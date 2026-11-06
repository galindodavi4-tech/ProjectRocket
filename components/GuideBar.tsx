"use client";

import { useCallback, useEffect, useState } from "react";

export type GuideStep = "pick" | "launch" | "money" | "company" | "mission" | "ask";

const STEPS: { id: GuideStep; label: string; hint: string }[] = [
  { id: "pick", label: "Escolha um foguete", hint: "Na aba Construir, clique num foguete real (ex.: Falcon 9) ou mude as peças." },
  { id: "launch", label: "Lance", hint: "Clique em Lançar e veja o voo. Use 10× ou 50× para acelerar." },
  { id: "money", label: "Veja quanto custa", hint: "Na aba Finanças: custo por voo, preço por kg e quem paga o projeto." },
  { id: "company", label: "Crie sua empresa", hint: "No modo Empresa: nome, país no globo e US$ 100 milhões." },
  { id: "mission", label: "Cumpra uma missão", hint: "Desenvolva o foguete, avance os trimestres e lance uma missão paga." },
  { id: "ask", label: "Pergunte à IA", hint: "No chat: \"O que minha empresa deve fazer agora?\"" },
];

const KEY = "space-agent:guide:v1";

/** Passos já feitos, guardados neste navegador. */
export function useGuide() {
  const [done, setDone] = useState<GuideStep[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      /* sem armazenamento */
    }
  }, []);
  const mark = useCallback((step: GuideStep) => {
    setDone((d) => {
      if (d.includes(step)) return d;
      const next = [...d, step];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* sem armazenamento */
      }
      return next;
    });
  }, []);
  const reset = useCallback(() => {
    setDone([]);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* sem armazenamento */
    }
  }, []);
  return { done, mark, reset };
}

/** Barra "passo a passo": mostra o caminho, marca o que já foi feito e leva ao lugar certo. */
export function GuideBar({ done, onGo, onReset }: { done: GuideStep[]; onGo: (step: GuideStep) => void; onReset: () => void }) {
  const [open, setOpen] = useState(true);
  const nextIndex = STEPS.findIndex((s) => !done.includes(s.id));
  const next = nextIndex >= 0 ? STEPS[nextIndex] : null;
  const count = STEPS.filter((s) => done.includes(s.id)).length;

  return (
    <section aria-label="Passo a passo" className="ds-card mb-5 !rounded-2xl px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <span className="ds-label mr-2">Passo a passo</span>
          {next ? (
            <span className="text-ink">Próximo: <strong className="text-primary">{next.label}</strong> <span className="text-ink-muted">— {next.hint}</span></span>
          ) : (
            <span className="text-primary">Você passou por tudo! 🎉</span>
          )}
        </p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-ink-faint">{count}/{STEPS.length}</span>
          {count > 0 && <button type="button" onClick={onReset} className="text-ink-faint hover:text-ink">Recomeçar</button>}
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-ink-muted hover:text-ink" aria-expanded={open}>{open ? "Esconder" : "Mostrar"}</button>
        </div>
      </div>
      {open && (
        <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {STEPS.map((s, i) => {
            const isDone = done.includes(s.id);
            const isNext = i === nextIndex;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  title={s.hint}
                  onClick={() => onGo(s.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition ${
                    isNext ? "bg-primary/15 text-ink ring-1 ring-primary/60" : isDone ? "bg-bg-deep/40 text-ink-muted" : "bg-bg-deep/40 text-ink-faint hover:text-ink"
                  }`}
                >
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${isDone ? "bg-primary text-bg-deep" : isNext ? "ds-gradient-warm text-bg-deep" : "bg-surface-3 text-ink-muted"}`}>
                    {isDone ? "✓" : i + 1}
                  </span>
                  <span className="leading-tight">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
