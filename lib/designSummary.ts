import { BOOSTERS, ENGINES, MATERIALS } from "./catalog";
import { analyzeDesign, type RocketDesign } from "./design";
import { costBreakdown } from "./economics";

/** Resumo numérico do projeto para a IA: tudo calculado pelo código. */
export function summarizeDesign(design: RocketDesign) {
  const a = analyzeDesign(design);
  const c = costBreakdown(design, a);
  return {
    canLaunch: a.launch.canLaunch,
    failingParts: a.launch.parts.filter((p) => p.status === "fail").map((p) => `${p.label}: ${p.reason}`),
    liftoffMassKg: Math.round(a.liftoffMassKg),
    heightM: Math.round(a.heightM),
    twr: +a.launch.metrics.twr.toFixed(2),
    deltaVMs: Math.round(a.launch.metrics.deltaVMs),
    requiredDeltaVMs: a.launch.metrics.requiredDeltaVMs,
    stageDeltaVMs: a.launch.metrics.stageDeltaVMs.map(Math.round),
    maxPayloadKg: a.maxPayload,
    costPerLaunchUsd: Math.round(c.perLaunchUsd),
    usdPerKgToTarget: c.usdPerKg ? Math.round(c.usdPerKg) : null,
    costLines: c.lines.map((l) => ({ item: l.label, usd: Math.round(l.usd) })),
  };
}

/** Catálogo compacto para o prompt, com os IDs que update_design aceita. */
export function catalogForPrompt() {
  const engines = ENGINES.map(
    (e) => `${e.id} (${e.name}, ${e.propellant}, ${e.thrustSlKN}/${e.thrustVacKN} kN SL/vac, Isp ${e.ispSlS}/${e.ispVacS} s, ${e.massKg} kg, ~US$${(e.costUsd / 1e6).toFixed(1)}M${e.vacuumOnly ? ", vacuum-only" : ""})`,
  ).join("; ");
  const materials = Object.values(MATERIALS).map((m) => `${m.id} (${m.name})`).join(", ");
  const boosters = BOOSTERS.map((b) => `${b.id} (${b.name}, solid, ${b.thrustSlKN} kN each)`).join(", ");
  return `Engines: ${engines}.\nMaterials: ${materials}.\nSide boosters: ${boosters}.\nStability: fins | gimbal | none. Reuse: none | drone | rtls. Target orbit: LEO | GTO | Moon.`;
}
