// Shared activation logic used by both the Paystack webhook and the
// client-triggered verify fallback. Both paths ultimately confirm success by
// asking Paystack directly (webhook: verified signature + event payload;
// verify endpoint: a live GET /transaction/verify call) — never by trusting
// a client-supplied status — so it's safe for either one to call this.
import { db } from "@workspace/db";
import {
  paymentsTable,
  subscriptionsTable,
  subscriptionPlansTable,
  subscriptionDaysTable,
  planTimetableTable,
  vendorsTable,
  type Payment,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { buildBasicScheduleRows, buildPremiumScheduleRows, totalScheduleDays } from "./schedule";
import { logger } from "./logger";

// Activates the subscription (or, for an à la carte order, simply finalizes
// the payment — there's no schedule to generate) tied to a successful
// payment. Idempotent and safe under concurrency: the webhook and the
// manual verify endpoint can both race to call this for the same payment,
// so the whole read-check-write sequence runs inside a single DB
// transaction with a row lock on the payment (`FOR UPDATE`) — the second
// caller blocks until the first commits, then sees `status === "success"`
// already set and returns without doing anything twice.
export async function activatePaymentSuccess(payment: Payment): Promise<{ subscriptionId: number | null }> {
  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, payment.id))
      .for("update");

    if (!locked) {
      throw new Error("Payment disappeared during activation");
    }
    if (locked.status === "success") {
      return { subscriptionId: locked.subscriptionId };
    }

    if (locked.orderType === "alacarte") {
      // No subscription/schedule to generate — the checkout endpoint already
      // computed and persisted vendorPriceNaira/offScheduleMarkupNaira from
      // the meal's raw price, so activation here is just finalizing payment
      // status and opening the order up for pickup confirmation.
      await tx
        .update(paymentsTable)
        .set({ status: "success", pickupStatus: "pending", updatedAt: new Date() })
        .where(eq(paymentsTable.id, locked.id));
      return { subscriptionId: null };
    }

    if (!locked.planId) {
      throw new Error("Subscription payment is missing a planId");
    }
    const [plan] = await tx.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, locked.planId));
    const [vendor] = await tx.select().from(vendorsTable).where(eq(vendorsTable.id, locked.vendorId));
    if (!plan || !vendor) {
      logger.error({ paymentId: locked.id }, "Cannot activate payment: plan or vendor no longer exists");
      throw new Error("Plan or vendor no longer exists");
    }

    const today = new Date().toISOString().split("T")[0];
    const [sub] = await tx
      .insert(subscriptionsTable)
      .values({ userId: locked.userId, vendorId: locked.vendorId, planId: locked.planId, startDate: today, status: "active" })
      .returning();

    let scheduleRows;
    if (plan.tier === "basic") {
      if (!plan.basicMealId) {
        throw new Error("Basic plan has no assigned meal");
      }
      scheduleRows = buildBasicScheduleRows(
        sub.id,
        sub.startDate,
        totalScheduleDays(plan.daysPerMonth, plan.freeDays),
        plan.basicMealId
      );
    } else {
      const timetable = await tx.select().from(planTimetableTable).where(eq(planTimetableTable.planId, plan.id));
      // A Premium plan must always carry exactly 4 rotation days + 1 free
      // day. If it doesn't (e.g. left incomplete by a bug or partial write),
      // refuse to activate rather than create a subscription with a broken
      // or empty pickup schedule.
      const freeDayCount = timetable.filter((t) => t.isFreeDay).length;
      if (timetable.length !== 5 || freeDayCount !== 1) {
        logger.error({ paymentId: locked.id, planId: plan.id, timetableRows: timetable.length }, "Refusing to activate: Premium plan timetable is incomplete");
        throw new Error("This vendor's Premium plan is not fully set up. Please try again later.");
      }
      scheduleRows = buildPremiumScheduleRows(sub.id, sub.startDate, timetable);
    }
    if (scheduleRows.length === 0) {
      throw new Error("Failed to generate a pickup schedule for this subscription");
    }
    await tx.insert(subscriptionDaysTable).values(scheduleRows);

    await tx
      .update(paymentsTable)
      .set({ status: "success", subscriptionId: sub.id, updatedAt: new Date() })
      .where(eq(paymentsTable.id, locked.id));

    return { subscriptionId: sub.id };
  });
}

export async function markPaymentFailed(payment: Payment, reason: string | null): Promise<void> {
  if (payment.status === "success") return; // never downgrade a successful payment
  await db
    .update(paymentsTable)
    .set({ status: "failed", failureReason: reason, updatedAt: new Date() })
    .where(eq(paymentsTable.id, payment.id));
}
