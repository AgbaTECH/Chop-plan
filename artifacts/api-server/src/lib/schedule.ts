// Shared helpers for building and pricing a subscription's daily pickup schedule.

export function totalScheduleDays(daysPerMonth: number, freeDays: number): number {
  return daysPerMonth + freeDays;
}

export function perDayShareNaira(priceNaira: number, daysPerMonth: number, freeDays: number): number {
  const total = totalScheduleDays(daysPerMonth, freeDays);
  return total > 0 ? Math.round(priceNaira / total) : 0;
}

export function buildScheduleRows(subscriptionId: number, startDate: string, totalDays: number) {
  const rows: { subscriptionId: number; dayNumber: number; scheduledDate: string; status: "pending" }[] = [];
  const start = new Date(startDate + "T00:00:00Z");
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    rows.push({
      subscriptionId,
      dayNumber: i + 1,
      scheduledDate: d.toISOString().split("T")[0],
      status: "pending",
    });
  }
  return rows;
}
