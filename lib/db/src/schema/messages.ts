import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { vendorsTable } from "./vendors";

/**
 * Direct messages between a customer and a vendor.
 * Each row is one message in a thread identified by (vendorId, userId).
 */
export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  /** Who sent this message — "vendor" or "user". */
  senderRole: text("sender_role").$type<"vendor" | "user">().notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  /** Set when the recipient reads the message. */
  readAt: timestamp("read_at", { withTimezone: true }),
});
