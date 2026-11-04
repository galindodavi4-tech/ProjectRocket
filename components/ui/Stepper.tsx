"use client";

import { MinusIcon, PlusIcon } from "./icons";

/** Contador com − e +, para quantidades pequenas (motores, estágios). */
export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1" aria-label={label}>
      <button type="button" aria-label={`Menos ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}
        className="ds-raised grid size-8 place-items-center !rounded-lg text-ink disabled:opacity-30 [&_svg]:size-4">
        <MinusIcon />
      </button>
      <output className="w-8 text-center text-sm font-semibold tabular-nums">{value}</output>
      <button type="button" aria-label={`Mais ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}
        className="ds-raised grid size-8 place-items-center !rounded-lg text-ink disabled:opacity-30 [&_svg]:size-4">
        <PlusIcon />
      </button>
    </div>
  );
}
