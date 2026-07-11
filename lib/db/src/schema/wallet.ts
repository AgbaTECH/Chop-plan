import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";

export const vendorWithdrawalsTable = pgTable("vendor_withdrawals", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "cascade" }),
  amountNaira: integer("amount_naira").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVendorWithdrawalSchema = createInsertSchema(vendorWithdrawalsTable).omit({ id: true, createdAt: true });
export type InsertVendorWithdrawal = z.infer<typeof insertVendorWithdrawalSchema>;
export type VendorWithdrawal = typeof vendorWithdrawalsTable.$inferSelect;
