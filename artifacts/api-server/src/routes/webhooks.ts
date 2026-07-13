import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { paymentsTable } from "@workspace/db";
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

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, reference));
  if (!payment) {
    logger.warn({ reference }, "Paystack webhook referenced an unknown payment");
    res.status(200).json({ success: true });
    return;
  }

  try {
    if (event.event === "charge.success") {
      await activatePaymentSuccess(payment);
    } else if (event.event === "charge.failed") {
      await markPaymentFailed(payment, event?.data?.gateway_response ?? "Payment failed");
    }
  } catch (err) {
    logger.error({ err, reference }, "Failed to process Paystack webhook event");
    // Still acknowledge with 200 so Paystack doesn't hammer us with retries
    // for a permanent error (e.g. deleted plan); the manual verify endpoint
    // remains available as a fallback for the customer.
  }

  res.status(200).json({ success: true });
}
