import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Copy, FlaskConical, Play, Plus, Trash2 } from "lucide-react";
import { del, errorMessage, get, post, put } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { useCatalog } from "../../lib/useCatalog";
import { ago, date } from "../../lib/format";
import type { Accent, Automation, Catalog, ConfigValue, Run, Step, StepDef, TriggerDef, VariableDef } from "../../lib/types";
import { accentBg, Button, ConfirmSheet, ErrorState, IconButton, PageLoader, Sheet, Toggle } from "../../components/ui";
import { CatalogIcon } from "../../components/Icon";
import { RunItem } from "../../components/RunItem";
import { defaultsFor, FieldInput, isBlank, visibleFields } from "../../components/AutomationFields";

interface Draft {
  name: string;
  trigger: { type: string; config: Record<string, ConfigValue> };
  steps: Step[];
}

const newStepId = () => Math.random().toString(36).slice(2, 10);

function variablesFor(catalog: Catalog, triggerType: string, steps: Step[], index: number): VariableDef[] {
  const vars = [...(catalog.triggers.find((t) => t.type === triggerType)?.variables || [])];
  for (const s of steps.slice(0, index)) {
    for (const out of catalog.steps.find((d) => d.type === s.type)?.outputs || []) {
      if (!vars.some((v) => v.key === out.key)) vars.push(out);
    }
  }
  return vars;
}

// Mirrors the server's checks so problems show up while you edit.
function findProblems(catalog: Catalog, d: Draft) {
  const problems: string[] = [];
  const missing = new Set<string>(); // "trigger.key" or "<stepId>.key"
  const trigger = catalog.triggers.find((t) => t.type === d.trigger.type);
  if (!trigger) problems.push("Choose what starts this automation");
  if (!d.steps.length) problems.push("Add at least one step");
  for (const f of trigger ? visibleFields(trigger.fields, d.trigger.config) : []) {
    if (f.required && isBlank(d.trigger.config[f.key])) {
      problems.push(`Fill in “${f.label}” for the trigger`);
      missing.add(`trigger.${f.key}`);
    }
  }
  d.steps.forEach((s, i) => {
    const def = catalog.steps.find((x) => x.type === s.type);
    if (!def) return;
    if (def.requiresTrigger && !def.requiresTrigger.includes(d.trigger.type)) problems.push(`Step ${i + 1} (${def.label}) only works when an invoice starts the automation`);
    for (const f of def.fields) {
      if (f.required && isBlank(s.config[f.key])) {
        problems.push(`Step ${i + 1} (${def.label}): fill in “${f.label}”`);
        missing.add(`${s.id}.${f.key}`);
      }
    }
  });
  return { problems, missing };
}

function TriggerPicker({ open, onClose, catalog, onPick, current }: { open: boolean; onClose: () => void; catalog: Catalog; onPick: (t: TriggerDef) => void; current: string }) {
  return (
    <Sheet open={open} onClose={onClose} title="When should it run?" wide>
      <div className="grid gap-2 sm:grid-cols-2">
        {catalog.triggers.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => onPick(t)}
            className={clsx("flex items-start gap-3 rounded-3xl border p-4 text-left transition hover:border-white/25", current === t.type ? "border-lime/60 bg-lime/[0.06]" : "border-white/[0.08] bg-ink-900")}
          >
            <span className={clsx("grid h-10 w-10 shrink-0 place-items-center rounded-full", accentBg[t.color as Accent])}>
              <CatalogIcon name={t.icon} className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold">{t.label}</span>
              <span className="mt-0.5 block text-sm text-mute">{t.description}</span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function StepPicker({ open, onClose, catalog, triggerType, onPick }: { open: boolean; onClose: () => void; catalog: Catalog; triggerType: string; onPick: (s: StepDef) => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Add a step" description="Steps run one after another, top to bottom." wide>
      <div className="grid gap-2 sm:grid-cols-2">
        {catalog.steps.map((s) => {
          const blocked = Boolean(s.requiresTrigger && !s.requiresTrigger.includes(triggerType));
          return (
            <button
              key={s.type}
              type="button"
              disabled={blocked}
              onClick={() => onPick(s)}
              className="flex items-start gap-3 rounded-3xl border border-white/[0.08] bg-ink-900 p-4 text-left transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className={clsx("grid h-10 w-10 shrink-0 place-items-center rounded-full", accentBg[s.color as Accent])}>
                <CatalogIcon name={s.icon} className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold">{s.label}</span>
                <span className="mt-0.5 block text-sm text-mute">{blocked ? "Only when an invoice starts the automation" : s.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

function AddStepButton({ onClick, label = "Add a step" }: { onClick: () => void; label?: string }) {
  return (
    <div className="relative flex items-center py-2 pl-[48px] sm:pl-[60px]">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-full border border-dashed border-white/20 px-4 py-2 text-sm font-semibold text-mute transition hover:border-pink hover:text-pink">
        <Plus className="h-4 w-4" />
        {label}
      </button>
    </div>
  );
}

export default function AutomationEditor() {
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: catalog, error: catalogError } = useCatalog();
  const { data: saved, error, isLoading } = useQuery({ queryKey: ["automation", id], queryFn: () => get<Automation>(`/automations/${id}`), enabled: !isNew });

  const [draft, setDraft] = useState<Draft>({ name: "Untitled automation", trigger: { type: "", config: {} }, steps: [] });
  const [baseline, setBaseline] = useState<string>(JSON.stringify({ name: "Untitled automation", trigger: { type: "", config: {} }, steps: [] }));
  const [triggerPickerOpen, setTriggerPickerOpen] = useState(false);
  const [stepPickerAt, setStepPickerAt] = useState<number | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [watchRuns, setWatchRuns] = useState(0); // poll runs until this time
  const watchRef = useRef(0);
  watchRef.current = watchRuns;
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    if (saved && loadedId.current !== saved._id) {
      loadedId.current = saved._id;
      const d: Draft = { name: saved.name, trigger: { type: saved.trigger.type, config: { ...saved.trigger.config } }, steps: saved.steps.map((s) => ({ ...s, config: { ...s.config } })) };
      setDraft(d);
      setBaseline(JSON.stringify(d));
    }
  }, [saved]);

  // New automations open straight onto the trigger choice.
  useEffect(() => {
    if (isNew && catalog) setTriggerPickerOpen(true);
  }, [isNew, catalog]);

  const dirty = JSON.stringify(draft) !== baseline;
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const { data: runs } = useQuery({
    queryKey: ["runs", { automation: id }],
    queryFn: () => get<Run[]>("/automations/runs", { automation: id, limit: 10 }),
    enabled: !isNew,
    refetchInterval: () => (watchRef.current > Date.now() ? 1500 : false),
  });

  const check = useMemo(() => (catalog ? findProblems(catalog, draft) : { problems: [], missing: new Set<string>() }), [catalog, draft]);
  const triggerDef = catalog?.triggers.find((t) => t.type === draft.trigger.type);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["automations"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const save = useMutation({
    mutationFn: (enabled?: boolean) => {
      const body = { name: draft.name.trim() || "Untitled automation", trigger: draft.trigger, steps: draft.steps, enabled, tzOffset: new Date().getTimezoneOffset() };
      return isNew ? post<Automation>("/automations", body) : put<Automation>(`/automations/${id}`, body);
    },
    onSuccess: (a, enabled) => {
      invalidate();
      qc.setQueryData(["automation", a._id], a);
      const d: Draft = { name: a.name, trigger: { type: a.trigger.type, config: { ...a.trigger.config } }, steps: a.steps.map((s) => ({ ...s, config: { ...s.config } })) };
      loadedId.current = a._id;
      setDraft(d);
      setBaseline(JSON.stringify(d));
      toast(enabled === true ? `Saved and switched on` : enabled === false ? "Saved and switched off" : "Saved");
      if (isNew) navigate(`/app/automations/${a._id}`, { replace: true });
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  const enable = useMutation({
    mutationFn: (enabled: boolean) => post<Automation>(`/automations/${id}/enable`, { enabled }),
    onSuccess: (a) => {
      invalidate();
      qc.setQueryData(["automation", a._id], a);
      toast(a.enabled ? "Switched on — it'll run by itself from now on" : "Switched off");
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  const run = useMutation({
    mutationFn: (test: boolean) => post<Run>(`/automations/${id}/run`, { test }),
    onSuccess: (_r, test) => {
      setWatchRuns(Date.now() + 15000);
      qc.invalidateQueries({ queryKey: ["runs", { automation: id }] });
      setTimeout(() => qc.invalidateQueries({ queryKey: ["notifications"] }), 2000);
      toast(test ? "Test run started — results appear below" : "Running now");
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  const remove = useMutation({
    mutationFn: () => del(`/automations/${id}`),
    onSuccess: () => {
      invalidate();
      toast("Automation deleted");
      setBaseline(JSON.stringify(draft));
      navigate("/app/automations", { replace: true });
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  if (catalogError || error) return <ErrorState message={errorMessage(catalogError || error)} />;
  if (!catalog || (!isNew && isLoading)) return <PageLoader />;

  const enabled = !isNew && Boolean(saved?.enabled);
  const canRunForReal = ["manual", "schedule"].includes(draft.trigger.type);
  const webhookUrl = saved?.webhookKey ? `${window.location.origin}/api/hooks/${saved.webhookKey}` : "";

  function setStep(index: number, patch: Partial<Step>) {
    setDraft((d) => ({ ...d, steps: d.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));
  }
  function moveStep(index: number, dir: -1 | 1) {
    setDraft((d) => {
      const steps = [...d.steps];
      const [s] = steps.splice(index, 1);
      steps.splice(index + dir, 0, s);
      return { ...d, steps };
    });
  }
  function addStep(def: StepDef) {
    const at = stepPickerAt ?? draft.steps.length;
    const config = defaultsFor(def.fields);
    if (def.type === "email" && draft.trigger.type.startsWith("invoice_")) config.to = "{{customerEmail}}";
    setDraft((d) => {
      const steps = [...d.steps];
      steps.splice(at, 0, { id: newStepId(), type: def.type, config });
      return { ...d, steps };
    });
    setStepPickerAt(null);
  }
  function onToggle(next: boolean) {
    if (next && check.problems.length) {
      setShowErrors(true);
      toast(check.problems[0], "error");
      return;
    }
    if (dirty || isNew) save.mutate(next);
    else enable.mutate(next);
  }

  return (
    <div className="pb-8">
      {/* Sticky editor bar */}
      <div className="sticky top-16 z-10 -mx-4 mb-6 border-b border-white/[0.06] bg-ink-950/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex items-center gap-2">
          <IconButton label="Back to automations" onClick={() => (dirty ? setConfirmLeave(true) : navigate("/app/automations"))}>
            <ArrowLeft className="h-5 w-5" />
          </IconButton>
          <input
            aria-label="Automation name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            maxLength={80}
            className="min-w-0 flex-1 rounded-xl bg-transparent px-2 py-1.5 font-display text-xl font-bold tracking-tight hover:bg-white/[0.04] focus:bg-white/[0.06] focus:outline-none sm:text-2xl"
          />
          {dirty && <span className="hidden text-xs font-semibold text-butter sm:inline">Unsaved changes</span>}
          <Button size="sm" onClick={() => save.mutate(undefined)} loading={save.isPending && save.variables === undefined} disabled={!dirty && !isNew} variant={dirty || isNew ? "primary" : "outline"}>
            {isNew ? "Save" : dirty ? "Save" : "Saved"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* The track */}
        <div>
          {showErrors && check.problems.length > 0 && (
            <div role="alert" className="mb-5 flex gap-3 rounded-3xl border border-butter/30 bg-butter/[0.07] p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-butter" />
              <div>
                <p className="font-semibold text-butter">Almost there. To switch this on:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-mute">
                  {check.problems.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
            </div>
          )}

          <ol className="relative">
            {/* the line connecting every station */}
            <span aria-hidden="true" className="absolute bottom-6 left-[17px] top-6 w-0.5 sm:left-[21px] rounded-full bg-gradient-to-b from-pink via-lilac to-lime opacity-40" />

            {/* Trigger */}
            <li className="relative flex gap-3 sm:gap-4">
              <span className={clsx("relative z-[1] grid h-9 w-9 shrink-0 place-items-center rounded-full ring-4 ring-ink-950 sm:h-11 sm:w-11 sm:ring-8", triggerDef ? accentBg[triggerDef.color as Accent] : "bg-ink-700 text-mute")}>
                <CatalogIcon name={triggerDef?.icon || "zap"} className="h-5 w-5" />
              </span>
              <div className="surface min-w-0 flex-1 p-4 sm:p-5">
                <div className="flex min-h-[36px] items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-dim">When</p>
                  {triggerDef && (
                    <Button variant="outline" size="sm" onClick={() => setTriggerPickerOpen(true)}>
                      Change
                    </Button>
                  )}
                </div>
                {triggerDef ? (
                  <>
                    <h2 className="text-lg font-bold">{triggerDef.label}</h2>
                    <p className="text-sm text-mute">{triggerDef.description}</p>
                    {visibleFields(triggerDef.fields, draft.trigger.config).length > 0 && (
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {visibleFields(triggerDef.fields, draft.trigger.config).map((f) => (
                          <FieldInput
                            key={f.key}
                            field={f}
                            value={draft.trigger.config[f.key]}
                            variables={[]}
                            invalid={showErrors && check.missing.has(`trigger.${f.key}`)}
                            onChange={(v) => setDraft((d) => ({ ...d, trigger: { ...d.trigger, config: { ...d.trigger.config, [f.key]: v } } }))}
                          />
                        ))}
                      </div>
                    )}
                    {draft.trigger.type === "schedule" && saved?.nextRunAt && enabled && !dirty && (
                      <p className="mt-3 text-sm text-mute">Next run: {date(saved.nextRunAt, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                    )}
                    {draft.trigger.type === "webhook" && (
                      <div className="mt-4 rounded-2xl bg-ink-900 p-4">
                        {webhookUrl ? (
                          <>
                            <p className="text-sm font-semibold">Your private link</p>
                            <p className="mt-1 text-xs text-mute">Paste this into Zapier, Make, a form tool or any app that can send a webhook (POST with JSON). Each field it sends can be used in your steps, e.g. {"{{name}}"}.</p>
                            <div className="mt-3 flex items-center gap-2">
                              <code className="min-w-0 flex-1 truncate rounded-xl bg-ink-950 px-3 py-2 text-xs text-lilac">{webhookUrl}</code>
                              <IconButton
                                label="Copy link"
                                onClick={() =>
                                  navigator.clipboard?.writeText(webhookUrl).then(
                                    () => toast("Link copied"),
                                    () => toast("Couldn't copy — select the link and copy it", "error")
                                  )
                                }
                              >
                                <Copy className="h-4 w-4" />
                              </IconButton>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-mute">Save this automation to get its private link.</p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-2">
                    <p className="text-[15px] text-mute">Choose the event that starts this automation.</p>
                    <Button className="mt-3" size="sm" onClick={() => setTriggerPickerOpen(true)}>
                      Choose a trigger
                    </Button>
                  </div>
                )}
              </div>
            </li>

            {draft.trigger.type && <AddStepButton onClick={() => setStepPickerAt(0)} label={draft.steps.length ? "Add a step here" : "Add the first step"} />}

            {/* Steps */}
            {draft.steps.map((step, i) => {
              const def = catalog.steps.find((s) => s.type === step.type);
              if (!def) return null;
              const vars = variablesFor(catalog, draft.trigger.type, draft.steps, i);
              const incompatible = Boolean(def.requiresTrigger && !def.requiresTrigger.includes(draft.trigger.type));
              return (
                <li key={step.id} className="relative">
                  <div className="flex gap-3 sm:gap-4">
                    <span className={clsx("relative z-[1] grid h-9 w-9 shrink-0 place-items-center rounded-full ring-4 ring-ink-950 sm:h-11 sm:w-11 sm:ring-8", accentBg[def.color as Accent])}>
                      <CatalogIcon name={def.icon} className="h-5 w-5" />
                    </span>
                    <div className={clsx("surface min-w-0 flex-1 p-4 sm:p-5", incompatible && "border-butter/40")}>
                      <div className="-mr-2 -mt-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-dim">Step {i + 1}</p>
                        <div className="flex shrink-0">
                          <IconButton label="Move up" disabled={i === 0} onClick={() => moveStep(i, -1)} className="h-9 w-9">
                            <ArrowUp className="h-4 w-4" />
                          </IconButton>
                          <IconButton label="Move down" disabled={i === draft.steps.length - 1} onClick={() => moveStep(i, 1)} className="h-9 w-9">
                            <ArrowDown className="h-4 w-4" />
                          </IconButton>
                          <IconButton label="Remove step" onClick={() => setDraft((d) => ({ ...d, steps: d.steps.filter((s) => s.id !== step.id) }))} className="h-9 w-9">
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold">{def.label}</h3>
                      <p className="text-sm text-mute">{incompatible ? "This step only works when an invoice starts the automation." : def.description}</p>
                      <div className={clsx("mt-4 grid grid-cols-1 gap-4", step.type === "filter" || step.type === "wait" ? "sm:grid-cols-3" : "")}>
                        {def.fields.map((f) => (
                          <FieldInput
                            key={f.key}
                            field={f}
                            value={step.config[f.key]}
                            variables={vars}
                            freeTextVariable={draft.trigger.type === "webhook"}
                            invalid={showErrors && check.missing.has(`${step.id}.${f.key}`)}
                            onChange={(v) => setStep(i, { config: { ...step.config, [f.key]: v } })}
                          />
                        ))}
                      </div>
                      {def.outputs?.length ? (
                        <p className="mt-3 text-xs text-lilac">Later steps can use “{def.outputs.map((o) => o.label).join("”, “")}”.</p>
                      ) : null}
                    </div>
                  </div>
                  <AddStepButton onClick={() => setStepPickerAt(i + 1)} label={i === draft.steps.length - 1 ? "Add a step" : "Add a step here"} />
                </li>
              );
            })}
          </ol>
        </div>

        {/* Side panel */}
        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <div className="surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{enabled ? "Switched on" : "Switched off"}</p>
                <p className="text-sm text-mute">{enabled ? "Runs by itself when triggered." : "Won't run until you switch it on."}</p>
              </div>
              <Toggle checked={enabled} label={enabled ? "Switch off" : "Switch on"} onChange={onToggle} disabled={save.isPending || enable.isPending} />
            </div>
            <div className="mt-5 grid gap-2">
              <Button
                variant="outline"
                icon={<FlaskConical className="h-4 w-4" />}
                disabled={isNew || dirty || check.problems.length > 0}
                loading={run.isPending && run.variables === true}
                onClick={() => run.mutate(true)}
              >
                Test run
              </Button>
              {canRunForReal && (
                <Button variant="lime" icon={<Play className="h-4 w-4 fill-current" />} disabled={isNew || dirty || check.problems.length > 0} loading={run.isPending && run.variables === false} onClick={() => run.mutate(false)}>
                  Run now
                </Button>
              )}
              <p className="text-xs leading-relaxed text-dim">
                {isNew || dirty
                  ? "Save your changes to try it out."
                  : check.problems.length
                    ? "Finish the steps above to try it out."
                    : "Test runs use your latest real data, skip waits, don't change invoices and send any emails to you instead of customers."}
              </p>
            </div>
          </div>

          {!isNew && (
            <div className="surface p-3">
              <div className="flex items-center justify-between px-2 pb-1 pt-2">
                <h2 className="font-bold">Recent runs</h2>
                {saved?.lastRunAt && <span className="text-xs text-dim">Last {ago(saved.lastRunAt)}</span>}
              </div>
              {runs && runs.length === 0 && <p className="px-2 pb-3 text-sm text-mute">No runs yet. Try a test run.</p>}
              <div className="space-y-1">
                {runs?.map((r, idx) => <RunItem key={r._id} run={r} steps={catalog.steps} showName={false} defaultOpen={idx === 0 && watchRuns > 0} />)}
              </div>
            </div>
          )}

          {!isNew && (
            <Button variant="ghost" size="sm" className="text-danger hover:text-danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)}>
              Delete automation
            </Button>
          )}
        </aside>
      </div>

      <TriggerPicker
        open={triggerPickerOpen}
        onClose={() => setTriggerPickerOpen(false)}
        catalog={catalog}
        current={draft.trigger.type}
        onPick={(t) => {
          setDraft((d) => ({
            ...d,
            name: d.name === "Untitled automation" ? `When ${t.label.toLowerCase()}` : d.name,
            trigger: { type: t.type, config: d.trigger.type === t.type ? d.trigger.config : defaultsFor(t.fields) },
          }));
          setTriggerPickerOpen(false);
        }}
      />
      <StepPicker open={stepPickerAt !== null} onClose={() => setStepPickerAt(null)} catalog={catalog} triggerType={draft.trigger.type} onPick={addStep} />
      <ConfirmSheet
        open={confirmLeave}
        title="Leave without saving?"
        body="Your changes to this automation will be lost."
        confirmLabel="Leave"
        onConfirm={() => {
          setBaseline(JSON.stringify(draft));
          navigate("/app/automations");
        }}
        onClose={() => setConfirmLeave(false)}
      />
      <ConfirmSheet
        open={confirmDelete}
        title="Delete this automation?"
        body="It will stop running and its history will be removed. This can't be undone."
        confirmLabel="Delete automation"
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirmDelete(false)}
        loading={remove.isPending}
      />
    </div>
  );
}
