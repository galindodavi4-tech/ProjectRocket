"use client";

import { useId } from "react";
import type { GlossaryKey } from "@/lib/glossary";
import { InfoTip } from "./InfoTip";

type Option = { value: string; label: string; group?: string };

export function SelectField({ label, value, options, onChange, info }: { label: string; value: string; options: Option[]; onChange: (v: string) => void; info?: GlossaryKey }) {
  const id = useId();
  const groups = [...new Set(options.map((o) => o.group ?? ""))];
  return (
    <div>
      <span className="mb-1 flex items-center gap-1.5">
        <label htmlFor={id} className="text-xs text-ink-muted">{label}</label>
        {info && <InfoTip term={info} />}
      </span>
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
