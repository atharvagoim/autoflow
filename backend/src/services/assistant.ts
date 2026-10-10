import { Types } from "mongoose";
import { Invoice } from "../models/Invoice";
import { Expense } from "../models/Expense";
import { Run } from "../models/Run";
import { User } from "../models/User";
import { aiText, isAIConfigured } from "../lib/ai";
import { formatMoney, formatDate } from "../automation/variables";
import { summary } from "./dashboard";

// The assistant answers from your real numbers. It gathers a compact
// snapshot, then (with an OpenAI key) lets the model phrase the answer;
// without a key it answers common questions directly from the data.
export async function ask(owner: Types.ObjectId, question: string) {
  const user = await User.findById(owner);
  const currency = user?.currency || "INR";
  const money = (n: number) => formatMoney(n, currency);
  const s = await summary(owner);
  const overdue = await Invoice.find({ owner, status: "overdue" }).sort({ dueDate: 1 }).limit(10).populate("customer", "name").lean();
  const topExpenses = await Expense.find({ owner }).sort({ amount: -1 }).limit(5).lean();
  const failed = await Run.countDocuments({ owner, status: "failed", createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } });

  const q = question.toLowerCase();
  const overdueList = overdue.map((i) => `${i.number} — ${(i.customer as { name?: string })?.name || "customer"}, ${money(i.total)}, due ${formatDate(i.dueDate)}`);

  let direct: string;
  if (/overdue|late|chase|owe/.test(q)) {
    direct = overdue.length
      ? `You have ${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"} worth ${money(s.overdueTotal)}:\n${overdueList.join("\n")}`
      : "Nothing is overdue right now.";
  } else if (/unpaid|outstanding|pending|receiv/.test(q)) {
    direct = `${s.unpaidCount} invoice${s.unpaidCount === 1 ? " is" : "s are"} unpaid, totalling ${money(s.unpaidTotal)} (${money(s.overdueTotal)} of it overdue).`;
  } else if (/expens|spend|spent|cost/.test(q)) {
    const cats = s.expenseBreakdown.map((c) => `${c.category}: ${money(c.amount)}`).join(", ");
    direct = `You've spent ${money(s.expensesThisMonth)} this month${cats ? ` — ${cats}` : ""}.`;
  } else if (/income|revenue|earn|made|paid/.test(q)) {
    direct = `You've been paid ${money(s.incomeThisMonth)} this month, compared with ${money(s.incomeLastMonth)} last month.`;
  } else if (/automation|workflow|fail/.test(q)) {
    direct = `${s.automations.active} of ${s.automations.total} automations are on, with ${s.automations.runsThisMonth} runs this month. ${failed ? `${failed} run${failed === 1 ? "" : "s"} failed in the last 7 days — check Activity.` : "No failures in the last 7 days."}`;
  } else if (/profit|net/.test(q)) {
    direct = `This month: ${money(s.incomeThisMonth)} in, ${money(s.expensesThisMonth)} out — ${money(s.incomeThisMonth - s.expensesThisMonth)} net.`;
  } else {
    direct = `Here's where things stand: ${money(s.incomeThisMonth)} earned this month, ${money(s.unpaidTotal)} unpaid (${s.overdueCount} overdue), and ${money(s.expensesThisMonth)} spent. Ask me about overdue invoices, spending, income or your automations.`;
  }

  if (!isAIConfigured) return { reply: direct, usedAI: false };

  const facts = {
    currency,
    incomeThisMonth: money(s.incomeThisMonth),
    incomeLastMonth: money(s.incomeLastMonth),
    unpaid: `${s.unpaidCount} invoices, ${money(s.unpaidTotal)}`,
    overdue: overdueList,
    expensesThisMonth: money(s.expensesThisMonth),
    expenseBreakdown: s.expenseBreakdown.map((c) => `${c.category}: ${money(c.amount)}`),
    biggestExpenses: topExpenses.map((e) => `${e.title}: ${money(e.amount)}`),
    cashflowLast6Months: s.cashflow.map((m) => `${m.month}: in ${money(m.income)}, out ${money(m.expenses)}`),
    automations: s.automations,
    failedRunsLast7Days: failed,
  };
  const reply = await aiText(
    "You are AutoFlow's money assistant for a small business owner. Answer in 1-4 short sentences using ONLY the facts provided. Use the given formatted amounts. If the facts don't cover the question, say what you can see and suggest where in AutoFlow to look. No markdown headings.",
    `Facts: ${JSON.stringify(facts)}\n\nQuestion: ${question}`,
    direct
  );
  return { reply, usedAI: true };
}
