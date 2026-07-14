import { Router } from "express";
import { db } from "@workspace/db";
import {
  vendorsTable,
  mealsTable,
  subscriptionsTable,
  subscriptionPlansTable,
  planTimetableTable,
  usersTable,
  subscriptionDaysTable,
  vendorWithdrawalsTable,
  vendorBankAccountsTable,
  paymentsTable,
  orderNotificationsTable,
} from "@workspace/db";
import { eq, and, sql, asc, desc, inArray } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth-middleware";
import { perDayShareNaira, PREMIUM_DAYS_PER_MONTH, PREMIUM_FREE_DAYS } from "../lib/schedule";
import { listBanks, resolveAccountNumber, createTransferRecipient, initiateTransfer, PaystackError } from "../lib/paystack";
import { logger } from "../lib/logger";
import { PRESET_TYPES, PresetType, resolveNotificationMessage } from "../lib/notifications";
import crypto from "node:crypto";

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
    kitchenPhotos: v.kitchenPhotos ?? [],
  });
});

// PATCH /vendor/profile
router.patch("/vendor/profile", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const { businessName, ownerName, phone, area, cuisineType, description, coverImage, kitchenPhotos } = req.body;
  const updates: Partial<typeof vendorsTable.$inferInsert> = {};
  if (businessName) updates.businessName = businessName;
  if (ownerName) updates.ownerName = ownerName;
  if (phone) updates.phone = phone;
  if (area) updates.area = area;
  if (cuisineType) updates.cuisineType = cuisineType;
  if (description !== undefined) updates.description = description;
  if (coverImage !== undefined) updates.coverImage = coverImage;
  if (kitchenPhotos !== undefined) {
    if (!Array.isArray(kitchenPhotos) || !kitchenPhotos.every((p) => typeof p === "string")) {
      res.status(400).json({ error: "kitchenPhotos must be an array of strings" });
      return;
    }
    updates.kitchenPhotos = kitchenPhotos;
  }
  const [v] = await db.update(vendorsTable).set(updates).where(eq(vendorsTable.id, req.session!.id)).returning();
  res.json({
    id: v.id, businessName: v.businessName, ownerName: v.ownerName,
    email: v.email, phone: v.phone, area: v.area, cuisineType: v.cuisineType,
    description: v.description ?? null, coverImage: v.coverImage ?? null,
    kitchenPhotos: v.kitchenPhotos ?? [],
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
    planName: p.tier === "basic" ? "Basic" : "Premium",
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
      tier: subscriptionPlansTable.tier,
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
    planName: r.tier === "basic" ? "Basic" : "Premium",
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
    return { planName: p.tier === "basic" ? "Basic" : "Premium", subscriberCount: count, revenueNaira: revenue };
  });

  const weekly = Math.round(monthly / 4);
  const weeklyByPlan = monthlyByPlan.map((pb) => ({
    ...pb,
    revenueNaira: Math.round(pb.revenueNaira / 4),
  }));

  res.json({ weekly, monthly, weeklyByPlan, monthlyByPlan });
});

// GET /vendor/plans — the vendor's Basic and/or Premium plan (each optional).
router.get("/vendor/plans", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const plans = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.vendorId, vendorId));
  const basic = plans.find((p) => p.tier === "basic");
  const premium = plans.find((p) => p.tier === "premium");

  let premiumOut = null;
  if (premium) {
    const timetable = await db
      .select()
      .from(planTimetableTable)
      .where(eq(planTimetableTable.planId, premium.id))
      .orderBy(asc(planTimetableTable.dayOfWeek));
    const freeDayRows = timetable.filter((t) => t.isFreeDay);
    // Never surface a Premium plan with an incomplete timetable (e.g. left
    // partial by a bug) — treat it as "not set up" so the vendor is prompted
    // to fix it via the edit dialog rather than the UI dereferencing a
    // missing freeDay/rotation entry.
    if (timetable.length === 5 && freeDayRows.length === 1) {
      premiumOut = {
        id: premium.id,
        priceNaira: premium.priceNaira,
        daysPerMonth: premium.daysPerMonth,
        freeDays: premium.freeDays,
        rotation: timetable.filter((t) => !t.isFreeDay).map((t) => ({ dayOfWeek: t.dayOfWeek, mealId: t.mealId })),
        freeDay: { dayOfWeek: freeDayRows[0].dayOfWeek, mealId: freeDayRows[0].mealId },
      };
    }
  }

  res.json({
    basic: basic
      ? { id: basic.id, priceNaira: basic.priceNaira, daysPerMonth: basic.daysPerMonth, freeDays: basic.freeDays, mealId: basic.basicMealId }
      : null,
    premium: premiumOut,
  });
});

// PUT /vendor/plans/basic — create or update the vendor's Basic plan: one
// fixed meal, no timetable, no rotation.
router.put("/vendor/plans/basic", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const { priceNaira, daysPerMonth, freeDays, mealId } = req.body ?? {};
  if (!priceNaira || priceNaira <= 0 || !daysPerMonth || daysPerMonth <= 0 || freeDays === undefined || freeDays < 0 || !mealId) {
    res.status(400).json({ error: "priceNaira, daysPerMonth, freeDays and mealId are required" });
    return;
  }

  const [meal] = await db.select().from(mealsTable).where(and(eq(mealsTable.id, mealId), eq(mealsTable.vendorId, vendorId)));
  if (!meal) {
    res.status(400).json({ error: "That meal does not belong to this vendor" });
    return;
  }

  const [existing] = await db
    .select()
    .from(subscriptionPlansTable)
    .where(and(eq(subscriptionPlansTable.vendorId, vendorId), eq(subscriptionPlansTable.tier, "basic")));

  const values = { vendorId, tier: "basic" as const, priceNaira, daysPerMonth, freeDays, basicMealId: mealId };
  const [plan] = existing
    ? await db.update(subscriptionPlansTable).set(values).where(eq(subscriptionPlansTable.id, existing.id)).returning()
    : await db.insert(subscriptionPlansTable).values(values).returning();

  res.status(existing ? 200 : 201).json({
    id: plan.id, priceNaira: plan.priceNaira, daysPerMonth: plan.daysPerMonth, freeDays: plan.freeDays, mealId: plan.basicMealId,
  });
});

// PUT /vendor/plans/premium — create or update the vendor's Premium plan:
// requires 2+ menu items, exactly 4 rotation days (one meal each) plus one
// free day whose meal is distinct from every rotation meal.
router.put("/vendor/plans/premium", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const { priceNaira, rotation, freeDay } = req.body ?? {};

  if (!priceNaira || priceNaira <= 0) {
    res.status(400).json({ error: "priceNaira is required" });
    return;
  }
  if (!Array.isArray(rotation) || rotation.length !== 4) {
    res.status(400).json({ error: "Premium requires exactly 4 rotation days" });
    return;
  }
  const validEntry = (e: any) => e && typeof e.dayOfWeek === "number" && e.dayOfWeek >= 0 && e.dayOfWeek <= 6 && typeof e.mealId === "number";
  if (!freeDay || !validEntry(freeDay)) {
    res.status(400).json({ error: "Premium requires exactly 1 free day with a valid dayOfWeek (0-6) and mealId" });
    return;
  }
  if (!rotation.every(validEntry)) {
    res.status(400).json({ error: "Each rotation day needs a valid dayOfWeek (0-6) and mealId" });
    return;
  }

  const rotationDays = rotation.map((e: any) => e.dayOfWeek);
  if (new Set(rotationDays).size !== 4) {
    res.status(400).json({ error: "Rotation days must be 4 distinct days of the week" });
    return;
  }
  if (rotationDays.includes(freeDay.dayOfWeek)) {
    res.status(400).json({ error: "The free day must be a different day from the 4 rotation days" });
    return;
  }
  const rotationMealIds = rotation.map((e: any) => e.mealId);
  if (rotationMealIds.includes(freeDay.mealId)) {
    res.status(400).json({ error: "The free-day meal must be different from all 4 rotation meals" });
    return;
  }

  const [{ mealCount }] = await db
    .select({ mealCount: sql<number>`count(*)::int` })
    .from(mealsTable)
    .where(eq(mealsTable.vendorId, vendorId));
  if (mealCount < 2) {
    res.status(400).json({ error: "Premium requires at least 2 menu items" });
    return;
  }

  const allMealIds = [...new Set([...rotationMealIds, freeDay.mealId])];
  const ownedMeals = await db
    .select({ id: mealsTable.id })
    .from(mealsTable)
    .where(and(inArray(mealsTable.id, allMealIds), eq(mealsTable.vendorId, vendorId)));
  if (ownedMeals.length !== allMealIds.length) {
    res.status(400).json({ error: "One or more meals do not belong to this vendor" });
    return;
  }

  // Plan row + full timetable replacement must succeed or fail together —
  // otherwise a failed insert after the delete would leave the plan with an
  // incomplete timetable (fewer than 4 rotation days + 1 free day), which
  // would silently break schedule generation at checkout.
  try {
    const { plan, wasExisting } = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(subscriptionPlansTable)
        .where(and(eq(subscriptionPlansTable.vendorId, vendorId), eq(subscriptionPlansTable.tier, "premium")));

      const values = {
        vendorId,
        tier: "premium" as const,
        priceNaira,
        daysPerMonth: PREMIUM_DAYS_PER_MONTH,
        freeDays: PREMIUM_FREE_DAYS,
        basicMealId: null,
      };
      const [savedPlan] = existing
        ? await tx.update(subscriptionPlansTable).set(values).where(eq(subscriptionPlansTable.id, existing.id)).returning()
        : await tx.insert(subscriptionPlansTable).values(values).returning();

      await tx.delete(planTimetableTable).where(eq(planTimetableTable.planId, savedPlan.id));
      const inserted = await tx.insert(planTimetableTable).values([
        ...rotation.map((e: any) => ({ planId: savedPlan.id, dayOfWeek: e.dayOfWeek, mealId: e.mealId, isFreeDay: false })),
        { planId: savedPlan.id, dayOfWeek: freeDay.dayOfWeek, mealId: freeDay.mealId, isFreeDay: true },
      ]).returning();

      // Belt-and-suspenders: confirm exactly 5 rows (4 rotation + 1 free) were
      // actually persisted before committing, so a partial insert can never
      // be committed as a "successful" save.
      if (inserted.length !== 5 || inserted.filter((r) => r.isFreeDay).length !== 1) {
        throw new Error("Failed to persist a complete Premium timetable");
      }

      return { plan: savedPlan, wasExisting: !!existing };
    });

    res.status(wasExisting ? 200 : 201).json({
      id: plan.id,
      priceNaira: plan.priceNaira,
      daysPerMonth: plan.daysPerMonth,
      freeDays: plan.freeDays,
      rotation,
      freeDay,
    });
  } catch (err) {
    logger.error({ err, vendorId }, "Failed to save Premium plan");
    res.status(500).json({ error: "Failed to save Premium plan. Please try again." });
  }
});

// DELETE /vendor/plans/:tier — disable a tier. Blocked while an active
// subscriber still depends on it, so a plan can't disappear under them.
router.delete("/vendor/plans/:tier", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const tier = req.params.tier;
  if (tier !== "basic" && tier !== "premium") {
    res.status(400).json({ error: "tier must be 'basic' or 'premium'" });
    return;
  }
  const [plan] = await db
    .select()
    .from(subscriptionPlansTable)
    .where(and(eq(subscriptionPlansTable.vendorId, vendorId), eq(subscriptionPlansTable.tier, tier)));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.planId, plan.id), eq(subscriptionsTable.status, "active")));
  if (count > 0) {
    res.status(400).json({ error: "Cannot remove a plan with active subscribers" });
    return;
  }
  await db.delete(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, plan.id));
  res.json({ success: true, message: "Plan removed" });
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

// DELETE /vendor/meals/:mealId — blocked while the meal is still in use by
// this vendor's Basic or Premium plan, since a delete would either null out
// the Basic plan's meal or (via FK cascade) leave the Premium timetable with
// fewer than 4 rotation days + 1 free day.
router.delete("/vendor/meals/:mealId", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const mealId = Number(req.params.mealId);

  const [usedAsBasic] = await db
    .select({ id: subscriptionPlansTable.id })
    .from(subscriptionPlansTable)
    .where(and(eq(subscriptionPlansTable.vendorId, vendorId), eq(subscriptionPlansTable.basicMealId, mealId)));
  if (usedAsBasic) {
    res.status(400).json({ error: "This meal is used by your Basic plan. Change the Basic plan's meal before deleting it." });
    return;
  }

  const [usedInPremium] = await db
    .select({ id: planTimetableTable.id })
    .from(planTimetableTable)
    .innerJoin(subscriptionPlansTable, eq(planTimetableTable.planId, subscriptionPlansTable.id))
    .where(and(eq(subscriptionPlansTable.vendorId, vendorId), eq(planTimetableTable.mealId, mealId)));
  if (usedInPremium) {
    res.status(400).json({ error: "This meal is used in your Premium timetable. Update the Premium plan before deleting it." });
    return;
  }

  const [usedInAlacarteOrder] = await db
    .select({ id: paymentsTable.id })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.vendorId, vendorId), eq(paymentsTable.mealId, mealId)));
  if (usedInAlacarteOrder) {
    res.status(400).json({ error: "This meal has à la carte order history and can't be deleted. Mark it unavailable instead." });
    return;
  }

  await db
    .delete(mealsTable)
    .where(and(eq(mealsTable.id, mealId), eq(mealsTable.vendorId, vendorId)));
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

// GET /vendor/alacarte/orders — the vendor-side view of à la carte orders
// placed with them, so they know which off-schedule pickups they can notify
// about (mirrors GET /user/alacarte/orders on the customer side).
router.get("/vendor/alacarte/orders", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const orders = await db
    .select({
      id: paymentsTable.id,
      userId: paymentsTable.userId,
      userName: usersTable.name,
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
    .innerJoin(usersTable, eq(paymentsTable.userId, usersTable.id))
    .leftJoin(mealsTable, eq(paymentsTable.mealId, mealsTable.id))
    .where(and(eq(paymentsTable.vendorId, vendorId), eq(paymentsTable.orderType, "alacarte")))
    .orderBy(desc(paymentsTable.createdAt));

  res.json(
    orders.map((o) => ({
      id: o.id,
      userId: o.userId,
      userName: o.userName,
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

// Resolves which vendor/user own a notifiable order, given the discriminator
// + id pair from the request. Returns null if the order doesn't exist or
// doesn't belong to this vendor — callers should 404 in that case. Shared by
// the vendor notify (POST) and history (GET) endpoints so ownership is
// checked identically in both places.
async function resolveVendorOrder(
  vendorId: number,
  orderType: string,
  subscriptionDayId: number | undefined,
  paymentId: number | undefined
): Promise<{ userId: number } | null> {
  if (orderType === "subscription") {
    if (!subscriptionDayId) return null;
    const [row] = await db
      .select({ userId: subscriptionsTable.userId })
      .from(subscriptionDaysTable)
      .innerJoin(subscriptionsTable, eq(subscriptionDaysTable.subscriptionId, subscriptionsTable.id))
      .where(and(eq(subscriptionDaysTable.id, subscriptionDayId), eq(subscriptionsTable.vendorId, vendorId)));
    return row ?? null;
  }
  if (orderType === "alacarte") {
    if (!paymentId) return null;
    const [row] = await db
      .select({ userId: paymentsTable.userId })
      .from(paymentsTable)
      .where(and(eq(paymentsTable.id, paymentId), eq(paymentsTable.vendorId, vendorId), eq(paymentsTable.orderType, "alacarte")));
    return row ?? null;
  }
  return null;
}

// POST /vendor/notifications — send a pickup notification to a customer
// about one of the vendor's own orders (subscription day or à la carte).
router.post("/vendor/notifications", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const { orderType, subscriptionDayId, paymentId, presetType, message } = req.body ?? {};

  if (orderType !== "subscription" && orderType !== "alacarte") {
    res.status(400).json({ error: "orderType must be 'subscription' or 'alacarte'" });
    return;
  }
  if (typeof presetType !== "string" || !PRESET_TYPES.includes(presetType as PresetType)) {
    res.status(400).json({ error: `presetType must be one of: ${PRESET_TYPES.join(", ")}` });
    return;
  }

  const owner = await resolveVendorOrder(vendorId, orderType, subscriptionDayId, paymentId);
  if (!owner) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const resolved = resolveNotificationMessage(presetType, message);
  if (!resolved.ok) {
    res.status(400).json({ error: resolved.error });
    return;
  }

  const [created] = await db
    .insert(orderNotificationsTable)
    .values({
      vendorId,
      userId: owner.userId,
      orderType,
      subscriptionDayId: orderType === "subscription" ? subscriptionDayId : null,
      paymentId: orderType === "alacarte" ? paymentId : null,
      presetType,
      message: resolved.message,
    })
    .returning();

  res.status(201).json({
    id: created.id,
    orderType: created.orderType as "subscription" | "alacarte",
    subscriptionDayId: created.subscriptionDayId,
    paymentId: created.paymentId,
    presetType: created.presetType,
    message: created.message,
    createdAt: created.createdAt,
  });
});

// GET /vendor/notifications — notification history for one of the vendor's
// orders (query by orderType + subscriptionDayId or paymentId).
router.get("/vendor/notifications", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const orderType = String(req.query.orderType ?? "");
  const subscriptionDayId = req.query.subscriptionDayId ? Number(req.query.subscriptionDayId) : undefined;
  const paymentId = req.query.paymentId ? Number(req.query.paymentId) : undefined;

  if (orderType !== "subscription" && orderType !== "alacarte") {
    res.status(400).json({ error: "orderType query param must be 'subscription' or 'alacarte'" });
    return;
  }
  const owner = await resolveVendorOrder(vendorId, orderType, subscriptionDayId, paymentId);
  if (!owner) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const rows = await db
    .select()
    .from(orderNotificationsTable)
    .where(
      and(
        eq(orderNotificationsTable.vendorId, vendorId),
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

  const subscriptionEarnedNaira = confirmedDays.reduce(
    (sum, d) => sum + perDayShareNaira(d.priceNaira, d.daysPerMonth, d.freeDays),
    0
  );

  // À la carte payout: the vendor is paid exactly vendorPriceNaira (the raw
  // meal price, stored at checkout time) once the customer confirms pickup
  // — no share of the off-schedule markup, same as a normal redemption never
  // gives the vendor a share of the 5% subscription markup.
  const confirmedAlacarteOrders = await db
    .select({ vendorPriceNaira: paymentsTable.vendorPriceNaira })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.vendorId, vendorId),
        eq(paymentsTable.orderType, "alacarte"),
        eq(paymentsTable.status, "success"),
        eq(paymentsTable.pickupStatus, "confirmed")
      )
    );
  const alacarteEarnedNaira = confirmedAlacarteOrders.reduce((sum, o) => sum + (o.vendorPriceNaira ?? 0), 0);

  const earnedNaira = subscriptionEarnedNaira + alacarteEarnedNaira;

  const withdrawals = await db
    .select()
    .from(vendorWithdrawalsTable)
    .where(eq(vendorWithdrawalsTable.vendorId, vendorId))
    .orderBy(desc(vendorWithdrawalsTable.createdAt));

  // Pending and successful withdrawals both hold funds against the balance;
  // a failed transfer is excluded here, which is what "restores" the amount
  // to the withdrawable balance — no separate refund step needed.
  const reservedNaira = withdrawals
    .filter((w) => w.status === "pending" || w.status === "success")
    .reduce((sum, w) => sum + w.amountNaira, 0);
  const withdrawnNaira = withdrawals
    .filter((w) => w.status === "success")
    .reduce((sum, w) => sum + w.amountNaira, 0);

  return {
    earnedNaira,
    withdrawableNaira: earnedNaira - reservedNaira,
    withdrawnNaira,
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      amountNaira: w.amountNaira,
      status: w.status as "pending" | "success" | "failed",
      bankName: w.bankName,
      accountNumber: w.accountNumber,
      accountName: w.accountName,
      failureReason: w.failureReason,
      createdAt: w.createdAt,
    })),
  };
}

// GET /vendor/wallet
router.get("/vendor/wallet", requireAuth("vendor"), async (req: AuthRequest, res) => {
  res.json(await getVendorWalletSummary(req.session!.id));
});

// GET /vendor/banks — list of Nigerian banks for the payout-account form
router.get("/vendor/banks", requireAuth("vendor"), async (_req: AuthRequest, res) => {
  try {
    const banks = await listBanks();
    res.json(banks);
  } catch (err) {
    res.status(502).json({ error: err instanceof PaystackError ? err.message : "Failed to load bank list" });
  }
});

// GET /vendor/bank-account — the vendor's saved payout account, if any
router.get("/vendor/bank-account", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const [account] = await db
    .select()
    .from(vendorBankAccountsTable)
    .where(eq(vendorBankAccountsTable.vendorId, req.session!.id));
  if (!account) {
    res.json(null);
    return;
  }
  res.json({
    bankCode: account.bankCode,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    accountName: account.accountName,
    updatedAt: account.updatedAt,
  });
});

// POST /vendor/bank-account — resolves the account number with Paystack,
// registers it as a transfer recipient, and saves/replaces the vendor's
// single payout account. Must succeed before a withdrawal can be requested.
router.post("/vendor/bank-account", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const { bankCode, bankName, accountNumber } = req.body ?? {};
  if (!bankCode || !bankName || !accountNumber) {
    res.status(400).json({ error: "bankCode, bankName and accountNumber are required" });
    return;
  }

  let resolved;
  try {
    resolved = await resolveAccountNumber(String(accountNumber), String(bankCode));
  } catch (err) {
    res.status(400).json({ error: err instanceof PaystackError ? err.message : "Could not verify this account number" });
    return;
  }

  let recipientCode: string;
  try {
    recipientCode = await createTransferRecipient({
      accountName: resolved.accountName,
      accountNumber: resolved.accountNumber,
      bankCode: String(bankCode),
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof PaystackError ? err.message : "Failed to register payout account with Paystack" });
    return;
  }

  const [existing] = await db
    .select()
    .from(vendorBankAccountsTable)
    .where(eq(vendorBankAccountsTable.vendorId, vendorId));

  const values = {
    vendorId,
    bankCode: String(bankCode),
    bankName: String(bankName),
    accountNumber: resolved.accountNumber,
    accountName: resolved.accountName,
    recipientCode,
    updatedAt: new Date(),
  };

  const [account] = existing
    ? await db.update(vendorBankAccountsTable).set(values).where(eq(vendorBankAccountsTable.vendorId, vendorId)).returning()
    : await db.insert(vendorBankAccountsTable).values(values).returning();

  res.status(existing ? 200 : 201).json({
    bankCode: account.bankCode,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    accountName: account.accountName,
    updatedAt: account.updatedAt,
  });
});

// POST /vendor/wallet/withdraw — initiates a real Paystack transfer to the
// vendor's verified bank account. The withdrawal row is inserted "pending"
// before the transfer call so the funds are reserved immediately (no
// double-withdraw race), then flipped to "success"/"failed" based on
// Paystack's response and, definitively, the transfer webhook.
router.post("/vendor/wallet/withdraw", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const amountNaira = Number(req.body?.amountNaira);
  if (!amountNaira || amountNaira <= 0) {
    res.status(400).json({ error: "Invalid withdrawal amount" });
    return;
  }

  const [bankAccount] = await db
    .select()
    .from(vendorBankAccountsTable)
    .where(eq(vendorBankAccountsTable.vendorId, vendorId));
  if (!bankAccount) {
    res.status(400).json({ error: "Add and verify a payout bank account before withdrawing" });
    return;
  }

  const summary = await getVendorWalletSummary(vendorId);
  if (amountNaira > summary.withdrawableNaira) {
    res.status(400).json({ error: "Amount exceeds withdrawable balance" });
    return;
  }

  const reference = `chopplan_wd_${crypto.randomUUID()}`;
  const [withdrawal] = await db
    .insert(vendorWithdrawalsTable)
    .values({
      vendorId,
      amountNaira,
      reference,
      status: "pending",
      bankName: bankAccount.bankName,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
    })
    .returning();

  try {
    const transfer = await initiateTransfer({
      amountNaira,
      recipientCode: bankAccount.recipientCode,
      reference,
      reason: "Chop Plan vendor withdrawal",
    });

    if (transfer.status === "success") {
      await db.update(vendorWithdrawalsTable)
        .set({ status: "success", transferCode: transfer.transferCode, updatedAt: new Date() })
        .where(eq(vendorWithdrawalsTable.id, withdrawal.id));
    } else if (transfer.status === "failed") {
      await db.update(vendorWithdrawalsTable)
        .set({ status: "failed", transferCode: transfer.transferCode, failureReason: "Transfer failed at Paystack", updatedAt: new Date() })
        .where(eq(vendorWithdrawalsTable.id, withdrawal.id));
    } else if (transfer.status === "otp") {
      // OTP finalization can't be automated server-side; treat as failed so
      // the balance is restored rather than left in limbo.
      await db.update(vendorWithdrawalsTable)
        .set({ status: "failed", transferCode: transfer.transferCode, failureReason: "This Paystack account requires OTP finalization for transfers. Disable OTP finalization in your Paystack dashboard settings to enable withdrawals.", updatedAt: new Date() })
        .where(eq(vendorWithdrawalsTable.id, withdrawal.id));
    } else {
      await db.update(vendorWithdrawalsTable)
        .set({ transferCode: transfer.transferCode, updatedAt: new Date() })
        .where(eq(vendorWithdrawalsTable.id, withdrawal.id));
    }
  } catch (err) {
    logger.error({ err, withdrawalId: withdrawal.id }, "Failed to initiate Paystack transfer");
    await db.update(vendorWithdrawalsTable)
      .set({ status: "failed", failureReason: err instanceof PaystackError ? err.message : "Failed to initiate transfer", updatedAt: new Date() })
      .where(eq(vendorWithdrawalsTable.id, withdrawal.id));
  }

  res.json(await getVendorWalletSummary(vendorId));
});

export default router;
