// The complete list of triggers ("When…") and steps ("Then…") a user can
// pick in the no-code editor. The web app renders its forms straight from
// this catalog, so adding a field here is all it takes to show it in the UI.

export type FieldType = "text" | "textarea" | "number" | "select" | "url" | "variable";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string | number;
  allowVariables?: boolean; // shows "Insert field" chips under the input
  min?: number;
  max?: number;
  showIf?: { key: string; values: string[] };
}

export interface VariableDef {
  key: string;
  label: string;
  kind: "text" | "number";
}

export interface TriggerDef {
  type: string;
  label: string;
  description: string;
  icon: string;
  color: "pink" | "lime" | "butter" | "lilac";
  fields: FieldDef[];
  variables: VariableDef[];
}

export interface StepDef {
  type: string;
  label: string;
  description: string;
  icon: string;
  color: "pink" | "lime" | "butter" | "lilac";
  fields: FieldDef[];
  requiresTrigger?: string[]; // only valid with these triggers
  outputs?: VariableDef[]; // variables this step adds for later steps
}

const COMMON_VARS: VariableDef[] = [
  { key: "userName", label: "Your name", kind: "text" },
  { key: "userEmail", label: "Your email", kind: "text" },
  { key: "businessName", label: "Business name", kind: "text" },
  { key: "today", label: "Today's date", kind: "text" },
];

const INVOICE_VARS: VariableDef[] = [
  { key: "invoiceNumber", label: "Invoice number", kind: "text" },
  { key: "customerName", label: "Customer name", kind: "text" },
  { key: "customerEmail", label: "Customer email", kind: "text" },
  { key: "amount", label: "Amount", kind: "number" },
  { key: "amountText", label: "Amount with currency", kind: "text" },
  { key: "dueDate", label: "Due date", kind: "text" },
  { key: "status", label: "Invoice status", kind: "text" },
  { key: "daysOverdue", label: "Days overdue", kind: "number" },
];

const EXPENSE_VARS: VariableDef[] = [
  { key: "expenseTitle", label: "Expense title", kind: "text" },
  { key: "amount", label: "Amount", kind: "number" },
  { key: "amountText", label: "Amount with currency", kind: "text" },
  { key: "category", label: "Category", kind: "text" },
  { key: "expenseDate", label: "Expense date", kind: "text" },
];

const SUMMARY_VARS: VariableDef[] = [
  { key: "unpaidTotal", label: "Total unpaid", kind: "text" },
  { key: "unpaidCount", label: "Unpaid invoices", kind: "number" },
  { key: "overdueTotal", label: "Total overdue", kind: "text" },
  { key: "overdueCount", label: "Overdue invoices", kind: "number" },
  { key: "incomeThisMonth", label: "Income this month", kind: "text" },
  { key: "expensesThisMonth", label: "Expenses this month", kind: "text" },
];

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "AM" : "PM"}`,
}));
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => ({
  value: String(i),
  label: d,
}));

export const TRIGGERS: TriggerDef[] = [
  {
    type: "invoice_paid",
    label: "An invoice is paid",
    description: "Runs when you mark an invoice as paid.",
    icon: "badge-check",
    color: "lime",
    fields: [],
    variables: [...INVOICE_VARS, ...COMMON_VARS],
  },
  {
    type: "invoice_created",
    label: "An invoice is created",
    description: "Runs right after a new invoice is saved.",
    icon: "file-plus",
    color: "pink",
    fields: [],
    variables: [...INVOICE_VARS, ...COMMON_VARS],
  },
  {
    type: "invoice_overdue",
    label: "An invoice becomes overdue",
    description: "Runs the day after a sent invoice passes its due date.",
    icon: "alarm-clock",
    color: "butter",
    fields: [],
    variables: [...INVOICE_VARS, ...COMMON_VARS],
  },
  {
    type: "expense_added",
    label: "An expense is added",
    description: "Runs when you record a new expense.",
    icon: "receipt",
    color: "lilac",
    fields: [],
    variables: [...EXPENSE_VARS, ...COMMON_VARS],
  },
  {
    type: "schedule",
    label: "On a schedule",
    description: "Runs every hour, day or week.",
    icon: "calendar-clock",
    color: "butter",
    fields: [
      {
        key: "frequency",
        label: "How often",
        type: "select",
        required: true,
        defaultValue: "daily",
        options: [
          { value: "hourly", label: "Every hour" },
          { value: "daily", label: "Every day" },
          { value: "weekly", label: "Every week" },
        ],
      },
      { key: "weekday", label: "On", type: "select", defaultValue: "1", options: WEEKDAYS, showIf: { key: "frequency", values: ["weekly"] } },
      { key: "hour", label: "At", type: "select", defaultValue: "9", options: HOURS, showIf: { key: "frequency", values: ["daily", "weekly"] } },
    ],
    variables: [...SUMMARY_VARS, ...COMMON_VARS],
  },
  {
    type: "manual",
    label: "I click Run",
    description: "Runs only when you press the Run button.",
    icon: "mouse-pointer-click",
    color: "pink",
    fields: [],
    variables: [...SUMMARY_VARS, ...COMMON_VARS],
  },
  {
    type: "webhook",
    label: "Another app sends data",
    description: "Gives you a private link that other apps can send data to.",
    icon: "webhook",
    color: "lilac",
    fields: [],
    variables: [...COMMON_VARS],
  },
];

const INVOICE_TRIGGERS = ["invoice_paid", "invoice_created", "invoice_overdue"];

export const STEPS: StepDef[] = [
  {
    type: "notify",
    label: "Notify me",
    description: "Shows a notification in AutoFlow.",
    icon: "bell-ring",
    color: "pink",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, allowVariables: true, placeholder: "Payment received from {{customerName}}" },
      { key: "message", label: "Message", type: "textarea", allowVariables: true, placeholder: "{{amountText}} for {{invoiceNumber}}" },
    ],
  },
  {
    type: "email",
    label: "Send an email",
    description: "Emails anyone — a customer, your accountant, yourself.",
    icon: "mail",
    color: "lime",
    fields: [
      { key: "to", label: "To", type: "text", required: true, allowVariables: true, placeholder: "{{customerEmail}} or name@example.com" },
      { key: "subject", label: "Subject", type: "text", required: true, allowVariables: true, placeholder: "Thanks for your payment" },
      { key: "message", label: "Message", type: "textarea", required: true, allowVariables: true, placeholder: "Hi {{customerName}}, …" },
    ],
  },
  {
    type: "ai_write",
    label: "Write a message with AI",
    description: "Drafts text you can use in later steps as “AI message”.",
    icon: "sparkles",
    color: "lilac",
    fields: [
      {
        key: "instruction",
        label: "What should it write?",
        type: "textarea",
        required: true,
        allowVariables: true,
        placeholder: "A friendly, short payment reminder to {{customerName}} for {{amountText}} due {{dueDate}}",
      },
    ],
    outputs: [{ key: "aiMessage", label: "AI message", kind: "text" }],
  },
  {
    type: "filter",
    label: "Only continue if…",
    description: "Stops here unless a condition is true.",
    icon: "filter",
    color: "butter",
    fields: [
      { key: "field", label: "When", type: "variable", required: true },
      {
        key: "operator",
        label: "Condition",
        type: "select",
        required: true,
        defaultValue: "greater_than",
        options: [
          { value: "greater_than", label: "is more than" },
          { value: "less_than", label: "is less than" },
          { value: "equals", label: "is" },
          { value: "not_equals", label: "is not" },
          { value: "contains", label: "contains" },
        ],
      },
      { key: "value", label: "Value", type: "text", required: true, placeholder: "50000" },
    ],
  },
  {
    type: "wait",
    label: "Wait",
    description: "Pauses before the next step.",
    icon: "hourglass",
    color: "butter",
    fields: [
      { key: "amount", label: "For", type: "number", required: true, defaultValue: 1, min: 1, max: 90 },
      {
        key: "unit",
        label: "Unit",
        type: "select",
        required: true,
        defaultValue: "days",
        options: [
          { value: "minutes", label: "Minutes" },
          { value: "hours", label: "Hours" },
          { value: "days", label: "Days" },
        ],
      },
    ],
  },
  {
    type: "ai_check",
    label: "Ask AI yes or no",
    description: "Continues only if AI answers yes.",
    icon: "brain",
    color: "lilac",
    fields: [
      {
        key: "question",
        label: "Question",
        type: "textarea",
        required: true,
        allowVariables: true,
        placeholder: "Is “{{expenseTitle}}” for {{amountText}} unusual for a small design studio?",
      },
    ],
  },
  {
    type: "update_invoice",
    label: "Update the invoice",
    description: "Changes the invoice that started this automation.",
    icon: "file-check",
    color: "lime",
    requiresTrigger: INVOICE_TRIGGERS,
    fields: [
      {
        key: "action",
        label: "Change it to",
        type: "select",
        required: true,
        defaultValue: "mark_sent",
        options: [
          { value: "mark_sent", label: "Sent" },
          { value: "mark_paid", label: "Paid" },
        ],
      },
    ],
  },
  {
    type: "slack",
    label: "Post to Slack",
    description: "Sends a message to a Slack channel.",
    icon: "hash",
    color: "pink",
    fields: [
      { key: "message", label: "Message", type: "textarea", required: true, allowVariables: true, placeholder: "New invoice {{invoiceNumber}} for {{amountText}}" },
      {
        key: "webhookUrl",
        label: "Slack webhook link",
        type: "url",
        placeholder: "https://hooks.slack.com/services/…",
        help: "Optional if your server has SLACK_WEBHOOK_URL set.",
      },
    ],
  },
  {
    type: "webhook",
    label: "Send data to another app",
    description: "Posts all the details to a web address (Zapier, Make, your own server).",
    icon: "send",
    color: "lilac",
    fields: [{ key: "url", label: "Web address", type: "url", required: true, placeholder: "https://hooks.zapier.com/…" }],
  },
];

export const TRIGGER_MAP = new Map(TRIGGERS.map((t) => [t.type, t]));
export const STEP_MAP = new Map(STEPS.map((s) => [s.type, s]));

// Variables available to a step at a given position: the trigger's, plus
// any produced by earlier steps (e.g. "AI message").
export function variablesFor(triggerType: string, steps: Array<{ type: string }>, upToIndex: number): VariableDef[] {
  const vars = [...(TRIGGER_MAP.get(triggerType)?.variables || COMMON_VARS)];
  for (const step of steps.slice(0, upToIndex)) {
    for (const out of STEP_MAP.get(step.type)?.outputs || []) {
      if (!vars.some((v) => v.key === out.key)) vars.push(out);
    }
  }
  return vars;
}

// Returns human-readable problems; an automation can only be switched on
// when this list is empty. Drafts can always be saved.
export function findProblems(trigger: { type: string; config: Record<string, unknown> }, steps: Array<{ type: string; config: Record<string, unknown> }>): string[] {
  const problems: string[] = [];
  const triggerDef = TRIGGER_MAP.get(trigger.type);
  if (!triggerDef) problems.push("Choose what starts this automation");
  if (steps.length === 0) problems.push("Add at least one step");

  const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === "";
  for (const f of triggerDef?.fields || []) {
    if (f.required && isBlank(trigger.config?.[f.key])) problems.push(`Trigger: fill in “${f.label}”`);
  }

  steps.forEach((step, i) => {
    const def = STEP_MAP.get(step.type);
    const name = `Step ${i + 1}`;
    if (!def) {
      problems.push(`${name}: unknown step`);
      return;
    }
    if (def.requiresTrigger && !def.requiresTrigger.includes(trigger.type)) {
      problems.push(`${name} (${def.label}) only works when an invoice starts the automation`);
    }
    for (const f of def.fields) {
      if (f.required && isBlank(step.config?.[f.key])) problems.push(`${name} (${def.label}): fill in “${f.label}”`);
    }
    if (step.type === "wait") {
      const n = Number(step.config?.amount);
      if (!Number.isFinite(n) || n < 1 || n > 90) problems.push(`${name} (Wait): choose between 1 and 90`);
    }
    if (step.type === "filter" && step.config?.field) {
      const available = variablesFor(trigger.type, steps, i).map((v) => v.key);
      if (!available.includes(String(step.config.field)) && trigger.type !== "webhook") {
        problems.push(`${name} (Only continue if…): pick a field again — “${step.config.field}” isn't available for this trigger`);
      }
    }
  });
  return problems;
}
