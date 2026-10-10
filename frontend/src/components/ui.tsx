import {
  ButtonHTMLAttributes,
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Loader2, X } from "lucide-react";
import type { Accent, InvoiceStatus, RunStatus } from "../lib/types";

// ---- Accent helpers -------------------------------------------------------
export const accentBg: Record<Accent, string> = {
  pink: "bg-pink text-ink-950",
  lime: "bg-lime text-ink-950",
  butter: "bg-butter text-ink-950",
  lilac: "bg-lilac text-ink-950",
};
export const accentText: Record<Accent, string> = {
  pink: "text-pink",
  lime: "text-lime",
  butter: "text-butter",
  lilac: "text-lilac",
};

// ---- Buttons --------------------------------------------------------------
type Variant = "primary" | "lime" | "outline" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-pink text-ink-950 hover:bg-pink-soft shadow-pink",
  lime: "bg-lime text-ink-950 hover:brightness-105",
  outline: "border border-white/15 text-fog hover:border-white/35 hover:bg-white/[0.04]",
  ghost: "text-mute hover:text-fog hover:bg-white/[0.06]",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-9 px-4 text-sm",
        size === "md" && "h-11 px-5 text-[15px]",
        size === "lg" && "h-14 px-7 text-base",
        variants[variant],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({ to, variant = "primary", size = "md", className, children, icon }: { to: string; variant?: Variant; size?: "sm" | "md" | "lg"; className?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <Link
      to={to}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.98]",
        size === "sm" && "h-9 px-4 text-sm",
        size === "md" && "h-11 px-5 text-[15px]",
        size === "lg" && "h-14 px-7 text-base",
        variants[variant],
        className
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx("grid h-10 w-10 shrink-0 place-items-center rounded-full text-mute transition hover:bg-white/[0.07] hover:text-fog disabled:opacity-30", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---- Form fields ----------------------------------------------------------
interface FieldShellProps {
  label?: string;
  error?: string;
  help?: ReactNode;
  id: string;
  children: ReactNode;
  className?: string;
}
function FieldShell({ label, error, help, id, children, className }: FieldShellProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : help ? (
        <p className="mt-1.5 text-xs text-dim">{help}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  help?: ReactNode;
  wrapClass?: string;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, help, wrapClass, className, id, ...rest }, ref) {
  const auto = useId();
  const fid = id || auto;
  return (
    <FieldShell label={label} error={error} help={help} id={fid} className={wrapClass}>
      <input
        ref={ref}
        id={fid}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fid}-error` : undefined}
        className={clsx("field", error && "field-invalid", className)}
        {...rest}
      />
    </FieldShell>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  help?: ReactNode;
  wrapClass?: string;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, error, help, wrapClass, className, id, ...rest }, ref) {
  const auto = useId();
  const fid = id || auto;
  return (
    <FieldShell label={label} error={error} help={help} id={fid} className={wrapClass}>
      <textarea ref={ref} id={fid} aria-invalid={Boolean(error)} className={clsx("field min-h-[96px] resize-y leading-relaxed", error && "field-invalid", className)} {...rest} />
    </FieldShell>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  help?: ReactNode;
  wrapClass?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}
export function Select({ label, error, help, wrapClass, className, id, options, placeholder, ...rest }: SelectProps) {
  const auto = useId();
  const fid = id || auto;
  return (
    <FieldShell label={label} error={error} help={help} id={fid} className={wrapClass}>
      <select id={fid} aria-invalid={Boolean(error)} className={clsx("field appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10", error && "field-invalid", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23A3A0AF' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest}>
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={clsx(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-lime" : "bg-ink-600"
      )}
    >
      <span className={clsx("absolute top-1 h-5 w-5 rounded-full transition-all", checked ? "left-6 bg-ink-950" : "left-1 bg-fog")} />
    </button>
  );
}

// ---- Status pills ---------------------------------------------------------
const invoiceStatus: Record<InvoiceStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-white/[0.08] text-mute" },
  sent: { label: "Sent", cls: "bg-lilac/15 text-lilac" },
  paid: { label: "Paid", cls: "bg-lime/15 text-lime" },
  overdue: { label: "Overdue", cls: "bg-pink/15 text-pink" },
};
export function InvoiceStatusPill({ status }: { status: InvoiceStatus }) {
  const s = invoiceStatus[status] || invoiceStatus.draft;
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", s.cls)}>{s.label}</span>;
}

const runStatus: Record<RunStatus, { label: string; dot: string; text: string }> = {
  queued: { label: "Queued", dot: "bg-mute", text: "text-mute" },
  running: { label: "Running", dot: "bg-lilac animate-pulse", text: "text-lilac" },
  waiting: { label: "Waiting", dot: "bg-butter", text: "text-butter" },
  success: { label: "Done", dot: "bg-lime", text: "text-lime" },
  stopped: { label: "Stopped", dot: "bg-mute", text: "text-mute" },
  failed: { label: "Failed", dot: "bg-danger", text: "text-danger" },
};
export function RunStatusPill({ status }: { status: RunStatus }) {
  const s = runStatus[status] || runStatus.queued;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 text-xs font-semibold", s.text)}>
      <span className={clsx("h-2 w-2 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

// ---- Sheet: bottom sheet on phones, centered dialog on larger screens ------
let openSheets = 0;
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    openSheets++;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    // Focus the first field (or the panel) so keyboard users land inside.
    requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>("input:not([type=hidden]),select,textarea,[data-autofocus]");
      (first || panelRef.current)?.focus({ preventScroll: true });
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      openSheets--;
      if (openSheets === 0) document.body.style.overflow = "";
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={clsx(
          "relative flex max-h-[92dvh] w-full animate-sheet flex-col rounded-t-[28px] border border-white/10 bg-ink-850 outline-none sm:max-h-[88vh] sm:animate-pop sm:rounded-[28px]",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg"
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4 sm:px-7 sm:pt-6">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {description && <p className="mt-1 text-sm text-mute">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2 sm:px-7">{children}</div>
        {footer && <div className="safe-bottom flex flex-wrap justify-end gap-2 border-t border-white/[0.07] px-5 py-4 sm:px-7">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  loading,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-mute">{body}</p>
    </Sheet>
  );
}

// ---- Misc -----------------------------------------------------------------
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx("h-5 w-5 animate-spin text-mute", className)} aria-label="Loading" />;
}

export function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-2xl bg-white/[0.05]", className)} />;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.06] text-pink">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[15px] text-mute">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-12 text-center">
      <p className="text-[15px] text-mute">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; count?: number }>; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition",
            value === o.value ? "bg-fog text-ink-950" : "bg-white/[0.05] text-mute hover:text-fog"
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={clsx("tabular text-xs", value === o.value ? "text-ink-700" : "text-dim")}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
