import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Bell, BellRing } from "lucide-react";
import { get, post } from "../lib/api";
import { ago } from "../lib/format";
import type { Notification } from "../lib/types";
import { Button, EmptyState, Sheet } from "./ui";

const toneDot = { info: "bg-lilac", success: "bg-lime", warning: "bg-pink" };

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => get<{ items: Notification[]; unread: number }>("/notifications"),
    refetchInterval: 30_000,
  });
  const markRead = useMutation({
    mutationFn: () => post("/notifications/read"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const unread = data?.unread || 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative grid h-10 w-10 place-items-center rounded-full text-mute transition hover:bg-white/[0.07] hover:text-fog"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="tabular absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-pink px-1 text-[10px] font-bold text-ink-950">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        footer={
          unread > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markRead.mutate()} loading={markRead.isPending}>
              Mark all as read
            </Button>
          ) : undefined
        }
      >
        {!data?.items.length ? (
          <EmptyState icon={<BellRing className="h-6 w-6" />} title="Nothing yet" body="Automations that use “Notify me” and anything that needs your attention will show up here." />
        ) : (
          <ul className="-mx-2 space-y-1">
            {data.items.map((n) => (
              <li key={n._id}>
                <button
                  type="button"
                  onClick={() => {
                    if (n.link) {
                      setOpen(false);
                      navigate(n.link);
                    }
                    if (!n.read) markRead.mutate();
                  }}
                  className="flex w-full gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.04]"
                >
                  <span className={clsx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", n.read ? "bg-ink-600" : toneDot[n.tone])} />
                  <span className="min-w-0 flex-1">
                    <span className={clsx("block text-[15px] font-semibold", n.read && "text-mute")}>{n.title}</span>
                    {n.body && <span className="mt-0.5 block whitespace-pre-line text-sm text-mute">{n.body}</span>}
                    <span className="mt-1 block text-xs text-dim">{ago(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
