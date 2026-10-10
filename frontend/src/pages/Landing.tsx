import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  FilePlus,
  Mail,
  PieChart,
  Play,
  Plus,
  Receipt,
  Send,
  Sparkles,
  AlarmClock,
  CalendarClock,
} from "lucide-react";
import { Asterisk, Logo, Sparkle, Squiggle, Starburst } from "../components/Brand";
import { Button, ButtonLink } from "../components/ui";
import { useAuth } from "../lib/auth";
import { useDemoLogin } from "../lib/useDemo";
import { useServerConfig } from "../lib/useServerConfig";

function Nav() {
  const { user } = useAuth();
  return (
    <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
      <Link to="/" aria-label="AutoFlow home">
        <Logo />
      </Link>
      <nav className="hidden items-center gap-9 text-sm text-mute md:flex" aria-label="Sections">
        <a href="#features" className="transition hover:text-fog">Features</a>
        <a href="#how" className="transition hover:text-fog">How it works</a>
        <a href="#templates" className="transition hover:text-fog">Templates</a>
      </nav>
      <div className="flex items-center gap-2">
        {user ? (
          <ButtonLink to="/app" variant="outline" size="sm">
            Open AutoFlow
          </ButtonLink>
        ) : (
          <>
            <Link to="/login" className="hidden px-3 text-sm font-semibold text-mute transition hover:text-fog sm:block">
              Log in
            </Link>
            <ButtonLink to="/signup" variant="outline" size="sm">
              Get started
            </ButtonLink>
          </>
        )}
      </div>
    </header>
  );
}

function Spark({ color, d }: { color: string; d: string }) {
  return (
    <svg viewBox="0 0 160 60" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`g-${color.slice(1)}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L160 60 L0 60 Z`} fill={`url(#g-${color.slice(1)})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const quickActions = [
  { icon: FilePlus, label: "Invoice", cls: "bg-lime" },
  { icon: AlarmClock, label: "Remind", cls: "bg-pink" },
  { icon: Receipt, label: "Expense", cls: "bg-butter" },
  { icon: PieChart, label: "Insights", cls: "bg-lilac" },
];

const avatars = [
  { i: "MI", cls: "bg-lime" },
  { i: "RD", cls: "bg-butter" },
  { i: "ST", cls: "bg-lilac" },
];

// The hero collage: a playful snapshot of the product, not a screenshot.
function HeroCollage() {
  return (
    <div className="relative mx-auto mt-14 max-w-6xl px-4 sm:px-6" aria-hidden="true">
      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        {/* Left column */}
        <div className="order-2 grid grid-cols-2 gap-4 lg:order-1 lg:col-span-3 lg:mt-10 lg:grid-cols-1">
          <div className="surface col-span-2 p-4 lg:col-span-1">
            <div className="grid grid-cols-4 gap-2">
              {quickActions.map(({ icon: I, label, cls }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <span className={clsx("grid h-11 w-11 place-items-center rounded-full text-ink-950", cls)}>
                    <I className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] text-mute">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="surface p-5">
            <div className="flex items-start justify-between">
              <span className="flex -space-x-1">
                <span className="h-7 w-7 rounded-full bg-pink" />
                <span className="h-7 w-7 rounded-full bg-pink-deep" />
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-full border border-white/15">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-6 font-display text-lg font-bold">Reminders, handled</p>
            <p className="mt-1 text-sm text-mute">Late invoices get a polite nudge on their own.</p>
          </div>
          <div className="surface relative h-[132px] overflow-hidden p-4 lg:h-[110px]">
            <p className="text-xs text-mute">Cash in, last 6 months</p>
            <div className="absolute inset-x-0 bottom-0 h-16">
              <Spark color="#C6F27C" d="M0 48 C20 46 30 30 50 34 S80 50 100 30 S130 12 160 18" />
            </div>
          </div>
        </div>

        {/* Center column */}
        <div className="order-1 lg:order-2 lg:col-span-6">
          <div className="pink-swirl relative overflow-hidden rounded-[32px] p-6 text-ink-950 shadow-pink sm:p-8">
            <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/25 blur-2xl" />
            <div className="absolute -bottom-20 left-10 h-48 w-72 rotate-12 rounded-full bg-pink-deep/40 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <span className="rounded-full bg-ink-950/90 px-3 py-1.5 text-xs font-semibold text-pink">This month</span>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-lg">
                <Sparkles className="h-5 w-5 text-pink-deep" />
              </span>
            </div>
            <div className="relative mt-16 sm:mt-24">
              <p className="text-sm font-medium text-ink-950/70">Collected automatically</p>
              <p className="tabular font-display text-5xl font-extrabold tracking-tight sm:text-6xl">₹2,83,040</p>
              <p className="mt-2 text-sm font-medium text-ink-950/70">14 invoices paid, 6 reminders sent for you</p>
            </div>
          </div>
          <div className="surface mx-auto mt-4 flex max-w-md items-center gap-4 rounded-full py-3 pl-3 pr-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink text-ink-950">
              <Send className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Chasing overdue invoices</span>
                <span className="tabular font-semibold">72%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10">
                <div className="relative h-full w-[72%] rounded-full bg-pink">
                  <span className="absolute -right-1.5 -top-1 h-3.5 w-3.5 rounded-full border-2 border-pink bg-ink-950" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="order-3 grid grid-cols-2 gap-4 lg:col-span-3 lg:mt-4 lg:grid-cols-1">
          <div className="col-span-2 flex items-center gap-3 lg:col-span-1">
            <div className="flex -space-x-3">
              {avatars.map((a) => (
                <span key={a.i} className={clsx("grid h-12 w-12 place-items-center rounded-full border-4 border-ink-950 font-display text-sm font-bold text-ink-950", a.cls)}>
                  {a.i}
                </span>
              ))}
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-ink-700">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-xs leading-snug text-mute">Paid on
              <br />
              time this week
            </span>
          </div>
          <div className="surface p-5">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-lime text-ink-950">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <p className="mt-6 text-sm text-mute">Recovered from late invoices</p>
            <p className="tabular font-display text-2xl font-bold">₹54,000</p>
          </div>
          <div className="surface relative h-[150px] overflow-hidden p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-pink text-ink-950">
                <Receipt className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold">Spending</p>
                <p className="tabular text-[11px] text-mute">₹48,210 this month</p>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-16">
              <Spark color="#F5A3CB" d="M0 30 C20 50 40 20 60 36 S90 10 110 30 S140 46 160 26" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Invoices that send themselves",
    body: "Create an invoice in seconds. AutoFlow emails it, tracks it and flags it the day it's late.",
    span: "md:col-span-2",
    preview: (
      <div className="mt-6 space-y-2">
        {[
          ["INV-0042", "Northwind Studio", "₹85,000", "Paid", "bg-lime/15 text-lime"],
          ["INV-0043", "Lumen Labs", "₹54,000", "Overdue", "bg-pink/15 text-pink"],
          ["INV-0044", "Orbit Media", "₹32,000", "Sent", "bg-lilac/15 text-lilac"],
        ].map(([n, c, a, s, cls]) => (
          <div key={n} className="flex items-center justify-between rounded-2xl bg-ink-900 px-4 py-3 text-sm">
            <span className="w-20 shrink-0 text-dim">{n}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{c}</span>
            <span className="tabular hidden w-24 text-right sm:block">{a}</span>
            <span className={clsx("ml-4 rounded-full px-2.5 py-1 text-xs font-semibold", cls)}>{s}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Reminders written for you",
    body: "AI drafts a friendly nudge with the right amount and date, then sends it.",
    span: "",
    preview: (
      <div className="mt-6 rounded-3xl rounded-bl-md bg-lilac p-4 text-sm leading-relaxed text-ink-950">
        Hi Rohan, a quick reminder that invoice INV-0043 for ₹54,000 was due on 30 Sept. Thanks so much!
      </div>
    ),
  },
  {
    title: "Spending, sorted",
    body: "Type “Uber to client office” and it lands in Travel. No dropdowns.",
    span: "",
    preview: (
      <div className="mt-6 flex flex-wrap gap-2">
        {[
          ["Software", "bg-lilac"],
          ["Travel", "bg-lime"],
          ["Meals", "bg-pink"],
          ["Rent", "bg-butter"],
          ["Office", "bg-white/80"],
        ].map(([c, cls]) => (
          <span key={c} className={clsx("rounded-full px-3 py-1.5 text-xs font-semibold text-ink-950", cls)}>
            {c}
          </span>
        ))}
      </div>
    ),
  },
  {
    title: "Automations in plain words",
    body: "When this happens, do that. Pick a trigger, add steps, switch it on.",
    span: "md:col-span-2",
    preview: (
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        {[
          [BadgeCheck, "An invoice is paid", "bg-lime"],
          [Mail, "Send a thank-you email", "bg-pink"],
          [BellRing, "Notify me", "bg-butter"],
        ].map(([I, label, cls], i) => {
          const Icon = I as typeof Mail;
          return (
            <div key={label as string} className="flex items-center gap-2 sm:flex-1">
              <div className="flex flex-1 items-center gap-3 rounded-2xl bg-ink-900 px-3 py-3 text-sm">
                <span className={clsx("grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-950", cls as string)}>
                  <Icon className="h-4 w-4" />
                </span>
                {label as string}
              </div>
              {i < 2 && <span className="hidden h-px w-4 bg-white/20 sm:block" />}
            </div>
          );
        })}
      </div>
    ),
  },
];

const steps = [
  { title: "Pick a template", body: "Start from ready-made automations like “Chase overdue invoices”." },
  { title: "Adjust it in plain words", body: "Change who gets emailed, what it says and when — all with simple forms." },
  { title: "Switch it on", body: "AutoFlow runs it every time, and shows you exactly what it did." },
];

const templates = [
  { icon: BadgeCheck, name: "Thank customers when they pay", cls: "bg-lime" },
  { icon: AlarmClock, name: "Chase overdue invoices", cls: "bg-pink" },
  { icon: CalendarClock, name: "Morning money summary", cls: "bg-butter" },
  { icon: Receipt, name: "Flag large expenses", cls: "bg-lilac" },
  { icon: FilePlus, name: "Email new invoices to customers", cls: "bg-lime" },
  { icon: Send, name: "Follow up after 3 days", cls: "bg-pink" },
];

export default function Landing() {
  const { user } = useAuth();
  const { data: config } = useServerConfig();
  const demo = useDemoLogin();

  return (
    <div className="relative overflow-hidden">
      <div className="canvas-grid pointer-events-none absolute inset-x-0 top-0 h-[900px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <Nav />

      <main>
        {/* Hero */}
        <section className="relative pt-6 sm:pt-10">
          <Squiggle className="pointer-events-none absolute -left-6 top-20 hidden w-64 lg:block" />
          <Squiggle className="pointer-events-none absolute -right-10 top-4 hidden w-72 -scale-x-100 lg:block" />
          <Starburst className="pointer-events-none absolute right-[6%] top-16 hidden w-24 animate-spin-slow md:block lg:w-28" />
          <Asterisk className="pointer-events-none absolute left-[7%] top-[300px] hidden w-10 md:block" />
          <Sparkle className="pointer-events-none absolute left-[16%] top-24 hidden w-6 sm:block" />
          <Sparkle className="pointer-events-none absolute right-[24%] top-6 hidden w-5 sm:block" />
          <Sparkle className="pointer-events-none absolute right-[18%] top-[270px] hidden w-4 sm:block" color="#C9B8F6" />
          <span className="pointer-events-none absolute right-[9%] top-[330px] hidden h-5 w-5 rounded-full bg-pink md:block" />
          <span className="pointer-events-none absolute left-[18%] top-[250px] hidden h-2 w-2 rounded-full bg-pink md:block" />

          <div className="relative mx-auto max-w-4xl animate-rise px-4 text-center sm:px-6">
            <div className="mx-auto inline-flex rounded-full border border-white/15 p-1 text-sm">
              <a href="#features" className="rounded-full bg-transparent px-4 py-2 font-semibold ring-1 ring-white/25">
                What’s new? AI reminders
              </a>
              <a href="#templates" className="px-4 py-2 font-semibold text-mute transition hover:text-fog">
                See templates
              </a>
            </div>

            <h1 className="mt-8 font-display text-[2.75rem] font-bold leading-[1.02] tracking-[-0.035em] sm:text-7xl lg:text-[5.25rem]">
              Keep your <span className="text-pink">money</span>
              <br />
              <span className="text-lime">moving</span> on its own
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-mute sm:text-lg">
              AutoFlow sends your invoices, chases late payments and sorts your spending. Pick a template, switch it on. No code, ever.
            </p>

            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <ButtonLink to={user ? "/app" : "/signup"} size="lg" className="sm:min-w-[200px]">
                {user ? "Open AutoFlow" : "Get started free"}
              </ButtonLink>
              {!user && config?.demoEnabled !== false && (
                <Button variant="outline" size="lg" onClick={demo.start} loading={demo.loading} icon={<Play className="h-4 w-4 fill-current" />} className="sm:min-w-[200px]">
                  Try the demo
                </Button>
              )}
            </div>
          </div>

          <HeroCollage />
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-8 px-4 pt-28 sm:px-6 sm:pt-36">
          <h2 className="max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl">
            The money chores that used to eat your evenings
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((f) => (
              <article key={f.title} className={clsx("surface p-6 sm:p-7", f.span)}>
                <h3 className="text-xl font-bold">{f.title}</h3>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-mute">{f.body}</p>
                {f.preview}
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-8 px-4 pt-28 sm:px-6 sm:pt-36">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl">Set it up once. It runs every time.</h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-mute">
                If you can fill in a form, you can build an automation. Every run is logged in plain English, so you always know what happened.
              </p>
            </div>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={s.title} className="surface flex gap-5 p-6">
                  <span
                    className={clsx(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-full font-display text-lg font-bold text-ink-950",
                      ["bg-pink", "bg-butter", "bg-lime"][i]
                    )}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold">{s.title}</h3>
                    <p className="mt-1 text-[15px] text-mute">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="mx-auto max-w-6xl scroll-mt-8 px-4 pt-28 sm:px-6 sm:pt-36">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">Ready when you are</h2>
          <p className="mt-3 text-[15px] text-mute">Every template turns on with one tap and can be changed later.</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map(({ icon: I, name, cls }) => (
              <li key={name} className="flex items-center gap-4 rounded-full border border-white/10 py-2.5 pl-2.5 pr-5">
                <span className={clsx("grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-950", cls)}>
                  <I className="h-5 w-5" />
                </span>
                <span className="font-semibold">{name}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pt-36">
          <div className="pink-swirl relative overflow-hidden rounded-[36px] px-6 py-14 text-center text-ink-950 sm:px-12 sm:py-20">
            <Sparkle className="absolute left-8 top-8 w-8" color="#060608" />
            <Starburst className="absolute -bottom-10 -right-6 w-36 opacity-90" />
            <h2 className="relative mx-auto max-w-2xl font-display text-4xl font-extrabold leading-tight sm:text-6xl">Let your invoices chase themselves</h2>
            <p className="relative mx-auto mt-4 max-w-md font-medium text-ink-950/75">Free to start. Your first automation takes about a minute.</p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={user ? "/app" : "/signup"} className="inline-flex h-14 items-center justify-center rounded-full bg-ink-950 px-8 font-semibold text-fog transition hover:bg-ink-800">
                {user ? "Open AutoFlow" : "Create your account"}
              </Link>
              {!user && config?.demoEnabled !== false && (
                <button onClick={demo.start} disabled={demo.loading} className="inline-flex h-14 items-center justify-center rounded-full border-2 border-ink-950/80 px-8 font-semibold transition hover:bg-ink-950/10 disabled:opacity-60">
                  {demo.loading ? "Opening the demo…" : "Try the demo"}
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-white/[0.07] px-4 py-8 text-sm text-dim sm:flex-row sm:px-6">
        <Logo className="text-fog" />
        <p>© {new Date().getFullYear()} AutoFlow. Money automations for small businesses.</p>
        <div className="flex gap-5">
          <Link to="/login" className="hover:text-fog">Log in</Link>
          <Link to="/signup" className="hover:text-fog">Sign up</Link>
        </div>
      </footer>
    </div>
  );
}
