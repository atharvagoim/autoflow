import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export const apiRateLimiter = rateLimit({
  windowMs: env.security.rateLimitWindowMs,
  max: env.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: "RATE_LIMITED", message: "Too many requests. Please slow down and try again shortly." },
});

// Only failed attempts count, keyed per IP + email, so normal logins never
// lock anyone out and one mistyped account doesn't block a whole office.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProd ? 10 : 100,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.email || "").trim().toLowerCase()}`,
  message: { success: false, code: "RATE_LIMITED", message: "Too many failed attempts. Please wait 15 minutes and try again." },
});
