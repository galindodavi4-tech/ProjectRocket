type Bar = { label: string; value: number; display: string; highlight?: boolean; hint?: string };

/** Barras horizontais com rótulo e valor — custos, preço por kg, massas. */
export function BarList({ bars, tone = "primary" }: { bars: Bar[]; tone?: "primary" | "warm" }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <ul className="space-y-2.5">
      {bars.map((b) => (
        <li key={b.label} title={b.hint}>
          <div className="mb-1 flex justify-between gap-3 text-xs">
            <span className={b.highlight ? "font-semibold text-ink" : "text-ink-muted"}>{b.label}</span>
            <span className={`tabular-nums ${b.highlight ? "font-semibold text-ink" : "text-ink-muted"}`}>{b.display}</span>
          </div>
          <div className="h-2 rounded-full bg-bg-deep/70">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${b.highlight ? "ds-gradient-warm" : tone === "primary" ? "ds-gradient-primary" : "ds-gradient-warm"} ${b.highlight ? "" : "opacity-80"}`}
              style={{ width: `${Math.max(2, (b.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
