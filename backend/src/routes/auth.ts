import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody } from "../middleware/validate";
import { authRateLimiter } from "../middleware/rateLimit";
import { requireAuth, ownerId } from "../middleware/auth";
import * as auth from "../services/auth";
import { CURRENCIES } from "../models/User";
import { loadSampleWorkspace, clearWorkspace } from "../services/sampleData";
import { env } from "../config/env";
import { isAIConfigured } from "../lib/ai";
import { isEmailConfigured } from "../services/email";

const router = Router();

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(120);
const password = z.string().min(8, "Use at least 8 characters").max(100);

router.get("/config", (_req, res) => {
  res.json({ success: true, data: { demoEnabled: env.autoSeed, aiEnabled: isAIConfigured, emailEnabled: isEmailConfigured } });
});

router.post(
  "/signup",
  authRateLimiter,
  validateBody(z.object({ name: z.string().trim().min(1, "Enter your name").max(80), email, password })),
  asyncHandler(async (req, res) => {
    res.status(201).json({ success: true, data: await auth.signup(req.body) });
  })
);

router.post(
  "/login",
  authRateLimiter,
  validateBody(z.object({ email, password: z.string().min(1, "Enter your password").max(100) })),
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await auth.login(req.body.email, req.body.password) });
  })
);

router.post(
  "/demo",
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await auth.demoLogin() });
  })
);

router.post(
  "/refresh",
  validateBody(z.object({ refreshToken: z.string().min(10) })),
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await auth.refresh(req.body.refreshToken) });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await auth.logout(String(req.body?.refreshToken || ""));
    res.json({ success: true });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await auth.getProfile(ownerId(req)) });
  })
);

router.patch(
  "/me",
  requireAuth,
  validateBody(
    z.object({
      name: z.string().trim().min(1, "Enter your name").max(80).optional(),
      businessName: z.string().trim().max(80).optional(),
      currency: z.enum(CURRENCIES).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await auth.updateProfile(ownerId(req), req.body) });
  })
);

router.post(
  "/change-password",
  requireAuth,
  validateBody(z.object({ currentPassword: z.string().min(1, "Enter your current password"), newPassword: password })),
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await auth.changePassword(ownerId(req), req.body.currentPassword, req.body.newPassword) });
  })
);

router.post(
  "/sample-data",
  requireAuth,
  asyncHandler(async (req, res) => {
    await loadSampleWorkspace(ownerId(req));
    res.json({ success: true });
  })
);

router.post(
  "/clear-data",
  requireAuth,
  asyncHandler(async (req, res) => {
    await clearWorkspace(ownerId(req));
    res.json({ success: true });
  })
);

export default router;
