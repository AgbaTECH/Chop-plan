import { pgTable, serial, integer, date, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subscriptionsTable } from "./subscriptions";
import { mealsTable } from "./meals";

export const subscriptionDaysTable = pgTable("subscription_days", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptionsTable.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  status: text("status").notNull().default("pending"),
  confirmedAt: timestamp("confirmed_at"),
  // Which meal is scheduled for this day. Always set for Basic (the single
  // fixed meal) and for Premium (whatever the timetable assigns to that
  // date's day-of-week, including the free day).
  mealId: integer("meal_id").references(() => mealsTable.id, { onDelete: "set null" }),
  isFreeDay: boolean("is_free_day").notNull().default(false),
});

export const insertSubscriptionDaySchema = createInsertSchema(subscriptionDaysTable).omit({ id: true });
export type InsertSubscriptionDay = z.infer<typeof insertSubscriptionDaySchema>;
export type SubscriptionDay = typeof subscriptionDaysTable.$inferSelect;
