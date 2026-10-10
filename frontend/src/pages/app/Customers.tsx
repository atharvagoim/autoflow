import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Pencil, Phone, Plus, Trash2, Users } from "lucide-react";
import { del, errorMessage, get } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { initials, money } from "../../lib/format";
import type { Customer } from "../../lib/types";
import { Button, ConfirmSheet, EmptyState, ErrorState, IconButton, Skeleton } from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";
import { CustomerSheet } from "../../components/CustomerSheet";

const swatches = ["bg-pink", "bg-lime", "bg-butter", "bg-lilac"];

export default function Customers() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const [params, setParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["customers"], queryFn: () => get<Customer[]>("/customers") });

  useEffect(() => {
    if (params.get("new") === "1") {
      setSheetOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const remove = useMutation({
    mutationFn: (c: Customer) => del(`/customers/${c._id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast(`${deleting?.name} removed`);
      setDeleting(null);
    },
    onError: (e) => {
      toast(errorMessage(e), "error");
      setDeleting(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="The people and businesses you invoice."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setSheetOpen(true); }}>New customer</Button>}
      />

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No customers yet" body="Add the people you bill. Their email is where invoices, reminders and thank-yous go." action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setSheetOpen(true)}>Add a customer</Button>} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c, i) => (
            <li key={c._id} className="surface flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full font-display font-bold text-ink-950 ${swatches[i % swatches.length]}`}>{initials(c.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{c.name}</p>
                  <p className="truncate text-sm text-mute">{c.company || "Individual"}</p>
                </div>
                <div className="-mr-2 -mt-1 flex">
                  <IconButton label={`Edit ${c.name}`} onClick={() => { setEditing(c); setSheetOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <IconButton label={`Delete ${c.name}`} onClick={() => setDeleting(c)}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
              <div className="mt-4 space-y-1.5 text-sm text-mute">
                <a href={`mailto:${c.email}`} className="flex items-center gap-2 break-all hover:text-fog"><Mail className="h-4 w-4 shrink-0" />{c.email}</a>
                {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-2 hover:text-fog"><Phone className="h-4 w-4 shrink-0" />{c.phone}</a>}
              </div>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                <div className="rounded-2xl bg-ink-900 px-3 py-2.5">
                  <p className="text-xs text-dim">Billed</p>
                  <p className="tabular font-semibold">{money(c.billed || 0, currency)}</p>
                </div>
                <div className="rounded-2xl bg-ink-900 px-3 py-2.5">
                  <p className="text-xs text-dim">Unpaid</p>
                  <p className={`tabular font-semibold ${c.unpaid ? "text-pink" : ""}`}>{money(c.unpaid || 0, currency)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CustomerSheet open={sheetOpen} customer={editing} onClose={() => { setSheetOpen(false); setEditing(null); }} />
      <ConfirmSheet
        open={Boolean(deleting)}
        title={`Remove ${deleting?.name}?`}
        body="Customers with invoices can't be removed — delete their invoices first."
        confirmLabel="Remove customer"
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
        loading={remove.isPending}
      />
    </div>
  );
}
