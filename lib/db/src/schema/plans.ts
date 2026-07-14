import { pgTable, serial, integer, unique, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";
import { mealsTable } from "./meals";

// Fixed two-tier model: every vendor may offer at most one Basic plan and
// one Premium plan (never more, never a free-form list of tiers).
export const planTierEnum = pgEnum("plan_tier", ["basic", "premium"]);

export const subscriptionPlansTable = pgTable(
  "subscription_plans",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "cascade" }),
    tier: planTierEnum("tier").notNull(),
    // Basic-only: the single fixed meal served every scheduled day.
    basicMealId: integer("basic_meal_id").references(() => mealsTable.id, { onDelete: "set null" }),
    daysPerMonth: integer("days_per_month").notNull(),
    freeDays: integer("free_days").notNull().default(0),
    priceNaira: integer("price_naira").notNull(),
  },
  (table) => ({
    vendorTierUnique: unique().on(table.vendorId, table.tier),
  })
);

export const insertPlanSchema = createInsertSchema(subscriptionPlansTable).omit({ id: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type PlanTier = "basic" | "premium";
