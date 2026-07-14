import { Router } from "express";
import { db } from "@workspace/db";
import {
  vendorsTable,
  subscriptionPlansTable,
  planTimetableTable,
  mealsTable,
  subscriptionsTable,
} from "@workspace/db";
import { eq, ilike, and, sql, inArray, asc } from "drizzle-orm";
import { toCustomerDisplayPriceNaira, computeOffSchedulePricing } from "../lib/pricing";

const router = Router();

// GET /vendors/areas — must come before /vendors/:id
router.get("/vendors/areas", async (_req, res) => {
  const rows = await db
    .selectDistinct({ area: vendorsTable.area })
    .from(vendorsTable)
    .orderBy(vendorsTable.area);
  res.json(rows.map((r) => r.area));
});

// GET /vendors
router.get("/vendors", async (req, res) => {
  const { area, search } = req.query as { area?: string; search?: string };
  const conditions = [];
  if (area) conditions.push(eq(vendorsTable.area, area));
  if (search) conditions.push(ilike(vendorsTable.businessName, `%${search}%`));

  const vendors = await db
    .select()
    .from(vendorsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const result = await Promise.all(
    vendors.map(async (v) => {
      const [lowestPlan] = await db
        .select({ price: subscriptionPlansTable.priceNaira })
        .from(subscriptionPlansTable)
        .where(eq(subscriptionPlansTable.vendorId, v.id))
        .orderBy(subscriptionPlansTable.priceNaira)
        .limit(1);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptionsTable)
        .where(and(eq(subscriptionsTable.vendorId, v.id), eq(subscriptionsTable.status, "active")));
      return {
        id: v.id,
        businessName: v.businessName,
        area: v.area,
        cuisineType: v.cuisineType,
        coverImage: v.coverImage ?? "",
        rating: v.rating,
        subscriberCount: count,
        lowestPlanPrice: lowestPlan ? toCustomerDisplayPriceNaira(lowestPlan.price) : 0,
        description: v.description ?? null,
      };
    })
  );
  res.json(result);
});

// Shared helper: builds the public { basic, premium } plan payload for a
// vendor, with full meal detail so a customer can preview the whole Premium
// timetable (or the single Basic meal) before subscribing — no auth needed.
async function buildPublicPlans(vendorId: number, mealsById: Map<number, typeof mealsTable.$inferSelect>) {
  const plans = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.vendorId, vendorId));
  const basicRow = plans.find((p) => p.tier === "basic");
  const premiumRow = plans.find((p) => p.tier === "premium");

  const toMealSummary = (mealId: number) => {
    const m = mealsById.get(mealId);
    return m ? { id: m.id, name: m.name, description: m.description, imageUrl: m.imageUrl, category: m.category ?? null } : null;
  };

  const basic = basicRow && basicRow.basicMealId
    ? {
        id: basicRow.id,
        priceNaira: toCustomerDisplayPriceNaira(basicRow.priceNaira),
        daysPerMonth: basicRow.daysPerMonth,
        freeDays: basicRow.freeDays,
        meal: toMealSummary(basicRow.basicMealId),
      }
    : null;

  let premium = null;
  if (premiumRow) {
    const timetable = await db
      .select()
      .from(planTimetableTable)
      .where(eq(planTimetableTable.planId, premiumRow.id))
      .orderBy(asc(planTimetableTable.dayOfWeek));
    const freeDayRows = timetable.filter((t) => t.isFreeDay);
    // A Premium plan is only ever valid with exactly 4 rotation days + 1 free
    // day. Never surface a partial/incomplete timetable to customers or the
    // vendor dashboard — treat it as if Premium isn't set up rather than
    // shipping a shape (e.g. missing freeDay) that callers assume is always
    // present.
    if (timetable.length === 5 && freeDayRows.length === 1) {
      premium = {
        id: premiumRow.id,
        priceNaira: toCustomerDisplayPriceNaira(premiumRow.priceNaira),
        daysPerMonth: premiumRow.daysPerMonth,
        freeDays: premiumRow.freeDays,
        rotation: timetable
          .filter((t) => !t.isFreeDay)
          .map((t) => ({ dayOfWeek: t.dayOfWeek, meal: toMealSummary(t.mealId) })),
        freeDay: { dayOfWeek: freeDayRows[0].dayOfWeek, meal: toMealSummary(freeDayRows[0].mealId) },
      };
    }
  }

  return { basic, premium };
}

// GET /vendors/:vendorId
router.get("/vendors/:vendorId", async (req, res) => {
  const vendorId = Number(req.params.vendorId);
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  const meals = await db
    .select()
    .from(mealsTable)
    .where(eq(mealsTable.vendorId, vendorId));
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.vendorId, vendorId), eq(subscriptionsTable.status, "active")));

  const mealsById = new Map(meals.map((m) => [m.id, m]));
  const plans = await buildPublicPlans(vendorId, mealsById);

  res.json({
    id: vendor.id,
    businessName: vendor.businessName,
    area: vendor.area,
    cuisineType: vendor.cuisineType,
    coverImage: vendor.coverImage ?? "",
    rating: vendor.rating,
    subscriberCount: count,
    description: vendor.description ?? "",
    plans,
    meals: meals.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      priceNaira: toCustomerDisplayPriceNaira(m.priceNaira),
      offSchedulePriceNaira: computeOffSchedulePricing(m.priceNaira, vendor.offScheduleMarkupPercent).totalPriceNaira,
      imageUrl: m.imageUrl,
      available: m.available,
      category: m.category ?? null,
    })),
  });
});

// GET /vendors/:vendorId/meals
router.get("/vendors/:vendorId/meals", async (req, res) => {
  const vendorId = Number(req.params.vendorId);
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  const meals = await db
    .select()
    .from(mealsTable)
    .where(eq(mealsTable.vendorId, vendorId));
  res.json(
    meals.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      priceNaira: toCustomerDisplayPriceNaira(m.priceNaira),
      offSchedulePriceNaira: computeOffSchedulePricing(m.priceNaira, vendor?.offScheduleMarkupPercent ?? null).totalPriceNaira,
      imageUrl: m.imageUrl,
      available: m.available,
      category: m.category ?? null,
    }))
  );
});

// GET /vendors/:vendorId/plans
router.get("/vendors/:vendorId/plans", async (req, res) => {
  const vendorId = Number(req.params.vendorId);
  const meals = await db.select().from(mealsTable).where(eq(mealsTable.vendorId, vendorId));
  const mealsById = new Map(meals.map((m) => [m.id, m]));
  res.json(await buildPublicPlans(vendorId, mealsById));
});

export default router;
