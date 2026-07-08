import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  daysPerMonth: integer("days_per_month").notNull(),
  freeDays: integer("free_days").notNull().default(0),
  priceNaira: integer("price_naira").notNull(),
  includesDelivery: boolean("includes_delivery").notNull().default(false),
});

export const insertPlanSchema = createInsertSchema(subscriptionPlansTable).omit({ id: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
