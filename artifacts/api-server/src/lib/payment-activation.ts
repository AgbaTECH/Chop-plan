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
  vendorsTable,
  type Payment,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { buildScheduleRows, totalScheduleDays } from "./schedule";
import { logger } from "./logger";

// Activates the subscription tied to a successful payment. Idempotent and
// safe under concurrency: the webhook and the manual verify endpoint can
// both race to call this for the same payment, so the whole read-check-write
// sequence runs inside a single DB transaction with a row lock on the
// payment (`FOR UPDATE`) — the second caller blocks until the first commits,
// then sees `subscriptionId` already set and returns without inserting a
// second subscription.
export async function activatePaymentSuccess(payment: Payment): Promise<{ subscriptionId: number }> {
  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, payment.id))
      .for("update");

    if (!locked) {
      throw new Error("Payment disappeared during activation");
    }
    if (locked.subscriptionId) {
      return { subscriptionId: locked.subscriptionId };
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

    const scheduleRows = buildScheduleRows(sub.id, sub.startDate, totalScheduleDays(plan.daysPerMonth, plan.freeDays));
    if (scheduleRows.length > 0) {
      await tx.insert(subscriptionDaysTable).values(scheduleRows);
    }

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
