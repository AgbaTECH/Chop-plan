import { randomBytes, createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

export interface Session {
  id: number;
  role: "user" | "vendor" | "admin";
  name: string;
  email: string;
}

const sessions = new Map<string, Session>();

export function createSession(data: Session): string {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, data);
  return token;
}

export function getSession(token: string): Session | null {
  return sessions.get(token) ?? null;
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}

// Invalidates all active sessions for a given account, e.g. after a
// password reset so other logged-in devices are signed out.
export function deleteSessionsForOwner(role: Session["role"], id: number): void {
  for (const [token, session] of sessions.entries()) {
    if (session.role === role && session.id === id) {
      sessions.delete(token);
    }
  }
}

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
