"use client";

type Tab<T extends string> = { id: T; label: string; badge?: string };

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: Tab<T>[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="ds-scroll flex gap-1 overflow-x-auto rounded-[var(--radius-control)] bg-bg-deep/60 p-1">
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-[calc(var(--radius-control)-4px)] px-2 py-2 text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase transition ${
              on ? "ds-raised text-ink shadow-[var(--shadow-glow)]" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
            {t.badge && <span className="rounded-full bg-coral px-1.5 text-[10px] text-bg-deep">{t.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
