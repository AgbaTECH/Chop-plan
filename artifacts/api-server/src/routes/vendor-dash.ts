import { Router } from "express";
import { db } from "@workspace/db";
import {
  vendorsTable,
  mealsTable,
  subscriptionsTable,
  subscriptionPlansTable,
  usersTable,
  subscriptionDaysTable,
  vendorWithdrawalsTable,
} from "@workspace/db";
import { eq, and, sql, asc, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth-middleware";
import { perDayShareNaira } from "../lib/schedule";

const router = Router();

// GET /vendor/profile
router.get("/vendor/profile", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const [v] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, req.session!.id));
  if (!v) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    id: v.id,
    businessName: v.businessName,
    ownerName: v.ownerName,
    email: v.email,
    phone: v.phone,
    area: v.area,
    cuisineType: v.cuisineType,
    description: v.description ?? null,
    coverImage: v.coverImage ?? null,
  });
});

// PATCH /vendor/profile
router.patch("/vendor/profile", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const { businessName, ownerName, phone, area, cuisineType, description } = req.body;
  const updates: Partial<typeof vendorsTable.$inferInsert> = {};
  if (businessName) updates.businessName = businessName;
  if (ownerName) updates.ownerName = ownerName;
  if (phone) updates.phone = phone;
  if (area) updates.area = area;
  if (cuisineType) updates.cuisineType = cuisineType;
  if (description !== undefined) updates.description = description;
  const [v] = await db.update(vendorsTable).set(updates).where(eq(vendorsTable.id, req.session!.id)).returning();
  res.json({
    id: v.id, businessName: v.businessName, ownerName: v.ownerName,
    email: v.email, phone: v.phone, area: v.area, cuisineType: v.cuisineType,
    description: v.description ?? null, coverImage: v.coverImage ?? null,
  });
});

// GET /vendor/dashboard
router.get("/vendor/dashboard", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const subs = await db
    .select({ status: subscriptionsTable.status, planId: subscriptionsTable.planId })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.vendorId, vendorId));

  const plans = await db
    .select()
    .from(subscriptionPlansTable)
    .where(eq(subscriptionPlansTable.vendorId, vendorId));

  const [{ mealCount }] = await db
    .select({ mealCount: sql<number>`count(*)::int` })
    .from(mealsTable)
    .where(eq(mealsTable.vendorId, vendorId));

  const totalSubscribers = subs.length;
  const activeSubscribers = subs.filter((s) => s.status === "active").length;

  const planMap = new Map(plans.map((p) => [p.id, p]));
  let monthlyRevenue = 0;
  const planCounts = new Map<number, number>();

  for (const s of subs.filter((s) => s.status === "active")) {
    const plan = planMap.get(s.planId);
    if (plan) {
      monthlyRevenue += plan.priceNaira;
      planCounts.set(s.planId, (planCounts.get(s.planId) ?? 0) + 1);
    }
  }

  const weeklyRevenue = Math.round(monthlyRevenue / 4);

  const planBreakdown = plans.map((p) => ({
    planName: p.name,
    subscriberCount: planCounts.get(p.id) ?? 0,
    revenueNaira: (planCounts.get(p.id) ?? 0) * p.priceNaira,
  }));

  res.json({
    totalSubscribers,
    activeSubscribers,
    projectedWeeklyEarning: weeklyRevenue,
    projectedMonthlyEarning: monthlyRevenue,
    totalMeals: mealCount,
    planBreakdown,
  });
});

// GET /vendor/customers
router.get("/vendor/customers", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const rows = await db
    .select({
      id: subscriptionsTable.id,
      name: usersTable.name,
      phone: usersTable.phone,
      planName: subscriptionPlansTable.name,
      startDate: subscriptionsTable.startDate,
      status: subscriptionsTable.status,
      priceNaira: subscriptionPlansTable.priceNaira,
    })
    .from(subscriptionsTable)
    .innerJoin(usersTable, eq(subscriptionsTable.userId, usersTable.id))
    .innerJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
    .where(eq(subscriptionsTable.vendorId, vendorId));

  res.json(rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    planName: r.planName,
    startDate: r.startDate,
    status: r.status as "active" | "paused" | "cancelled",
    priceNaira: r.priceNaira,
  })));
});

// GET /vendor/earnings
router.get("/vendor/earnings", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const plans = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.vendorId, vendorId));
  const subs = await db
    .select({ planId: subscriptionsTable.planId })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.vendorId, vendorId), eq(subscriptionsTable.status, "active")));

  const planMap = new Map(plans.map((p) => [p.id, p]));
  const planCounts = new Map<number, number>();
  for (const s of subs) {
    planCounts.set(s.planId, (planCounts.get(s.planId) ?? 0) + 1);
  }

  let monthly = 0;
  const monthlyByPlan = plans.map((p) => {
    const count = planCounts.get(p.id) ?? 0;
    const revenue = count * p.priceNaira;
    monthly += revenue;
    return { planName: p.name, subscriberCount: count, revenueNaira: revenue };
  });

  const weekly = Math.round(monthly / 4);
  const weeklyByPlan = monthlyByPlan.map((pb) => ({
    ...pb,
    revenueNaira: Math.round(pb.revenueNaira / 4),
  }));

  res.json({ weekly, monthly, weeklyByPlan, monthlyByPlan });
});

// GET /vendor/meals
router.get("/vendor/meals", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const meals = await db.select().from(mealsTable).where(eq(mealsTable.vendorId, req.session!.id));
  res.json(meals.map((m) => ({
    id: m.id, name: m.name, description: m.description,
    priceNaira: m.priceNaira, imageUrl: m.imageUrl,
    available: m.available, category: m.category ?? null,
  })));
});

// POST /vendor/meals
router.post("/vendor/meals", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const { name, description, priceNaira, imageUrl, category, available } = req.body;
  const [meal] = await db
    .insert(mealsTable)
    .values({
      vendorId: req.session!.id, name, description, priceNaira,
      imageUrl, category: category ?? null, available: available ?? true,
    })
    .returning();
  res.status(201).json({
    id: meal.id, name: meal.name, description: meal.description,
    priceNaira: meal.priceNaira, imageUrl: meal.imageUrl,
    available: meal.available, category: meal.category ?? null,
  });
});

// PATCH /vendor/meals/:mealId
router.patch("/vendor/meals/:mealId", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const mealId = Number(req.params.mealId);
  const { name, description, priceNaira, imageUrl, category, available } = req.body;
  const updates: Partial<typeof mealsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (priceNaira !== undefined) updates.priceNaira = priceNaira;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (category !== undefined) updates.category = category;
  if (available !== undefined) updates.available = available;
  const [meal] = await db
    .update(mealsTable)
    .set(updates)
    .where(and(eq(mealsTable.id, mealId), eq(mealsTable.vendorId, req.session!.id)))
    .returning();
  res.json({
    id: meal.id, name: meal.name, description: meal.description,
    priceNaira: meal.priceNaira, imageUrl: meal.imageUrl,
    available: meal.available, category: meal.category ?? null,
  });
});

// DELETE /vendor/meals/:mealId
router.delete("/vendor/meals/:mealId", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const mealId = Number(req.params.mealId);
  await db
    .delete(mealsTable)
    .where(and(eq(mealsTable.id, mealId), eq(mealsTable.vendorId, req.session!.id)));
  res.json({ success: true, message: "Meal deleted" });
});

// GET /vendor/customers/:subscriptionId/schedule
router.get("/vendor/customers/:subscriptionId/schedule", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const subscriptionId = Number(req.params.subscriptionId);
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.vendorId, req.session!.id)));
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

async function getVendorWalletSummary(vendorId: number) {
  const confirmedDays = await db
    .select({
      priceNaira: subscriptionPlansTable.priceNaira,
      daysPerMonth: subscriptionPlansTable.daysPerMonth,
      freeDays: subscriptionPlansTable.freeDays,
    })
    .from(subscriptionDaysTable)
    .innerJoin(subscriptionsTable, eq(subscriptionDaysTable.subscriptionId, subscriptionsTable.id))
    .innerJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
    .where(and(eq(subscriptionsTable.vendorId, vendorId), eq(subscriptionDaysTable.status, "confirmed")));

  const earnedNaira = confirmedDays.reduce(
    (sum, d) => sum + perDayShareNaira(d.priceNaira, d.daysPerMonth, d.freeDays),
    0
  );

  const withdrawals = await db
    .select()
    .from(vendorWithdrawalsTable)
    .where(eq(vendorWithdrawalsTable.vendorId, vendorId))
    .orderBy(desc(vendorWithdrawalsTable.createdAt));

  const withdrawnNaira = withdrawals.reduce((sum, w) => sum + w.amountNaira, 0);

  return {
    earnedNaira,
    withdrawableNaira: earnedNaira - withdrawnNaira,
    withdrawnNaira,
    withdrawals: withdrawals.map((w) => ({ id: w.id, amountNaira: w.amountNaira, createdAt: w.createdAt })),
  };
}

// GET /vendor/wallet
router.get("/vendor/wallet", requireAuth("vendor"), async (req: AuthRequest, res) => {
  res.json(await getVendorWalletSummary(req.session!.id));
});

// POST /vendor/wallet/withdraw
router.post("/vendor/wallet/withdraw", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const amountNaira = Number(req.body?.amountNaira);
  if (!amountNaira || amountNaira <= 0) {
    res.status(400).json({ error: "Invalid withdrawal amount" });
    return;
  }
  const summary = await getVendorWalletSummary(vendorId);
  if (amountNaira > summary.withdrawableNaira) {
    res.status(400).json({ error: "Amount exceeds withdrawable balance" });
    return;
  }
  await db.insert(vendorWithdrawalsTable).values({ vendorId, amountNaira });
  res.json(await getVendorWalletSummary(vendorId));
});

export default router;
