import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, BellRing, Mail } from "lucide-react";
import { Logo, Sparkle, Starburst } from "../components/Brand";

export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link to="/" aria-label="AutoFlow home" className="self-start">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-[15px] text-mute">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden p-6 lg:block" aria-hidden="true">
        <div className="pink-swirl relative flex h-full flex-col justify-end overflow-hidden rounded-[36px] p-10 text-ink-950">
          <Starburst className="absolute right-10 top-10 w-28 animate-spin-slow" />
          <Sparkle className="absolute left-12 top-16 w-8" color="#060608" />
          <div className="max-w-sm space-y-3">
            {[
              [BadgeCheck, "Meera paid ₹85,000", "Thank-you email sent", "bg-lime"],
              [Mail, "Reminder sent to Rohan", "INV-0043 was due 30 Sept", "bg-butter"],
              [BellRing, "Today: ₹1,69,900 unpaid", "2 invoices overdue", "bg-lilac"],
            ].map(([Icon, title, sub, cls], i) => {
              const I = Icon as typeof Mail;
              return (
                <div key={i} className="flex items-center gap-3 rounded-3xl bg-ink-950/90 p-3 pr-5 text-fog" style={{ marginLeft: i * 24 }}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-950 ${cls}`}>
                    <I className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{title as string}</span>
                    <span className="block text-xs text-mute">{sub as string}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-10 max-w-md font-display text-4xl font-bold leading-tight">Your money admin, running quietly in the background.</p>
        </div>
      </div>
    </div>
  );
}
