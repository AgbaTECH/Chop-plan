import { pgTable, serial, integer, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { vendorsTable } from "./vendors";
import { subscriptionPlansTable } from "./plans";
import { subscriptionsTable } from "./subscriptions";

// One row per Paystack checkout attempt. A payment starts "pending", and is
// only ever flipped to "success" (with subscriptionId populated) once
// Paystack itself confirms the charge — either via webhook or via a
// server-side verify call against Paystack's API. Never trust a client-
// supplied status here.
export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull().references(() => subscriptionPlansTable.id, { onDelete: "cascade" }),
  subscriptionId: integer("subscription_id").references(() => subscriptionsTable.id, { onDelete: "set null" }),
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
