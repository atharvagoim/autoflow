import clsx from "clsx";

// The AutoFlow mark: a looping pink "flow" line that lands on a lime dot.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={clsx("h-9 w-9", className)} aria-hidden="true">
      <path d="M6 26c4-13 10-13 13-5s9 8 14-6" fill="none" stroke="#F5A3CB" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="33" cy="12" r="4.2" fill="#C6F27C" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-display text-[19px] font-bold tracking-tight">AutoFlow</span>
    </span>
  );
}

// ---- Decorative shapes from the reference (used sparingly) ----------------
export function Starburst({ className }: { className?: string }) {
  const points = Array.from({ length: 32 }, (_, i) => {
    const r = i % 2 === 0 ? 50 : 38;
    const a = (i / 32) * Math.PI * 2;
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <polygon points={points} fill="#F6E59E" />
    </svg>
  );
}

export function Sparkle({ className, color = "#C6F27C" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12C6.4 11.2 11.2 6.4 12 0Z" fill={color} />
    </svg>
  );
}

export function Asterisk({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      {[0, 45, 90, 135].map((r) => (
        <rect key={r} x="17" y="2" width="6" height="36" rx="3" fill="#F5A3CB" transform={`rotate(${r} 20 20)`} />
      ))}
    </svg>
  );
}

export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 120" className={className} fill="none" aria-hidden="true">
      <path d="M2 100C40 60 60 20 98 30s30 70 70 50 30-60 50-70" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
      <path d="M8 112C46 72 66 32 104 42s30 70 70 50 30-60 44-66" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
    </svg>
  );
}
