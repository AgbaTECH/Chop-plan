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

export interface PaystackBank {
  name: string;
  code: string;
}

// GET /bank — the list of Nigerian banks vendors can pick from when adding
// their payout account. Fetched live from Paystack rather than hardcoded so
// bank codes always match what Paystack itself expects.
export async function listBanks(): Promise<PaystackBank[]> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/bank?currency=NGN&country=nigeria`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  });
  const body = (await res.json().catch(() => null)) as PaystackResponseShape | null;
  if (!res.ok || !body?.status) {
    logger.error({ status: res.status, body }, "Paystack list banks failed");
    throw new PaystackError(body?.message || "Failed to load bank list");
  }
  return (body.data ?? []).map((b: any) => ({ name: b.name, code: b.code }));
}

export interface ResolvedAccount {
  accountNumber: string;
  accountName: string;
}

// GET /bank/resolve — confirms an account number actually belongs to a real
// account at the given bank and returns the account holder's name, so the
// vendor (and we) can confirm it's correct before it's used for payouts.
export async function resolveAccountNumber(accountNumber: string, bankCode: string): Promise<ResolvedAccount> {
  const res = await fetch(
    `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    { headers: { Authorization: `Bearer ${getSecretKey()}` } },
  );
  const body = (await res.json().catch(() => null)) as PaystackResponseShape | null;
  if (!res.ok || !body?.status) {
    logger.error({ status: res.status, body }, "Paystack resolve account failed");
    throw new PaystackError(body?.message || "Could not verify this account number");
  }
  return {
    accountNumber: body.data?.account_number ?? accountNumber,
    accountName: body.data?.account_name ?? "",
  };
}

export interface CreateTransferRecipientInput {
  accountName: string;
  accountNumber: string;
  bankCode: string;
}

// POST /transferrecipient — registers the bank account as a payout
// destination with Paystack; the returned recipient code is what we
// reference on every future transfer to this vendor.
export async function createTransferRecipient(input: CreateTransferRecipientInput): Promise<string> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "nuban",
      name: input.accountName,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: "NGN",
    }),
  });
  const body = (await res.json().catch(() => null)) as PaystackResponseShape | null;
  if (!res.ok || !body?.status) {
    logger.error({ status: res.status, body }, "Paystack create transfer recipient failed");
    throw new PaystackError(body?.message || "Failed to register payout account with Paystack");
  }
  return body.data?.recipient_code;
}

// Paystack rejects the transfer request outright (before ever debiting our
// balance) when the destination Paystack account is restricted from sending
// payouts to third parties — e.g. an unverified/"starter" business tier.
// This is an account-level restriction on OUR Paystack account, not
// something the vendor did wrong, so it deserves a distinct, non-technical
// message instead of a raw Paystack error string, and repeated vendor
// retries will fail identically until we resolve it with Paystack.
const PAYOUT_RESTRICTION_PATTERNS = [
  /third[\s-]?party/i,
  /starter\s*(business)?/i,
  /cannot initiate.*payout/i,
  /upgrade your business/i,
];

export function isPayoutRestrictionError(message: string | null | undefined): boolean {
  if (!message) return false;
  return PAYOUT_RESTRICTION_PATTERNS.some((re) => re.test(message));
}

export const PAYOUT_RESTRICTED_VENDOR_MESSAGE =
  "Payouts are temporarily unavailable — our team is resolving this with our payment provider.";

export type PaystackTransferStatus = "success" | "pending" | "failed" | "otp";

export interface InitiateTransferInput {
  amountNaira: number;
  recipientCode: string;
  reference: string;
  reason: string;
}

export interface InitiateTransferResult {
  status: PaystackTransferStatus;
  transferCode: string | null;
}

// POST /transfer — moves money from our Paystack balance to the vendor's
// registered recipient. Paystack may finish this synchronously ("success"),
// leave it in flight ("pending"), or require OTP finalization ("otp") if
// that safety feature hasn't been disabled on the Paystack dashboard for
// this integration — we treat "otp" as unsupported automation and surface
// it as a failure rather than silently leaving money in limbo.
export async function initiateTransfer(input: InitiateTransferInput): Promise<InitiateTransferResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      amount: Math.round(input.amountNaira * 100),
      recipient: input.recipientCode,
      reference: input.reference,
      reason: input.reason,
    }),
  });
  const body = (await res.json().catch(() => null)) as PaystackResponseShape | null;
  if (!res.ok || !body?.status) {
    logger.error({ status: res.status, body }, "Paystack initiate transfer failed");
    throw new PaystackError(body?.message || "Failed to initiate withdrawal transfer");
  }
  const paystackStatus = body.data?.status as string | undefined;
  const status: PaystackTransferStatus =
    paystackStatus === "success" || paystackStatus === "failed" || paystackStatus === "otp"
      ? paystackStatus
      : "pending";
  return {
    status,
    transferCode: body.data?.transfer_code ?? null,
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
