import { randomBytes, createHash } from "crypto";

export interface Session {
  id: number;
  role: "user" | "vendor";
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

export function hashPassword(password: string): string {
  return createHash("sha256").update(password + "chop_plan_salt").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
