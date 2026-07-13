import crypto from "node:crypto";
import { logger } from "./logger";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function getSecretKey(): string {
  const key = process.env["PAYSTACK_SECRET_KEY"];
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY environment variable is required but was not provided.");
  }
  return key;
}

export interface InitializeTransactionInput {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export class PaystackError extends Error {}

// POST /transaction/initialize — starts a real Paystack checkout (card or
// bank transfer, whatever the customer picks on Paystack's hosted page) for
// the given amount, denominated in kobo (Naira * 100).
export async function initializeTransaction(input: InitializeTransactionInput): Promise<InitializeTransactionResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountNaira * 100),
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });

  const body = (await res.json().catch(() => null)) as PaystackResponseShape | null;
  if (!res.ok || !body?.status) {
    logger.error({ status: res.status, body }, "Paystack initialize transaction failed");
    throw new PaystackError(body?.message || "Failed to start Paystack checkout");
  }

  return {
    authorizationUrl: body.data.authorization_url,
    accessCode: body.data.access_code,
    reference: body.data.reference,
  };
}

interface PaystackResponseShape {
  status: boolean;
  message?: string;
  data?: any;
}

export type PaystackVerifyStatus = "success" | "failed" | "abandoned" | "pending" | "unknown";

export interface VerifyTransactionResult {
  status: PaystackVerifyStatus;
  amountNaira: number;
  reference: string;
  gatewayResponse: string | null;
}

// GET /transaction/verify/:reference — the authoritative source of truth for
// whether a charge actually succeeded. Always call this (never trust a
// client-supplied "it worked") before activating anything.
export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  });

  const body = (await res.json().catch(() => null)) as PaystackResponseShape | null;
  if (!res.ok || !body?.status) {
    logger.error({ status: res.status, body }, "Paystack verify transaction failed");
    throw new PaystackError(body?.message || "Failed to verify Paystack transaction");
  }

  const paystackStatus = body.data?.status as string | undefined;
  const status: PaystackVerifyStatus =
    paystackStatus === "success" || paystackStatus === "failed" || paystackStatus === "abandoned"
      ? paystackStatus
      : paystackStatus === "pending" || paystackStatus === "queued" || paystackStatus === "ongoing"
        ? "pending"
        : "unknown";

  return {
    status,
    amountNaira: Math.round((body.data?.amount ?? 0) / 100),
    reference: body.data?.reference ?? reference,
    gatewayResponse: body.data?.gateway_response ?? null,
  };
}

// Verifies the `x-paystack-signature` header against the raw request body
// using HMAC-SHA512 with the secret key, per Paystack's webhook docs.
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature) return false;
  const hash = crypto.createHmac("sha512", getSecretKey()).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}
