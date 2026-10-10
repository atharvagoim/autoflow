export type Accent = "pink" | "lime" | "butter" | "lilac";

export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  invoices?: number;
  billed?: number;
  unpaid?: number;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  _id: string;
  number: string;
  customer: Customer;
  items: InvoiceItem[];
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  notes: string;
  createdAt: string;
}

export interface Expense {
  _id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
  categorizedByAI: boolean;
}

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "url" | "variable";
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string | number;
  allowVariables?: boolean;
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
  color: Accent;
  fields: FieldDef[];
  variables: VariableDef[];
}

export interface StepDef {
  type: string;
  label: string;
  description: string;
  icon: string;
  color: Accent;
  fields: FieldDef[];
  requiresTrigger?: string[];
  outputs?: VariableDef[];
}

export interface TemplateSummary {
  key: string;
  name: string;
  description: string;
  triggerType: string;
  stepTypes: string[];
}

export interface Catalog {
  triggers: TriggerDef[];
  steps: StepDef[];
  templates: TemplateSummary[];
}

export type ConfigValue = string | number;

export interface Step {
  id: string;
  type: string;
  config: Record<string, ConfigValue>;
}

export type RunStatus = "queued" | "running" | "waiting" | "success" | "stopped" | "failed";

export interface Automation {
  _id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: { type: string; config: Record<string, ConfigValue> };
  steps: Step[];
  webhookKey: string;
  nextRunAt?: string;
  lastRunAt?: string;
  runCount: number;
  problems: string[];
  lastRun?: { status: RunStatus; at: string } | null;
}

export interface Run {
  _id: string;
  automation: string;
  automationName: string;
  triggerType: string;
  isTest: boolean;
  status: RunStatus;
  logs: Array<{ stepId: string; type: string; status: string; message: string; at: string }>;
  error?: string;
  createdAt: string;
  finishedAt?: string;
  resumeAt?: string;
}

export interface Notification {
  _id: string;
  title: string;
  body: string;
  tone: "info" | "success" | "warning";
  link: string;
  read: boolean;
  createdAt: string;
}

export interface Dashboard {
  incomeThisMonth: number;
  incomeLastMonth: number;
  unpaidTotal: number;
  unpaidCount: number;
  overdueTotal: number;
  overdueCount: number;
  expensesThisMonth: number;
  cashflow: Array<{ month: string; income: number; expenses: number }>;
  expenseBreakdown: Array<{ category: string; amount: number }>;
  automations: { total: number; active: number; runsThisMonth: number };
  recentRuns: Array<Pick<Run, "_id" | "automationName" | "status" | "createdAt" | "isTest" | "triggerType">>;
  dueSoon: Array<{ _id: string; number: string; total: number; dueDate: string; customer: string }>;
  setup: { hasCustomers: boolean; hasInvoices: boolean; hasExpenses: boolean; hasAutomations: boolean };
}

export interface ServerConfig {
  demoEnabled: boolean;
  aiEnabled: boolean;
  emailEnabled: boolean;
}
