import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus, Receipt, Sparkles, Trash2 } from "lucide-react";
import { del, errorMessage, get, post, put } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { date, money, todayInput, toInputDate } from "../../lib/format";
import type { Expense } from "../../lib/types";
import { Button, ConfirmSheet, EmptyState, ErrorState, Input, Select, Sheet, Skeleton, Textarea } from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";

const CATEGORY_COLORS: Record<string, string> = {
  Software: "bg-lilac",
  Travel: "bg-lime",
  Meals: "bg-pink",
  Office: "bg-butter",
  Marketing: "bg-pink-soft",
  Utilities: "bg-lilac-deep",
  Rent: "bg-butter-deep",
  Salaries: "bg-lime-deep",
  "Professional services": "bg-white/80",
  Other: "bg-ink-600",
};

function ExpenseSheet({ open, onClose, expense }: { open: boolean; onClose: () => void; expense: Expense | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const { data: categories = [] } = useQuery({ queryKey: ["expense-categories"], queryFn: () => get<string[]>("/expenses/categories"), staleTime: Infinity, enabled: open });
  const [form, setForm] = useState({ title: "", amount: "", category: "auto", date: todayInput(), notes: "" });
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      expense
        ? { title: expense.title, amount: String(expense.amount), category: expense.category, date: toInputDate(expense.date), notes: expense.notes || "" }
        : { title: "", amount: "", category: "auto", date: todayInput(), notes: "" }
    );
  }, [open, expense]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["runs"] });
    }, 1500);
  };

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, amount: parseFloat(form.amount.replace(/,/g, "")), title: form.title.trim() };
      return expense ? put<Expense>(`/expenses/${expense._id}`, body) : post<Expense>("/expenses", body);
    },
    onSuccess: (e) => {
      refresh();
      toast(form.category === "auto" ? `Saved under ${e.category}` : "Expense saved");
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => del(`/expenses/${expense!._id}`),
    onSuccess: () => {
      refresh();
      toast("Expense deleted");
      setConfirmDelete(false);
      onClose();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const amount = parseFloat(form.amount.replace(/,/g, ""));
    if (!form.title.trim()) return setError("What was this expense for?");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter an amount more than 0");
    setError("");
    save.mutate();
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={expense ? "Edit expense" : "Add an expense"}
        footer={
          <>
            {expense && (
              <Button variant="ghost" className="mr-auto text-danger hover:text-danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => submit()} loading={save.isPending}>{expense ? "Save changes" : "Add expense"}</Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Input label="What was it for?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Uber to client office" maxLength={120} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={`Amount (${user?.currency || "INR"})`} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="450" className="tabular" />
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={[{ value: "auto", label: "Let AutoFlow decide" }, ...categories.map((c) => ({ value: c, label: c }))]}
            help={form.category === "auto" ? "Picked from the description when you save." : undefined}
          />
          <Textarea label="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} className="min-h-[72px]" />
          {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
          <button type="submit" hidden />
        </form>
      </Sheet>
      <ConfirmSheet open={confirmDelete} title="Delete this expense?" body={`“${expense?.title}” will be removed permanently.`} confirmLabel="Delete expense" onConfirm={() => remove.mutate()} onClose={() => setConfirmDelete(false)} loading={remove.isPending} />
    </>
  );
}

export default function Expenses() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["expenses"], queryFn: () => get<Expense[]>("/expenses") });

  useEffect(() => {
    if (params.get("new") === "1") {
      setOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; total: number; items: Expense[] }>();
    for (const e of data || []) {
      const d = new Date(e.date);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      if (!map.has(key)) map.set(key, { label: date(e.date, { month: "long", year: "numeric", timeZone: "UTC" }), total: 0, items: [] });
      const g = map.get(key)!;
      g.total += e.amount;
      g.items.push(e);
    }
    return [...map.values()];
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Note what you spend. AutoFlow sorts it into categories."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setOpen(true); }}>Add expense</Button>}
      />

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon={<Receipt className="h-6 w-6" />} title="No expenses yet" body="Add what you spend — just describe it and AutoFlow files it under the right category." action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Add an expense</Button>} />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.label}>
              <div className="mb-3 flex items-baseline justify-between px-1">
                <h2 className="text-lg font-bold">{g.label}</h2>
                <span className="tabular text-sm text-mute">{money(g.total, currency)}</span>
              </div>
              <ul className="surface divide-y divide-white/[0.05] overflow-hidden">
                {g.items.map((e) => (
                  <li key={e._id}>
                    <button type="button" onClick={() => { setEditing(e); setOpen(true); }} className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]">
                      <span className={clsx("h-10 w-1.5 shrink-0 rounded-full", CATEGORY_COLORS[e.category] || "bg-ink-600")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{e.title}</span>
                        <span className="flex items-center gap-1.5 text-xs text-dim">
                          {e.category}
                          {e.categorizedByAI && <Sparkles className="h-3 w-3 text-lilac" aria-label="Picked by AutoFlow" />}
                          <span className="ml-1.5">{date(e.date, { day: "numeric", month: "short", timeZone: "UTC" })}</span>
                        </span>
                      </span>
                      <span className="tabular shrink-0 font-semibold">{money(e.amount, currency)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ExpenseSheet open={open} expense={editing} onClose={() => { setOpen(false); setEditing(null); }} />
    </div>
  );
}
