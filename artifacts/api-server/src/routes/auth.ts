import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, vendorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createSession, deleteSession, hashPassword, verifyPassword, getSession } from "../lib/sessions";
import { requireAuth, AuthRequest } from "../lib/auth-middleware";
import {
  UserSignupBody,
  VendorSignupBody,
  UserLoginBody,
  VendorLoginBody,
} from "@workspace/api-zod";

const router = Router();

// POST /auth/user/signup
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
  const token = createSession({ id: user.id, role: "user", name: user.name, email: user.email });
  res.status(201).json({ token, role: "user", id: user.id, name: user.name, email: user.email });
});

// POST /auth/user/login
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
  const token = createSession({ id: user.id, role: "user", name: user.name, email: user.email });
  res.json({ token, role: "user", id: user.id, name: user.name, email: user.email });
});

// POST /auth/vendor/signup
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
  const token = createSession({ id: vendor.id, role: "vendor", name: vendor.businessName, email: vendor.email });
  res.status(201).json({ token, role: "vendor", id: vendor.id, name: vendor.businessName, email: vendor.email });
});

// POST /auth/vendor/login
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
  const token = createSession({ id: vendor.id, role: "vendor", name: vendor.businessName, email: vendor.email });
  res.json({ token, role: "vendor", id: vendor.id, name: vendor.businessName, email: vendor.email });
});

// POST /auth/logout
router.post("/auth/logout", (req: AuthRequest, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    deleteSession(authHeader.slice(7));
  }
  res.json({ success: true, message: "Logged out" });
});

// GET /auth/me
router.get("/auth/me", requireAuth(), (req: AuthRequest, res) => {
  const s = req.session!;
  res.json({ id: s.id, name: s.name, email: s.email, role: s.role, area: null });
});

export default router;
