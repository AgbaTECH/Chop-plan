import { Request, Response, NextFunction } from "express";
import { getSession, Session } from "./sessions";

export interface AuthRequest extends Request {
  session?: Session;
}

export function requireAuth(role?: "user" | "vendor") {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const token = authHeader.slice(7);
    const session = getSession(token);
    if (!session) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }
    if (role && session.role !== role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    req.session = session;
    next();
  };
}
