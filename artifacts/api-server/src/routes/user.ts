import { Router } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import {
  usersTable,
  subscriptionsTable,
  vendorsTable,
  subscriptionPlansTable,
  subscriptionDaysTable,
  mealsTable,
  paymentsTable,
  orderNotificationsTable,
} from "@workspace/db";
import { eq, and, asc, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth-middleware";
import { totalScheduleDays } from "../lib/schedule";
import { toCustomerDisplayPriceNaira, computeOffSchedulePricing } from "../lib/pricing";
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
      tier: subscriptionPlansTable.tier,
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
      planName: s.tier === "basic" ? "Basic" : "Premium",
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
      metadata: { userId: user.id, vendorId, planId, planName: plan.tier === "basic" ? "Basic" : "Premium" },
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
    res.json({ status: "success", subscriptionId: payment.subscriptionId, orderType: payment.orderType, paymentId: payment.id, message: null });
    return;
  }
  if (payment.status === "failed") {
    res.json({ status: "failed", subscriptionId: null, orderType: payment.orderType, paymentId: payment.id, message: payment.failureReason ?? "Payment failed" });
    return;
  }

  try {
    const result = await verifyTransaction(reference);
    if (result.status === "success") {
      const { subscriptionId } = await activatePaymentSuccess(payment);
      res.json({ status: "success", subscriptionId, orderType: payment.orderType, paymentId: payment.id, message: null });
    } else if (result.status === "failed" || result.status === "abandoned") {
      const message = result.gatewayResponse || "Payment was declined or abandoned";
      await markPaymentFailed(payment, message);
      res.json({ status: "failed", subscriptionId: null, orderType: payment.orderType, paymentId: payment.id, message });
    } else {
      res.json({ status: "pending", subscriptionId: null, orderType: payment.orderType, paymentId: payment.id, message: null });
    }
  } catch (err) {
    res.status(502).json({ error: err instanceof PaystackError ? err.message : "Failed to verify payment with Paystack" });
  }
});

// POST /user/alacarte/checkout
// Off-schedule, à la carte purchase: no active subscription required. Always
// priced from the meal's raw vendor price using the (higher) off-schedule
// markup rate — never trust a client-supplied price. orderDate is always
// "today" (server clock), decided here, not by the client, so this endpoint
// can only ever be used for a right-now purchase, not to game future/past
// subscription-day pricing.
router.post("/user/alacarte/checkout", requireAuth("user"), async (req: AuthRequest, res) => {
  const { vendorId, mealId, callbackUrl } = req.body;
  if (!vendorId || !mealId) {
    res.status(400).json({ error: "vendorId and mealId required" });
    return;
  }
  if (!callbackUrl || typeof callbackUrl !== "string") {
    res.status(400).json({ error: "callbackUrl required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session!.id));
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  const [meal] = await db.select().from(mealsTable).where(eq(mealsTable.id, mealId));
  if (!user || !vendor || !meal) {
    res.status(404).json({ error: "Vendor or meal not found" });
    return;
  }
  if (meal.vendorId !== vendor.id) {
    res.status(400).json({ error: "This meal does not belong to the selected vendor" });
    return;
  }
  if (!meal.available) {
    res.status(400).json({ error: "This meal is not currently available" });
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  // Off-schedule enforcement: if the customer already has an active
  // subscription at this exact vendor with a pickup scheduled for today,
  // today is an on-schedule day for them at this vendor — à la carte is for
  // days outside the plan schedule, so block it here rather than only in
  // the UI (this is checked server-side regardless of what the client sends).
  const [scheduledToday] = await db
    .select({ id: subscriptionDaysTable.id })
    .from(subscriptionDaysTable)
    .innerJoin(subscriptionsTable, eq(subscriptionDaysTable.subscriptionId, subscriptionsTable.id))
    .where(
      and(
        eq(subscriptionsTable.userId, user.id),
        eq(subscriptionsTable.vendorId, vendor.id),
        eq(subscriptionsTable.status, "active"),
        eq(subscriptionDaysTable.scheduledDate, today)
      )
    )
    .limit(1);
  if (scheduledToday) {
    res.status(400).json({ error: "You already have a subscription pickup at this vendor today. À la carte is only for days outside your schedule." });
    return;
  }

  const pricing = computeOffSchedulePricing(meal.priceNaira, vendor.offScheduleMarkupPercent);
  const reference = `chopplan_alc_${crypto.randomUUID()}`;

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      userId: user.id,
      vendorId: vendor.id,
      orderType: "alacarte",
      mealId: meal.id,
      orderDate: today,
      vendorPriceNaira: pricing.vendorPriceNaira,
      offScheduleMarkupNaira: pricing.offScheduleMarkupNaira,
      pickupStatus: "pending",
      reference,
      amountNaira: pricing.totalPriceNaira,
      status: "pending",
    })
    .returning();

  try {
    const tx = await initializeTransaction({
      email: user.email,
      amountNaira: pricing.totalPriceNaira,
      reference: payment.reference,
      callbackUrl,
      metadata: { userId: user.id, vendorId: vendor.id, mealId: meal.id, orderType: "alacarte" },
    });
    res.status(201).json({
      reference: payment.reference,
      authorizationUrl: tx.authorizationUrl,
      amountNaira: pricing.totalPriceNaira,
    });
  } catch (err) {
    await markPaymentFailed(payment, err instanceof PaystackError ? err.message : "Failed to start checkout");
    res.status(502).json({ error: err instanceof PaystackError ? err.message : "Failed to start checkout with Paystack" });
  }
});

// GET /user/alacarte/orders
router.get("/user/alacarte/orders", requireAuth("user"), async (req: AuthRequest, res) => {
  const orders = await db
    .select({
      id: paymentsTable.id,
      vendorId: paymentsTable.vendorId,
      vendorName: vendorsTable.businessName,
      mealId: paymentsTable.mealId,
      mealName: mealsTable.name,
      orderDate: paymentsTable.orderDate,
      amountNaira: paymentsTable.amountNaira,
      status: paymentsTable.status,
      pickupStatus: paymentsTable.pickupStatus,
      pickupConfirmedAt: paymentsTable.pickupConfirmedAt,
      createdAt: paymentsTable.createdAt,
    })
    .from(paymentsTable)
    .innerJoin(vendorsTable, eq(paymentsTable.vendorId, vendorsTable.id))
    .leftJoin(mealsTable, eq(paymentsTable.mealId, mealsTable.id))
    .where(and(eq(paymentsTable.userId, req.session!.id), eq(paymentsTable.orderType, "alacarte")))
    .orderBy(desc(paymentsTable.createdAt));

  res.json(
    orders.map((o) => ({
      id: o.id,
      vendorId: o.vendorId,
      vendorName: o.vendorName,
      mealId: o.mealId,
      mealName: o.mealName ?? null,
      orderDate: o.orderDate,
      amountNaira: o.amountNaira,
      status: o.status as "pending" | "success" | "failed",
      pickupStatus: (o.pickupStatus ?? null) as "pending" | "confirmed" | null,
      pickupConfirmedAt: o.pickupConfirmedAt,
      createdAt: o.createdAt,
    }))
  );
});

// POST /user/alacarte/:paymentId/confirm
// Customer confirms they've picked up an à la carte order, mirroring how
// subscription pickup days are confirmed.
router.post("/user/alacarte/:paymentId/confirm", requireAuth("user"), async (req: AuthRequest, res) => {
  const paymentId = Number(req.params.paymentId);
  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.id, paymentId), eq(paymentsTable.userId, req.session!.id), eq(paymentsTable.orderType, "alacarte")));
  if (!payment) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (payment.status !== "success") {
    res.status(400).json({ error: "This order has not been paid for yet" });
    return;
  }
  if (payment.pickupStatus === "confirmed") {
    res.status(400).json({ error: "This order is already confirmed" });
    return;
  }
  const [updated] = await db
    .update(paymentsTable)
    .set({ pickupStatus: "confirmed", pickupConfirmedAt: new Date(), updatedAt: new Date() })
    .where(eq(paymentsTable.id, paymentId))
    .returning();

  res.json({
    id: updated.id,
    orderDate: updated.orderDate,
    amountNaira: updated.amountNaira,
    pickupStatus: updated.pickupStatus as "pending" | "confirmed",
    pickupConfirmedAt: updated.pickupConfirmedAt,
  });
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
    .select({
      id: subscriptionDaysTable.id,
      dayNumber: subscriptionDaysTable.dayNumber,
      scheduledDate: subscriptionDaysTable.scheduledDate,
      status: subscriptionDaysTable.status,
      confirmedAt: subscriptionDaysTable.confirmedAt,
      isFreeDay: subscriptionDaysTable.isFreeDay,
      mealName: mealsTable.name,
    })
    .from(subscriptionDaysTable)
    .leftJoin(mealsTable, eq(subscriptionDaysTable.mealId, mealsTable.id))
    .where(eq(subscriptionDaysTable.subscriptionId, subscriptionId))
    .orderBy(asc(subscriptionDaysTable.dayNumber));

  res.json(days.map((d) => ({
    id: d.id,
    dayNumber: d.dayNumber,
    scheduledDate: d.scheduledDate,
    status: d.status as "pending" | "confirmed",
    confirmedAt: d.confirmedAt,
    isFreeDay: d.isFreeDay,
    mealName: d.mealName ?? null,
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

  const [meal] = updated.mealId ? await db.select().from(mealsTable).where(eq(mealsTable.id, updated.mealId)) : [];
  res.json({
    id: updated.id,
    dayNumber: updated.dayNumber,
    scheduledDate: updated.scheduledDate,
    status: updated.status as "pending" | "confirmed",
    confirmedAt: updated.confirmedAt,
    isFreeDay: updated.isFreeDay,
    mealName: meal?.name ?? null,
  });
});

// GET /user/notifications — pickup-notification history the customer has
// received about one of their own orders (subscription day or à la carte),
// mirroring GET /vendor/notifications on the vendor side.
router.get("/user/notifications", requireAuth("user"), async (req: AuthRequest, res) => {
  const userId = req.session!.id;
  const orderType = String(req.query.orderType ?? "");
  const subscriptionDayId = req.query.subscriptionDayId ? Number(req.query.subscriptionDayId) : undefined;
  const paymentId = req.query.paymentId ? Number(req.query.paymentId) : undefined;

  if (orderType !== "subscription" && orderType !== "alacarte") {
    res.status(400).json({ error: "orderType query param must be 'subscription' or 'alacarte'" });
    return;
  }

  // Confirm this order actually belongs to the requesting user before
  // returning any notification history for it.
  if (orderType === "subscription") {
    if (!subscriptionDayId) {
      res.status(400).json({ error: "subscriptionDayId is required for orderType 'subscription'" });
      return;
    }
    const [owned] = await db
      .select({ id: subscriptionDaysTable.id })
      .from(subscriptionDaysTable)
      .innerJoin(subscriptionsTable, eq(subscriptionDaysTable.subscriptionId, subscriptionsTable.id))
      .where(and(eq(subscriptionDaysTable.id, subscriptionDayId), eq(subscriptionsTable.userId, userId)));
    if (!owned) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
  } else {
    if (!paymentId) {
      res.status(400).json({ error: "paymentId is required for orderType 'alacarte'" });
      return;
    }
    const [owned] = await db
      .select({ id: paymentsTable.id })
      .from(paymentsTable)
      .where(and(eq(paymentsTable.id, paymentId), eq(paymentsTable.userId, userId), eq(paymentsTable.orderType, "alacarte")));
    if (!owned) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
  }

  const rows = await db
    .select()
    .from(orderNotificationsTable)
    .where(
      and(
        eq(orderNotificationsTable.userId, userId),
        eq(orderNotificationsTable.orderType, orderType),
        orderType === "subscription"
          ? eq(orderNotificationsTable.subscriptionDayId, subscriptionDayId!)
          : eq(orderNotificationsTable.paymentId, paymentId!)
      )
    )
    .orderBy(desc(orderNotificationsTable.createdAt));

  res.json(
    rows.map((n) => ({
      id: n.id,
      orderType: n.orderType as "subscription" | "alacarte",
      subscriptionDayId: n.subscriptionDayId,
      paymentId: n.paymentId,
      presetType: n.presetType,
      message: n.message,
      createdAt: n.createdAt,
    }))
  );
});

export default router;
