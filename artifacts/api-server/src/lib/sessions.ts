import { randomBytes, createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { sessionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface Session {
  id: number;
  role: "user" | "vendor" | "admin";
  name: string;
  email: string;
}

// ---------------------------------------------------------------------------
// DB-backed session store
// ---------------------------------------------------------------------------
// Sessions are persisted to Postgres so they survive server restarts. Replit
// idles and redeploys shut the Node process down; previously the in-memory
// Map was wiped on every restart, logging every user out silently on their
// next request. The DB store is transparent to callers — same interface,
// all async now.

export async function createSession(data: Session): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    token,
    accountId: data.id,
    role: data.role,
    name: data.name,
    email: data.email,
  });
  return token;
}

export async function getSession(token: string): Promise<Session | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token));
  if (!row) return null;
  return {
    id: row.accountId,
    role: row.role as Session["role"],
    name: row.name,
    email: row.email,
  };
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

/** Invalidates all sessions for an account (e.g. after password reset). */
export async function deleteSessionsForOwner(
  role: Session["role"],
  id: number,
): Promise<void> {
  await db
    .delete(sessionsTable)
    .where(and(eq(sessionsTable.role, role), eq(sessionsTable.accountId, id)));
}

// ---------------------------------------------------------------------------
// Password hashing utilities (unchanged)
// ---------------------------------------------------------------------------

const BCRYPT_ROUNDS = 12;

// Legacy format from before the bcrypt migration: SHA-256 of
// `password + hardcoded salt`, always a 64-char hex string. Bcrypt hashes
// always start with "$2" and are never valid hex, so the two formats never
// collide and can be told apart unambiguously.
function legacyHash(password: string): string {
  return createHash("sha256").update(password + "chop_plan_salt").digest("hex");
}

function isLegacyHash(hash: string): boolean {
  return /^[0-9a-f]{64}$/i.test(hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Verifies a password against either a modern bcrypt hash or a legacy
// SHA-256 hash (for accounts created before the bcrypt migration). Callers
// that also want to transparently upgrade a legacy hash to bcrypt on
// successful login should use `verifyAndMaybeUpgradePassword` instead.
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (isLegacyHash(hash)) {
    const candidate = Buffer.from(legacyHash(password));
    const stored = Buffer.from(hash);
    return candidate.length === stored.length && timingSafeEqual(candidate, stored);
  }
  return bcrypt.compare(password, hash);
}

export interface PasswordVerifyResult {
  valid: boolean;
  /** Set when the stored hash was in the legacy format and should be replaced with this bcrypt hash. */
  upgradedHash?: string;
}

// Same as verifyPassword, but when the stored hash is in the legacy SHA-256
// format and the password is correct, also returns a freshly computed
// bcrypt hash so the caller can rehash-on-login and migrate the account
// transparently, with no forced password reset.
export async function verifyAndMaybeUpgradePassword(password: string, hash: string): Promise<PasswordVerifyResult> {
  const valid = await verifyPassword(password, hash);
  if (!valid) return { valid: false };
  if (isLegacyHash(hash)) {
    return { valid: true, upgradedHash: await hashPassword(password) };
  }
  return { valid: true };
}
