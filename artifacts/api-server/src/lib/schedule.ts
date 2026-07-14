// Shared helpers for building and pricing a subscription's daily pickup schedule.

export function totalScheduleDays(daysPerMonth: number, freeDays: number): number {
  return daysPerMonth + freeDays;
}

export function perDayShareNaira(priceNaira: number, daysPerMonth: number, freeDays: number): number {
  const total = totalScheduleDays(daysPerMonth, freeDays);
  return total > 0 ? Math.round(priceNaira / total) : 0;
}

type ScheduleRow = {
  subscriptionId: number;
  dayNumber: number;
  scheduledDate: string;
  status: "pending";
  mealId: number;
  isFreeDay: boolean;
};

// Basic tier: the same fixed meal every consecutive scheduled day.
export function buildBasicScheduleRows(
  subscriptionId: number,
  startDate: string,
  totalDays: number,
  mealId: number
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const start = new Date(startDate + "T00:00:00Z");
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    rows.push({
      subscriptionId,
      dayNumber: i + 1,
      scheduledDate: d.toISOString().split("T")[0],
      status: "pending",
      mealId,
      isFreeDay: false,
    });
  }
  return rows;
}

export type PremiumTimetableEntry = { dayOfWeek: number; mealId: number; isFreeDay: boolean };

// Premium tier: a weekly timetable of 4 rotation days + 1 free day, expanded
// across a 4-week (28 consecutive day) window. 28 is a multiple of 7, so
// every day-of-week occurs exactly 4 times regardless of the start date —
// this keeps daysPerMonth/freeDays (and therefore each vendor's per-day
// revenue share) deterministic no matter which day a subscription starts on.
export function buildPremiumScheduleRows(
  subscriptionId: number,
  startDate: string,
  timetable: PremiumTimetableEntry[],
  weeks = 4
): ScheduleRow[] {
  const byDayOfWeek = new Map(timetable.map((t) => [t.dayOfWeek, t]));
  const rows: ScheduleRow[] = [];
  const start = new Date(startDate + "T00:00:00Z");
  const totalDays = weeks * 7;
  let dayNumber = 0;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const entry = byDayOfWeek.get(d.getUTCDay());
    if (!entry) continue;
    dayNumber += 1;
    rows.push({
      subscriptionId,
      dayNumber,
      scheduledDate: d.toISOString().split("T")[0],
      status: "pending",
      mealId: entry.mealId,
      isFreeDay: entry.isFreeDay,
    });
  }
  return rows;
}

// A Premium plan's rotation always covers 4 chargeable days/week and 1 free
// day/week; over a 4-week window that's a deterministic 16 chargeable +
// 4 free days per billing cycle.
export const PREMIUM_ROTATION_DAYS_PER_WEEK = 4;
export const PREMIUM_FREE_DAYS_PER_WEEK = 1;
export const PREMIUM_WEEKS_PER_CYCLE = 4;
export const PREMIUM_DAYS_PER_MONTH = PREMIUM_ROTATION_DAYS_PER_WEEK * PREMIUM_WEEKS_PER_CYCLE;
export const PREMIUM_FREE_DAYS = PREMIUM_FREE_DAYS_PER_WEEK * PREMIUM_WEEKS_PER_CYCLE;
