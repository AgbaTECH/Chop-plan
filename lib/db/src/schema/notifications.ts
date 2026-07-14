import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { vendorsTable } from "./vendors";
import { subscriptionDaysTable } from "./schedule";
import { paymentsTable } from "./payments";

// A vendor-to-customer pickup message about a specific order — either a
// subscription pickup day or an à la carte order. Exactly one of
// subscriptionDayId / paymentId is set, matching whichever orderType the
// notification is about. Kept as its own history table (not a mutable field
// on the order) so multiple messages can accumulate over time and both
// sides can see the full thread.
export const orderNotificationsTable = pgTable("order_notifications", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  orderType: text("order_type").notNull(), // subscription | alacarte
  subscriptionDayId: integer("subscription_day_id").references(() => subscriptionDaysTable.id, { onDelete: "cascade" }),
  paymentId: integer("payment_id").references(() => paymentsTable.id, { onDelete: "cascade" }),
  presetType: text("preset_type").notNull(), // ready | delayed_10 | delayed_20 | custom
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderNotificationSchema = createInsertSchema(orderNotificationsTable).omit({ id: true, createdAt: true });
export type InsertOrderNotification = z.infer<typeof insertOrderNotificationSchema>;
export type OrderNotification = typeof orderNotificationsTable.$inferSelect;
