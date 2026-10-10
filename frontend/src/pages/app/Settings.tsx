import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Check, LogOut, Minus } from "lucide-react";
import { errorMessage, patch, post, Session, session, User } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { useServerConfig } from "../../lib/useServerConfig";
import { Button, ConfirmSheet, Input, Select } from "../../components/ui";
import { PageHeader } from "../../components/PageHeader";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"].map((c) => ({ value: c, label: c }));

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="surface grid gap-5 p-5 sm:p-7 md:grid-cols-[220px_1fr] md:gap-10">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="mt-1 text-sm text-mute">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: config } = useServerConfig();
  const [profile, setProfile] = useState({ name: user?.name || "", businessName: user?.businessName || "", currency: user?.currency || "INR" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [pwError, setPwError] = useState("");
  const [confirm, setConfirm] = useState<null | "sample" | "clear">(null);

  useEffect(() => {
    if (user) setProfile({ name: user.name, businessName: user.businessName, currency: user.currency });
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: () => patch<User>("/auth/me", { ...profile, name: profile.name.trim(), businessName: profile.businessName.trim() }),
    onSuccess: (u) => {
      setUser(u);
      qc.invalidateQueries();
      toast("Profile saved");
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  const changePassword = useMutation({
    mutationFn: () => post<Session>("/auth/change-password", pw),
    onSuccess: (s) => {
      session.save(s);
      setPw({ currentPassword: "", newPassword: "" });
      setPwError("");
      toast("Password changed. Other devices were logged out.");
    },
    onError: (e) => setPwError(errorMessage(e)),
  });

  const workspace = useMutation({
    mutationFn: (action: "sample" | "clear") => post(action === "sample" ? "/auth/sample-data" : "/auth/clear-data"),
    onSuccess: (_d, action) => {
      qc.invalidateQueries();
      setConfirm(null);
      toast(action === "sample" ? "Sample data loaded" : "Workspace cleared");
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  const status = [
    { on: config?.aiEnabled, label: "AI writing and answers", off: "Using built-in messages. Add OPENAI_API_KEY to the server's .env to turn on AI." },
    { on: config?.emailEnabled, label: "Email delivery", off: "Emails are prepared but not delivered. Add SMTP settings to the server's .env." },
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle={user?.email} />
      <div className="space-y-4">
        <Section title="Profile" description="Your business name appears on invoices and in emails.">
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (!profile.name.trim()) return toast("Enter your name", "error");
              saveProfile.mutate();
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Input label="Your name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} maxLength={80} />
            <Input label="Business name" value={profile.businessName} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} maxLength={80} placeholder="Shown on invoices" />
            <Select label="Currency" value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })} options={CURRENCIES} help="Used for new invoices and all totals." />
            <div className="flex items-end">
              <Button type="submit" loading={saveProfile.isPending}>
                Save profile
              </Button>
            </div>
          </form>
        </Section>

        <Section title="Password">
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (pw.newPassword.length < 8) return setPwError("Use at least 8 characters for the new password");
              changePassword.mutate();
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Input label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            <Input label="New password" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} help="At least 8 characters" />
            {pwError && <p role="alert" className="text-sm text-danger sm:col-span-2">{pwError}</p>}
            <div>
              <Button type="submit" variant="outline" loading={changePassword.isPending} disabled={!pw.currentPassword || !pw.newPassword}>
                Change password
              </Button>
            </div>
          </form>
        </Section>

        <Section title="What's switched on" description="Optional extras your server is set up for.">
          <ul className="space-y-3">
            {status.map((s) => (
              <li key={s.label} className="flex gap-3">
                <span className={clsx("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full", s.on ? "bg-lime text-ink-950" : "bg-ink-700 text-mute")}>
                  {s.on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Minus className="h-3.5 w-3.5" />}
                </span>
                <span>
                  <span className="block font-semibold">{s.label}</span>
                  <span className="block text-sm text-mute">{s.on ? "On" : s.off}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Workspace" description="Try things out safely. These only affect your own account.">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConfirm("sample")}>
              Load sample data
            </Button>
            <Button variant="danger" onClick={() => setConfirm("clear")}>
              Delete all my data
            </Button>
          </div>
        </Section>

        <Button variant="ghost" icon={<LogOut className="h-4 w-4" />} onClick={logout}>
          Log out
        </Button>
      </div>

      <ConfirmSheet
        open={confirm === "sample"}
        title="Replace your data with sample data?"
        body="Your current customers, invoices, expenses and automations will be replaced with a realistic sample workspace."
        confirmLabel="Load sample data"
        onConfirm={() => workspace.mutate("sample")}
        onClose={() => setConfirm(null)}
        loading={workspace.isPending}
      />
      <ConfirmSheet
        open={confirm === "clear"}
        title="Delete all your data?"
        body="All customers, invoices, expenses, automations and activity in your account will be deleted. Your login stays. This can't be undone."
        confirmLabel="Delete everything"
        onConfirm={() => workspace.mutate("clear")}
        onClose={() => setConfirm(null)}
        loading={workspace.isPending}
      />
    </div>
  );
}
