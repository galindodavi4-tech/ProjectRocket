import { z } from "zod";
import {
  boosterById,
  engineById,
  MATERIALS,
  PROPELLANTS,
  REUSE,
  structureMassKg,
  type Booster,
  type Engine,
  type MaterialId,
} from "./catalog";
import { REQUIRED_DELTA_V_MS, TargetOrbit, type LaunchInput } from "./schemas";
import { checkLaunch } from "./tools/checkLaunch";

/** Um estágio do construtor: escolhas do usuário, não massas prontas. */
export const DesignStageSchema = z.object({
  engineId: z.string().describe("ID do motor no catálogo (ex.: merlin-1d, raptor-2, rl10)"),
  engineCount: z.number().int().min(1).max(40).describe("Quantos motores no estágio"),
  propellantMassKg: z.number().min(100).max(5_000_000).describe("Propelente do estágio, em kg"),
  material: z.enum(["aluminum", "al-li", "steel", "carbon"]).describe("Material da estrutura"),
});

export const RocketDesignSchema = z.object({
  name: z.string().min(1).max(40),
  diameterM: z.number().min(0.6).max(12).describe("Diâmetro do foguete, em metros"),
  stages: z.array(DesignStageSchema).min(1).max(3).describe("Estágios em ordem de queima"),
  boosters: z
    .object({
      boosterId: z.string().describe("ID do propulsor lateral (gem-63, p120c)"),
      count: z.union([z.literal(2), z.literal(4), z.literal(6)]),
    })
    .nullable()
    .describe("Propulsores laterais sólidos, ou null"),
  payloadMassKg: z.number().min(0).max(200_000).describe("Carga útil, em kg"),
  targetOrbit: TargetOrbit,
  stability: z.enum(["fins", "gimbal", "none"]).describe("Como o foguete se mantém estável"),
  reuse: z.enum(["none", "drone", "rtls"]).describe("Se o 1º estágio volta para ser reutilizado"),
  reuseFlights: z.number().int().min(1).max(30).describe("Quantos voos cada 1º estágio faz"),
});

export type RocketDesign = z.infer<typeof RocketDesignSchema>;
export type DesignStage = z.infer<typeof DesignStageSchema>;

export const FAIRING_MASS_PER_M2 = 70;

export type StageBreakdown = {
  engine: Engine;
  engineMassKg: number;
  structureMassKg: number;
  fairingMassKg: number;
  avionicsMassKg: number;
  dryMassKg: number;
  propellantMassKg: number;
  reserveKg: number;
  thrustSlN: number;
  thrustVacN: number;
  ispSl: number;
  ispVac: number;
  lengthM: number;
};

/** Massas, empuxo e tamanho de cada estágio, calculados a partir das escolhas. */
export function stageBreakdown(design: RocketDesign): StageBreakdown[] {
  const area = Math.PI * (design.diameterM / 2) ** 2;
  return design.stages.map((s, i) => {
    const engine = engineById(s.engineId) ?? fallbackEngine;
    const propellant = PROPELLANTS[engine.propellant];
    const material = MATERIALS[s.material as MaterialId];
    const structure = structureMassKg(s.propellantMassKg, material, propellant);
    const avionics = 50 + 0.002 * s.propellantMassKg;
    const engineMass = engine.massKg * s.engineCount;
    const fairing = i === 0 ? FAIRING_MASS_PER_M2 * design.diameterM ** 2 : 0;
    const reserve = i === 0 ? s.propellantMassKg * REUSE[design.reuse].landingReserve : 0;
    const tankVolume = s.propellantMassKg / propellant.densityKgM3;
    return {
      engine,
      engineMassKg: engineMass,
      structureMassKg: structure,
      fairingMassKg: fairing,
      avionicsMassKg: avionics,
      dryMassKg: engineMass + structure + avionics + fairing,
      propellantMassKg: s.propellantMassKg,
      reserveKg: reserve,
      thrustSlN: engine.thrustSlKN * 1000 * s.engineCount,
      thrustVacN: engine.thrustVacKN * 1000 * s.engineCount,
      ispSl: engine.ispSlS,
      ispVac: engine.ispVacS,
      // Tanque cilíndrico com 25% a mais de comprimento para domos, interestágio e motores.
      lengthM: Math.max(design.diameterM * 1.2, (tankVolume / area) * 1.25 + 1),
    };
  });
}

const fallbackEngine: Engine = {
  id: "unknown", name: "Motor desconhecido", flies: "—", propellant: "kerosene",
  thrustSlKN: 0, thrustVacKN: 0, ispSlS: 1, ispVacS: 1, massKg: 0, costUsd: 0,
  vacuumOnly: false, estimated: true, note: "",
};

export function boosterOf(design: RocketDesign): Booster | undefined {
  return design.boosters ? boosterById(design.boosters.boosterId) : undefined;
}

/**
 * Converte o projeto para a entrada da checagem do PRD. O 1º estágio usa o
 * empuxo ao nível do mar e a média do Isp (solo → vácuo); os de cima, vácuo.
 */
export function toLaunchInput(design: RocketDesign, payloadMassKg = design.payloadMassKg): LaunchInput {
  const stages = stageBreakdown(design);
  const booster = boosterOf(design);
  return {
    name: design.name,
    stages: stages.map((s, i) => ({
      dryMassKg: s.dryMassKg,
      propellantMassKg: s.propellantMassKg,
      thrustN: i === 0 ? s.thrustSlN : s.thrustVacN,
      ispSeconds: i === 0 ? (s.ispSl + s.ispVac) / 2 : s.ispVac,
      engineCount: design.stages[i].engineCount,
      ...(s.reserveKg > 0 && { reservePropellantKg: s.reserveKg }),
    })),
    payloadMassKg,
    targetOrbit: design.targetOrbit,
    hasFins: design.stability === "fins",
    hasThrustVectoring: design.stability === "gimbal",
    ...(booster &&
      design.boosters && {
        sideBoosters: {
          count: design.boosters.count,
          thrustN: booster.thrustSlKN * 1000,
          ispSeconds: (booster.ispSlS + booster.ispVacS) / 2,
          propellantMassKg: booster.propellantMassKg,
          dryMassKg: booster.dryMassKg,
        },
      }),
  };
}

const totalDeltaV = (design: RocketDesign, payload: number) =>
  checkLaunch(toLaunchInput(design, payload)).metrics.deltaVMs;

/** Maior carga útil (kg) que ainda fecha o Δv para a órbita escolhida. */
export function maxPayloadKg(design: RocketDesign, orbit = design.targetOrbit): number {
  const d = { ...design, targetOrbit: orbit };
  const need = REQUIRED_DELTA_V_MS[orbit];
  if (totalDeltaV(d, 0) < need) return 0;
  let lo = 0;
  let hi = 10_000;
  while (totalDeltaV(d, hi) >= need && hi < 1e7) hi *= 2;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (totalDeltaV(d, mid) >= need) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo / 10) * 10;
}

export type DesignAnalysis = {
  launch: ReturnType<typeof checkLaunch>;
  stages: StageBreakdown[];
  liftoffMassKg: number;
  heightM: number;
  maxPayload: Record<z.infer<typeof TargetOrbit>, number>;
};

export function analyzeDesign(design: RocketDesign): DesignAnalysis {
  const stages = stageBreakdown(design);
  const launch = checkLaunch(toLaunchInput(design));
  const booster = boosterOf(design);
  const boosterMass = booster && design.boosters ? design.boosters.count * (booster.dryMassKg + booster.propellantMassKg) : 0;
  const liftoffMassKg =
    stages.reduce((a, s) => a + s.dryMassKg + s.propellantMassKg, 0) + design.payloadMassKg + boosterMass;
  return {
    launch,
    stages,
    liftoffMassKg,
    heightM: stages.reduce((a, s) => a + s.lengthM, 0) + design.diameterM * 1.8,
    maxPayload: {
      LEO: maxPayloadKg(design, "LEO"),
      GTO: maxPayloadKg(design, "GTO"),
      Moon: maxPayloadKg(design, "Moon"),
    },
  };
}
