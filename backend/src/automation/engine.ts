import { Invoice } from "../models/Invoice";
import { IRun, IStepLog } from "../models/Run";
import { IStep } from "../models/Automation";
import { User } from "../models/User";
import { aiJSON, aiText, isAIConfigured } from "../lib/ai";
import { safePostJSON } from "../lib/safeFetch";
import { env } from "../config/env";
import { sendEmail } from "../services/email";
import { notify } from "../services/notifications";
import * as invoiceService from "../services/invoices";
import { STEP_MAP } from "./catalog";
import { checkCondition, fillTemplate, invoiceVars, Operator, Vars, waitMs } from "./variables";

interface StepResult {
  status: "success" | "stopped" | "waiting";
  message: string;
  setVars?: Vars;
  waitMs?: number;
}

interface StepContext {
  run: IRun;
  vars: Vars;
  ownerEmail: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fallbackMessage(vars: Vars, instruction: string): string {
  if (vars.invoiceNumber) {
    if (vars.status === "paid") {
      return `Hi ${vars.customerName || "there"},\n\nThank you for your payment of ${vars.amountText} for invoice ${vars.invoiceNumber}. It's been received and recorded.\n\nBest regards,\n${vars.businessName}`;
    }
    return `Hi ${vars.customerName || "there"},\n\nA friendly reminder that invoice ${vars.invoiceNumber} for ${vars.amountText} was due on ${vars.dueDate}. If you've already paid, please ignore this note — otherwise we'd appreciate payment at your earliest convenience.\n\nThank you,\n${vars.businessName}`;
  }
  return instruction;
}

type Executor = (config: Record<string, unknown>, ctx: StepContext) => Promise<StepResult>;

const executors: Record<string, Executor> = {
  async notify(config, { run, vars }) {
    const title = fillTemplate(config.title, vars) || run.automationName;
    await notify(run.owner, {
      title: run.isTest ? `[Test] ${title}` : title,
      body: fillTemplate(config.message, vars),
      tone: "info",
      link: vars.invoiceId ? `/app/invoices?open=${vars.invoiceId}` : "/app/activity",
    });
    return { status: "success", message: `Notification: “${title}”` };
  },

  async email(config, { run, vars, ownerEmail }) {
    let to = fillTemplate(config.to, vars).trim();
    const subject = fillTemplate(config.subject, vars).trim() || run.automationName;
    const message = fillTemplate(config.message, vars);
    if (!EMAIL_RE.test(to)) throw new Error(`“${to || "(empty)"}” isn't a valid email address`);
    // Test runs never email customers — they go to the account owner.
    if (run.isTest) to = ownerEmail;
    const result = await sendEmail(to, subject, message, String(vars.businessName || ""));
    const where = run.isTest ? `to you (${to}) because this is a test` : `to ${to}`;
    return {
      status: "success",
      message: result.simulated ? `Email “${subject}” ready ${where} — add SMTP settings to deliver it` : `Emailed “${subject}” ${where}`,
    };
  },

  async ai_write(config, { vars }) {
    const instruction = fillTemplate(config.instruction, vars);
    const fallback = fallbackMessage(vars, instruction);
    const text = await aiText(
      "You write short, warm, professional business messages for a small business owner. Return only the message body, no subject line, under 150 words.",
      `${instruction}\n\nSign off as: ${vars.businessName}`,
      fallback
    );
    return {
      status: "success",
      message: isAIConfigured ? "AI wrote a message" : "Used a standard message (add OPENAI_API_KEY for AI-written text)",
      setVars: { aiMessage: text },
    };
  },

  async filter(config, { vars }) {
    const field = String(config.field || "");
    const passed = checkCondition(vars[field], config.operator as Operator, config.value);
    const def = STEP_MAP.get("filter")!.fields[1].options!.find((o) => o.value === config.operator);
    const desc = `${field} (${vars[field] ?? "empty"}) ${def?.label || config.operator} ${config.value}`;
    return passed ? { status: "success", message: `Condition met: ${desc}` } : { status: "stopped", message: `Stopped — condition not met: ${desc}` };
  },

  async wait(config, { run }) {
    const ms = waitMs(config.amount, config.unit);
    if (run.isTest) return { status: "success", message: `Skipped the ${config.amount} ${config.unit} wait (test run)` };
    return { status: "waiting", message: `Waiting ${config.amount} ${config.unit}`, waitMs: ms };
  },

  async ai_check(config, { vars }) {
    const question = fillTemplate(config.question, vars);
    if (!isAIConfigured) {
      return { status: "success", message: "Continued without asking — add OPENAI_API_KEY to let AI decide" };
    }
    const res = await aiJSON(
      'Answer the yes/no question about a small business automation. Reply as JSON {"answer": "yes" | "no", "reason": string (one sentence)}.',
      question,
      { answer: "yes", reason: "AI unavailable, continued" }
    );
    const yes = String(res.answer).toLowerCase().startsWith("y");
    return yes ? { status: "success", message: `AI said yes: ${res.reason}` } : { status: "stopped", message: `Stopped — AI said no: ${res.reason}` };
  },

  async update_invoice(config, { run, vars }) {
    const id = String(vars.invoiceId || "");
    if (!id) throw new Error("This automation wasn't started by an invoice");
    if (run.isTest) return { status: "success", message: "Test run — the invoice wasn't changed" };
    const updated =
      config.action === "mark_paid" ? await invoiceService.markPaid(run.owner, id, "other") : await invoiceService.markSent(run.owner, id);
    return { status: "success", message: `Invoice ${updated.number} is now ${updated.status}`, setVars: { status: updated.status } };
  },

  async slack(config, { vars }) {
    const url = String(config.webhookUrl || "").trim() || env.integrations.slackWebhookUrl;
    const text = fillTemplate(config.message, vars);
    if (!url) return { status: "success", message: "Slack isn't connected yet — add a Slack webhook link to this step" };
    const res = await safePostJSON(url, { text });
    if (!res.ok) throw new Error(`Slack replied with an error (${res.status}). Check the webhook link.`);
    return { status: "success", message: "Posted to Slack" };
  },

  async webhook(config, { run, vars }) {
    const res = await safePostJSON(String(config.url || ""), {
      automation: run.automationName,
      trigger: run.triggerType,
      test: run.isTest,
      data: vars,
    });
    if (!res.ok) throw new Error(`The app replied with an error (${res.status})`);
    return { status: "success", message: `Sent to ${new URL(String(config.url)).host}` };
  },
};

export async function executeStep(step: IStep, ctx: StepContext): Promise<StepResult> {
  const exec = executors[step.type];
  if (!exec) throw new Error(`Unknown step "${step.type}"`);
  return exec(step.config || {}, ctx);
}

// Runs a claimed run from its next step until it finishes, stops, fails or
// has to wait. All progress is saved on the run document itself.
export async function processRun(run: IRun): Promise<void> {
  const user = await User.findById(run.owner);
  const vars: Vars = { ...(run.vars as Vars) };

  // Invoices can change while a run waits (e.g. it got paid) — refresh.
  if (vars.invoiceId) {
    const inv = await Invoice.findOne({ _id: vars.invoiceId, owner: run.owner }).populate("customer");
    if (inv) Object.assign(vars, invoiceVars(inv));
  }

  if (!run.startedAt) run.startedAt = new Date();
  const log = (stepId: string, type: string, status: IStepLog["status"], message: string) =>
    run.logs.push({ stepId, type, status, message, at: new Date() });

  for (let i = run.nextStep; i < run.steps.length; i++) {
    const step = run.steps[i];
    let result: StepResult;
    try {
      result = await executeStep(step, { run, vars, ownerEmail: user?.email || "" });
    } catch (err) {
      const message = (err as Error).message || "Something went wrong";
      log(step.id, step.type, "failed", message);
      run.status = "failed";
      run.error = message;
      run.finishedAt = new Date();
      run.vars = vars;
      run.markModified("vars");
      await run.save();
      await notify(run.owner, {
        title: `“${run.automationName}” couldn't finish`,
        body: `Step ${i + 1} failed: ${message}`,
        tone: "warning",
        link: `/app/activity?run=${run._id}`,
      });
      return;
    }

    if (result.setVars) Object.assign(vars, result.setVars);
    log(step.id, step.type, result.status, result.message);

    if (result.status === "stopped") {
      run.status = "stopped";
      run.finishedAt = new Date();
      run.nextStep = i + 1;
      break;
    }
    if (result.status === "waiting") {
      run.status = "waiting";
      run.nextStep = i + 1;
      run.resumeAt = new Date(Date.now() + (result.waitMs || 0));
      run.claimedAt = undefined;
      run.vars = vars;
      run.markModified("vars");
      await run.save();
      return;
    }
    run.nextStep = i + 1;
  }

  if (run.status === "running") {
    run.status = "success";
    run.finishedAt = new Date();
  }
  run.resumeAt = undefined;
  run.vars = vars;
  run.markModified("vars");
  await run.save();
}
