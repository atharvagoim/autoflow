import { Types } from "mongoose";

// Pure helpers for automation data: building the variables a run can use,
// filling {{placeholders}}, checking conditions and working out schedules.
// No database access here (except summaryVars) so they're easy to unit test.

export type Vars = Record<string, string | number | boolean | null>;

export function formatMoney(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      // ₹1,50,000 for whole amounts, ₹1,234.50 otherwise
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(d: Date | string | number): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// Replaces {{key}} with the value from vars. Unknown keys become empty text,
// so a typo never leaks "{{…}}" into an email.
export function fillTemplate(text: unknown, vars: Vars): string {
  if (text === undefined || text === null) return "";
  return String(text).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export type Operator = "equals" | "not_equals" | "greater_than" | "less_than" | "contains";

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  return Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
}

export function checkCondition(actual: unknown, operator: Operator, expected: unknown): boolean {
  const a = String(actual ?? "").trim().toLowerCase();
  const e = String(expected ?? "").trim().toLowerCase();
  switch (operator) {
    case "greater_than":
      return toNumber(actual) > toNumber(expected);
    case "less_than":
      return toNumber(actual) < toNumber(expected);
    case "equals":
      return a === e || (a !== "" && e !== "" && !Number.isNaN(Number(a)) && Number(a) === Number(e));
    case "not_equals":
      return !checkCondition(actual, "equals", expected);
    case "contains":
      return e !== "" && a.includes(e);
    default:
      return false;
  }
}

const DAY = 24 * 60 * 60 * 1000;

interface InvoiceLike {
  _id: Types.ObjectId | string;
  number: string;
  total: number;
  currency: string;
  status: string;
  dueDate: Date;
  customer?: unknown;
}

export function invoiceVars(inv: InvoiceLike): Vars {
  const customer = (inv.customer && typeof inv.customer === "object" ? inv.customer : {}) as { name?: string; email?: string };
  const overdueMs = Date.now() - new Date(inv.dueDate).getTime();
  return {
    invoiceId: String(inv._id),
    invoiceNumber: inv.number,
    customerName: customer.name || "",
    customerEmail: customer.email || "",
    amount: inv.total,
    amountText: formatMoney(inv.total, inv.currency),
    currency: inv.currency,
    dueDate: formatDate(inv.dueDate),
    status: inv.status,
    daysOverdue: inv.status === "paid" ? 0 : Math.max(0, Math.floor(overdueMs / DAY)),
  };
}

interface ExpenseLike {
  _id: Types.ObjectId | string;
  title: string;
  amount: number;
  category: string;
  date: Date;
}

export function expenseVars(exp: ExpenseLike): Vars {
  return {
    expenseId: String(exp._id),
    expenseTitle: exp.title,
    amount: exp.amount,
    category: exp.category,
    expenseDate: formatDate(exp.date),
  };
}

// Adds the variables every run has, and currency-formatted amounts.
export function withCommonVars(vars: Vars, user: { name: string; email?: string; businessName?: string; currency: string }): Vars {
  const currency = String(vars.currency || user.currency || "INR");
  const out: Vars = {
    ...vars,
    userName: user.name,
    userEmail: user.email || "",
    businessName: user.businessName || user.name,
    today: formatDate(new Date()),
    currency,
  };
  if (typeof vars.amount === "number" && !vars.amountText) out.amountText = formatMoney(vars.amount, currency);
  return out;
}

// Webhook payloads: keep simple top-level values only, with sane limits.
export function flattenPayload(body: unknown): Vars {
  const out: Vars = {};
  if (!body || typeof body !== "object" || Array.isArray(body)) return out;
  for (const [key, value] of Object.entries(body as Record<string, unknown>).slice(0, 50)) {
    if (!/^[\w.]{1,40}$/.test(key)) continue;
    if (typeof value === "string") out[key] = value.slice(0, 2000);
    else if (typeof value === "number" || typeof value === "boolean") out[key] = value;
    else if (value === null) out[key] = null;
  }
  return out;
}

export interface ScheduleConfig {
  frequency?: string;
  hour?: string | number;
  weekday?: string | number;
  tzOffset?: number; // minutes, as from Date#getTimezoneOffset() in the user's browser
}

// Next time a schedule should run, strictly after `from`.
// Hours/weekdays are in the user's local time (tzOffset), stored as UTC.
export function nextScheduleRun(config: ScheduleConfig, from = new Date()): Date {
  const offsetMs = (Number(config.tzOffset) || 0) * 60 * 1000;
  const frequency = config.frequency || "daily";

  if (frequency === "hourly") {
    const next = new Date(from.getTime());
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(next.getUTCHours() + 1);
    return next;
  }

  const hour = Math.min(23, Math.max(0, Number(config.hour ?? 9) || 0));
  // Work in "local time expressed as UTC fields", then shift back.
  const localNow = new Date(from.getTime() - offsetMs);
  const candidate = new Date(localNow.getTime());
  candidate.setUTCHours(hour, 0, 0, 0);

  if (frequency === "weekly") {
    const weekday = Math.min(6, Math.max(0, Number(config.weekday ?? 1) || 0));
    let addDays = (weekday - candidate.getUTCDay() + 7) % 7;
    if (addDays === 0 && candidate.getTime() <= localNow.getTime()) addDays = 7;
    candidate.setUTCDate(candidate.getUTCDate() + addDays);
  } else if (candidate.getTime() <= localNow.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return new Date(candidate.getTime() + offsetMs);
}

export function waitMs(amount: unknown, unit: unknown): number {
  const n = Math.min(90, Math.max(1, Number(amount) || 1));
  const unitMs = unit === "minutes" ? 60_000 : unit === "hours" ? 3_600_000 : DAY;
  return n * unitMs;
}
