import { Router, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody } from "../middleware/validate";
import { ownerId } from "../middleware/auth";
import * as automations from "../services/automations";

const router = Router();
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });

const configValue = z.union([z.string().max(5000), z.number(), z.boolean(), z.null()]);
const automationBody = z.object({
  name: z.string().trim().min(1, "Give your automation a name").max(80),
  description: z.string().trim().max(300).optional(),
  trigger: z.object({ type: z.string().min(1, "Choose what starts this automation"), config: z.record(configValue).default({}) }),
  steps: z
    .array(z.object({ id: z.string().max(40).optional(), type: z.string().min(1), config: z.record(configValue).default({}) }))
    .max(20, "An automation can have up to 20 steps"),
  enabled: z.boolean().optional(),
  tzOffset: z.number().int().min(-840).max(840).optional(),
});

router.get("/catalog", (_req, res) => ok(res, automations.catalog()));
router.get("/runs", asyncHandler(async (req, res) => ok(res, await automations.listRuns(ownerId(req), req.query.automation ? String(req.query.automation) : undefined, Number(req.query.limit) || 50))));
router.get("/runs/:id", asyncHandler(async (req, res) => ok(res, await automations.getRun(ownerId(req), req.params.id))));
router.post("/runs/:id/cancel", asyncHandler(async (req, res) => ok(res, await automations.cancelRun(ownerId(req), req.params.id))));

router.get("/", asyncHandler(async (req, res) => ok(res, await automations.list(ownerId(req)))));
router.post("/", validateBody(automationBody), asyncHandler(async (req, res) => ok(res, await automations.create(ownerId(req), req.body), 201)));
router.post(
  "/from-template",
  validateBody(z.object({ key: z.string().min(1), tzOffset: z.number().int().min(-840).max(840).optional() })),
  asyncHandler(async (req, res) => ok(res, await automations.createFromTemplate(ownerId(req), req.body.key, req.body.tzOffset), 201))
);
router.get("/:id", asyncHandler(async (req, res) => ok(res, await automations.get(ownerId(req), req.params.id))));
router.put("/:id", validateBody(automationBody), asyncHandler(async (req, res) => ok(res, await automations.update(ownerId(req), req.params.id, req.body))));
router.post("/:id/enable", validateBody(z.object({ enabled: z.boolean() })), asyncHandler(async (req, res) => ok(res, await automations.setEnabled(ownerId(req), req.params.id, req.body.enabled))));
router.post("/:id/run", validateBody(z.object({ test: z.boolean().default(true) })), asyncHandler(async (req, res) => ok(res, await automations.run(ownerId(req), req.params.id, req.body.test), 202)));
router.delete("/:id", asyncHandler(async (req, res) => ok(res, await automations.remove(ownerId(req), req.params.id))));

export default router;
