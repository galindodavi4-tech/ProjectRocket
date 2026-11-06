import { PROPELLANTS } from "./catalog";
import { boosterOf, type DesignAnalysis, type RocketDesign } from "./design";
import type { RocketModel } from "./schemas";

const SOLID_DENSITY = 1_800;

/** Modelo do visualizador a partir do projeto: peças com status e proporções reais. */
export function designToModel(design: RocketDesign, analysis: DesignAnalysis): RocketModel {
  const booster = boosterOf(design);
  return {
    name: design.name,
    stageCount: design.stages.length,
    hasFins: design.stability === "fins",
    canLaunch: analysis.launch.canLaunch,
    parts: analysis.launch.parts,
    geometry: {
      diameterM: design.diameterM,
      stages: analysis.stages.map((s, i) => ({
        lengthM: s.lengthM,
        engineCount: design.stages[i].engineCount,
        propellant: s.engine.propellant,
        vacuumEngine: s.engine.vacuumOnly,
      })),
      boosters:
        booster && design.boosters
          ? {
              count: design.boosters.count,
              diameterM: booster.diameterM,
              lengthM: booster.propellantMassKg / SOLID_DENSITY / (Math.PI * (booster.diameterM / 2) ** 2) * 1.15 + 2,
            }
          : null,
      stability: design.stability,
      reusable: design.reuse !== "none",
    },
  };
}

/** Proporções padrão para foguetes descritos no chat, sem projeto detalhado. */
export function defaultGeometry(model: RocketModel): NonNullable<RocketModel["geometry"]> {
  const lengths = [24, 16, 11, 9];
  return {
    diameterM: 5,
    stages: Array.from({ length: model.stageCount }, (_, i) => ({
      lengthM: lengths[i] ?? 9,
      engineCount: i === 0 ? 5 : 1,
      propellant: "kerosene" as const,
      vacuumEngine: i > 0,
    })),
    boosters: model.parts.some((p) => p.id === "boosters") ? { count: 2, lengthM: 20, diameterM: 2.5 } : null,
    stability: model.hasFins ? "fins" : "gimbal",
  };
}

export const FLAME_COLORS: Record<keyof typeof PROPELLANTS | "solid", { core: string; outer: string }> = {
  kerosene: { core: "#fff1c2", outer: "#ff8a3d" },
  methane: { core: "#e6f6ff", outer: "#7fb6ff" },
  hydrogen: { core: "#f2f8ff", outer: "#b9c8ff" },
  solid: { core: "#fffbe8", outer: "#ffb347" },
};
