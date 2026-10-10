import { Types } from "mongoose";
import { Invoice } from "../models/Invoice";
import { Expense } from "../models/Expense";
import { Customer } from "../models/Customer";
import { Automation } from "../models/Automation";
import { Run } from "../models/Run";
import { sweepOverdue } from "./invoices";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;

export async function summary(owner: Types.ObjectId) {
  await sweepOverdue(owner);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const weekAhead = new Date(now.getTime() + 7 * 86400000);

  const [paid, open, expenses, customers, automations, runs, dueSoon] = await Promise.all([
    Invoice.find({ owner, status: "paid", paidAt: { $gte: sixMonthsAgo } }, { total: 1, paidAt: 1 }).lean(),
    Invoice.find({ owner, status: { $in: ["sent", "overdue"] } }, { total: 1, status: 1 }).lean(),
    Expense.find({ owner, date: { $gte: sixMonthsAgo } }, { amount: 1, date: 1, category: 1 }).lean(),
    Customer.countDocuments({ owner }),
    Automation.find({ owner }, { enabled: 1 }).lean(),
    Run.find({ owner }, { automationName: 1, status: 1, createdAt: 1, isTest: 1, triggerType: 1 }).sort({ createdAt: -1 }).limit(6).lean(),
    Invoice.find({ owner, status: "sent", dueDate: { $lte: weekAhead } })
      .sort({ dueDate: 1 })
      .limit(5)
      .populate("customer", "name")
      .lean(),
  ]);
  const [invoiceCount, expenseCount, runsThisMonth] = await Promise.all([
    Invoice.countDocuments({ owner }),
    Expense.countDocuments({ owner }),
    Run.countDocuments({ owner, isTest: false, createdAt: { $gte: monthStart } }),
  ]);

  const sum = (rows: Array<{ total?: number; amount?: number }>) => rows.reduce((s, r) => s + (r.total ?? r.amount ?? 0), 0);

  const buckets = new Map<string, { month: string; income: number; expenses: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.set(monthKey(d), { month: MONTHS[d.getUTCMonth()], income: 0, expenses: 0 });
  }
  for (const p of paid) if (p.paidAt) buckets.get(monthKey(new Date(p.paidAt)))!.income += p.total;
  for (const e of expenses) {
    const b = buckets.get(monthKey(new Date(e.date)));
    if (b) b.expenses += e.amount;
  }

  const incomeThisMonth = sum(paid.filter((p) => p.paidAt && p.paidAt >= monthStart));
  const incomeLastMonth = sum(paid.filter((p) => p.paidAt && p.paidAt >= lastMonthStart && p.paidAt < monthStart));
  const monthExpenses = expenses.filter((e) => e.date >= monthStart);
  const byCategory = new Map<string, number>();
  for (const e of monthExpenses) byCategory.set(e.category, (byCategory.get(e.category) || 0) + e.amount);

  return {
    incomeThisMonth,
    incomeLastMonth,
    unpaidTotal: sum(open),
    unpaidCount: open.length,
    overdueTotal: sum(open.filter((o) => o.status === "overdue")),
    overdueCount: open.filter((o) => o.status === "overdue").length,
    expensesThisMonth: sum(monthExpenses),
    cashflow: [...buckets.values()],
    expenseBreakdown: [...byCategory.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    automations: { total: automations.length, active: automations.filter((a) => a.enabled).length, runsThisMonth },
    recentRuns: runs,
    dueSoon: dueSoon.map((i) => ({ _id: i._id, number: i.number, total: i.total, dueDate: i.dueDate, customer: (i.customer as { name?: string })?.name || "" })),
    setup: {
      hasCustomers: customers > 0,
      hasInvoices: invoiceCount > 0,
      hasExpenses: expenseCount > 0,
      hasAutomations: automations.length > 0,
    },
  };
}
