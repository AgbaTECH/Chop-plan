import { Router } from "express";
import { db } from "@workspace/db";
import { contactMessagesTable } from "@workspace/db";

const router = Router();

router.post("/contact", async (req, res) => {
  const { name, email, subject, message, type } = req.body;
  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: "All fields required" });
    return;
  }
  await db.insert(contactMessagesTable).values({
    name,
    email,
    subject,
    message,
    type: type ?? "general",
  });
  res.json({ success: true, message: "Message received. We'll get back to you within 24 hours." });
});

export default router;
