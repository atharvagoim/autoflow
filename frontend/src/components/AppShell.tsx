import { Suspense, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";
import { Activity, FileText, Home, LogOut, Menu, Receipt, Settings, Users, Workflow } from "lucide-react";
import { Logo } from "./Brand";
import { NotificationsButton } from "./Notifications";
import { AssistantButton } from "./Assistant";
import { PageLoader, Sheet } from "./ui";
import { ErrorBoundary } from "./ErrorBoundary";
import { useAuth } from "../lib/auth";
import { initials } from "../lib/format";

const nav = [
  { to: "/app", label: "Home", icon: Home, end: true },
  { to: "/app/invoices", label: "Invoices", icon: FileText },
  { to: "/app/automations", label: "Automations", icon: Workflow },
  { to: "/app/expenses", label: "Expenses", icon: Receipt },
  { to: "/app/customers", label: "Customers", icon: Users },
  { to: "/app/activity", label: "Activity", icon: Activity },
  { to: "/app/settings", label: "Settings", icon: Settings },
];
const mobileTabs = nav.slice(0, 4);
const moreItems = nav.slice(4);

function Avatar() {
  const { user } = useAuth();
  return (
    <Link to="/app/settings" aria-label="Your settings" className="grid h-10 w-10 place-items-center rounded-full bg-butter font-display text-sm font-bold text-ink-950">
      {initials(user?.name || "?")}
    </Link>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const moreActive = moreItems.some((i) => location.pathname.startsWith(i.to));

  return (
    <div className="min-h-dvh lg:pl-[264px]">
      {/* Sidebar — laptops and up */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-white/[0.06] bg-ink-950 px-4 py-6 lg:flex">
        <Link to="/app" className="px-3" aria-label="AutoFlow home">
          <Logo />
        </Link>
        <nav className="mt-10 flex flex-1 flex-col gap-1" aria-label="Main">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-full px-4 py-3 text-[15px] font-semibold transition",
                  isActive ? "bg-pink text-ink-950" : "text-mute hover:bg-white/[0.05] hover:text-fog"
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="surface flex items-center gap-3 rounded-full p-1.5 pr-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-butter font-display text-xs font-bold text-ink-950">{initials(user?.name || "?")}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{user?.name}</span>
            <span className="block truncate text-xs text-dim">{user?.businessName || user?.email}</span>
          </span>
          <button type="button" onClick={logout} aria-label="Log out" title="Log out" className="grid h-9 w-9 place-items-center rounded-full text-mute hover:bg-white/[0.07] hover:text-fog">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <Link to="/app" className="lg:hidden" aria-label="AutoFlow home">
            <Logo />
          </Link>
          <span className="hidden lg:block" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <AssistantButton className="hidden sm:inline-flex" />
            <AssistantButton compact className="sm:hidden" />
            <NotificationsButton />
            <Avatar />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pb-16">
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Bottom tabs — phones and tablets */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-ink-900/95 backdrop-blur-xl lg:hidden" aria-label="Main">
        <div className="mx-auto grid h-[68px] max-w-lg grid-cols-5 px-2">
          {mobileTabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="group flex flex-col items-center justify-center gap-1 text-[11px] font-semibold">
              {({ isActive }) => (
                <>
                  <span className={clsx("grid h-8 w-12 place-items-center rounded-full transition", isActive ? "bg-pink text-ink-950" : "text-mute group-hover:text-fog")}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={isActive ? "text-fog" : "text-dim"}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button type="button" onClick={() => setMoreOpen(true)} className="group flex flex-col items-center justify-center gap-1 text-[11px] font-semibold">
            <span className={clsx("grid h-8 w-12 place-items-center rounded-full transition", moreActive ? "bg-pink text-ink-950" : "text-mute group-hover:text-fog")}>
              <Menu className="h-5 w-5" />
            </span>
            <span className={moreActive ? "text-fog" : "text-dim"}>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="grid gap-2">
          {moreItems.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-2xl bg-ink-900 px-4 py-4 font-semibold">
              <Icon className="h-5 w-5 text-pink" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              logout();
            }}
            className="flex items-center gap-3 rounded-2xl px-4 py-4 text-left font-semibold text-mute"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-dim">Signed in as {user?.email}</p>
      </Sheet>
    </div>
  );
}
