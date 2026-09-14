import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";

/** Authenticates a consultation participant without granting administrative access. */
export async function requireParticipant(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: "Authentication required" });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "Invalid or expired session" });

  res.locals.userId = data.user.id;
  res.locals.role = data.user.app_metadata?.role ?? data.user.user_metadata?.role ?? "participant";
  return next();
}