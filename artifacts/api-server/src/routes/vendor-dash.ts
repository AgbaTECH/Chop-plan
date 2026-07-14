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
  vendorBankAccountsTable,
  planMealsTable,
} from "@workspace/db";
import { eq, and, sql, asc, desc, inArray } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth-middleware";
import { perDayShareNaira } from "../lib/schedule";
import { listBanks, resolveAccountNumber, createTransferRecipient, initiateTransfer, PaystackError } from "../lib/paystack";
import { logger } from "../lib/logger";
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

// GET /vendor/plans
router.get("/vendor/plans", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const plans = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.vendorId, vendorId));
  if (plans.length === 0) {
    res.json([]);
    return;
  }
  const planIds = plans.map((p) => p.id);
  const links = await db
    .select({ planId: planMealsTable.planId, mealId: planMealsTable.mealId })
    .from(planMealsTable)
    .where(inArray(planMealsTable.planId, planIds));
  const mealIdsByPlan = new Map<number, number[]>();
  for (const link of links) {
    const list = mealIdsByPlan.get(link.planId) ?? [];
    list.push(link.mealId);
    mealIdsByPlan.set(link.planId, list);
  }
  res.json(plans.map((p) => ({
    id: p.id,
    name: p.name,
    daysPerMonth: p.daysPerMonth,
    freeDays: p.freeDays,
    priceNaira: p.priceNaira,
    includesDelivery: p.includesDelivery,
    mealIds: mealIdsByPlan.get(p.id) ?? [],
  })));
});

// PUT /vendor/plans/:planId/meals
router.put("/vendor/plans/:planId/meals", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const planId = Number(req.params.planId);
  const mealIdsInput = req.body?.mealIds;
  if (!Array.isArray(mealIdsInput) || !mealIdsInput.every((id) => typeof id === "number")) {
    res.status(400).json({ error: "mealIds must be an array of numbers" });
    return;
  }
  const mealIds = [...new Set(mealIdsInput)];

  const [plan] = await db
    .select()
    .from(subscriptionPlansTable)
    .where(and(eq(subscriptionPlansTable.id, planId), eq(subscriptionPlansTable.vendorId, vendorId)));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  if (mealIds.length > 0) {
    const ownedMeals = await db
      .select({ id: mealsTable.id })
      .from(mealsTable)
      .where(and(inArray(mealsTable.id, mealIds), eq(mealsTable.vendorId, vendorId)));
    if (ownedMeals.length !== mealIds.length) {
      res.status(400).json({ error: "One or more meals do not belong to this vendor" });
      return;
    }
  }

  await db.delete(planMealsTable).where(eq(planMealsTable.planId, planId));
  if (mealIds.length > 0) {
    await db.insert(planMealsTable).values(mealIds.map((mealId) => ({ planId, mealId })));
  }

  res.json({ planId, mealIds });
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
