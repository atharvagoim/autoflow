import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { errorMessage, get, post, put } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { money, todayInput, toInputDate } from "../lib/format";
import type { Customer, Invoice } from "../lib/types";
import { Button, IconButton, Input, Select, Sheet, Textarea } from "./ui";
import { CustomerSheet } from "./CustomerSheet";

interface Row {
  description: string;
  quantity: string;
  unitPrice: string;
}
const blankRow = (): Row => ({ description: "", quantity: "1", unitPrice: "" });
const NEW_CUSTOMER = "__new__";

export function InvoiceForm({ open, onClose, invoice, onSaved }: { open: boolean; onClose: () => void; invoice?: Invoice | null; onSaved?: (inv: Invoice) => void }) {
  const { user } = useAuth();
  const currency = invoice?.currency || user?.currency || "INR";
  const qc = useQueryClient();
  const toast = useToast();
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => get<Customer[]>("/customers"), enabled: open });

  const [customer, setCustomer] = useState("");
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [taxRate, setTaxRate] = useState("0");
  const [issueDate, setIssueDate] = useState(todayInput());
  const [dueDate, setDueDate] = useState(todayInput(14));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    if (invoice) {
      setCustomer(invoice.customer?._id || "");
      setRows(invoice.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: String(i.unitPrice) })));
      setTaxRate(String(invoice.taxRate || 0));
      setIssueDate(toInputDate(invoice.issueDate));
      setDueDate(toInputDate(invoice.dueDate));
      setNotes(invoice.notes || "");
    } else {
      setCustomer("");
      setRows([blankRow()]);
      setTaxRate("0");
      setIssueDate(todayInput());
      setDueDate(todayInput(14));
      setNotes("");
    }
  }, [open, invoice]);

  // Pick the only customer automatically for brand-new workspaces.
  useEffect(() => {
    if (open && !invoice && !customer && customers.length === 1) setCustomer(customers[0]._id);
  }, [open, invoice, customer, customers]);

  const num = (v: string) => {
    const n = parseFloat(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const subtotal = useMemo(() => rows.reduce((s, r) => s + num(r.quantity) * num(r.unitPrice), 0), [rows]);
  const tax = (subtotal * num(taxRate)) / 100;

  const save = useMutation({
    mutationFn: (send: boolean) => {
      const body = {
        customer,
        items: rows.map((r) => ({ description: r.description.trim(), quantity: num(r.quantity), unitPrice: num(r.unitPrice) })),
        taxRate: num(taxRate),
        issueDate,
        dueDate,
        notes: notes.trim(),
        send,
      };
      return invoice ? put<Invoice>(`/invoices/${invoice._id}`, body) : post<Invoice>("/invoices", body);
    },
    onSuccess: (inv, send) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["runs"] });
      }, 1500);
      toast(invoice ? `${inv.number} saved` : send ? `${inv.number} created and marked as sent` : `${inv.number} saved as a draft`);
      onSaved?.(inv);
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function validate(): string {
    if (!customer) return "Choose who this invoice is for";
    if (rows.some((r) => !r.description.trim())) return "Describe each item, or remove empty rows";
    if (rows.some((r) => num(r.quantity) <= 0)) return "Each quantity must be more than 0";
    if (rows.some((r) => r.unitPrice.trim() === "" || num(r.unitPrice) < 0)) return "Enter a price for each item";
    if (!dueDate) return "Choose a due date";
    if (issueDate && dueDate < issueDate) return "The due date can't be before the issue date";
    return "";
  }

  function submit(send: boolean) {
    const problem = validate();
    setError(problem);
    if (!problem) save.mutate(send);
  }

  const setRow = (i: number, patch: Partial<Row>) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const isDraft = !invoice || invoice.status === "draft";

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        wide
        title={invoice ? `Edit ${invoice.number}` : "New invoice"}
        description={invoice ? undefined : "Automations that start on “An invoice is created” will run when you save."}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {isDraft && (
              <Button variant="outline" onClick={() => submit(false)} loading={save.isPending && save.variables === false}>
                Save as draft
              </Button>
            )}
            <Button onClick={() => submit(isDraft)} loading={save.isPending && save.variables !== false}>
              {isDraft ? "Save and mark as sent" : "Save changes"}
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            submit(isDraft);
          }}
          className="space-y-5"
          noValidate
        >
          <Select
            label="Bill to"
            value={customer}
            placeholder={customers.length ? "Choose a customer" : "No customers yet"}
            onChange={(e) => (e.target.value === NEW_CUSTOMER ? setAddingCustomer(true) : setCustomer(e.target.value))}
            options={[...customers.map((c) => ({ value: c._id, label: c.company ? `${c.name} (${c.company})` : c.name })), { value: NEW_CUSTOMER, label: "+ Add a new customer" }]}
          />

          <fieldset>
            <legend className="label">Items</legend>
            <div className="space-y-3">
              {rows.map((r, i) => (
                <div key={i} className="rounded-2xl bg-ink-900 p-3 sm:bg-transparent sm:p-0">
                  <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_80px_130px_auto]">
                    <Input aria-label={`Item ${i + 1} description`} placeholder="What did you do or sell?" value={r.description} onChange={(e) => setRow(i, { description: e.target.value })} wrapClass="col-span-2 sm:col-span-1" />
                    <Input aria-label={`Item ${i + 1} quantity`} inputMode="decimal" placeholder="Qty" value={r.quantity} onChange={(e) => setRow(i, { quantity: e.target.value })} className="tabular" />
                    <Input aria-label={`Item ${i + 1} price`} inputMode="decimal" placeholder="Price" value={r.unitPrice} onChange={(e) => setRow(i, { unitPrice: e.target.value })} className="tabular" wrapClass="max-sm:col-start-1" />
                    <IconButton label={`Remove item ${i + 1}`} onClick={() => setRows(rows.filter((_, idx) => idx !== i))} disabled={rows.length === 1} className="h-12 w-12 self-start max-sm:col-start-2 max-sm:row-start-2">
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-2 -ml-2" icon={<Plus className="h-4 w-4" />} onClick={() => setRows([...rows, blankRow()])} disabled={rows.length >= 50}>
              Add item
            </Button>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Issue date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            <Input label="Due date" type="date" value={dueDate} min={issueDate} onChange={(e) => setDueDate(e.target.value)} />
            <Input label="Tax %" inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="tabular" help="e.g. 18 for GST" />
          </div>

          <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment details, thank-you note…" maxLength={1000} className="min-h-[80px]" />

          <div className="rounded-3xl bg-ink-900 p-4 text-sm">
            <div className="flex justify-between text-mute">
              <span>Subtotal</span>
              <span className="tabular">{money(subtotal, currency)}</span>
            </div>
            <div className="mt-1.5 flex justify-between text-mute">
              <span>Tax ({num(taxRate)}%)</span>
              <span className="tabular">{money(Math.round(tax * 100) / 100, currency)}</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-semibold">Total</span>
              <span className="tabular font-display text-2xl font-bold">{money(Math.round((subtotal + tax) * 100) / 100, currency)}</span>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}
          <button type="submit" hidden />
        </form>
      </Sheet>
      <CustomerSheet open={addingCustomer} onClose={() => setAddingCustomer(false)} onSaved={(c) => setCustomer(c._id)} />
    </>
  );
}
