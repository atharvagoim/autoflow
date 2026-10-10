import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileText, Pencil, Plus, Search, Send, Trash2, Undo2 } from "lucide-react";
import { del, errorMessage, get, openPdf, post } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { day, money } from "../../lib/format";
import type { Invoice, InvoiceStatus } from "../../lib/types";
import { Button, ConfirmSheet, EmptyState, ErrorState, InvoiceStatusPill, Segmented, Select, Sheet, Skeleton } from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";
import { InvoiceForm } from "../../components/InvoiceForm";

type Filter = "all" | "unpaid" | "overdue" | "paid" | "draft";
const METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

function useInvalidateMoney() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["customers"] });
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["runs"] });
    }, 1500);
  };
}

function InvoiceDetail({ invoice, onClose, onEdit }: { invoice: Invoice | null; onClose: () => void; onEdit: (inv: Invoice) => void }) {
  const toast = useToast();
  const refresh = useInvalidateMoney();
  const [method, setMethod] = useState("bank_transfer");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const act = useMutation({
    mutationFn: async (action: "pay" | "send" | "unpay" | "delete") => {
      if (!invoice) return;
      if (action === "delete") return del(`/invoices/${invoice._id}`);
      return post(`/invoices/${invoice._id}/${action}`, action === "pay" ? { method } : {});
    },
    onSuccess: (_d, action) => {
      refresh();
      const msg = { pay: `${invoice?.number} marked as paid`, send: `${invoice?.number} marked as sent`, unpay: `${invoice?.number} marked as unpaid`, delete: `${invoice?.number} deleted` }[action];
      toast(msg);
      setConfirmDelete(false);
      onClose();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  async function pdf() {
    if (!invoice) return;
    setPdfLoading(true);
    try {
      await openPdf(invoice._id, invoice.number);
    } catch (e) {
      toast(errorMessage(e, "Couldn't open the PDF"), "error");
    } finally {
      setPdfLoading(false);
    }
  }

  if (!invoice) return null;
  const unpaid = invoice.status === "sent" || invoice.status === "overdue";

  return (
    <>
      <Sheet open={Boolean(invoice)} onClose={onClose} title={invoice.number} wide description={<InvoiceStatusPill status={invoice.status} />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-ink-900 p-4">
            <p className="text-xs text-dim">Billed to</p>
            <p className="mt-1 font-semibold">{invoice.customer?.name}</p>
            <p className="text-sm text-mute">{invoice.customer?.company}</p>
            <p className="break-all text-sm text-mute">{invoice.customer?.email}</p>
          </div>
          <div className="rounded-3xl bg-ink-900 p-4 text-sm">
            <div className="flex justify-between"><span className="text-dim">Issued</span><span>{day(invoice.issueDate)}</span></div>
            <div className="mt-1.5 flex justify-between"><span className="text-dim">Due</span><span>{day(invoice.dueDate)}</span></div>
            {invoice.paidAt && (
              <div className="mt-1.5 flex justify-between"><span className="text-dim">Paid</span><span>{day(invoice.paidAt)}</span></div>
            )}
          </div>
        </div>

        <ul className="mt-4 divide-y divide-white/[0.06] rounded-3xl border border-white/[0.07]">
          {invoice.items.map((it, i) => (
            <li key={i} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
              <span className="min-w-0">
                <span className="block font-medium">{it.description}</span>
                <span className="tabular text-dim">
                  {it.quantity} × {money(it.unitPrice, invoice.currency)}
                </span>
              </span>
              <span className="tabular shrink-0 font-semibold">{money(it.quantity * it.unitPrice, invoice.currency)}</span>
            </li>
          ))}
          <li className="space-y-1 px-4 py-3 text-sm">
            <div className="flex justify-between text-mute"><span>Subtotal</span><span className="tabular">{money(invoice.subtotal, invoice.currency)}</span></div>
            <div className="flex justify-between text-mute"><span>Tax ({invoice.taxRate}%)</span><span className="tabular">{money(invoice.tax, invoice.currency)}</span></div>
            <div className="flex items-baseline justify-between pt-1"><span className="font-semibold">Total</span><span className="tabular font-display text-2xl font-bold">{money(invoice.total, invoice.currency)}</span></div>
          </li>
        </ul>
        {invoice.notes && <p className="mt-4 whitespace-pre-line text-sm text-mute">{invoice.notes}</p>}

        {unpaid && (
          <div className="mt-5 rounded-3xl border border-lime/25 bg-lime/[0.06] p-4">
            <p className="font-semibold">Got paid?</p>
            <p className="mt-0.5 text-sm text-mute">Marking it paid runs your “An invoice is paid” automations.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Select aria-label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)} options={METHODS} wrapClass="sm:w-48" />
              <Button variant="lime" onClick={() => act.mutate("pay")} loading={act.isPending && act.variables === "pay"} icon={<CheckCircle2 className="h-4 w-4" />}>
                Mark as paid
              </Button>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={pdf} loading={pdfLoading} icon={<Download className="h-4 w-4" />}>
            Download PDF
          </Button>
          {invoice.status === "draft" && (
            <Button variant="outline" size="sm" onClick={() => act.mutate("send")} loading={act.isPending && act.variables === "send"} icon={<Send className="h-4 w-4" />}>
              Mark as sent
            </Button>
          )}
          {invoice.status !== "paid" && (
            <Button variant="outline" size="sm" onClick={() => onEdit(invoice)} icon={<Pencil className="h-4 w-4" />}>
              Edit
            </Button>
          )}
          {invoice.status === "paid" && (
            <Button variant="outline" size="sm" onClick={() => act.mutate("unpay")} loading={act.isPending && act.variables === "unpay"} icon={<Undo2 className="h-4 w-4" />}>
              Mark as unpaid
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} icon={<Trash2 className="h-4 w-4" />} className="text-danger hover:text-danger">
            Delete
          </Button>
        </div>
      </Sheet>
      <ConfirmSheet
        open={confirmDelete}
        title={`Delete ${invoice.number}?`}
        body="The invoice will be removed permanently. This can't be undone."
        confirmLabel="Delete invoice"
        onConfirm={() => act.mutate("delete")}
        onClose={() => setConfirmDelete(false)}
        loading={act.isPending && act.variables === "delete"}
      />
    </>
  );
}

export default function Invoices() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const [params, setParams] = useSearchParams();
  const filter = (params.get("status") as Filter) || "all";
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("open"));

  const { data: invoices, isLoading, error, refetch } = useQuery({ queryKey: ["invoices"], queryFn: () => get<Invoice[]>("/invoices") });

  // Deep links from notifications / home (?open=…, ?new=1) — consume them once.
  useEffect(() => {
    const open = params.get("open");
    const isNew = params.get("new") === "1";
    if (open || isNew) {
      if (open) setSelectedId(open);
      if (isNew) setFormOpen(true);
      const next = new URLSearchParams(params);
      next.delete("open");
      next.delete("new");
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, unpaid: 0, overdue: 0, paid: 0, draft: 0 };
    for (const i of invoices || []) {
      c.all++;
      if (i.status === "sent" || i.status === "overdue") c.unpaid++;
      if (i.status in c) c[i.status as Exclude<Filter, "all" | "unpaid">]++;
    }
    return c;
  }, [invoices]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (invoices || []).filter((i) => {
      const matches =
        filter === "all" || (filter === "unpaid" ? i.status === "sent" || i.status === "overdue" : i.status === (filter as InvoiceStatus));
      const text = `${i.number} ${i.customer?.name} ${i.customer?.company}`.toLowerCase();
      return matches && (!q || text.includes(q));
    });
  }, [invoices, filter, search]);

  const selected = invoices?.find((i) => i._id === selectedId) || null;

  const setFilter = (f: Filter) => {
    const next = new URLSearchParams(params);
    if (f === "all") next.delete("status");
    else next.set("status", f);
    setParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Create, send and track what you're owed."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            New invoice
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          label="Filter invoices"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "unpaid", label: "Unpaid", count: counts.unpaid },
            { value: "overdue", label: "Overdue", count: counts.overdue },
            { value: "paid", label: "Paid", count: counts.paid },
            { value: "draft", label: "Drafts", count: counts.draft },
          ]}
        />
        <label className="relative md:w-72">
          <span className="sr-only">Search invoices</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search number or customer" className="field rounded-full py-2.5 pl-10" />
        </label>
      </div>

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[72px]" />)}</div>
      ) : !invoices?.length ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No invoices yet"
          body="Create your first invoice. Once it's saved, your automations can email it, chase it and thank the customer when it's paid."
          action={<Button onClick={() => setFormOpen(true)} icon={<Plus className="h-4 w-4" />}>Create an invoice</Button>}
        />
      ) : visible.length === 0 ? (
        <p className="surface px-6 py-10 text-center text-mute">No invoices match. Try another filter or search.</p>
      ) : (
        <div className="surface overflow-hidden">
          <div className="hidden grid-cols-[110px_1fr_130px_130px_100px] gap-4 border-b border-white/[0.06] px-5 py-3 text-xs font-semibold text-dim md:grid">
            <span>Number</span>
            <span>Customer</span>
            <span>Due</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Status</span>
          </div>
          <ul className="divide-y divide-white/[0.05]">
            {visible.map((inv) => (
              <li key={inv._id}>
                <button type="button" onClick={() => setSelectedId(inv._id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 text-left transition hover:bg-white/[0.03] md:grid-cols-[110px_1fr_130px_130px_100px]">
                  <span className="text-sm text-dim md:order-none">{inv.number}</span>
                  <span className="row-start-2 min-w-0 truncate font-semibold md:row-start-auto">{inv.customer?.name || "Unknown customer"}</span>
                  <span className="hidden text-sm text-mute md:block">{day(inv.dueDate)}</span>
                  <span className="tabular row-start-2 text-right font-semibold md:row-start-auto">{money(inv.total, inv.currency || currency)}</span>
                  <span className="col-start-2 row-start-1 text-right md:col-start-auto md:row-start-auto">
                    <InvoiceStatusPill status={inv.status} />
                  </span>
                  <span className="col-span-2 text-xs text-dim md:hidden">Due {day(inv.dueDate)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <InvoiceDetail
        invoice={selected}
        onClose={() => setSelectedId(null)}
        onEdit={(inv) => {
          setSelectedId(null);
          setEditing(inv);
          setFormOpen(true);
        }}
      />
      <InvoiceForm
        open={formOpen}
        invoice={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
