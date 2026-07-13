import { pgTable, serial, integer, unique } from "drizzle-orm/pg-core";
import { subscriptionPlansTable } from "./plans";
import { mealsTable } from "./meals";

export const planMealsTable = pgTable("plan_meals", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => subscriptionPlansTable.id, { onDelete: "cascade" }),
  mealId: integer("meal_id").notNull().references(() => mealsTable.id, { onDelete: "cascade" }),
}, (table) => ({
  planMealUnique: unique().on(table.planId, table.mealId),
}));

export type PlanMeal = typeof planMealsTable.$inferSelect;
