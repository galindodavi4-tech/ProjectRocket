"use client";

import { useId } from "react";
import type { GlossaryKey } from "@/lib/glossary";
import { InfoTip } from "./InfoTip";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Escala logarítmica para faixas enormes (ex.: 1 t a 3.000 t de propelente). */
  log?: boolean;
  format: (v: number) => string;
  onChange: (v: number) => void;
  hint?: string;
  info?: GlossaryKey;
};

/** Rótulo, valor e trilho com o botão branco do kit. */
export function RangeField({ label, value, min, max, step, log, format, onChange, hint, info }: Props) {
  const id = useId();
  const toPos = (v: number) => (log ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min));
  const fromPos = (p: number) => (log ? min * Math.pow(max / min, p) : min + p * (max - min));
  const pos = Math.max(0, Math.min(1, toPos(value)));
  const snap = (v: number) => {
    if (step) return Math.round(v / step) * step;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(1, v))) - 1);
    return Math.round(v / mag) * mag;
  };
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <label htmlFor={id} className="text-xs text-ink-muted">{label}</label>
          {info && <InfoTip term={info} />}
        </span>
        <span className="text-sm font-semibold tabular-nums text-ink">{format(value)}</span>
      </div>
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-bg-deep/80" />
        <div className="ds-gradient-primary absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-full" style={{ width: `${pos * 100}%` }} />
        <input
          id={id}
          type="range"
          min={0}
          max={1000}
          value={Math.round(pos * 1000)}
          onChange={(e) => onChange(Math.min(max, Math.max(min, snap(fromPos(Number(e.target.value) / 1000)))))}
          className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-surface-3 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-surface-3 [&::-webkit-slider-thumb]:bg-white"
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}
