import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { paymentsTable, vendorWithdrawalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyWebhookSignature } from "../lib/paystack";
import { activatePaymentSuccess, markPaymentFailed } from "../lib/payment-activation";
import { logger } from "../lib/logger";

// Mounted directly in app.ts (before the global JSON body parser) so `req.body`
// here is the raw request Buffer, which is required to verify Paystack's
// HMAC-SHA512 signature. Do not move this behind express.json().
export async function paystackWebhookHandler(req: Request, res: Response): Promise<void> {
  const rawBody = req.body as Buffer;
  const signature = req.headers["x-paystack-signature"] as string | undefined;

  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn("Rejected Paystack webhook with invalid signature");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString("utf-8"));
  } catch {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  const reference = event?.data?.reference as string | undefined;
  if (!reference) {
    res.status(200).json({ success: true });
    return;
  }

  try {
    if (event.event === "charge.success" || event.event === "charge.failed") {
      await handleChargeEvent(event.event, reference, event?.data?.gateway_response);
    } else if (
      event.event === "transfer.success" ||
      event.event === "transfer.failed" ||
      event.event === "transfer.reversed"
    ) {
      await handleTransferEvent(event.event, reference, event?.data?.failure_reason ?? event?.data?.gateway_response);
    }
  } catch (err) {
    logger.error({ err, reference }, "Failed to process Paystack webhook event");
    // Still acknowledge with 200 so Paystack doesn't hammer us with retries
    // for a permanent error (e.g. deleted plan); the manual verify endpoint
    // remains available as a fallback for the customer.
  }

  res.status(200).json({ success: true });
}

async function handleChargeEvent(event: string, reference: string, gatewayResponse: string | undefined): Promise<void> {
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, reference));
  if (!payment) {
    logger.warn({ reference }, "Paystack webhook referenced an unknown payment");
    return;
  }
  if (event === "charge.success") {
    await activatePaymentSuccess(payment);
  } else {
    await markPaymentFailed(payment, gatewayResponse ?? "Payment failed");
  }
}

// Withdrawals are inserted "pending" at initiation time (see
// POST /vendor/wallet/withdraw) and only ever move to a terminal state here,
// once Paystack confirms the transfer's real-world outcome. A reversal
// (funds bounced back after apparent success) is treated the same as a
// failure so the vendor's balance is restored either way.
async function handleTransferEvent(event: string, reference: string, failureReason: string | undefined): Promise<void> {
  const [withdrawal] = await db.select().from(vendorWithdrawalsTable).where(eq(vendorWithdrawalsTable.reference, reference));
  if (!withdrawal) {
    logger.warn({ reference }, "Paystack webhook referenced an unknown withdrawal");
    return;
  }
  if (withdrawal.status !== "pending") {
    return; // already finalized (e.g. by the synchronous initiate response); don't downgrade
  }
  if (event === "transfer.success") {
    await db.update(vendorWithdrawalsTable)
      .set({ status: "success", updatedAt: new Date() })
      .where(eq(vendorWithdrawalsTable.id, withdrawal.id));
  } else {
    await db.update(vendorWithdrawalsTable)
      .set({ status: "failed", failureReason: failureReason ?? "Transfer failed", updatedAt: new Date() })
      .where(eq(vendorWithdrawalsTable.id, withdrawal.id));
  }
}
