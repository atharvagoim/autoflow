import type { ComponentType } from "react";
import {
  AlarmClock,
  BadgeCheck,
  BellRing,
  Brain,
  CalendarClock,
  FileCheck,
  FilePlus,
  Filter,
  Hash,
  Hourglass,
  Mail,
  MousePointerClick,
  Receipt,
  Send,
  Sparkles,
  Webhook,
  Zap,
  LucideProps,
} from "lucide-react";

// Maps the icon names used by the server's automation catalog to icons.
const icons: Record<string, ComponentType<LucideProps>> = {
  "alarm-clock": AlarmClock,
  "badge-check": BadgeCheck,
  "bell-ring": BellRing,
  brain: Brain,
  "calendar-clock": CalendarClock,
  "file-check": FileCheck,
  "file-plus": FilePlus,
  filter: Filter,
  hash: Hash,
  hourglass: Hourglass,
  mail: Mail,
  "mouse-pointer-click": MousePointerClick,
  receipt: Receipt,
  send: Send,
  sparkles: Sparkles,
  webhook: Webhook,
};

export function CatalogIcon({ name, ...props }: { name: string } & LucideProps) {
  const C = icons[name] || Zap;
  return <C {...props} />;
}
