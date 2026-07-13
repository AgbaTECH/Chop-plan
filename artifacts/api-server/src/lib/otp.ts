import { randomInt, createHash } from "crypto";
import { db } from "@workspace/db";
import { verificationCodesTable } from "@workspace/db";
import { and, eq, desc, isNull } from "drizzle-orm";

export type VerificationRole = "user" | "vendor";
export type VerificationPurpose = "signup_verify" | "password_reset";

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super(`Please wait ${retryAfterSeconds}s before requesting another code`);
  }
}

function hashCode(code: string): string {
  return createHash("sha256").update(code + "chop_plan_otp_salt").digest("hex");
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// Creates and stores a new verification code, enforcing a resend cooldown
// based on the most recently created (not necessarily consumed) code for
// this owner+purpose. Returns the plaintext code to send to the user.
export async function createVerificationCode(
  role: VerificationRole,
  ownerId: number,
  purpose: VerificationPurpose,
): Promise<string> {
  const [latest] = await db
    .select()
    .from(verificationCodesTable)
    .where(and(
      eq(verificationCodesTable.role, role),
      eq(verificationCodesTable.ownerId, ownerId),
      eq(verificationCodesTable.purpose, purpose),
    ))
    .orderBy(desc(verificationCodesTable.createdAt))
    .limit(1);

  if (latest) {
    const elapsedMs = Date.now() - latest.createdAt.getTime();
    const elapsedSeconds = elapsedMs / 1000;
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      throw new RateLimitError(Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds));
    }
  }

  const code = generateCode();
  await db.insert(verificationCodesTable).values({
    role,
    ownerId,
    purpose,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
  });
  return code;
}

export type VerifyCodeResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "incorrect" };

// Verifies a submitted code against the latest unconsumed code for this
// owner+purpose. On success, marks it (and any other outstanding unconsumed
// codes for the same owner+purpose) consumed inside a transaction so the
// code can't be replayed and concurrent verify attempts can't double-spend.
export async function verifyAndConsumeCode(
  role: VerificationRole,
  ownerId: number,
  purpose: VerificationPurpose,
  submittedCode: string,
): Promise<VerifyCodeResult> {
  return db.transaction(async (tx) => {
    const [latest] = await tx
      .select()
      .from(verificationCodesTable)
      .where(and(
        eq(verificationCodesTable.role, role),
        eq(verificationCodesTable.ownerId, ownerId),
        eq(verificationCodesTable.purpose, purpose),
        isNull(verificationCodesTable.consumedAt),
      ))
      .orderBy(desc(verificationCodesTable.createdAt))
      .limit(1)
      .for("update");

    if (!latest) {
      return { ok: false, reason: "not_found" };
    }
    if (latest.expiresAt.getTime() < Date.now()) {
      return { ok: false, reason: "expired" };
    }
    if (latest.codeHash !== hashCode(submittedCode)) {
      return { ok: false, reason: "incorrect" };
    }

    await tx
      .update(verificationCodesTable)
      .set({ consumedAt: new Date() })
      .where(eq(verificationCodesTable.id, latest.id));

    return { ok: true };
  });
}

export function verifyErrorMessage(reason: "not_found" | "expired" | "incorrect"): string {
  switch (reason) {
    case "not_found":
      return "No active code found. Please request a new one.";
    case "expired":
      return "This code has expired. Please request a new one.";
    case "incorrect":
      return "Incorrect code. Please try again.";
  }
}
