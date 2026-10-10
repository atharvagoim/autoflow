export function money(amount: number, currency = "INR"): string {
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
}

// ₹80.2K, ₹1.7L, ₹2.1Cr for rupees; $80.2K, $1.7M elsewhere.
export function compactMoney(amount: number, currency = "INR"): string {
  const n = amount || 0;
  if (Math.abs(n) < 1000) return money(Math.round(n), currency);
  if (currency === "INR") {
    const units: Array<[number, string]> = [[1e7, "Cr"], [1e5, "L"], [1e3, "K"]];
    const [div, suffix] = units.find(([d]) => Math.abs(n) >= d)!;
    return `₹${(n / div).toFixed(1).replace(/\.0$/, "")}${suffix}`;
  }
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(n);
  } catch {
    return money(n, currency);
  }
}

export function date(d?: string | Date | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!d) return "";
  const v = new Date(d);
  return Number.isNaN(v.getTime()) ? "" : v.toLocaleString("en-GB", opts);
}

// Invoice dates are calendar days stored at midnight UTC — show them as such.
export function day(d?: string | Date | null) {
  return date(d, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function toInputDate(d?: string | Date | null): string {
  const v = d ? new Date(d) : new Date();
  return Number.isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
}

export function todayInput(offsetDays = 0): string {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

export function ago(d?: string | Date | null): string {
  if (!d) return "";
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 0) {
    const f = -s;
    if (f < 3600) return `in ${Math.max(1, Math.round(f / 60))} min`;
    if (f < 86400) return `in ${Math.round(f / 3600)} h`;
    return `in ${Math.round(f / 86400)} days`;
  }
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} days ago`;
  return date(d);
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function dateTime(d?: string | Date | null): string {
  if (!d) return "";
  const v = new Date(d);
  return Number.isNaN(v.getTime()) ? "" : v.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
