import { pgTable, serial, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Backs both signup OTP verification and password-reset codes for both
// users and vendors. A new row is inserted for every code sent (rather than
// overwriting one row) so resend history is preserved for rate limiting.
export const verificationCodesTable = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 10 }).notNull(), // "user" | "vendor"
  ownerId: integer("owner_id").notNull(),
  purpose: varchar("purpose", { length: 20 }).notNull(), // "signup_verify" | "password_reset"
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodesTable).omit({ id: true, createdAt: true });
export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
export type VerificationCode = typeof verificationCodesTable.$inferSelect;
