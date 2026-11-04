/** Número grande com rótulo pequeno — para resumos do projeto. */
export function Stat({ label, value, tone, sub }: { label: string; value: string; tone?: "ok" | "bad" | "warn"; sub?: string }) {
  const color = tone === "ok" ? "text-success" : tone === "bad" ? "text-danger" : tone === "warn" ? "text-peach" : "text-ink";
  return (
    <div className="min-w-0 rounded-2xl bg-bg-deep/50 px-3 py-2.5">
      <p className="truncate text-[10px] tracking-widest text-ink-faint uppercase">{label}</p>
      <p className={`truncate text-base font-semibold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="truncate text-[10px] text-ink-faint">{sub}</p>}
    </div>
  );
}
