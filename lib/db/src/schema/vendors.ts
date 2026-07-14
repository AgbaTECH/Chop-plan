import { pgTable, serial, text, timestamp, varchar, real, boolean, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  area: varchar("area", { length: 100 }).notNull(),
  cuisineType: varchar("cuisine_type", { length: 100 }).notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  // Additional kitchen photos beyond the single cover image, shown on the
  // vendor's public profile. Stored as fully-servable paths (e.g.
  // "/api/storage/objects/uploads/<uuid>"), same convention as coverImage
  // and mealsTable.imageUrl, so rendering never needs extra path logic.
  kitchenPhotos: text("kitchen_photos").array().notNull().default(sql`'{}'::text[]`),
  rating: real("rating").default(4.5).notNull(),
  verified: boolean("verified").default(false).notNull(),
  // Admin-configurable override for the off-schedule (à la carte) markup
  // percentage applied to this vendor's meals, e.g. 40 = 40%. Null means
  // "use the global default" (see OFF_SCHEDULE_MARKUP_RATE in pricing.ts).
  offScheduleMarkupPercent: integer("off_schedule_markup_percent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({ id: true, createdAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
