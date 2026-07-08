import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  subscriptionsTable,
  vendorsTable,
  subscriptionPlansTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth-middleware";

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
      priceNaira: s.priceNaira,
      startDate: typeof s.startDate === "string" ? s.startDate : s.startDate,
      status: s.status as "active" | "paused" | "cancelled",
    }))
  );
});

// POST /user/subscriptions
router.post("/user/subscriptions", requireAuth("user"), async (req: AuthRequest, res) => {
  const { vendorId, planId } = req.body;
  if (!vendorId || !planId) {
    res.status(400).json({ error: "vendorId and planId required" });
    return;
  }
  const today = new Date().toISOString().split("T")[0];
  const [sub] = await db
    .insert(subscriptionsTable)
    .values({ userId: req.session!.id, vendorId, planId, startDate: today, status: "active" })
    .returning();

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, planId));

  res.status(201).json({
    id: sub.id,
    vendorId: sub.vendorId,
    vendorName: vendor.businessName,
    vendorCoverImage: vendor.coverImage ?? null,
    planName: plan.name,
    daysPerMonth: plan.daysPerMonth,
    freeDays: plan.freeDays,
    priceNaira: plan.priceNaira,
    startDate: sub.startDate,
    status: sub.status as "active",
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

export default router;
