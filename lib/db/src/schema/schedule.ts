import { pgTable, serial, integer, date, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subscriptionsTable } from "./subscriptions";

export const subscriptionDaysTable = pgTable("subscription_days", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptionsTable.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  status: text("status").notNull().default("pending"),
  confirmedAt: timestamp("confirmed_at"),
});

export const insertSubscriptionDaySchema = createInsertSchema(subscriptionDaysTable).omit({ id: true });
export type InsertSubscriptionDay = z.infer<typeof insertSubscriptionDaySchema>;
export type SubscriptionDay = typeof subscriptionDaysTable.$inferSelect;
