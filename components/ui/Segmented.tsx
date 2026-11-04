"use client";

type Option<T extends string> = { value: T; label: string; hint?: string };

/** Botões lado a lado, um escolhido (como um rádio). */
export function Segmented<T extends string>({ value, options, onChange, label, size = "md" }: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-[var(--radius-control)] bg-bg-deep/60 p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-[calc(var(--radius-control)-4px)] px-2.5 font-medium whitespace-nowrap transition ${
              size === "sm" ? "py-1 text-[11px]" : "py-1.5 text-xs"
            } ${on ? "ds-gradient-primary text-bg-deep shadow-[var(--shadow-glow)]" : "text-ink-muted hover:text-ink"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
