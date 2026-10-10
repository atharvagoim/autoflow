import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { ArrowRight, Check, Plus, Workflow } from "lucide-react";
import { errorMessage, get, post } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { useCatalog } from "../../lib/useCatalog";
import { ago } from "../../lib/format";
import type { Accent, Automation, Catalog } from "../../lib/types";
import { accentBg, Button, ErrorState, RunStatusPill, Skeleton, Toggle } from "../../components/ui";
import { CatalogIcon } from "../../components/Icon";
import { PageHeader } from "../../components/PageHeader";

function Chain({ catalog, triggerType, stepTypes }: { catalog?: Catalog; triggerType: string; stepTypes: string[] }) {
  const trigger = catalog?.triggers.find((t) => t.type === triggerType);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={clsx("grid h-9 w-9 place-items-center rounded-full", accentBg[(trigger?.color || "pink") as Accent])} title={trigger?.label}>
        <CatalogIcon name={trigger?.icon || "zap"} className="h-4 w-4" />
      </span>
      {stepTypes.length > 0 && <ArrowRight className="h-3.5 w-3.5 text-dim" />}
      {stepTypes.map((t, i) => {
        const s = catalog?.steps.find((x) => x.type === t);
        return (
          <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-ink-700 text-fog" title={s?.label}>
            <CatalogIcon name={s?.icon || "zap"} className="h-4 w-4" />
          </span>
        );
      })}
    </div>
  );
}

export default function Automations() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: catalog } = useCatalog();
  const { data: automations, isLoading, error, refetch } = useQuery({ queryKey: ["automations"], queryFn: () => get<Array<Automation & { templateKey?: string }>>("/automations") });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => post<Automation>(`/automations/${id}/enable`, { enabled }),
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast(a.enabled ? `“${a.name}” is on` : `“${a.name}” is off`);
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  const addTemplate = useMutation({
    mutationFn: (key: string) => post<Automation>("/automations/from-template", { key, tzOffset: new Date().getTimezoneOffset() }),
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast(`“${a.name}” is switched on`);
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  const usedTemplates = new Set((automations || []).map((a) => a.templateKey).filter(Boolean));
  const triggerLabel = (type: string) => catalog?.triggers.find((t) => t.type === type)?.label || "";

  return (
    <div>
      <PageHeader
        title="Automations"
        subtitle="Things AutoFlow does for you, on its own."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate("/app/automations/new")}>
            Build your own
          </Button>
        }
      />

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}</div>
      ) : automations && automations.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {automations.map((a) => (
            <li key={a._id}>
              <div className="surface flex h-full flex-col p-5 transition hover:border-white/15">
                <div className="flex items-start justify-between gap-3">
                  <Chain catalog={catalog} triggerType={a.trigger.type} stepTypes={a.steps.map((s) => s.type)} />
                  <Toggle checked={a.enabled} label={`Switch ${a.name} ${a.enabled ? "off" : "on"}`} onChange={(v) => toggle.mutate({ id: a._id, enabled: v })} disabled={toggle.isPending && toggle.variables?.id === a._id} />
                </div>
                <Link to={`/app/automations/${a._id}`} className="mt-4 block flex-1">
                  <h2 className="text-lg font-bold leading-snug hover:underline">{a.name}</h2>
                  <p className="mt-1 text-sm text-mute">When {triggerLabel(a.trigger.type).toLowerCase() || "…"}</p>
                </Link>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-xs text-dim">
                  {a.problems.length > 0 ? (
                    <span className="font-semibold text-butter">Needs finishing before it can run</span>
                  ) : a.lastRun ? (
                    <span className="flex items-center gap-2">
                      <RunStatusPill status={a.lastRun.status} /> {ago(a.lastRun.at)}
                    </span>
                  ) : (
                    <span>Hasn’t run yet</span>
                  )}
                  <Link to={`/app/automations/${a._id}`} className="font-semibold text-pink hover:underline">
                    Edit
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="surface flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-lime text-ink-950">
            <Workflow className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-lg font-bold">Start with a template</h2>
            <p className="text-[15px] text-mute">Tap “Switch on” below and AutoFlow starts working right away. You can change anything later.</p>
          </div>
        </div>
      )}

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold">Templates</h2>
        <p className="mt-1 text-[15px] text-mute">Ready-made automations. Each one can be edited after you switch it on.</p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(catalog?.templates || []).map((t) => {
            const used = usedTemplates.has(t.key);
            return (
              <li key={t.key} className="surface flex flex-col p-5">
                <Chain catalog={catalog} triggerType={t.triggerType} stepTypes={t.stepTypes} />
                <h3 className="mt-4 text-lg font-bold leading-snug">{t.name}</h3>
                <p className="mt-1 flex-1 text-sm text-mute">{t.description}</p>
                <Button
                  variant={used ? "ghost" : "lime"}
                  size="sm"
                  className="mt-5 self-start"
                  onClick={() => addTemplate.mutate(t.key)}
                  loading={addTemplate.isPending && addTemplate.variables === t.key}
                  icon={used ? <Check className="h-4 w-4" /> : undefined}
                >
                  {used ? "Added. Add again" : "Switch on"}
                </Button>
              </li>
            );
          })}
          {!catalog && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-3xl" />)}
        </ul>
      </section>
    </div>
  );
}
