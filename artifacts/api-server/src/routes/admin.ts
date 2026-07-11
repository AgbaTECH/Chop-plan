import { Router } from "express";
import { db } from "@workspace/db";
import {
  vendorsTable,
  usersTable,
  subscriptionsTable,
  subscriptionPlansTable,
  leadsTable,
} from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth-middleware";
import { hashPassword } from "../lib/sessions";
import { CreateAdminVendorBody, CreateAdminCustomerBody } from "@workspace/api-zod";

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
      passwordHash: hashPassword(password),
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
    .values({ name, email, passwordHash: hashPassword(password), phone, area })
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

export default router;
