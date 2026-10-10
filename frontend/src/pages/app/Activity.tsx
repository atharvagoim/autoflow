import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity as ActivityIcon } from "lucide-react";
import { errorMessage, get } from "../../lib/api";
import { useCatalog } from "../../lib/useCatalog";
import { date } from "../../lib/format";
import type { Run } from "../../lib/types";
import { ButtonLink, EmptyState, ErrorState, Segmented, Skeleton } from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";
import { RunItem } from "../../components/RunItem";

type Filter = "all" | "failed" | "waiting" | "test";

export default function Activity() {
  const [params] = useSearchParams();
  const highlight = params.get("run");
  const [filter, setFilter] = useState<Filter>("all");
  const { data: catalog } = useCatalog();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["runs", "all"],
    queryFn: () => get<Run[]>("/automations/runs", { limit: 100 }),
    refetchInterval: 15_000,
  });

  const filtered = (data || []).filter((r) =>
    filter === "all" ? true : filter === "failed" ? r.status === "failed" : filter === "waiting" ? r.status === "waiting" : r.isTest
  );

  const groups = useMemo(() => {
    const map = new Map<string, Run[]>();
    for (const r of filtered) {
      const label = date(r.createdAt, { weekday: "long", day: "numeric", month: "long" });
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(r);
    }
    return [...map.entries()];
  }, [filtered]);

  const count = (f: Filter) => (data || []).filter((r) => (f === "failed" ? r.status === "failed" : f === "waiting" ? r.status === "waiting" : r.isTest)).length;

  return (
    <div>
      <PageHeader title="Activity" subtitle="Everything your automations did, step by step." />
      <div className="mb-5">
        <Segmented
          label="Filter runs"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: data?.length },
            { value: "failed", label: "Failed", count: data ? count("failed") : undefined },
            { value: "waiting", label: "Waiting", count: data ? count("waiting") : undefined },
            { value: "test", label: "Test runs", count: data ? count("test") : undefined },
          ]}
        />
      </div>

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon={<ActivityIcon className="h-6 w-6" />} title="No activity yet" body="When an automation runs, every step it takes shows up here in plain words." action={<ButtonLink to="/app/automations" variant="lime">Switch on an automation</ButtonLink>} />
      ) : filtered.length === 0 ? (
        <p className="surface px-6 py-10 text-center text-mute">Nothing here — that’s good news.</p>
      ) : (
        <div className="space-y-6">
          {groups.map(([label, runs]) => (
            <section key={label}>
              <h2 className="mb-2 px-1 text-sm font-semibold text-dim">{label}</h2>
              <div className="surface space-y-1 p-2">
                {runs.map((r) => (
                  <RunItem key={r._id} run={r} steps={catalog?.steps} defaultOpen={r._id === highlight} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
