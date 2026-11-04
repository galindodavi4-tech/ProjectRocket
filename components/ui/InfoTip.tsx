"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";

/** Botão "?" que abre uma explicação simples do termo. Fecha com Esc ou clicando fora. */
export function InfoTip({ term, className = "" }: { term: GlossaryKey; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  const entry = GLOSSARY[term];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        aria-label={`O que é ${entry.title}?`}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`grid size-4 place-items-center rounded-full text-[10px] leading-none font-bold transition ${open ? "bg-primary text-bg-deep" : "bg-surface-3 text-primary-200 hover:bg-primary hover:text-bg-deep"}`}
      >
        ?
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className="ds-card absolute top-6 left-1/2 z-50 w-64 -translate-x-1/2 !rounded-2xl p-3.5 text-left text-xs normal-case tracking-normal shadow-[var(--shadow-card)] ring-1 ring-primary/40 animate-[fadein_.2s_ease]"
        >
          <span className="block text-sm font-semibold text-primary">{entry.title}</span>
          <span className="mt-1 block leading-relaxed text-ink">{entry.text}</span>
          {"example" in entry && entry.example && <span className="mt-2 block rounded-lg bg-bg-deep/60 px-2 py-1.5 text-ink-muted">💡 {entry.example}</span>}
        </span>
      )}
    </span>
  );
}
