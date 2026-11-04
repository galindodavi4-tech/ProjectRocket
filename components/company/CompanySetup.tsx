"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { COUNTRIES, countryById, rotationBoostMs, type CountryId } from "@/lib/countries";
import { num } from "@/lib/format";
import { Button } from "../ui/Button";
import { InfoTip } from "../ui/InfoTip";

const Globe = dynamic(() => import("./Globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink-faint">Carregando o globo…</div>,
});

export const flag = (id: CountryId) => {
  const code = id === "UK" ? "GB" : id;
  return String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
};

function Meter({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  // value ~0,5 a 1,5 → barra de 0 a 100%
  const pct = Math.max(5, Math.min(100, ((value - 0.4) / 1.2) * 100));
  const good = invert ? value < 1 : value > 1;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-ink-muted">{label}</span>
        <span className={good ? "text-primary" : "text-ink-faint"}>{value < 0.85 ? "baixo" : value > 1.15 ? "alto" : "médio"}</span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-deep/70">
        <div className={`h-full rounded-full ${invert ? "ds-gradient-warm" : "ds-gradient-primary"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

type Props = {
  onFound: (name: string, countryId: CountryId, fixedLuck: boolean) => void;
  onCancel: () => void;
};

/** Fundar a empresa: nome, país no globo e as consequências da escolha. */
export function CompanySetup({ onFound, onCancel }: Props) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState<CountryId | null>("BR");
  const [fixedLuck, setFixedLuck] = useState(true);
  const c = country ? countryById(country) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg-deep/95 backdrop-blur-sm">
      <div className="mx-auto grid min-h-full max-w-6xl content-center gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative h-[46dvh] min-h-[320px] overflow-hidden rounded-[var(--radius-card)] bg-bg lg:h-[78dvh]">
          <Globe selected={country} onPick={setCountry} />
          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-bg-deep/70 px-3 py-1 text-[11px] text-ink-muted">
            Arraste para girar · clique num país destacado
          </p>
        </div>

        <div className="ds-card space-y-4 p-5">
          <div>
            <p className="ds-label">Simulador de empresa</p>
            <h2 className="mt-1 text-2xl font-semibold">Crie sua empresa espacial</h2>
            <p className="mt-1 text-sm text-ink-muted">Você começa com <strong className="text-ink">US$ 100 milhões</strong>. O resto depende das suas decisões.</p>
          </div>

          <div>
            <label htmlFor="company-name" className="mb-1 block text-xs text-ink-muted">Nome da empresa</label>
            <input id="company-name" value={name} maxLength={40} placeholder="Ex.: Turquesa Aeroespacial" onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface/70 px-3 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none" />
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs text-ink-muted">País <InfoTip term="country" /></p>
            <div className="flex flex-wrap gap-1.5">
              {COUNTRIES.map((x) => (
                <button key={x.id} type="button" onClick={() => setCountry(x.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${x.id === country ? "border-primary bg-primary/15 text-ink" : "border-line/60 text-ink-muted hover:text-ink"}`}>
                  {flag(x.id)} {x.name}
                </button>
              ))}
            </div>
          </div>

          {c && (
            <div className="space-y-3 rounded-2xl bg-bg-deep/50 p-4">
              <p className="font-semibold">{flag(c.id)} {c.name}</p>
              <p className="text-xs text-ink-muted">🚀 {c.site} · {c.agency}</p>
              <p className="text-xs leading-relaxed text-ink">{c.fact}</p>
              <Meter label="Custo de operação (salários, impostos)" value={c.costFactor} invert />
              <Meter label="Mercado de investidores" value={c.investorFactor} />
              <Meter label="Apoio do governo" value={c.grantFactor} />
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl bg-surface/60 p-2">
                  <p className="text-ink-faint">Incentivo por missão</p>
                  <p className="text-sm font-semibold text-primary">+{num(c.missionBonus * 100)}%</p>
                </div>
                <div className="rounded-xl bg-surface/60 p-2">
                  <p className="text-ink-faint">Empurrão da Terra</p>
                  <p className="text-sm font-semibold text-primary">{num(rotationBoostMs(c.lat))} m/s</p>
                </div>
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 text-xs text-ink-muted">
            <input type="checkbox" checked={fixedLuck} onChange={(e) => setFixedLuck(e.target.checked)} className="mt-0.5 accent-[var(--color-primary)]" />
            Sorte fixa: as mesmas decisões dão sempre o mesmo resultado (bom para ensaiar a apresentação).
          </label>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel} className="flex-1">Voltar</Button>
            <Button onClick={() => country && onFound(name, country, fixedLuck)} disabled={!country} className="flex-[2]">Fundar com US$ 100 mi</Button>
          </div>
          <p className="text-[10px] text-ink-faint">Bases de lançamento e latitudes são reais. Custos, investidores e incentivos por país são uma simplificação didática.</p>
        </div>
      </div>
    </div>
  );
}
