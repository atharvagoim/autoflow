import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { webhookRun } from "../services/automations";
import { flattenPayload } from "../automation/variables";

// Public: other apps POST here to start an automation. The long random key
// in the URL is the secret.
const router = Router();
router.post(
  "/:key",
  asyncHandler(async (req, res) => {
    if (!/^[a-f0-9]{32}$/.test(req.params.key)) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Unknown link" });
    const run = await webhookRun(req.params.key, flattenPayload({ ...req.query, ...(req.body || {}) }));
    res.status(202).json({ success: true, data: { received: true, runId: run._id } });
  })
);
export default router;
