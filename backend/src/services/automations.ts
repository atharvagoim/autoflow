import crypto from "crypto";
import { Types } from "mongoose";
import { Automation, IAutomation, IStep } from "../models/Automation";
import { Run } from "../models/Run";
import { Invoice } from "../models/Invoice";
import { Expense } from "../models/Expense";
import { AppError } from "../lib/AppError";
import { STEP_MAP, TRIGGER_MAP, TRIGGERS, STEPS, findProblems } from "../automation/catalog";
import { TEMPLATES, TEMPLATE_MAP } from "../automation/templates";
import { startRun } from "../automation/events";
import { expenseVars, invoiceVars, nextScheduleRun, Vars } from "../automation/variables";

export interface AutomationInput {
  name: string;
  description?: string;
  trigger: { type: string; config: Record<string, unknown> };
  steps: Array<{ id?: string; type: string; config: Record<string, unknown> }>;
  enabled?: boolean;
  tzOffset?: number;
}

const newId = () => crypto.randomBytes(4).toString("hex");

// Keep only the fields each trigger/step actually defines, as short strings/numbers.
function cleanConfig(fields: Array<{ key: string; type: string }>, config: Record<string, unknown> = {}) {
  const out: Record<string, string | number> = {};
  for (const f of fields) {
    const v = config[f.key];
    if (v === undefined || v === null) continue;
    if (f.type === "number") {
      const n = Number(v);
      if (Number.isFinite(n)) out[f.key] = n;
    } else {
      out[f.key] = String(v).slice(0, 5000);
    }
  }
  return out;
}

function normalise(input: AutomationInput) {
  const triggerDef = TRIGGER_MAP.get(input.trigger.type);
  if (!triggerDef) throw AppError.badRequest("Choose what starts this automation");
  const triggerConfig: Record<string, unknown> = cleanConfig(triggerDef.fields, input.trigger.config);
  if (input.trigger.type === "schedule") {
    const tz = Number(input.tzOffset ?? input.trigger.config?.tzOffset ?? 0);
    triggerConfig.tzOffset = Number.isFinite(tz) ? Math.max(-840, Math.min(840, tz)) : 0;
  }
  const steps: IStep[] = input.steps.slice(0, 20).map((s) => {
    const def = STEP_MAP.get(s.type);
    if (!def) throw AppError.badRequest(`Unknown step type "${s.type}"`);
    return { id: s.id && /^[\w-]{1,40}$/.test(s.id) ? s.id : newId(), type: s.type, config: cleanConfig(def.fields, s.config) };
  });
  return { trigger: { type: input.trigger.type, config: triggerConfig }, steps };
}

function present(a: IAutomation) {
  const obj = a.toObject();
  return { ...obj, problems: findProblems(a.trigger, a.steps) };
}

async function getOwned(owner: Types.ObjectId, id: string) {
  const a = await Automation.findOne({ _id: id, owner });
  if (!a) throw AppError.notFound("That automation doesn't exist");
  return a;
}

function applySchedule(a: IAutomation) {
  a.nextRunAt = a.enabled && a.trigger.type === "schedule" ? nextScheduleRun(a.trigger.config) : undefined;
}

export function catalog() {
  return { triggers: TRIGGERS, steps: STEPS, templates: TEMPLATES.map(({ key, name, description, trigger, steps }) => ({ key, name, description, triggerType: trigger.type, stepTypes: steps.map((s) => s.type) })) };
}

export async function list(owner: Types.ObjectId) {
  const automations = await Automation.find({ owner }).sort({ updatedAt: -1 });
  const recent = await Run.find({ owner }, { automation: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(500).lean();
  const byId = new Map<string, { status: string; at: Date }>();
  for (const r of recent) {
    const key = String(r.automation);
    if (!byId.has(key)) byId.set(key, { status: r.status, at: r.createdAt });
  }
  return automations.map((a) => ({ ...present(a), lastRun: byId.get(String(a._id)) || null }));
}

export async function get(owner: Types.ObjectId, id: string) {
  return present(await getOwned(owner, id));
}

export async function create(owner: Types.ObjectId, input: AutomationInput) {
  const { trigger, steps } = normalise(input);
  const a = new Automation({
    owner,
    name: input.name,
    description: input.description || "",
    trigger,
    steps,
    enabled: false,
    webhookKey: crypto.randomBytes(16).toString("hex"),
  });
  if (input.enabled) {
    const problems = findProblems(trigger, steps);
    if (problems.length) throw AppError.badRequest(problems[0]);
    a.enabled = true;
  }
  applySchedule(a);
  await a.save();
  return present(a);
}

export async function update(owner: Types.ObjectId, id: string, input: AutomationInput) {
  const a = await getOwned(owner, id);
  const { trigger, steps } = normalise(input);
  a.set({ name: input.name, description: input.description ?? a.description, trigger, steps });
  a.markModified("trigger");
  a.markModified("steps");
  const wantsEnabled = input.enabled ?? a.enabled;
  if (wantsEnabled) {
    const problems = findProblems(trigger, steps);
    if (problems.length) throw AppError.badRequest(`Saved changes can't be switched on yet: ${problems[0]}`);
  }
  a.enabled = wantsEnabled;
  applySchedule(a);
  await a.save();
  return present(a);
}

export async function setEnabled(owner: Types.ObjectId, id: string, enabled: boolean) {
  const a = await getOwned(owner, id);
  if (enabled) {
    const problems = findProblems(a.trigger, a.steps);
    if (problems.length) throw AppError.badRequest(problems[0]);
  }
  a.enabled = enabled;
  applySchedule(a);
  await a.save();
  return present(a);
}

export async function remove(owner: Types.ObjectId, id: string) {
  const a = await getOwned(owner, id);
  await Run.deleteMany({ automation: a._id, owner });
  await a.deleteOne();
}

export async function createFromTemplate(owner: Types.ObjectId, key: string, tzOffset = 0) {
  const t = TEMPLATE_MAP.get(key);
  if (!t) throw AppError.notFound("That template doesn't exist");
  const created = await create(owner, {
    name: t.name,
    description: t.description,
    trigger: { type: t.trigger.type, config: { ...t.trigger.config } },
    steps: t.steps.map((s) => ({ type: s.type, config: { ...s.config } })),
    enabled: true,
    tzOffset,
  });
  await Automation.updateOne({ _id: created._id }, { $set: { templateKey: key } });
  return { ...created, templateKey: key };
}

// Realistic data for a test run: your latest invoice/expense, or a sample.
async function sampleVars(owner: Types.ObjectId, triggerType: string): Promise<Vars> {
  if (triggerType.startsWith("invoice_")) {
    const status = triggerType === "invoice_paid" ? "paid" : triggerType === "invoice_overdue" ? "overdue" : undefined;
    const inv =
      (status && (await Invoice.findOne({ owner, status }).sort({ updatedAt: -1 }).populate("customer"))) ||
      (await Invoice.findOne({ owner }).sort({ createdAt: -1 }).populate("customer"));
    if (inv) return invoiceVars(inv);
    return {
      invoiceNumber: "INV-0042",
      customerName: "Sample Customer",
      customerEmail: "customer@example.com",
      amount: 24000,
      dueDate: "15 Nov 2026",
      status: status || "sent",
      daysOverdue: status === "overdue" ? 2 : 0,
    };
  }
  if (triggerType === "expense_added") {
    const exp = await Expense.findOne({ owner }).sort({ createdAt: -1 });
    if (exp) return expenseVars(exp);
    return { expenseTitle: "Figma subscription", amount: 1500, category: "Software", expenseDate: "1 Oct 2026" };
  }
  if (triggerType === "webhook") return { name: "Sam Carter", email: "sam@example.com", amount: 1200, source: "test" };
  return {};
}

export async function run(owner: Types.ObjectId, id: string, test: boolean) {
  const a = await getOwned(owner, id);
  const problems = findProblems(a.trigger, a.steps);
  if (problems.length) throw AppError.badRequest(problems[0]);
  const canRunForReal = ["manual", "schedule"].includes(a.trigger.type);
  if (!test && !canRunForReal) {
    throw AppError.badRequest("This automation starts on its own when its trigger happens. Use Test run to try it.");
  }
  return startRun(a, await sampleVars(owner, a.trigger.type), { isTest: test });
}

export async function webhookRun(key: string, payload: Vars) {
  const a = await Automation.findOne({ webhookKey: key, "trigger.type": "webhook" });
  if (!a) throw AppError.notFound("This link doesn't belong to any automation");
  if (!a.enabled) throw AppError.badRequest("This automation is switched off");
  return startRun(a, payload);
}

export async function listRuns(owner: Types.ObjectId, automationId?: string, limit = 50) {
  const filter: Record<string, unknown> = { owner };
  if (automationId) filter.automation = automationId;
  return Run.find(filter, { vars: 0, steps: 0 }).sort({ createdAt: -1 }).limit(Math.min(100, limit)).lean();
}

export async function getRun(owner: Types.ObjectId, id: string) {
  const r = await Run.findOne({ _id: id, owner }).lean();
  if (!r) throw AppError.notFound("That run doesn't exist");
  return r;
}

export async function cancelRun(owner: Types.ObjectId, id: string) {
  const r = await Run.findOneAndUpdate(
    { _id: id, owner, status: { $in: ["queued", "waiting"] } },
    { $set: { status: "stopped", finishedAt: new Date(), error: "Cancelled by you" }, $unset: { resumeAt: 1 } },
    { new: true }
  );
  if (!r) throw AppError.badRequest("Only waiting runs can be cancelled");
  return r;
}
