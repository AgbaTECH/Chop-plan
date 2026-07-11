import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable } from "@workspace/db";
import { SubmitLeadBody } from "@workspace/api-zod";

const router = Router();

router.post("/leads", async (req, res) => {
  const parsed = SubmitLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide your name, phone number and email." });
    return;
  }
  const { name, phone, email } = parsed.data;
  await db.insert(leadsTable).values({ name, phone, email });
  res.json({ success: true, message: "Thanks! A Chop Plan team member will reach out to help you subscribe." });
});

export default router;
