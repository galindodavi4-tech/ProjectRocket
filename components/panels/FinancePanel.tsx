"use client";

import { MARKET } from "@/lib/catalog";
import type { CostBreakdown, FinancePlan, FinanceResult } from "@/lib/economics";
import { usd } from "@/lib/economics";
import { mass, num } from "@/lib/format";
import { BarList } from "../ui/BarList";
import { RangeField } from "../ui/RangeField";
import { InfoTip } from "../ui/InfoTip";
import { Stat } from "../ui/Stat";

type Props = {
  cost: CostBreakdown;
  capacityKg: number;
  plan: FinancePlan;
  result: FinanceResult;
  onPlan: (p: FinancePlan) => void;
  onResetPrice: () => void;
};

const VERDICT = {
  viable: { label: "Negócio viável", tone: "text-primary bg-primary/10 ring-primary/40", text: "Devolve o dinheiro de investidores e do empréstimo em poucos anos." },
  risky: { label: "Arriscado", tone: "text-peach bg-peach/10 ring-peach/40", text: "Dá lucro, mas demora muitos anos para devolver o investimento." },
  unviable: { label: "Inviável", tone: "text-danger bg-danger/10 ring-danger/40", text: "Com este preço e esta frequência, a empresa não se paga." },
} as const;

/** Custo por lançamento, comparação com o mercado e plano de financiamento. */
export function FinancePanel({ cost, capacityKg, plan, result, onPlan, onResetPrice }: Props) {
  const set = (patch: Partial<FinancePlan>) => onPlan({ ...plan, ...patch });
  const total = plan.investorsPct + plan.governmentPct + plan.loanPct || 1;
  const pct = (v: number) => `${num((v / total) * 100)}%`;
  const v = VERDICT[result.verdict];
  const yourPerKg = cost.usdPerKg;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Custo por lançamento" info="costPerLaunch" value={usd(cost.perLaunchUsd)} />
        <Stat label="Custo por kg" info="costPerKg" value={yourPerKg ? usd(yourPerKg) : "—"} sub={capacityKg > 0 ? `levando ${mass(capacityKg)}` : "sem capacidade"} />
      </div>

      <div>
        <h3 className="ds-label mb-3 flex items-center gap-1.5">De onde vem o custo <InfoTip term="costPerLaunch" /></h3>
        <BarList bars={cost.lines.map((l) => ({ label: l.label, value: l.usd, display: usd(l.usd), hint: l.hint }))} />
      </div>

      {yourPerKg && (
        <div>
          <h3 className="ds-label mb-3 flex items-center gap-1.5">Preço por kg na órbita baixa <InfoTip term="costPerKg" /></h3>
          <BarList tone="primary" bars={[
            ...MARKET.map((m) => ({ label: m.name, value: m.usdPerKg, display: usd(m.usdPerKg), hint: m.note })),
            { label: "Seu foguete (preço de venda)", value: result.pricePerKg ?? 0, display: result.pricePerKg ? usd(result.pricePerKg) : "—", highlight: true },
          ].sort((a, b) => a.value - b.value)} />
          <p className="mt-2 text-[11px] text-ink-faint">{result.marketPosition} Valores de mercado aproximados.</p>
        </div>
      )}

      <div className="space-y-3 border-t border-line/40 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="ds-label">Plano de negócio</h3>
          <button type="button" onClick={onResetPrice} className="text-xs text-primary hover:underline">Preço sugerido</button>
        </div>
        <RangeField label="Preço cobrado por lançamento" info="price" value={plan.pricePerLaunchUsd} min={Math.max(200_000, cost.perLaunchUsd * 0.5)} max={cost.perLaunchUsd * 4}
          log format={usd} onChange={(x) => set({ pricePerLaunchUsd: x })}
          hint={`Margem de ${usd(result.marginPerLaunch)} por lançamento.`} />
        <RangeField label="Lançamentos por ano" info="launchesPerYear" value={plan.launchesPerYear} min={1} max={60} step={1} format={(x) => `${num(x)} por ano`}
          onChange={(x) => set({ launchesPerYear: x })} hint="O Falcon 9 passou de 100 lançamentos por ano; a maioria dos foguetes faz menos de 10." />
      </div>

      <div className="space-y-3 border-t border-line/40 pt-4">
        <h3 className="ds-label flex items-center gap-1.5">Quem paga o desenvolvimento ({usd(result.developmentUsd)}) <InfoTip term="development" /></h3>
        <RangeField label={`Investidores · ${pct(plan.investorsPct)}`} info="investors" value={plan.investorsPct} min={0} max={100} step={5} format={() => usd(result.investorsUsd)}
          onChange={(x) => set({ investorsPct: x })} hint="Ficam com parte da empresa e esperam lucro." />
        <RangeField label={`Contratos do governo · ${pct(plan.governmentPct)}`} info="government" value={plan.governmentPct} min={0} max={100} step={5} format={() => usd(result.governmentUsd)}
          onChange={(x) => set({ governmentPct: x })} hint="Pagos por marcos cumpridos, como o programa COTS da NASA. Não precisa devolver — mas atrasou, perde." />
        <RangeField label={`Empréstimo · ${pct(plan.loanPct)}`} info="loan" value={plan.loanPct} min={0} max={100} step={5} format={() => usd(result.loanUsd)}
          onChange={(x) => set({ loanPct: x })} />
        {plan.loanPct > 0 && (
          <RangeField label="Juros do empréstimo" value={plan.loanRatePct} min={0} max={25} step={0.5} format={(x) => `${num(x, 1)}% ao ano`}
            onChange={(x) => set({ loanRatePct: x })} />
        )}
      </div>

      <div className={`rounded-2xl px-4 py-3 ring-1 ${v.tone}`}>
        <p className="font-semibold">{v.label}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{v.text}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Receita por ano" value={usd(result.revenuePerYear)} />
        <Stat label="Lucro por ano" value={usd(result.profitPerYear)} tone={result.profitPerYear > 0 ? "ok" : "bad"} />
        <Stat label="Custos fixos por ano" info="fixedCosts" value={usd(result.fixedCostsPerYear)} sub="equipe, fábrica, base" />
        <Stat label="Retorno do investimento" info="payback" value={result.paybackYears ? `${num(result.paybackYears, 1)} anos` : "nunca"}
          tone={result.verdict === "viable" ? "ok" : result.verdict === "risky" ? "warn" : "bad"} />
      </div>

      <details className="rounded-2xl bg-bg-deep/40 px-4 py-3 text-xs text-ink-muted">
        <summary className="cursor-pointer font-semibold text-ink">Como empresas de foguetes conseguem dinheiro de verdade</summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-4">
          <li>A Rocket Lab levantou cerca de US$ 250 milhões com investidores até o Electron voar; o desenvolvimento custou ~US$ 100 milhões.</li>
          <li>No programa COTS, a NASA pagou a Orbital Sciences por marcos cumpridos (US$ 288 milhões) para criar o Antares. Quem não cumpriu os marcos, como a Kistler, perdeu o contrato.</li>
          <li>Depois de voar, as empresas usam dívida e bolsa de valores: a Rocket Lab emitiu US$ 355 milhões em títulos em 2024.</li>
          <li>Reutilizar o 1º estágio corta o custo por voo, mas só compensa com muitos voos por ano — por isso o número de lançamentos pesa tanto aqui.</li>
        </ul>
      </details>
    </div>
  );
}
