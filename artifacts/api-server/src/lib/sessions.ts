import { randomBytes, createHash } from "crypto";

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

export function hashPassword(password: string): string {
  return createHash("sha256").update(password + "chop_plan_salt").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
