import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  subscriptionsTable,
  vendorsTable,
  subscriptionPlansTable,
  subscriptionDaysTable,
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth-middleware";
import { totalScheduleDays, buildScheduleRows } from "../lib/schedule";
import { toCustomerDisplayPriceNaira } from "../lib/pricing";

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

  const scheduleRows = buildScheduleRows(sub.id, sub.startDate, totalScheduleDays(plan.daysPerMonth, plan.freeDays));
  if (scheduleRows.length > 0) {
    await db.insert(subscriptionDaysTable).values(scheduleRows);
  }

  res.status(201).json({
    id: sub.id,
    vendorId: sub.vendorId,
    vendorName: vendor.businessName,
    vendorCoverImage: vendor.coverImage ?? null,
    planName: plan.name,
    daysPerMonth: plan.daysPerMonth,
    freeDays: plan.freeDays,
    priceNaira: toCustomerDisplayPriceNaira(plan.priceNaira),
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
