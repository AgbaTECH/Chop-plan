import { Router } from "express";
import { db } from "@workspace/db";
import {
  vendorsTable,
  usersTable,
  subscriptionsTable,
  subscriptionPlansTable,
  leadsTable,
  paymentsTable,
  mealsTable,
  planTimetableTable,
  vendorBankAccountsTable,
  vendorWithdrawalsTable,
  orderNotificationsTable,
  subscriptionDaysTable,
} from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth-middleware";
import { hashPassword } from "../lib/sessions";
import { CreateAdminVendorBody, CreateAdminCustomerBody } from "@workspace/api-zod";
import { PLATFORM_FEE_RATE } from "../lib/pricing";

const router = Router();

// GET /admin/stats
router.get("/admin/stats", requireAuth("admin"), async (_req, res) => {
  const [{ vendorCount }] = await db.select({ vendorCount: sql<number>`count(*)::int` }).from(vendorsTable);
  const [{ customerCount }] = await db.select({ customerCount: sql<number>`count(*)::int` }).from(usersTable);

  const activeSubs = await db
    .select({ planId: subscriptionsTable.planId })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.status, "active"));

  const plans = await db.select().from(subscriptionPlansTable);
  const planMap = new Map(plans.map((p) => [p.id, p]));

  let totalMonthlyRevenueNaira = 0;
  for (const s of activeSubs) {
    const plan = planMap.get(s.planId);
    if (plan) totalMonthlyRevenueNaira += plan.priceNaira;
  }

  res.json({
    vendorCount,
    customerCount,
    activeSubscriptions: activeSubs.length,
    totalMonthlyRevenueNaira,
  });
});

// GET /admin/vendors
router.get("/admin/vendors", requireAuth("admin"), async (_req, res) => {
  const vendors = await db.select().from(vendorsTable);
  const result = await Promise.all(
    vendors.map(async (v) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptionsTable)
        .where(and(eq(subscriptionsTable.vendorId, v.id), eq(subscriptionsTable.status, "active")));
      return {
        id: v.id,
        businessName: v.businessName,
        ownerName: v.ownerName,
        email: v.email,
        phone: v.phone,
        area: v.area,
        cuisineType: v.cuisineType,
        subscriberCount: count,
      };
    })
  );
  res.json(result);
});

// POST /admin/vendors
router.post("/admin/vendors", requireAuth("admin"), async (req, res) => {
  const parsed = CreateAdminVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const { businessName, ownerName, email, password, phone, area, cuisineType, description } = parsed.data;
  const existing = await db.select().from(vendorsTable).where(eq(vendorsTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const [vendor] = await db
    .insert(vendorsTable)
    .values({
      businessName,
      ownerName,
      email,
      passwordHash: await hashPassword(password),
      phone,
      area,
      cuisineType,
      description: description ?? null,
      coverImage: null,
      rating: 4.5,
    })
    .returning();

  res.status(201).json({
    id: vendor.id,
    businessName: vendor.businessName,
    ownerName: vendor.ownerName,
    email: vendor.email,
    phone: vendor.phone,
    area: vendor.area,
    cuisineType: vendor.cuisineType,
    subscriberCount: 0,
  });
});

// DELETE /admin/vendors/:vendorId
router.delete("/admin/vendors/:vendorId", requireAuth("admin"), async (req, res) => {
  const vendorId = Number(req.params.vendorId);
  await db.delete(vendorsTable).where(eq(vendorsTable.id, vendorId));
  res.json({ success: true, message: "Vendor deleted" });
});

// GET /admin/customers
router.get("/admin/customers", requireAuth("admin"), async (_req, res) => {
  const users = await db.select().from(usersTable);
  const result = await Promise.all(
    users.map(async (u) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptionsTable)
        .where(and(eq(subscriptionsTable.userId, u.id), eq(subscriptionsTable.status, "active")));
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        area: u.area,
        activeSubscriptionCount: count,
      };
    })
  );
  res.json(result);
});

// POST /admin/customers
router.post("/admin/customers", requireAuth("admin"), async (req, res) => {
  const parsed = CreateAdminCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const { name, email, password, phone, area } = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash: await hashPassword(password), phone, area })
    .returning();

  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    area: user.area,
    activeSubscriptionCount: 0,
  });
});

// DELETE /admin/customers/:userId
router.delete("/admin/customers/:userId", requireAuth("admin"), async (req, res) => {
  const userId = Number(req.params.userId);
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.json({ success: true, message: "Customer deleted" });
});

// GET /admin/revenue/off-schedule
// Off-schedule (à la carte) markup revenue, tracked entirely separately from
// the flat 5% subscription markup (which is never persisted — it's only
// ever computed on the fly for display) so it can be reported independently.
router.get("/admin/revenue/off-schedule", requireAuth("admin"), async (_req, res) => {
  const orders = await db
    .select({ offScheduleMarkupNaira: paymentsTable.offScheduleMarkupNaira })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.orderType, "alacarte"), eq(paymentsTable.status, "success")));

  const totalOffScheduleMarkupNaira = orders.reduce((sum, o) => sum + (o.offScheduleMarkupNaira ?? 0), 0);

  res.json({
    orderCount: orders.length,
    totalOffScheduleMarkupNaira,
  });
});

// GET /admin/leads
router.get("/admin/leads", requireAuth("admin"), async (_req, res) => {
  const leads = await db.select().from(leadsTable).orderBy(desc(leadsTable.createdAt));
  res.json(
    leads.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email,
      createdAt: l.createdAt.toISOString(),
    }))
  );
});

// GET /admin/vendors/:vendorId/detail
// Full vendor picture for the admin: kitchen profile, both plan tiers (with
// the Premium timetable resolved to meal names), bank account status, and
// subscriber count. View-only — no vendor menu/timetable editing here.
router.get("/admin/vendors/:vendorId/detail", requireAuth("admin"), async (req, res) => {
  const vendorId = Number(req.params.vendorId);
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId)).limit(1);
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  const [{ subscriberCount }] = await db
    .select({ subscriberCount: sql<number>`count(*)::int` })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.vendorId, vendorId), eq(subscriptionsTable.status, "active")));

  const plans = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.vendorId, vendorId));
  const meals = await db.select().from(mealsTable).where(eq(mealsTable.vendorId, vendorId));
  const mealMap = new Map(meals.map((m) => [m.id, m.name]));

  const plansWithDetail = await Promise.all(
    plans.map(async (plan) => {
      if (plan.tier === "basic") {
        return {
          id: plan.id,
          tier: plan.tier,
          priceNaira: plan.priceNaira,
          daysPerMonth: plan.daysPerMonth,
          freeDays: plan.freeDays,
          mealCount: plan.basicMealId ? 1 : 0,
          basicMealName: plan.basicMealId ? mealMap.get(plan.basicMealId) ?? null : null,
          timetable: [],
        };
      }
      const timetableRows = await db
        .select()
        .from(planTimetableTable)
        .where(eq(planTimetableTable.planId, plan.id));
      const timetable = timetableRows
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
        .map((t) => ({
          dayOfWeek: t.dayOfWeek,
          mealName: mealMap.get(t.mealId) ?? "Unknown meal",
          isFreeDay: t.isFreeDay,
        }));
      const distinctMealIds = new Set(timetableRows.map((t) => t.mealId));
      return {
        id: plan.id,
        tier: plan.tier,
        priceNaira: plan.priceNaira,
        daysPerMonth: plan.daysPerMonth,
        freeDays: plan.freeDays,
        mealCount: distinctMealIds.size,
        basicMealName: null,
        timetable,
      };
    })
  );

  const [bankAccount] = await db
    .select()
    .from(vendorBankAccountsTable)
    .where(eq(vendorBankAccountsTable.vendorId, vendorId))
    .limit(1);

  res.json({
    id: vendor.id,
    businessName: vendor.businessName,
    ownerName: vendor.ownerName,
    email: vendor.email,
    phone: vendor.phone,
    area: vendor.area,
    cuisineType: vendor.cuisineType,
    description: vendor.description,
    coverImage: vendor.coverImage,
    kitchenPhotos: vendor.kitchenPhotos,
    verified: vendor.verified,
    rating: vendor.rating,
    offScheduleMarkupPercent: vendor.offScheduleMarkupPercent,
    subscriberCount,
    plans: plansWithDetail,
    bankAccount: bankAccount
      ? {
          bankCode: bankAccount.bankCode,
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
          accountName: bankAccount.accountName,
          updatedAt: bankAccount.updatedAt.toISOString(),
        }
      : null,
  });
});

// GET /admin/transactions
// Subscription payments and off-schedule purchases in one feed, each tagged
// with the vendor's payout and ChopPlan's markup. Subscription markup is
// never persisted (see paymentsTable comment), so it's derived here from the
// flat PLATFORM_FEE_RATE; off-schedule markup is read straight off the row
// since it was computed and stored at checkout time.
router.get("/admin/transactions", requireAuth("admin"), async (_req, res) => {
  const rows = await db
    .select({
      id: paymentsTable.id,
      orderType: paymentsTable.orderType,
      amountNaira: paymentsTable.amountNaira,
      offScheduleMarkupNaira: paymentsTable.offScheduleMarkupNaira,
      vendorPriceNaira: paymentsTable.vendorPriceNaira,
      status: paymentsTable.status,
      reference: paymentsTable.reference,
      createdAt: paymentsTable.createdAt,
      vendorName: vendorsTable.businessName,
      customerName: usersTable.name,
    })
    .from(paymentsTable)
    .innerJoin(vendorsTable, eq(paymentsTable.vendorId, vendorsTable.id))
    .innerJoin(usersTable, eq(paymentsTable.userId, usersTable.id))
    .orderBy(desc(paymentsTable.createdAt));

  res.json(
    rows.map((r) => {
      let vendorPayoutNaira: number;
      let markupNaira: number;
      if (r.orderType === "alacarte") {
        markupNaira = r.offScheduleMarkupNaira ?? 0;
        vendorPayoutNaira = r.vendorPriceNaira ?? r.amountNaira - markupNaira;
      } else {
        vendorPayoutNaira = Math.round(r.amountNaira / (1 + PLATFORM_FEE_RATE));
        markupNaira = r.amountNaira - vendorPayoutNaira;
      }
      return {
        id: r.id,
        orderType: r.orderType,
        vendorName: r.vendorName,
        customerName: r.customerName,
        amountNaira: r.amountNaira,
        vendorPayoutNaira,
        markupNaira,
        status: r.status,
        reference: r.reference,
        createdAt: r.createdAt.toISOString(),
      };
    })
  );
});

// GET /admin/withdrawals
// Every vendor withdrawal with its current status. There is no
// reconciliation job yet (tracked separately as task #14) so nothing here
// is flagged — this view will surface reconciliation flags once that lands.
router.get("/admin/withdrawals", requireAuth("admin"), async (_req, res) => {
  const rows = await db
    .select({
      id: vendorWithdrawalsTable.id,
      amountNaira: vendorWithdrawalsTable.amountNaira,
      status: vendorWithdrawalsTable.status,
      bankName: vendorWithdrawalsTable.bankName,
      accountNumber: vendorWithdrawalsTable.accountNumber,
      accountName: vendorWithdrawalsTable.accountName,
      failureReason: vendorWithdrawalsTable.failureReason,
      createdAt: vendorWithdrawalsTable.createdAt,
      vendorName: vendorsTable.businessName,
    })
    .from(vendorWithdrawalsTable)
    .innerJoin(vendorsTable, eq(vendorWithdrawalsTable.vendorId, vendorsTable.id))
    .orderBy(desc(vendorWithdrawalsTable.createdAt));

  res.json(
    rows.map((r) => ({
      id: r.id,
      vendorName: r.vendorName,
      amountNaira: r.amountNaira,
      status: r.status,
      bankName: r.bankName,
      accountNumber: r.accountNumber,
      accountName: r.accountName,
      failureReason: r.failureReason,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

// GET /admin/notifications
// Read-only log of every vendor-to-customer pickup notification sent.
router.get("/admin/notifications", requireAuth("admin"), async (_req, res) => {
  const rows = await db
    .select({
      id: orderNotificationsTable.id,
      orderType: orderNotificationsTable.orderType,
      presetType: orderNotificationsTable.presetType,
      message: orderNotificationsTable.message,
      createdAt: orderNotificationsTable.createdAt,
      vendorName: vendorsTable.businessName,
      customerName: usersTable.name,
    })
    .from(orderNotificationsTable)
    .innerJoin(vendorsTable, eq(orderNotificationsTable.vendorId, vendorsTable.id))
    .innerJoin(usersTable, eq(orderNotificationsTable.userId, usersTable.id))
    .orderBy(desc(orderNotificationsTable.createdAt))
    .limit(200);

  res.json(
    rows.map((r) => ({
      id: r.id,
      vendorName: r.vendorName,
      customerName: r.customerName,
      orderType: r.orderType,
      presetType: r.presetType,
      message: r.message,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

// GET /admin/order-archive
// Returns order history (alacarte payments + subscription days) from BEFORE the
// current ISO week — records that are hidden from customer/vendor views by the
// weekly filter (#2). Admin-only, no date filter applied.
router.get("/admin/order-archive", requireAuth("admin"), async (_req, res) => {
  const alacarteOrders = await db
    .select({
      id: paymentsTable.id,
      orderType: paymentsTable.orderType,
      amountNaira: paymentsTable.amountNaira,
      status: paymentsTable.status,
      createdAt: paymentsTable.createdAt,
      vendorName: vendorsTable.businessName,
      customerName: usersTable.name,
    })
    .from(paymentsTable)
    .innerJoin(vendorsTable, eq(paymentsTable.vendorId, vendorsTable.id))
    .innerJoin(usersTable, eq(paymentsTable.userId, usersTable.id))
    .where(and(
      eq(paymentsTable.orderType, "alacarte"),
      sql`${paymentsTable.createdAt} < date_trunc('week', NOW())`
    ))
    .orderBy(desc(paymentsTable.createdAt))
    .limit(500);

  const subscriptionDays = await db
    .select({
      id: subscriptionDaysTable.id,
      scheduledDate: subscriptionDaysTable.scheduledDate,
      status: subscriptionDaysTable.status,
      confirmedAt: subscriptionDaysTable.confirmedAt,
      customerName: usersTable.name,
      vendorName: vendorsTable.businessName,
    })
    .from(subscriptionDaysTable)
    .innerJoin(subscriptionsTable, eq(subscriptionDaysTable.subscriptionId, subscriptionsTable.id))
    .innerJoin(usersTable, eq(subscriptionsTable.userId, usersTable.id))
    .innerJoin(vendorsTable, eq(subscriptionsTable.vendorId, vendorsTable.id))
    .where(sql`${subscriptionDaysTable.scheduledDate} < date_trunc('week', NOW())::date`)
    .orderBy(desc(subscriptionDaysTable.scheduledDate))
    .limit(500);

  res.json({
    alacarteOrders: alacarteOrders.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    subscriptionDays: subscriptionDays.map((r) => ({
      ...r,
      confirmedAt: r.confirmedAt?.toISOString() ?? null,
    })),
  });
});

// POST /admin/maintenance/fix-image-paths
// One-time data fix: seeded image URLs were written with the old
// "/chop-plan/images" prefix from when this app was routed under
// /chop-plan. The app now serves at the domain root, so those rows need to
// point at "/images" instead. Safe to call repeatedly — it only touches
// rows still carrying the old prefix and is a no-op once none remain.
router.post("/admin/maintenance/fix-image-paths", requireAuth("admin"), async (_req, res) => {
  const vendorCovers = await db.execute(
    sql`UPDATE vendors SET cover_image = regexp_replace(cover_image, '^/chop-plan/images', '/images') WHERE cover_image LIKE '/chop-plan/images%'`
  );
  const meals = await db.execute(
    sql`UPDATE meals SET image_url = regexp_replace(image_url, '^/chop-plan/images', '/images') WHERE image_url LIKE '/chop-plan/images%'`
  );
  const blogPosts = await db.execute(
    sql`UPDATE blog_posts SET cover_image = regexp_replace(cover_image, '^/chop-plan/images', '/images') WHERE cover_image LIKE '/chop-plan/images%'`
  );
  const kitchenPhotos = await db.execute(sql`
    UPDATE vendors
    SET kitchen_photos = (
      SELECT array_agg(regexp_replace(photo, '^/chop-plan/images', '/images'))
      FROM unnest(kitchen_photos) AS photo
    )
    WHERE EXISTS (SELECT 1 FROM unnest(kitchen_photos) AS p WHERE p LIKE '/chop-plan/images%')
  `);

  res.json({
    success: true,
    message: `Fixed ${vendorCovers.rowCount ?? 0} vendor covers, ${meals.rowCount ?? 0} meal images, ${blogPosts.rowCount ?? 0} blog covers, ${kitchenPhotos.rowCount ?? 0} vendors' kitchen photo sets.`,
  });
});

export default router;
