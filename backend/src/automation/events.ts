import { Types } from "mongoose";
import { Automation, IAutomation } from "../models/Automation";
import { Run } from "../models/Run";
import { User } from "../models/User";
import { logger } from "../lib/logger";
import { Vars, withCommonVars } from "./variables";
import { summaryVars } from "./summary";

// The worker registers here so new runs start immediately (no import cycle).
let onQueued: () => void = () => undefined;
export function setQueueListener(fn: () => void) {
  onQueued = fn;
}

export async function startRun(
  automation: IAutomation,
  vars: Vars,
  opts: { isTest?: boolean } = {}
) {
  const user = await User.findById(automation.owner);
  if (!user) throw new Error("Automation owner not found");

  let runVars = vars;
  if (["schedule", "manual"].includes(automation.trigger.type)) {
    runVars = { ...(await summaryVars(user._id, user.currency)), ...vars };
  }

  const run = await Run.create({
    owner: automation.owner,
    automation: automation._id,
    automationName: automation.name,
    triggerType: automation.trigger.type,
    isTest: Boolean(opts.isTest),
    status: "queued",
    vars: withCommonVars(runVars, user),
    steps: automation.steps.map((s) => ({ id: s.id, type: s.type, config: s.config })),
  });
  await Automation.updateOne({ _id: automation._id }, { $set: { lastRunAt: new Date() }, $inc: { runCount: 1 } });
  onQueued();
  return run;
}

// Called by invoices/expenses when something happens. Never throws, so a
// broken automation can't break saving an invoice.
export async function emitEvent(owner: Types.ObjectId, type: string, vars: Vars) {
  try {
    const automations = await Automation.find({ owner, enabled: true, "trigger.type": type });
    for (const automation of automations) await startRun(automation, vars);
  } catch (err) {
    logger.error(`[automation] could not start "${type}" automations: ${(err as Error).message}`);
  }
}
