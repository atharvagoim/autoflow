import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { errorMessage, post, put } from "../lib/api";
import { useToast } from "../lib/toast";
import type { Customer } from "../lib/types";
import { Button, Input, Sheet } from "./ui";

const empty = { name: "", email: "", company: "", phone: "" };

export function CustomerSheet({ open, onClose, customer, onSaved }: { open: boolean; onClose: () => void; customer?: Customer | null; onSaved?: (c: Customer) => void }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setForm(customer ? { name: customer.name, email: customer.email, company: customer.company || "", phone: customer.phone || "" } : empty);
      setError("");
    }
  }, [open, customer]);

  const save = useMutation({
    mutationFn: () => (customer ? put<Customer>(`/customers/${customer._id}`, form) : post<Customer>("/customers", form)),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast(customer ? "Customer updated" : `${c.name} added`);
      onSaved?.(c);
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Enter the customer's name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError("Enter a valid email address — invoices and reminders go there");
    save.mutate();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={customer ? "Edit customer" : "New customer"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form" loading={save.isPending}>
            {customer ? "Save changes" : "Add customer"}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" placeholder="Meera Iyer" />
        <Input label="Email" type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="meera@company.com" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Company (optional)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <Input label="Phone (optional)" type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        {error && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
