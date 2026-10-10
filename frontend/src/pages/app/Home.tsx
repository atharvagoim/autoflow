import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Check, FilePlus, Receipt, Sparkles, Workflow } from "lucide-react";
import { errorMessage, get, post } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { ago, compactMoney, day, greeting, money } from "../../lib/format";
import type { Dashboard } from "../../lib/types";
import { Button, ButtonLink, ErrorState, RunStatusPill, Skeleton } from "../../components/ui";
import { Sparkle } from "../../components/Brand";

function SetupChecklist({ setup }: { setup: Dashboard["setup"] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const load = useMutation({
    mutationFn: () => post("/auth/sample-data"),
    onSuccess: () => {
      qc.invalidateQueries();
      toast("Sample data loaded — have a look around");
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  const items = [
    { done: setup.hasCustomers, label: "Add your first customer", to: "/app/customers?new=1" },
    { done: setup.hasInvoices, label: "Create an invoice", to: "/app/invoices?new=1" },
    { done: setup.hasAutomations, label: "Switch on an automation", to: "/app/automations" },
    { done: setup.hasExpenses, label: "Record an expense", to: "/app/expenses?new=1" },
  ];
  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;

  return (
    <section className="surface relative mb-6 overflow-hidden p-5 sm:p-7">
      <Sparkle className="absolute right-6 top-6 hidden w-7 sm:block" />
      <h2 className="text-xl font-bold">Get set up</h2>
      <p className="mt-1 text-[15px] text-mute">{doneCount} of {items.length} done. Or fill your workspace with sample data to explore first.</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {items.map((i) => (
          <Link
            key={i.label}
            to={i.to}
            className={clsx("flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-semibold transition", i.done ? "bg-lime/10 text-lime" : "bg-ink-900 hover:bg-ink-800")}
          >
            <span className={clsx("grid h-6 w-6 shrink-0 place-items-center rounded-full", i.done ? "bg-lime text-ink-950" : "border border-white/20")}>
              {i.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            {i.label}
          </Link>
        ))}
      </div>
      {!setup.hasInvoices && (
        <Button variant="outline" size="sm" className="mt-5" onClick={() => load.mutate()} loading={load.isPending}>
          Load sample data
        </Button>
      )}
    </section>
  );
}

function Stat({ label, value, sub, accent, to }: { label: string; value: string; sub: string; accent: string; to: string }) {
  return (
    <Link to={to} className="surface group flex flex-col justify-between p-5 transition hover:border-white/15">
      <div className="flex items-center justify-between">
        <span className="text-sm text-mute">{label}</span>
        <span className={clsx("h-2.5 w-2.5 rounded-full", accent)} />
      </div>
      <div className="mt-5">
        <p className="tabular font-display text-2xl font-bold tracking-tight sm:text-[28px]">{value}</p>
        <p className="mt-0.5 text-xs text-dim">{sub}</p>
      </div>
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => get<Dashboard>("/dashboard") });
  const [chartFocus, setChartFocus] = useState<"both" | "income" | "expenses">("both");

  const firstName = user?.name.split(" ")[0] || "there";

  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  const change = data && data.incomeLastMonth > 0 ? Math.round(((data.incomeThisMonth - data.incomeLastMonth) / data.incomeLastMonth) * 100) : null;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1.5 text-[15px] text-mute">Here’s where your money stands today.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <ButtonLink to="/app/invoices?new=1" size="sm" icon={<FilePlus className="h-4 w-4" />}>
            New invoice
          </ButtonLink>
          <ButtonLink to="/app/expenses?new=1" size="sm" variant="outline" icon={<Receipt className="h-4 w-4" />}>
            Add expense
          </ButtonLink>
        </div>
      </div>

      {data && <SetupChecklist setup={data.setup} />}

      {/* Money row */}
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        {isLoading || !data ? (
          <Skeleton className="h-[260px] rounded-[32px]" />
        ) : (
          <Link to="/app/invoices?status=paid" className="pink-swirl relative flex min-h-[240px] flex-col justify-between overflow-hidden rounded-[32px] p-6 text-ink-950 shadow-pink sm:p-7">
            <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/25 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <span className="rounded-full bg-ink-950/90 px-3 py-1.5 text-xs font-semibold text-pink">Paid to you this month</span>
              {change !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold">
                  {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {Math.abs(change)}% vs last month
                </span>
              )}
            </div>
            <div className="relative">
              <p className="tabular break-all font-display text-5xl font-extrabold tracking-tight sm:text-6xl">{money(data.incomeThisMonth, currency)}</p>
              <p className="mt-1.5 text-sm font-medium text-ink-950/70">Last month: {money(data.incomeLastMonth, currency)}</p>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-2 gap-4">
          {isLoading || !data ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-3xl" />)
          ) : (
            <>
              <Stat label="Unpaid" value={compactMoney(data.unpaidTotal, currency)} sub={`${data.unpaidCount} invoice${data.unpaidCount === 1 ? "" : "s"}`} accent="bg-lilac" to="/app/invoices?status=unpaid" />
              <Stat label="Overdue" value={compactMoney(data.overdueTotal, currency)} sub={`${data.overdueCount} invoice${data.overdueCount === 1 ? "" : "s"}`} accent="bg-pink" to="/app/invoices?status=overdue" />
              <Stat label="Spent this month" value={compactMoney(data.expensesThisMonth, currency)} sub={data.expenseBreakdown[0] ? `Most on ${data.expenseBreakdown[0].category}` : "Nothing yet"} accent="bg-butter" to="/app/expenses" />
              <Stat label="Automation runs" value={String(data.automations.runsThisMonth)} sub={`${data.automations.active} of ${data.automations.total} switched on`} accent="bg-lime" to="/app/activity" />
            </>
          )}
        </div>
      </div>

      {/* Cash flow + automations */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Money in and out</h2>
            <div className="flex gap-1.5 text-xs font-semibold" role="group" aria-label="Show">
              {(
                [
                  ["both", "Both"],
                  ["income", "In"],
                  ["expenses", "Out"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} onClick={() => setChartFocus(v)} aria-pressed={chartFocus === v} className={clsx("rounded-full px-3 py-1.5 transition", chartFocus === v ? "bg-fog text-ink-950" : "bg-white/[0.05] text-mute hover:text-fog")}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-mute">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-lime" />Paid to you</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-pink" />Spent</span>
          </div>
          <div className="mt-4 h-[240px]">
            {data ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.cashflow} barGap={4} margin={{ left: -8, right: 4, top: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#6F6C7C", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: "#6F6C7C", fontSize: 11 }} tickFormatter={(v: number) => compactMoney(v, currency)} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{ background: "#1F1F28", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, color: "#F4F1F7" }}
                    formatter={(v: number, name: string) => [money(v, currency), name === "income" ? "Paid to you" : "Spent"]}
                  />
                  {chartFocus !== "expenses" && <Bar dataKey="income" fill="#C6F27C" radius={[8, 8, 8, 8]} maxBarSize={28} />}
                  {chartFocus !== "income" && <Bar dataKey="expenses" fill="#F5A3CB" radius={[8, 8, 8, 8]} maxBarSize={28} />}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full" />
            )}
          </div>
        </section>

        <section className="surface flex flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Automations</h2>
            <Link to="/app/activity" className="text-sm font-semibold text-pink hover:underline">
              All activity
            </Link>
          </div>
          {data && data.recentRuns.length === 0 ? (
            <div className="flex flex-1 flex-col items-start justify-center py-6">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink-950">
                <Workflow className="h-6 w-6" />
              </span>
              <p className="mt-4 font-semibold">Nothing has run yet</p>
              <p className="mt-1 text-sm text-mute">Switch on a template and AutoFlow starts working for you.</p>
              <ButtonLink to="/app/automations" size="sm" variant="lime" className="mt-4">
                Browse templates
              </ButtonLink>
            </div>
          ) : (
            <ul className="mt-4 space-y-1">
              {(data?.recentRuns || []).map((r) => (
                <li key={r._id}>
                  <Link to={`/app/activity?run=${r._id}`} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-white/[0.04]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">
                        {r.automationName}
                        {r.isTest && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-mute">Test</span>}
                      </span>
                      <span className="block text-xs text-dim">{ago(r.createdAt)}</span>
                    </span>
                    <RunStatusPill status={r.status} />
                  </Link>
                </li>
              ))}
              {!data && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </ul>
          )}
        </section>
      </div>

      {/* Due soon + spending */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="surface p-5 sm:p-6">
          <h2 className="text-lg font-bold">Due in the next 7 days</h2>
          {data && data.dueSoon.length === 0 && <p className="mt-3 text-sm text-mute">Nothing due this week.</p>}
          <ul className="mt-3 space-y-1">
            {data?.dueSoon.map((i) => (
              <li key={i._id}>
                <Link to={`/app/invoices?open=${i._id}`} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-white/[0.04]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-butter text-ink-950">
                    <FilePlus className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{i.customer}</span>
                    <span className="block text-xs text-dim">
                      {i.number}, due {day(i.dueDate)}
                    </span>
                  </span>
                  <span className="tabular font-semibold">{money(i.total, currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface p-5 sm:p-6">
          <h2 className="text-lg font-bold">Where your money went this month</h2>
          {data && data.expenseBreakdown.length === 0 && <p className="mt-3 text-sm text-mute">No expenses recorded this month.</p>}
          <ul className="mt-4 space-y-3.5">
            {data?.expenseBreakdown.slice(0, 5).map((c, idx) => {
              const max = data.expenseBreakdown[0].amount || 1;
              return (
                <li key={c.category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{c.category}</span>
                    <span className="tabular text-mute">{money(c.amount, currency)}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-white/[0.06]">
                    <div className={clsx("h-full rounded-full", ["bg-pink", "bg-butter", "bg-lilac", "bg-lime", "bg-white/60"][idx])} style={{ width: `${Math.max(4, (c.amount / max) * 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          {data && data.expenseBreakdown.length > 0 && (
            <Link to="/app/expenses" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-pink hover:underline">
              <Sparkles className="h-4 w-4" /> See all expenses
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
