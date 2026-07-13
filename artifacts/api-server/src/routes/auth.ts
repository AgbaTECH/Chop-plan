import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, vendorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createSession, deleteSession, deleteSessionsForOwner, hashPassword, verifyPassword } from "../lib/sessions";
import { requireAuth, AuthRequest } from "../lib/auth-middleware";
import {
  UserSignupBody,
  VendorSignupBody,
  UserLoginBody,
  VendorLoginBody,
  AdminLoginBody,
  UserVerifyBody,
  VendorVerifyBody,
  UserResendOtpBody,
  VendorResendOtpBody,
  UserForgotPasswordBody,
  VendorForgotPasswordBody,
  UserResetPasswordBody,
  VendorResetPasswordBody,
} from "@workspace/api-zod";
import { adminsTable } from "@workspace/db";
import { createVerificationCode, verifyAndConsumeCode, verifyErrorMessage, RateLimitError } from "../lib/otp";
import { sendEmail, otpEmailHtml } from "../lib/email";
import { logger } from "../lib/logger";

const router = Router();

type AccountRole = "user" | "vendor";
const TABLE_BY_ROLE = { user: usersTable, vendor: vendorsTable } as const;

function displayName(role: AccountRole, account: { name?: string; businessName?: string }): string {
  return role === "user" ? account.name! : account.businessName!;
}

// ── Signup verification (shared helpers) ────────────────────────────────

async function sendSignupOtp(role: AccountRole, ownerId: number, email: string) {
  const code = await createVerificationCode(role, ownerId, "signup_verify");
  await sendEmail({ to: email, subject: "Verify your Chop Plan account", html: otpEmailHtml(code, "verify") });
}

async function handleVerify(role: AccountRole, email: string, code: string) {
  const table = TABLE_BY_ROLE[role];
  const [account] = await db.select().from(table).where(eq(table.email, email)).limit(1);
  if (!account) {
    return { status: 404 as const, body: { error: "Account not found" } };
  }
  if (account.verified) {
    return { status: 400 as const, body: { error: "Account already verified. Please log in." } };
  }
  const result = await verifyAndConsumeCode(role, account.id, "signup_verify", code);
  if (!result.ok) {
    return { status: 400 as const, body: { error: verifyErrorMessage(result.reason) } };
  }
  await db.update(table).set({ verified: true }).where(eq(table.id, account.id));
  const token = createSession({ id: account.id, role, name: displayName(role, account), email: account.email });
  return { status: 200 as const, body: { token, role, id: account.id, name: displayName(role, account), email: account.email } };
}

async function handleResendOtp(role: AccountRole, email: string) {
  const table = TABLE_BY_ROLE[role];
  const [account] = await db.select().from(table).where(eq(table.email, email)).limit(1);
  if (!account) {
    return { status: 404 as const, body: { error: "Account not found" } };
  }
  if (account.verified) {
    return { status: 400 as const, body: { error: "Account already verified" } };
  }
  let code: string;
  try {
    code = await createVerificationCode(role, account.id, "signup_verify");
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { status: 429 as const, body: { error: err.message } };
    }
    throw err;
  }
  try {
    await sendEmail({ to: account.email, subject: "Verify your Chop Plan account", html: otpEmailHtml(code, "verify") });
  } catch (err) {
    logger.error({ err }, "Failed to send resend-OTP email");
    return { status: 502 as const, body: { error: "Could not send the verification email. Please try again shortly." } };
  }
  return { status: 200 as const, body: { success: true, message: "Verification code resent" } };
}

async function handleForgotPassword(role: AccountRole, email: string) {
  const table = TABLE_BY_ROLE[role];
  const [account] = await db.select().from(table).where(eq(table.email, email)).limit(1);
  if (!account) {
    return { status: 404 as const, body: { error: "Account not found" } };
  }
  let code: string;
  try {
    code = await createVerificationCode(role, account.id, "password_reset");
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { status: 429 as const, body: { error: err.message } };
    }
    throw err;
  }
  try {
    await sendEmail({ to: account.email, subject: "Reset your Chop Plan password", html: otpEmailHtml(code, "reset") });
  } catch (err) {
    logger.error({ err }, "Failed to send password-reset email");
    return { status: 502 as const, body: { error: "Could not send the reset email. Please try again shortly." } };
  }
  return { status: 200 as const, body: { success: true, message: "Reset code sent to your email" } };
}

async function handleResetPassword(role: AccountRole, email: string, code: string, newPassword: string) {
  const table = TABLE_BY_ROLE[role];
  const [account] = await db.select().from(table).where(eq(table.email, email)).limit(1);
  if (!account) {
    return { status: 404 as const, body: { error: "Account not found" } };
  }
  const result = await verifyAndConsumeCode(role, account.id, "password_reset", code);
  if (!result.ok) {
    return { status: 400 as const, body: { error: verifyErrorMessage(result.reason) } };
  }
  await db.update(table).set({ passwordHash: hashPassword(newPassword) }).where(eq(table.id, account.id));
  deleteSessionsForOwner(role, account.id);
  return { status: 200 as const, body: { success: true, message: "Password reset successful" } };
}

// ── User ─────────────────────────────────────────────────────────────────

router.post("/auth/user/signup", async (req, res) => {
  const parsed = UserSignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const { name, email, password, phone, area } = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash: hashPassword(password),
    phone,
    area,
  }).returning();
  try {
    await sendSignupOtp("user", user.id, user.email);
  } catch (err) {
    logger.error({ err }, "Failed to send signup OTP email");
    await db.delete(usersTable).where(eq(usersTable.id, user.id));
    res.status(502).json({ error: "Could not send the verification email. Please try again." });
    return;
  }
  res.status(201).json({ requiresVerification: true, email: user.email, message: "We sent a verification code to your email" });
});

router.post("/auth/user/login", async (req, res) => {
  const parsed = UserLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (!user.verified) {
    res.status(403).json({ error: "Account not verified", requiresVerification: true, email: user.email });
    return;
  }
  const token = createSession({ id: user.id, role: "user", name: user.name, email: user.email });
  res.json({ token, role: "user", id: user.id, name: user.name, email: user.email });
});

router.post("/auth/user/verify", async (req, res) => {
  const parsed = UserVerifyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const { email, code } = parsed.data;
  const result = await handleVerify("user", email, code);
  res.status(result.status).json(result.body);
});

router.post("/auth/user/resend-otp", async (req, res) => {
  const parsed = UserResendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const result = await handleResendOtp("user", parsed.data.email);
  res.status(result.status).json(result.body);
});

router.post("/auth/user/forgot-password", async (req, res) => {
  const parsed = UserForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const result = await handleForgotPassword("user", parsed.data.email);
  res.status(result.status).json(result.body);
});

router.post("/auth/user/reset-password", async (req, res) => {
  const parsed = UserResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const { email, code, newPassword } = parsed.data;
  const result = await handleResetPassword("user", email, code, newPassword);
  res.status(result.status).json(result.body);
});

// ── Vendor ───────────────────────────────────────────────────────────────

router.post("/auth/vendor/signup", async (req, res) => {
  const parsed = VendorSignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const { businessName, ownerName, email, password, phone, area, cuisineType, description } = parsed.data;
  const existing = await db.select().from(vendorsTable).where(eq(vendorsTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const [vendor] = await db.insert(vendorsTable).values({
    businessName,
    ownerName,
    email,
    passwordHash: hashPassword(password),
    phone,
    area,
    cuisineType,
    description: description ?? null,
    coverImage: null,
    rating: 4.5,
  }).returning();
  try {
    await sendSignupOtp("vendor", vendor.id, vendor.email);
  } catch (err) {
    logger.error({ err }, "Failed to send signup OTP email");
    await db.delete(vendorsTable).where(eq(vendorsTable.id, vendor.id));
    res.status(502).json({ error: "Could not send the verification email. Please try again." });
    return;
  }
  res.status(201).json({ requiresVerification: true, email: vendor.email, message: "We sent a verification code to your email" });
});

router.post("/auth/vendor/login", async (req, res) => {
  const parsed = VendorLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const { email, password } = parsed.data;
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.email, email)).limit(1);
  if (!vendor || !verifyPassword(password, vendor.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (!vendor.verified) {
    res.status(403).json({ error: "Account not verified", requiresVerification: true, email: vendor.email });
    return;
  }
  const token = createSession({ id: vendor.id, role: "vendor", name: vendor.businessName, email: vendor.email });
  res.json({ token, role: "vendor", id: vendor.id, name: vendor.businessName, email: vendor.email });
});

router.post("/auth/vendor/verify", async (req, res) => {
  const parsed = VendorVerifyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const { email, code } = parsed.data;
  const result = await handleVerify("vendor", email, code);
  res.status(result.status).json(result.body);
});

router.post("/auth/vendor/resend-otp", async (req, res) => {
  const parsed = VendorResendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const result = await handleResendOtp("vendor", parsed.data.email);
  res.status(result.status).json(result.body);
});

router.post("/auth/vendor/forgot-password", async (req, res) => {
  const parsed = VendorForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const result = await handleForgotPassword("vendor", parsed.data.email);
  res.status(result.status).json(result.body);
});

router.post("/auth/vendor/reset-password", async (req, res) => {
  const parsed = VendorResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const { email, code, newPassword } = parsed.data;
  const result = await handleResetPassword("vendor", email, code, newPassword);
  res.status(result.status).json(result.body);
});

// ── Admin (unchanged) ────────────────────────────────────────────────────

router.post("/auth/admin/login", async (req, res) => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  const { email, password } = parsed.data;
  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, email)).limit(1);
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = createSession({ id: admin.id, role: "admin", name: admin.name, email: admin.email });
  res.json({ token, role: "admin", id: admin.id, name: admin.name, email: admin.email });
});

router.post("/auth/logout", (req: AuthRequest, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    deleteSession(authHeader.slice(7));
  }
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", requireAuth(), (req: AuthRequest, res) => {
  const s = req.session!;
  res.json({ id: s.id, name: s.name, email: s.email, role: s.role, area: null });
});

export default router;
