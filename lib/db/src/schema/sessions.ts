import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Server-side session store. Persisted to Postgres so sessions survive
 * server restarts (Replit idles and redeploys kill in-memory state, which
 * previously wiped every active session and bounced all users to the login
 * page on their next request).
 */
export const sessionsTable = pgTable("sessions", {
  token: text("token").primaryKey(),
  // The numeric ID of the user/vendor/admin row, not a FK — accounts live
  // across three separate tables so a single FK isn't practical.
  accountId: integer("account_id").notNull(),
  role: text("role").$type<"user" | "vendor" | "admin">().notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
