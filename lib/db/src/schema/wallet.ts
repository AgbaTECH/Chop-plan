import { pgTable, serial, integer, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";

// One row per vendor — their verified Nigerian bank account, resolved via
// Paystack's account-resolve endpoint and registered as a Paystack transfer
// recipient so withdrawals can be sent directly to it.
export const vendorBankAccountsTable = pgTable("vendor_bank_accounts", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().unique().references(() => vendorsTable.id, { onDelete: "cascade" }),
  bankCode: varchar("bank_code", { length: 20 }).notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: varchar("account_number", { length: 20 }).notNull(),
  accountName: text("account_name").notNull(),
  recipientCode: varchar("recipient_code", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVendorBankAccountSchema = createInsertSchema(vendorBankAccountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendorBankAccount = z.infer<typeof insertVendorBankAccountSchema>;
export type VendorBankAccount = typeof vendorBankAccountsTable.$inferSelect;

// A withdrawal starts "pending" the moment a Paystack transfer is initiated,
// and only ever moves to "success" or "failed" once Paystack confirms the
// outcome (webhook, or a manual status check as a fallback) — never trust a
// client-supplied status. Failed/reversed withdrawals are excluded from the
// vendor's withdrawn total, which automatically restores the balance.
export const vendorWithdrawalsTable = pgTable("vendor_withdrawals", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "cascade" }),
  amountNaira: integer("amount_naira").notNull(),
  reference: varchar("reference", { length: 100 }).notNull().unique(),
  status: text("status").notNull().default("pending"), // pending | success | failed
  transferCode: varchar("transfer_code", { length: 100 }),
  bankName: text("bank_name").notNull(),
  accountNumber: varchar("account_number", { length: 20 }).notNull(),
  accountName: text("account_name").notNull(),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVendorWithdrawalSchema = createInsertSchema(vendorWithdrawalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendorWithdrawal = z.infer<typeof insertVendorWithdrawalSchema>;
export type VendorWithdrawal = typeof vendorWithdrawalsTable.$inferSelect;
