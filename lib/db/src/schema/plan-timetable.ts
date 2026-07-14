import { pgTable, serial, integer, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subscriptionPlansTable } from "./plans";
import { mealsTable } from "./meals";

// Premium-only weekly timetable: exactly 4 rotation days (one meal each)
// plus exactly 1 free day (a distinct meal, on a day not already covered by
// the rotation). dayOfWeek is 0 (Sunday) through 6 (Saturday).
export const planTimetableTable = pgTable(
  "plan_timetable",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id").notNull().references(() => subscriptionPlansTable.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    mealId: integer("meal_id").notNull().references(() => mealsTable.id, { onDelete: "cascade" }),
    isFreeDay: boolean("is_free_day").notNull().default(false),
  },
  (table) => ({
    planDayUnique: unique().on(table.planId, table.dayOfWeek),
  })
);

export const insertPlanTimetableSchema = createInsertSchema(planTimetableTable).omit({ id: true });
export type InsertPlanTimetableEntry = z.infer<typeof insertPlanTimetableSchema>;
export type PlanTimetableEntry = typeof planTimetableTable.$inferSelect;
