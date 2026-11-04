import type { RocketDesign } from "./design";

/**
 * Foguetes reais (aproximados) para carregar no construtor e comparar.
 * `real` guarda o número público para conferir o modelo do app.
 */
export const PRESETS: { id: string; label: string; real: string; design: RocketDesign }[] = [
  {
    id: "falcon-9",
    label: "Falcon 9",
    real: "Real: ~17,5 t para LEO reutilizando o 1º estágio; ~22,8 t descartável.",
    design: {
      name: "Falcon 9",
      diameterM: 3.7,
      stages: [
        { engineId: "merlin-1d", engineCount: 9, propellantMassKg: 411_000, material: "al-li" },
        { engineId: "merlin-vac", engineCount: 1, propellantMassKg: 107_500, material: "al-li" },
      ],
      boosters: null,
      payloadMassKg: 15_000,
      targetOrbit: "LEO",
      stability: "gimbal",
      reuse: "drone",
      reuseFlights: 15,
    },
  },
  {
    id: "electron",
    label: "Electron",
    real: "Real: ~300 kg para LEO.",
    design: {
      name: "Electron",
      diameterM: 1.2,
      stages: [
        { engineId: "rutherford", engineCount: 9, propellantMassKg: 9_250, material: "carbon" },
        { engineId: "rutherford-vac", engineCount: 1, propellantMassKg: 2_050, material: "carbon" },
      ],
      boosters: null,
      payloadMassKg: 300,
      targetOrbit: "LEO",
      stability: "gimbal",
      reuse: "none",
      reuseFlights: 1,
    },
  },
  {
    id: "saturn-v",
    label: "Saturn V",
    real: "Real: ~140 t para LEO e ~48 t rumo à Lua. Decolava com empuxo/peso de ~1,16 — abaixo da margem de 1,2 que a regra do app exige.",
    design: {
      name: "Saturn V",
      diameterM: 10.1,
      stages: [
        { engineId: "f-1", engineCount: 5, propellantMassKg: 2_160_000, material: "aluminum" },
        { engineId: "j-2", engineCount: 5, propellantMassKg: 443_000, material: "aluminum" },
        { engineId: "j-2", engineCount: 1, propellantMassKg: 109_000, material: "aluminum" },
      ],
      boosters: null,
      payloadMassKg: 45_000,
      targetOrbit: "Moon",
      stability: "fins",
      reuse: "none",
      reuseFlights: 1,
    },
  },
  {
    id: "atlas-v",
    label: "Atlas V 541",
    real: "Real: ~17 t para LEO e ~8 t para GTO com 4 GEM 63.",
    design: {
      name: "Atlas V 541",
      diameterM: 3.8,
      stages: [
        { engineId: "rd-180", engineCount: 1, propellantMassKg: 284_000, material: "steel" },
        { engineId: "rl10", engineCount: 1, propellantMassKg: 20_800, material: "steel" },
      ],
      boosters: { boosterId: "gem-63", count: 4 },
      payloadMassKg: 6_000,
      targetOrbit: "GTO",
      stability: "gimbal",
      reuse: "none",
      reuseFlights: 1,
    },
  },
];

/** Ponto de partida do construtor: um foguete pequeno, simples e que ainda dá para melhorar. */
export const STARTER_DESIGN: RocketDesign = {
  name: "Meu foguete",
  diameterM: 2,
  stages: [
    { engineId: "merlin-1d", engineCount: 3, propellantMassKg: 90_000, material: "aluminum" },
    { engineId: "merlin-vac", engineCount: 1, propellantMassKg: 20_000, material: "aluminum" },
  ],
  boosters: null,
  payloadMassKg: 1_000,
  targetOrbit: "LEO",
  stability: "fins",
  reuse: "none",
  reuseFlights: 1,
};
