import { pgTable, serial, integer, text, varchar, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { vendorsTable } from "./vendors";
import { subscriptionPlansTable } from "./plans";
import { subscriptionsTable } from "./subscriptions";
import { mealsTable } from "./meals";

// One row per Paystack checkout attempt. A payment starts "pending", and is
// only ever flipped to "success" once Paystack itself confirms the charge —
// either via webhook or via a server-side verify call against Paystack's
// API. Never trust a client-supplied status here.
//
// orderType distinguishes two independent purchase flows that share this
// same checkout/activation machinery:
//   - "subscription": planId is set: on success a subscription + pickup
//     schedule is generated (see activatePaymentSuccess).
//   - "alacarte": mealId + orderDate are set instead: a one-off, off-schedule
//     purchase with no subscription or generated schedule. vendorPriceNaira
//     (the vendor's raw payout, matching normal redemption payout math) and
//     offScheduleMarkupNaira (ChopPlan's cut, tracked separately from the
//     flat 5% subscription markup so it can be reported independently) are
//     persisted at checkout time so revenue attribution never has to be
//     recomputed after the fact. pickupStatus mirrors subscription_days'
//     pending/confirmed lifecycle, confirmed by the customer on pickup.
export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "cascade" }),
  orderType: text("order_type").notNull().default("subscription"), // subscription | alacarte
  planId: integer("plan_id").references(() => subscriptionPlansTable.id, { onDelete: "cascade" }),
  subscriptionId: integer("subscription_id").references(() => subscriptionsTable.id, { onDelete: "set null" }),
  mealId: integer("meal_id").references(() => mealsTable.id, { onDelete: "restrict" }),
  orderDate: date("order_date"),
  vendorPriceNaira: integer("vendor_price_naira"),
  offScheduleMarkupNaira: integer("off_schedule_markup_naira"),
  pickupStatus: text("pickup_status"), // pending | confirmed (alacarte only)
  pickupConfirmedAt: timestamp("pickup_confirmed_at"),
  reference: varchar("reference", { length: 100 }).notNull().unique(),
  amountNaira: integer("amount_naira").notNull(),
  status: text("status").notNull().default("pending"), // pending | success | failed
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
