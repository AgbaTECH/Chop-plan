import { Router } from "express";
import { db } from "@workspace/db";
import {
  vendorsTable,
  subscriptionPlansTable,
  mealsTable,
  subscriptionsTable,
  planMealsTable,
} from "@workspace/db";
import { eq, ilike, and, sql, inArray } from "drizzle-orm";
import { toCustomerDisplayPriceNaira } from "../lib/pricing";

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

// GET /vendors/:vendorId
router.get("/vendors/:vendorId", async (req, res) => {
  const vendorId = Number(req.params.vendorId);
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  const plans = await db
    .select()
    .from(subscriptionPlansTable)
    .where(eq(subscriptionPlansTable.vendorId, vendorId));
  const meals = await db
    .select()
    .from(mealsTable)
    .where(eq(mealsTable.vendorId, vendorId));
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.vendorId, vendorId), eq(subscriptionsTable.status, "active")));

  const mealsById = new Map(meals.map((m) => [m.id, m]));
  const planIds = plans.map((p) => p.id);
  const links = planIds.length > 0
    ? await db
        .select({ planId: planMealsTable.planId, mealId: planMealsTable.mealId })
        .from(planMealsTable)
        .where(inArray(planMealsTable.planId, planIds))
    : [];
  const mealIdsByPlan = new Map<number, number[]>();
  for (const link of links) {
    const list = mealIdsByPlan.get(link.planId) ?? [];
    list.push(link.mealId);
    mealIdsByPlan.set(link.planId, list);
  }

  res.json({
    id: vendor.id,
    businessName: vendor.businessName,
    area: vendor.area,
    cuisineType: vendor.cuisineType,
    coverImage: vendor.coverImage ?? "",
    rating: vendor.rating,
    subscriberCount: count,
    description: vendor.description ?? "",
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      daysPerMonth: p.daysPerMonth,
      freeDays: p.freeDays,
      priceNaira: toCustomerDisplayPriceNaira(p.priceNaira),
      includesDelivery: p.includesDelivery,
      menuItems: (mealIdsByPlan.get(p.id) ?? [])
        .map((mealId) => mealsById.get(mealId))
        .filter((m): m is typeof meals[number] => Boolean(m))
        .map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          imageUrl: m.imageUrl,
          category: m.category ?? null,
        })),
    })),
    meals: meals.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      priceNaira: toCustomerDisplayPriceNaira(m.priceNaira),
      imageUrl: m.imageUrl,
      available: m.available,
      category: m.category ?? null,
    })),
  });
});

// GET /vendors/:vendorId/meals
router.get("/vendors/:vendorId/meals", async (req, res) => {
  const vendorId = Number(req.params.vendorId);
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
      imageUrl: m.imageUrl,
      available: m.available,
      category: m.category ?? null,
    }))
  );
});

// GET /vendors/:vendorId/plans
router.get("/vendors/:vendorId/plans", async (req, res) => {
  const vendorId = Number(req.params.vendorId);
  const plans = await db
    .select()
    .from(subscriptionPlansTable)
    .where(eq(subscriptionPlansTable.vendorId, vendorId));
  res.json(
    plans.map((p) => ({
      id: p.id,
      name: p.name,
      daysPerMonth: p.daysPerMonth,
      freeDays: p.freeDays,
      priceNaira: toCustomerDisplayPriceNaira(p.priceNaira),
      includesDelivery: p.includesDelivery,
    }))
  );
});

export default router;
