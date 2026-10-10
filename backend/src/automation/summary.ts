import { Types } from "mongoose";
import { Invoice } from "../models/Invoice";
import { Expense } from "../models/Expense";
import { formatMoney, Vars } from "./variables";

function startOfMonth(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

// Money snapshot used by scheduled and manual automations ("daily summary").
export async function summaryVars(owner: Types.ObjectId, currency: string): Promise<Vars> {
  const monthStart = startOfMonth();
  const [unpaid, overdue, income, expenses] = await Promise.all([
    Invoice.find({ owner, status: { $in: ["sent", "overdue"] } }, { total: 1 }).lean(),
    Invoice.find({ owner, status: "overdue" }, { total: 1 }).lean(),
    Invoice.find({ owner, status: "paid", paidAt: { $gte: monthStart } }, { total: 1 }).lean(),
    Expense.find({ owner, date: { $gte: monthStart } }, { amount: 1 }).lean(),
  ]);
  const sum = (rows: Array<{ total?: number; amount?: number }>) => rows.reduce((s, r) => s + (r.total ?? r.amount ?? 0), 0);
  return {
    unpaidTotal: formatMoney(sum(unpaid), currency),
    unpaidCount: unpaid.length,
    overdueTotal: formatMoney(sum(overdue), currency),
    overdueCount: overdue.length,
    incomeThisMonth: formatMoney(sum(income), currency),
    expensesThisMonth: formatMoney(sum(expenses), currency),
  };
}
