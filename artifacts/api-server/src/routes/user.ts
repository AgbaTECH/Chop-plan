import { Router } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import {
  usersTable,
  subscriptionsTable,
  vendorsTable,
  subscriptionPlansTable,
  subscriptionDaysTable,
  paymentsTable,
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth-middleware";
import { totalScheduleDays, buildScheduleRows } from "../lib/schedule";
import { toCustomerDisplayPriceNaira } from "../lib/pricing";
import { initializeTransaction, verifyTransaction, PaystackError } from "../lib/paystack";
import { activatePaymentSuccess, markPaymentFailed } from "../lib/payment-activation";

const router = Router();

// GET /user/profile
router.get("/user/profile", requireAuth("user"), async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session!.id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, area: user.area });
});

// PATCH /user/profile
router.patch("/user/profile", requireAuth("user"), async (req: AuthRequest, res) => {
  const { name, phone, area } = req.body;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name) updates.name = name;
  if (phone) updates.phone = phone;
  if (area) updates.area = area;
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.session!.id)).returning();
  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, area: user.area });
});

// GET /user/subscriptions
router.get("/user/subscriptions", requireAuth("user"), async (req: AuthRequest, res) => {
  const subs = await db
    .select({
      id: subscriptionsTable.id,
      vendorId: subscriptionsTable.vendorId,
      planId: subscriptionsTable.planId,
      startDate: subscriptionsTable.startDate,
      status: subscriptionsTable.status,
      vendorName: vendorsTable.businessName,
      vendorCoverImage: vendorsTable.coverImage,
      planName: subscriptionPlansTable.name,
      daysPerMonth: subscriptionPlansTable.daysPerMonth,
      freeDays: subscriptionPlansTable.freeDays,
      priceNaira: subscriptionPlansTable.priceNaira,
    })
    .from(subscriptionsTable)
    .innerJoin(vendorsTable, eq(subscriptionsTable.vendorId, vendorsTable.id))
    .innerJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
    .where(eq(subscriptionsTable.userId, req.session!.id));

  res.json(
    subs.map((s) => ({
      id: s.id,
      vendorId: s.vendorId,
      vendorName: s.vendorName,
      vendorCoverImage: s.vendorCoverImage ?? null,
      planName: s.planName,
      daysPerMonth: s.daysPerMonth,
      freeDays: s.freeDays,
      priceNaira: toCustomerDisplayPriceNaira(s.priceNaira),
      startDate: typeof s.startDate === "string" ? s.startDate : s.startDate,
      status: s.status as "active" | "paused" | "cancelled",
    }))
  );
});

// POST /user/subscriptions/checkout
// Starts a real Paystack payment for the customer-facing price. No
// subscription is created here — it's only created once Paystack confirms
// the charge succeeded (see activatePaymentSuccess, invoked from the webhook
// or the verify endpoint below).
router.post("/user/subscriptions/checkout", requireAuth("user"), async (req: AuthRequest, res) => {
  const { vendorId, planId, callbackUrl } = req.body;
  if (!vendorId || !planId) {
    res.status(400).json({ error: "vendorId and planId required" });
    return;
  }
  if (!callbackUrl || typeof callbackUrl !== "string") {
    res.status(400).json({ error: "callbackUrl required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session!.id));
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, planId));
  if (!user || !vendor || !plan) {
    res.status(404).json({ error: "Vendor or plan not found" });
    return;
  }
  if (plan.vendorId !== vendor.id) {
    res.status(400).json({ error: "This plan does not belong to the selected vendor" });
    return;
  }

  const amountNaira = toCustomerDisplayPriceNaira(plan.priceNaira);
  const reference = `chopplan_${crypto.randomUUID()}`;

  const [payment] = await db
    .insert(paymentsTable)
    .values({ userId: user.id, vendorId, planId, reference, amountNaira, status: "pending" })
    .returning();

  try {
    const tx = await initializeTransaction({
      email: user.email,
      amountNaira,
      reference: payment.reference,
      callbackUrl,
      metadata: { userId: user.id, vendorId, planId, planName: plan.name },
    });
    res.status(201).json({
      reference: payment.reference,
      authorizationUrl: tx.authorizationUrl,
      amountNaira,
    });
  } catch (err) {
    await markPaymentFailed(payment, err instanceof PaystackError ? err.message : "Failed to start checkout");
    res.status(502).json({ error: err instanceof PaystackError ? err.message : "Failed to start checkout with Paystack" });
  }
});

// GET /user/payments/:reference/verify
// Fallback for the checkout-callback screen: independently confirms the
// transaction's status directly with Paystack (never trusts the client) and
// activates the subscription if it succeeded but the webhook hasn't landed
// yet. Idempotent — safe to call repeatedly or race with the webhook.
router.get("/user/payments/:reference/verify", requireAuth("user"), async (req: AuthRequest, res) => {
  const reference = String(req.params.reference);
  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.reference, reference), eq(paymentsTable.userId, req.session!.id)));
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  if (payment.status === "success") {
    res.json({ status: "success", subscriptionId: payment.subscriptionId, message: null });
    return;
  }
  if (payment.status === "failed") {
    res.json({ status: "failed", subscriptionId: null, message: payment.failureReason ?? "Payment failed" });
    return;
  }

  try {
    const result = await verifyTransaction(reference);
    if (result.status === "success") {
      const { subscriptionId } = await activatePaymentSuccess(payment);
      res.json({ status: "success", subscriptionId, message: null });
    } else if (result.status === "failed" || result.status === "abandoned") {
      const message = result.gatewayResponse || "Payment was declined or abandoned";
      await markPaymentFailed(payment, message);
      res.json({ status: "failed", subscriptionId: null, message });
    } else {
      res.json({ status: "pending", subscriptionId: null, message: null });
    }
  } catch (err) {
    res.status(502).json({ error: err instanceof PaystackError ? err.message : "Failed to verify payment with Paystack" });
  }
});

// DELETE /user/subscriptions/:subscriptionId
router.delete("/user/subscriptions/:subscriptionId", requireAuth("user"), async (req: AuthRequest, res) => {
  const id = Number(req.params.subscriptionId);
  await db
    .update(subscriptionsTable)
    .set({ status: "cancelled" })
    .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.userId, req.session!.id)));
  res.json({ success: true, message: "Subscription cancelled" });
});

// GET /user/subscriptions/:subscriptionId/schedule
router.get("/user/subscriptions/:subscriptionId/schedule", requireAuth("user"), async (req: AuthRequest, res) => {
  const subscriptionId = Number(req.params.subscriptionId);
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.userId, req.session!.id)));
  if (!sub) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }
  const days = await db
    .select()
    .from(subscriptionDaysTable)
    .where(eq(subscriptionDaysTable.subscriptionId, subscriptionId))
    .orderBy(asc(subscriptionDaysTable.dayNumber));

  res.json(days.map((d) => ({
    id: d.id,
    dayNumber: d.dayNumber,
    scheduledDate: d.scheduledDate,
    status: d.status as "pending" | "confirmed",
    confirmedAt: d.confirmedAt,
  })));
});

// POST /user/subscriptions/:subscriptionId/schedule/:dayId/confirm
router.post("/user/subscriptions/:subscriptionId/schedule/:dayId/confirm", requireAuth("user"), async (req: AuthRequest, res) => {
  const subscriptionId = Number(req.params.subscriptionId);
  const dayId = Number(req.params.dayId);
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.userId, req.session!.id)));
  if (!sub) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }
  const [day] = await db
    .select()
    .from(subscriptionDaysTable)
    .where(and(eq(subscriptionDaysTable.id, dayId), eq(subscriptionDaysTable.subscriptionId, subscriptionId)));
  if (!day) {
    res.status(404).json({ error: "Day not found" });
    return;
  }
  if (day.status === "confirmed") {
    res.status(400).json({ error: "This day is already confirmed" });
    return;
  }
  const today = new Date().toISOString().split("T")[0];
  if (day.scheduledDate > today) {
    res.status(400).json({ error: "Cannot confirm a future pickup" });
    return;
  }
  const [updated] = await db
    .update(subscriptionDaysTable)
    .set({ status: "confirmed", confirmedAt: new Date() })
    .where(eq(subscriptionDaysTable.id, dayId))
    .returning();

  res.json({
    id: updated.id,
    dayNumber: updated.dayNumber,
    scheduledDate: updated.scheduledDate,
    status: updated.status as "pending" | "confirmed",
    confirmedAt: updated.confirmedAt,
  });
});

export default router;
