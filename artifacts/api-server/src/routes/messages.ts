/**
 * Two-way messaging between customers (users) and vendors.
 *
 * Thread identity: (vendorId, userId) pair.
 *
 * Customer routes  — auth: "user"
 *   GET  /user/messages            — list threads (one entry per vendor chatted with)
 *   GET  /user/messages/:vendorId  — full conversation with that vendor
 *   POST /user/messages/:vendorId  — send a message to a vendor
 *
 * Vendor routes — auth: "vendor"
 *   GET  /vendor/messages           — list threads (one entry per customer)
 *   GET  /vendor/messages/:userId   — full conversation with that customer
 *   POST /vendor/messages/:userId   — send a message to a customer
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, usersTable, vendorsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth-middleware";

const router = Router();

function parseMessageContent(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const content = (body as Record<string, unknown>).content;
  if (typeof content !== "string" || content.trim().length === 0 || content.length > 2000) return null;
  return content.trim();
}

// ---------------------------------------------------------------------------
// CUSTOMER routes
// ---------------------------------------------------------------------------

/** GET /user/messages — list all vendors this customer has messaged (threads). */
router.get("/user/messages", requireAuth("user"), async (req: AuthRequest, res) => {
  const userId = req.session!.id;
  // One row per vendor: last message content + timestamp + unread count.
  const threads = await db.execute(sql`
    SELECT
      m.vendor_id      AS "vendorId",
      v.business_name  AS "vendorName",
      v.cover_image    AS "vendorImage",
      (SELECT content    FROM messages WHERE vendor_id = m.vendor_id AND user_id = ${userId} ORDER BY created_at DESC LIMIT 1) AS "lastMessage",
      (SELECT created_at FROM messages WHERE vendor_id = m.vendor_id AND user_id = ${userId} ORDER BY created_at DESC LIMIT 1) AS "lastAt",
      (SELECT COUNT(*) FROM messages
       WHERE vendor_id = m.vendor_id AND user_id = ${userId}
         AND sender_role = 'vendor' AND read_at IS NULL)::int AS "unreadCount"
    FROM (SELECT DISTINCT vendor_id FROM messages WHERE user_id = ${userId}) m
    JOIN vendors v ON v.id = m.vendor_id
    ORDER BY "lastAt" DESC
  `);
  res.json(threads.rows);
});

/** GET /user/messages/:vendorId — full conversation with one vendor. Marks vendor messages read. */
router.get("/user/messages/:vendorId", requireAuth("user"), async (req: AuthRequest, res) => {
  const userId = req.session!.id;
  const vendorId = Number(req.params.vendorId);

  // Mark unread vendor→user messages as read
  await db.execute(sql`
    UPDATE messages SET read_at = NOW()
    WHERE vendor_id = ${vendorId} AND user_id = ${userId}
      AND sender_role = 'vendor' AND read_at IS NULL
  `);

  const msgs = await db
    .select({
      id: messagesTable.id,
      senderRole: messagesTable.senderRole,
      content: messagesTable.content,
      createdAt: messagesTable.createdAt,
      readAt: messagesTable.readAt,
    })
    .from(messagesTable)
    .where(and(eq(messagesTable.vendorId, vendorId), eq(messagesTable.userId, userId)))
    .orderBy(desc(messagesTable.createdAt))
    .limit(100);

  res.json(msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), readAt: m.readAt?.toISOString() ?? null })).reverse());
});

/** POST /user/messages/:vendorId — send a message to a vendor. */
router.post("/user/messages/:vendorId", requireAuth("user"), async (req: AuthRequest, res) => {
  const userId = req.session!.id;
  const vendorId = Number(req.params.vendorId);
  const content = parseMessageContent(req.body);
  if (!content) {
    res.status(400).json({ error: "content must be between 1 and 2000 characters" });
    return;
  }
  const [vendor] = await db.select({ id: vendorsTable.id }).from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  const [msg] = await db
    .insert(messagesTable)
    .values({ vendorId, userId, senderRole: "user", content })
    .returning();
  res.status(201).json({ ...msg, createdAt: msg.createdAt.toISOString(), readAt: null });
});

// ---------------------------------------------------------------------------
// VENDOR routes
// ---------------------------------------------------------------------------

/** GET /vendor/messages — list all customers who have messaged this vendor. */
router.get("/vendor/messages", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const threads = await db.execute(sql`
    SELECT
      m.user_id        AS "userId",
      u.name           AS "customerName",
      u.phone          AS "customerPhone",
      (SELECT content    FROM messages WHERE vendor_id = ${vendorId} AND user_id = m.user_id ORDER BY created_at DESC LIMIT 1) AS "lastMessage",
      (SELECT created_at FROM messages WHERE vendor_id = ${vendorId} AND user_id = m.user_id ORDER BY created_at DESC LIMIT 1) AS "lastAt",
      (SELECT COUNT(*) FROM messages
       WHERE vendor_id = ${vendorId} AND user_id = m.user_id
         AND sender_role = 'user' AND read_at IS NULL)::int AS "unreadCount"
    FROM (SELECT DISTINCT user_id FROM messages WHERE vendor_id = ${vendorId}) m
    JOIN users u ON u.id = m.user_id
    ORDER BY "lastAt" DESC
  `);
  res.json(threads.rows);
});

/** GET /vendor/messages/:userId — full conversation with one customer. Marks customer messages read. */
router.get("/vendor/messages/:userId", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const userId = Number(req.params.userId);

  await db.execute(sql`
    UPDATE messages SET read_at = NOW()
    WHERE vendor_id = ${vendorId} AND user_id = ${userId}
      AND sender_role = 'user' AND read_at IS NULL
  `);

  const msgs = await db
    .select({
      id: messagesTable.id,
      senderRole: messagesTable.senderRole,
      content: messagesTable.content,
      createdAt: messagesTable.createdAt,
      readAt: messagesTable.readAt,
    })
    .from(messagesTable)
    .where(and(eq(messagesTable.vendorId, vendorId), eq(messagesTable.userId, userId)))
    .orderBy(desc(messagesTable.createdAt))
    .limit(100);

  res.json(msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), readAt: m.readAt?.toISOString() ?? null })).reverse());
});

/** POST /vendor/messages/:userId — send a message to a customer. */
router.post("/vendor/messages/:userId", requireAuth("vendor"), async (req: AuthRequest, res) => {
  const vendorId = req.session!.id;
  const userId = Number(req.params.userId);
  const content = parseMessageContent(req.body);
  if (!content) {
    res.status(400).json({ error: "content must be between 1 and 2000 characters" });
    return;
  }
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [msg] = await db
    .insert(messagesTable)
    .values({ vendorId, userId, senderRole: "vendor", content })
    .returning();
  res.status(201).json({ ...msg, createdAt: msg.createdAt.toISOString(), readAt: null });
});

export default router;
