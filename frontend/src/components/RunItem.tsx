import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronDown, CircleSlash, Clock3 } from "lucide-react";
import { errorMessage, post } from "../lib/api";
import { useToast } from "../lib/toast";
import { ago, dateTime } from "../lib/format";
import type { Run, StepDef } from "../lib/types";
import { Button, RunStatusPill } from "./ui";
import { CatalogIcon } from "./Icon";

const logDot: Record<string, string> = {
  success: "bg-lime",
  stopped: "bg-mute",
  failed: "bg-danger",
  waiting: "bg-butter",
};

export function RunItem({ run, steps, showName = true, defaultOpen = false }: { run: Run; steps?: StepDef[]; showName?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const qc = useQueryClient();
  const toast = useToast();
  const cancel = useMutation({
    mutationFn: () => post(`/automations/runs/${run._id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["runs"] });
      toast("Run cancelled — the remaining steps won't happen");
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  const stepLabel = (type: string) => steps?.find((s) => s.type === type)?.label || type.replace(/_/g, " ");
  const stepIcon = (type: string) => steps?.find((s) => s.type === type)?.icon || "zap";

  return (
    <div className={clsx("rounded-3xl border transition", open ? "border-white/10 bg-ink-900" : "border-transparent")}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 rounded-3xl px-3 py-3 text-left hover:bg-white/[0.03]">
        <span className="min-w-0 flex-1">
          {showName && <span className="block truncate text-[15px] font-semibold">{run.automationName}</span>}
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-dim">
            <span title={dateTime(run.createdAt)}>{ago(run.createdAt)}</span>
            {run.isTest && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-mute">Test run</span>}
          </span>
        </span>
        <RunStatusPill status={run.status} />
        <ChevronDown className={clsx("h-4 w-4 shrink-0 text-dim transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 pb-4">
          {run.logs.length === 0 && run.status !== "failed" && <p className="text-sm text-mute">Starting…</p>}
          <ol className="relative space-y-3 border-l border-white/10 pl-5">
            {run.logs.map((l, i) => (
              <li key={i} className="relative">
                <span className={clsx("absolute -left-[27px] top-1 grid h-3.5 w-3.5 place-items-center rounded-full ring-4 ring-ink-900", logDot[l.status] || "bg-mute")} />
                <p className="flex items-center gap-1.5 text-xs font-semibold text-mute">
                  <CatalogIcon name={stepIcon(l.type)} className="h-3.5 w-3.5" />
                  {stepLabel(l.type)}
                </p>
                <p className={clsx("mt-0.5 text-sm", l.status === "failed" ? "text-danger" : "text-fog")}>{l.message}</p>
              </li>
            ))}
          </ol>
          {run.status === "waiting" && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-butter/10 px-4 py-3 text-sm text-butter">
              <Clock3 className="h-4 w-4" />
              <span className="flex-1">Continues {run.resumeAt ? ago(run.resumeAt) : "soon"}</span>
              <Button variant="outline" size="sm" onClick={() => cancel.mutate()} loading={cancel.isPending} icon={<CircleSlash className="h-4 w-4" />}>
                Cancel
              </Button>
            </div>
          )}
          {run.status === "failed" && run.error && !run.logs.some((l) => l.status === "failed") && <p className="mt-2 text-sm text-danger">{run.error}</p>}
        </div>
      )}
    </div>
  );
}
