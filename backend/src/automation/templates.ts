// One-click starting points. Each becomes a normal, editable automation.
export interface TemplateDef {
  key: string;
  name: string;
  description: string;
  trigger: { type: string; config: Record<string, unknown> };
  steps: Array<{ type: string; config: Record<string, unknown> }>;
}

export const TEMPLATES: TemplateDef[] = [
  {
    key: "thank_on_payment",
    name: "Thank customers when they pay",
    description: "Sends a thank-you email and tells you the money arrived.",
    trigger: { type: "invoice_paid", config: {} },
    steps: [
      {
        type: "email",
        config: {
          to: "{{customerEmail}}",
          subject: "Thanks for your payment for {{invoiceNumber}}",
          message: "Hi {{customerName}},\n\nWe've received your payment of {{amountText}} for invoice {{invoiceNumber}}. Thank you for working with us!\n\n{{businessName}}",
        },
      },
      { type: "notify", config: { title: "{{customerName}} paid {{amountText}}", message: "Invoice {{invoiceNumber}} is settled." } },
    ],
  },
  {
    key: "chase_overdue",
    name: "Chase overdue invoices",
    description: "Writes a polite reminder and emails it the day an invoice goes overdue.",
    trigger: { type: "invoice_overdue", config: {} },
    steps: [
      {
        type: "ai_write",
        config: { instruction: "A polite, friendly payment reminder to {{customerName}}: invoice {{invoiceNumber}} for {{amountText}} was due on {{dueDate}}." },
      },
      { type: "email", config: { to: "{{customerEmail}}", subject: "Reminder: invoice {{invoiceNumber}} is overdue", message: "{{aiMessage}}" } },
      { type: "notify", config: { title: "Reminder sent to {{customerName}}", message: "{{invoiceNumber}} for {{amountText}} was due {{dueDate}}." } },
    ],
  },
  {
    key: "second_reminder",
    name: "Follow up after 3 days",
    description: "If an overdue invoice is still unpaid 3 days later, sends a second reminder.",
    trigger: { type: "invoice_overdue", config: {} },
    steps: [
      { type: "wait", config: { amount: 3, unit: "days" } },
      { type: "filter", config: { field: "status", operator: "not_equals", value: "paid" } },
      {
        type: "email",
        config: {
          to: "{{customerEmail}}",
          subject: "Second reminder: {{invoiceNumber}}",
          message: "Hi {{customerName}},\n\nJust following up on invoice {{invoiceNumber}} for {{amountText}}, which is now {{daysOverdue}} days overdue. Could you let us know when we can expect payment?\n\nThanks,\n{{businessName}}",
        },
      },
    ],
  },
  {
    key: "big_invoice_alert",
    name: "Celebrate big invoices",
    description: "Notifies you (and Slack, if connected) when an invoice over 50,000 is created.",
    trigger: { type: "invoice_created", config: {} },
    steps: [
      { type: "filter", config: { field: "amount", operator: "greater_than", value: "50000" } },
      { type: "notify", config: { title: "Big one: {{amountText}} for {{customerName}}", message: "Invoice {{invoiceNumber}} is due {{dueDate}}." } },
      { type: "slack", config: { message: "New invoice {{invoiceNumber}} for {{amountText}} to {{customerName}}", webhookUrl: "" } },
    ],
  },
  {
    key: "large_expense",
    name: "Flag large expenses",
    description: "Notifies you when a single expense is over 10,000.",
    trigger: { type: "expense_added", config: {} },
    steps: [
      { type: "filter", config: { field: "amount", operator: "greater_than", value: "10000" } },
      { type: "notify", config: { title: "Large expense: {{expenseTitle}}", message: "{{amountText}} in {{category}} on {{expenseDate}}." } },
    ],
  },
  {
    key: "daily_summary",
    name: "Morning money summary",
    description: "Every morning at 9, shows what's unpaid, overdue and earned this month.",
    trigger: { type: "schedule", config: { frequency: "daily", hour: "9", weekday: "1" } },
    steps: [
      {
        type: "notify",
        config: {
          title: "Today: {{unpaidTotal}} unpaid",
          message: "{{unpaidCount}} unpaid invoices, {{overdueCount}} overdue ({{overdueTotal}}). Income this month: {{incomeThisMonth}}. Expenses: {{expensesThisMonth}}.",
        },
      },
    ],
  },
  {
    key: "send_new_invoices",
    name: "Email new invoices to customers",
    description: "Emails the customer as soon as you create an invoice and marks it sent.",
    trigger: { type: "invoice_created", config: {} },
    steps: [
      {
        type: "email",
        config: {
          to: "{{customerEmail}}",
          subject: "Invoice {{invoiceNumber}} from {{businessName}}",
          message: "Hi {{customerName}},\n\nHere's invoice {{invoiceNumber}} for {{amountText}}, due on {{dueDate}}.\n\nThank you,\n{{businessName}}",
        },
      },
      { type: "update_invoice", config: { action: "mark_sent" } },
    ],
  },
  {
    key: "weekly_review",
    name: "Weekly review in your inbox",
    description: "Every Monday morning, emails you a short summary of the week ahead.",
    trigger: { type: "schedule", config: { frequency: "weekly", weekday: "1", hour: "9" } },
    steps: [
      {
        type: "ai_write",
        config: {
          instruction: "A short, upbeat weekly money summary for {{userName}}: {{unpaidCount}} unpaid invoices totalling {{unpaidTotal}}, {{overdueCount}} overdue ({{overdueTotal}}), income this month {{incomeThisMonth}}, expenses this month {{expensesThisMonth}}. Suggest one action.",
        },
      },
      { type: "email", config: { to: "{{userEmail}}", subject: "Your week ahead", message: "{{aiMessage}}" } },
    ],
  },
];

export const TEMPLATE_MAP = new Map(TEMPLATES.map((t) => [t.key, t]));
