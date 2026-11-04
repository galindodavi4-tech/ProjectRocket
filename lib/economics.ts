import { MATERIALS, MARKET, PROPELLANTS, propellantPricePerKg, REUSE, type MaterialId } from "./catalog";
import { boosterOf, type DesignAnalysis, type RocketDesign } from "./design";

/**
 * Custos e plano de negócio. Modelo simples, calibrado para dar números na
 * ordem de grandeza dos reais (Falcon 9 descartável ~US$ 50 mi, reutilizado
 * ~US$ 20 mi; desenvolvimento do Electron ~US$ 100 mi). Fontes em docs/DADOS.md.
 */

export const AVIONICS_COST_PER_STAGE = 1_000_000;
/** Coifa de ~5 m de diâmetro custa ~US$ 6 mi; escala com a área. */
export const FAIRING_COST_REF = 6_000_000;
export const LAUNCH_OPS_BASE = 1_500_000;
export const LAUNCH_OPS_SHARE = 0.05;
export const REFURB_SHARE = 0.05;

export type CostLine = { label: string; usd: number; hint?: string };

export type CostBreakdown = {
  lines: CostLine[];
  perLaunchUsd: number;
  /** Custo de fabricar o primeiro foguete inteiro (sem reutilização). */
  firstUnitUsd: number;
  stageHardwareUsd: number[];
  usdPerKg: number | null;
};

export function costBreakdown(design: RocketDesign, analysis: DesignAnalysis): CostBreakdown {
  const lines: CostLine[] = [];
  const stageHardwareUsd = analysis.stages.map((s, i) => {
    const material = MATERIALS[design.stages[i].material as MaterialId];
    return s.engine.costUsd * design.stages[i].engineCount + s.structureMassKg * material.fabricatedCostUsdKg + AVIONICS_COST_PER_STAGE;
  });

  const reuse = REUSE[design.reuse];
  const reusable = design.reuse !== "none";
  const flights = reusable ? design.reuseFlights : 1;

  analysis.stages.forEach((s, i) => {
    const hw = stageHardwareUsd[i];
    if (i === 0 && reusable) {
      lines.push({ label: `1º estágio (dividido por ${flights} voos)`, usd: hw / flights, hint: `Fabricar custa ${usd(hw)}` });
      lines.push({ label: "Revisão entre voos", usd: hw * REFURB_SHARE });
      lines.push({ label: `Recuperação (${reuse.name.toLowerCase()})`, usd: reuse.recoveryCostUsd });
    } else {
      lines.push({ label: `${i + 1}º estágio`, usd: hw, hint: `${design.stages[i].engineCount}× ${s.engine.name}` });
    }
  });

  const booster = boosterOf(design);
  const boostersUsd = booster && design.boosters ? booster.costUsd * design.boosters.count : 0;
  if (boostersUsd) lines.push({ label: `${design.boosters!.count}× ${booster!.name}`, usd: boostersUsd });

  const fairingUsd = Math.max(300_000, FAIRING_COST_REF * (design.diameterM / 3.7) ** 2);
  lines.push({ label: "Coifa", usd: fairingUsd });

  const propellantUsd = analysis.stages.reduce(
    (a, s) => a + s.propellantMassKg * propellantPricePerKg(PROPELLANTS[s.engine.propellant]),
    0,
  );
  lines.push({ label: "Propelente", usd: propellantUsd, hint: "Quase sempre menos de 1% do total" });

  const hardware = lines.reduce((a, l) => a + l.usd, 0) - propellantUsd;
  const opsUsd = LAUNCH_OPS_BASE + LAUNCH_OPS_SHARE * hardware;
  lines.push({ label: "Integração e operação do lançamento", usd: opsUsd });

  const perLaunchUsd = lines.reduce((a, l) => a + l.usd, 0);
  const firstUnitUsd = stageHardwareUsd.reduce((a, b) => a + b, 0) + boostersUsd + fairingUsd;
  const capacity = analysis.maxPayload[design.targetOrbit];
  return {
    lines,
    perLaunchUsd,
    firstUnitUsd,
    stageHardwareUsd,
    usdPerKg: capacity > 0 ? perLaunchUsd / capacity : null,
  };
}

/** Desenvolvimento ≈ US$ 50 mi + 7× o primeiro foguete (Electron ~100 mi, Falcon 9 ~390 mi). */
export function developmentCostUsd(cost: CostBreakdown) {
  return 50_000_000 + 7 * cost.firstUnitUsd;
}

export type FinancePlan = {
  pricePerLaunchUsd: number;
  launchesPerYear: number;
  /** Partes do desenvolvimento pagas por cada fonte (somam 100). */
  investorsPct: number;
  governmentPct: number;
  loanPct: number;
  loanRatePct: number;
};

export function defaultPlan(cost: CostBreakdown): FinancePlan {
  return {
    pricePerLaunchUsd: roundMoney(cost.perLaunchUsd * 1.5),
    launchesPerYear: 10,
    investorsPct: 50,
    governmentPct: 30,
    loanPct: 20,
    loanRatePct: 10,
  };
}

export type FinanceResult = {
  developmentUsd: number;
  investorsUsd: number;
  governmentUsd: number;
  loanUsd: number;
  revenuePerYear: number;
  launchCostsPerYear: number;
  fixedCostsPerYear: number;
  interestPerYear: number;
  profitPerYear: number;
  marginPerLaunch: number;
  /** Anos para devolver o que não veio de contrato do governo (null = nunca). */
  paybackYears: number | null;
  pricePerKg: number | null;
  verdict: "viable" | "risky" | "unviable";
  marketPosition: string;
};

export function evaluatePlan(cost: CostBreakdown, capacityKg: number, plan: FinancePlan): FinanceResult {
  const developmentUsd = developmentCostUsd(cost);
  const total = plan.investorsPct + plan.governmentPct + plan.loanPct || 1;
  const investorsUsd = (developmentUsd * plan.investorsPct) / total;
  const governmentUsd = (developmentUsd * plan.governmentPct) / total;
  const loanUsd = (developmentUsd * plan.loanPct) / total;

  const revenuePerYear = plan.pricePerLaunchUsd * plan.launchesPerYear;
  const launchCostsPerYear = cost.perLaunchUsd * plan.launchesPerYear;
  // Equipe, fábrica e base de lançamento: ~8% do desenvolvimento por ano.
  const fixedCostsPerYear = developmentUsd * 0.08;
  const interestPerYear = (loanUsd * plan.loanRatePct) / 100;
  const profitPerYear = revenuePerYear - launchCostsPerYear - fixedCostsPerYear - interestPerYear;
  const toRecover = investorsUsd + loanUsd;
  const paybackYears = profitPerYear > 0 ? toRecover / profitPerYear : null;
  const pricePerKg = capacityKg > 0 ? plan.pricePerLaunchUsd / capacityKg : null;

  const verdict = paybackYears === null || paybackYears > 15 ? "unviable" : paybackYears > 7 ? "risky" : "viable";

  let marketPosition = "Sem capacidade de carga, não há o que vender.";
  if (pricePerKg !== null) {
    const cheaper = MARKET.filter((m) => m.usdPerKg > pricePerKg).map((m) => m.name);
    marketPosition =
      cheaper.length === MARKET.length
        ? "Mais barato por kg que todos os concorrentes da lista."
        : cheaper.length === 0
          ? "Mais caro por kg que todos os concorrentes da lista."
          : `Mais barato por kg que ${cheaper.join(", ")}.`;
  }

  return {
    developmentUsd,
    investorsUsd,
    governmentUsd,
    loanUsd,
    revenuePerYear,
    launchCostsPerYear,
    fixedCostsPerYear,
    interestPerYear,
    profitPerYear,
    marginPerLaunch: plan.pricePerLaunchUsd - cost.perLaunchUsd,
    paybackYears,
    pricePerKg,
    verdict,
    marketPosition,
  };
}

const roundMoney = (v: number) => Math.round(v / 100_000) * 100_000;

/** "US$ 12,3 mi", "US$ 1,2 bi", "US$ 850 mil". */
export function usd(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  const f = (n: number, d: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });
  if (a >= 1e9) return `${sign}US$ ${f(a / 1e9, 2)} bi`;
  if (a >= 1e6) return `${sign}US$ ${f(a / 1e6, a >= 1e8 ? 0 : 1)} mi`;
  if (a >= 1e5) return `${sign}US$ ${f(a / 1e3, 0)} mil`;
  return `${sign}US$ ${f(a, 0)}`;
}
