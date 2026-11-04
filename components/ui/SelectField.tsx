"use client";

import { useId } from "react";

type Option = { value: string; label: string; group?: string };

export function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (v: string) => void }) {
  const id = useId();
  const groups = [...new Set(options.map((o) => o.group ?? ""))];
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-ink-muted">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface/70 px-3 text-sm text-ink focus:border-primary focus:outline-none"
      >
        {groups.map((g) =>
          g ? (
            <optgroup key={g} label={g}>
              {options.filter((o) => o.group === g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          ) : (
            options.filter((o) => !o.group).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)
          ),
        )}
      </select>
    </div>
  );
}
