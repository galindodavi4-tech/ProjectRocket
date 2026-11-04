/**
 * Catálogo do construtor: motores, propelentes, materiais, propulsores laterais
 * e foguetes reais para comparar. Valores aproximados, para fins educativos.
 * `estimated: true` marca números sem fonte pública confiável (custos de motor,
 * principalmente). Fontes em docs/DADOS.md.
 */

export type PropellantId = "kerosene" | "methane" | "hydrogen";

export type Propellant = {
  id: PropellantId;
  name: string;
  short: string;
  /** Razão oxidante/combustível em massa. */
  mixtureRatio: number;
  /** Densidade média da mistura nos tanques (kg/m³). */
  densityKgM3: number;
  /** Preço do combustível e do oxigênio líquido (US$/kg). */
  fuelPriceUsdKg: number;
  oxidizerPriceUsdKg: number;
  pros: string;
  cons: string;
};

export const PROPELLANTS: Record<PropellantId, Propellant> = {
  kerosene: {
    id: "kerosene",
    name: "Querosene (RP-1) + oxigênio líquido",
    short: "Querosene",
    mixtureRatio: 2.56,
    densityKgM3: 1030,
    fuelPriceUsdKg: 2.3,
    oxidizerPriceUsdKg: 0.27,
    pros: "Barato e denso: tanques menores e muito empuxo na decolagem.",
    cons: "Isp mais baixo e deixa fuligem, o que complica reutilizar o motor.",
  },
  methane: {
    id: "methane",
    name: "Metano + oxigênio líquido",
    short: "Metano",
    mixtureRatio: 3.6,
    densityKgM3: 830,
    fuelPriceUsdKg: 0.6,
    oxidizerPriceUsdKg: 0.27,
    pros: "Queima limpa (bom para reutilizar) e Isp maior que o querosene.",
    cons: "Precisa ser mantido a −162 °C; tanques um pouco maiores.",
  },
  hydrogen: {
    id: "hydrogen",
    name: "Hidrogênio + oxigênio líquido",
    short: "Hidrogênio",
    mixtureRatio: 6,
    densityKgM3: 360,
    fuelPriceUsdKg: 6,
    oxidizerPriceUsdKg: 0.27,
    pros: "Maior Isp de todos: o melhor para estágios superiores.",
    cons: "Muito pouco denso (tanques enormes e pesados) e a −253 °C.",
  },
};

/** Preço médio de 1 kg de mistura combustível + oxidante. */
export function propellantPricePerKg(p: Propellant) {
  return (p.fuelPriceUsdKg + p.mixtureRatio * p.oxidizerPriceUsdKg) / (1 + p.mixtureRatio);
}

export type Engine = {
  id: string;
  name: string;
  /** Onde voa (ou voou) na vida real. */
  flies: string;
  propellant: PropellantId;
  /** Empuxo ao nível do mar (kN). Motores de vácuo quase não funcionam no solo. */
  thrustSlKN: number;
  thrustVacKN: number;
  ispSlS: number;
  ispVacS: number;
  massKg: number;
  /** Custo aproximado por unidade (US$). */
  costUsd: number;
  vacuumOnly: boolean;
  estimated: boolean;
  note: string;
};

export const ENGINES: Engine[] = [
  {
    id: "merlin-1d", name: "Merlin 1D", flies: "Falcon 9 (1º estágio)", propellant: "kerosene",
    thrustSlKN: 845, thrustVacKN: 914, ispSlS: 282, ispVacS: 311, massKg: 470,
    costUsd: 1_000_000, vacuumOnly: false, estimated: true,
    note: "Barato e produzido em série. Nove deles empurram o Falcon 9.",
  },
  {
    id: "merlin-vac", name: "Merlin Vacuum", flies: "Falcon 9 (2º estágio)", propellant: "kerosene",
    thrustSlKN: 280, thrustVacKN: 981, ispSlS: 100, ispVacS: 348, massKg: 490,
    costUsd: 1_500_000, vacuumOnly: true, estimated: true,
    note: "Bocal enorme, feito para o vácuo. No solo quase não empurra.",
  },
  {
    id: "rutherford", name: "Rutherford", flies: "Electron (1º estágio)", propellant: "kerosene",
    thrustSlKN: 24.9, thrustVacKN: 26.6, ispSlS: 311, ispVacS: 330, massKg: 35,
    costUsd: 300_000, vacuumOnly: false, estimated: true,
    note: "Pequeno, impresso em 3D, com bombas elétricas a bateria.",
  },
  {
    id: "rutherford-vac", name: "Rutherford Vacuum", flies: "Electron (2º estágio)", propellant: "kerosene",
    thrustSlKN: 8, thrustVacKN: 25.8, ispSlS: 100, ispVacS: 343, massKg: 40,
    costUsd: 350_000, vacuumOnly: true, estimated: true,
    note: "Versão de vácuo do Rutherford.",
  },
  {
    id: "raptor-2", name: "Raptor 2", flies: "Starship / Super Heavy", propellant: "methane",
    thrustSlKN: 2256, thrustVacKN: 2450, ispSlS: 327, ispVacS: 347, massKg: 1630,
    costUsd: 1_000_000, vacuumOnly: false, estimated: true,
    note: "Ciclo de combustão completa, muito eficiente. Feito para reutilizar.",
  },
  {
    id: "raptor-vac", name: "Raptor Vacuum", flies: "Starship (nave)", propellant: "methane",
    thrustSlKN: 750, thrustVacKN: 2500, ispSlS: 120, ispVacS: 380, massKg: 2500,
    costUsd: 1_500_000, vacuumOnly: true, estimated: true,
    note: "Raptor com bocal de vácuo.",
  },
  {
    id: "be-4", name: "BE-4", flies: "New Glenn e Vulcan", propellant: "methane",
    thrustSlKN: 2400, thrustVacKN: 2600, ispSlS: 310, ispVacS: 340, massKg: 2100,
    costUsd: 8_000_000, vacuumOnly: false, estimated: true,
    note: "Motor da Blue Origin, também vendido para a ULA.",
  },
  {
    id: "rd-180", name: "RD-180", flies: "Atlas V", propellant: "kerosene",
    thrustSlKN: 3830, thrustVacKN: 4152, ispSlS: 311, ispVacS: 338, massKg: 5480,
    costUsd: 25_000_000, vacuumOnly: false, estimated: true,
    note: "Russo, duas câmaras de combustão. Potente e eficiente para querosene.",
  },
  {
    id: "f-1", name: "F-1", flies: "Saturn V (1º estágio)", propellant: "kerosene",
    thrustSlKN: 6770, thrustVacKN: 7770, ispSlS: 263, ispVacS: 304, massKg: 8400,
    costUsd: 60_000_000, vacuumOnly: false, estimated: true,
    note: "O maior motor de câmara única já voado. Levou a Apollo à Lua.",
  },
  {
    id: "rs-25", name: "RS-25", flies: "Ônibus Espacial e SLS", propellant: "hydrogen",
    thrustSlKN: 1860, thrustVacKN: 2279, ispSlS: 366, ispVacS: 452, massKg: 3527,
    costUsd: 100_000_000, vacuumOnly: false, estimated: true,
    note: "Isp altíssimo, mas caro: contratos recentes passam de US$ 100 milhões por motor.",
  },
  {
    id: "j-2", name: "J-2", flies: "Saturn V (2º e 3º estágios)", propellant: "hydrogen",
    thrustSlKN: 486, thrustVacKN: 1033, ispSlS: 200, ispVacS: 421, massKg: 1788,
    costUsd: 30_000_000, vacuumOnly: true, estimated: true,
    note: "Motor de hidrogênio dos estágios superiores da Apollo.",
  },
  {
    id: "rl10", name: "RL10", flies: "Centaur (Atlas V, Vulcan)", propellant: "hydrogen",
    thrustSlKN: 30, thrustVacKN: 106, ispSlS: 150, ispVacS: 453, massKg: 231,
    costUsd: 20_000_000, vacuumOnly: true, estimated: true,
    note: "Pequeno e extremamente eficiente. Voa desde os anos 1960.",
  },
];

export type MaterialId = "aluminum" | "al-li" | "steel" | "carbon";

export type Material = {
  id: MaterialId;
  name: string;
  /**
   * Massa da estrutura por kg de propelente, para propelente denso como o
   * querosene. Calibrado para o Falcon 9 dar ~5%.
   */
  structureFactor: number;
  /** Custo da estrutura pronta (material + fabricação), US$ por kg. */
  fabricatedCostUsdKg: number;
  /** Preço só da matéria-prima, US$ por kg (da pesquisa). */
  rawCostUsdKg: number;
  note: string;
};

export const MATERIALS: Record<MaterialId, Material> = {
  aluminum: {
    id: "aluminum", name: "Alumínio 2219", structureFactor: 0.052, fabricatedCostUsdKg: 700, rawCostUsdKg: 5,
    note: "Clássico (Saturn V, Ônibus Espacial). Fácil de soldar.",
  },
  "al-li": {
    id: "al-li", name: "Alumínio-lítio 2195", structureFactor: 0.048, fabricatedCostUsdKg: 1000, rawCostUsdKg: 39,
    note: "Mais leve que o alumínio comum. Usado no Falcon 9.",
  },
  steel: {
    id: "steel", name: "Aço inox 304L", structureFactor: 0.075, fabricatedCostUsdKg: 250, rawCostUsdKg: 3.9,
    note: "Pesado, mas baratíssimo e aguenta frio e calor extremos. Escolha da Starship.",
  },
  carbon: {
    id: "carbon", name: "Fibra de carbono", structureFactor: 0.038, fabricatedCostUsdKg: 2000, rawCostUsdKg: 135,
    note: "O mais leve, mas caro e lento de fabricar. Usado no Electron.",
  },
};

/** Tanques de propelente pouco denso pesam mais: a massa cresce com o volume. */
export function structureMassKg(propellantMassKg: number, material: Material, propellant: Propellant) {
  const densityPenalty = Math.pow(PROPELLANTS.kerosene.densityKgM3 / propellant.densityKgM3, 0.4);
  return propellantMassKg * material.structureFactor * densityPenalty;
}

export type Booster = {
  id: string;
  name: string;
  flies: string;
  thrustSlKN: number;
  thrustVacKN: number;
  ispSlS: number;
  ispVacS: number;
  propellantMassKg: number;
  dryMassKg: number;
  diameterM: number;
  costUsd: number;
  estimated: boolean;
};

/** Propulsores laterais de combustível sólido. */
export const BOOSTERS: Booster[] = [
  {
    id: "gem-63", name: "GEM 63", flies: "Atlas V e Vulcan",
    thrustSlKN: 1500, thrustVacKN: 1660, ispSlS: 250, ispVacS: 279,
    propellantMassKg: 44_200, dryMassKg: 5_100, diameterM: 1.6, costUsd: 6_000_000, estimated: true,
  },
  {
    id: "p120c", name: "P120C", flies: "Ariane 6 e Vega C",
    thrustSlKN: 4000, thrustVacKN: 4500, ispSlS: 250, ispVacS: 279,
    propellantMassKg: 141_600, dryMassKg: 13_000, diameterM: 3.4, costUsd: 15_000_000, estimated: true,
  },
];

export type ReuseMode = "none" | "drone" | "rtls";

export const REUSE: Record<ReuseMode, { name: string; landingReserve: number; recoveryCostUsd: number; note: string }> = {
  none: { name: "Descartável", landingReserve: 0, recoveryCostUsd: 0, note: "O 1º estágio cai no mar e se perde." },
  drone: {
    name: "Pouso em balsa no mar", landingReserve: 0.08, recoveryCostUsd: 1_000_000,
    note: "Guarda ~8% do propelente do 1º estágio para pousar numa balsa no oceano.",
  },
  rtls: {
    name: "Volta à base", landingReserve: 0.15, recoveryCostUsd: 500_000,
    note: "Guarda ~15% do propelente para voltar ao ponto de partida. Perde mais carga útil.",
  },
};

/** Referências de mercado: preço aproximado por kg levado à órbita baixa. */
export const MARKET = [
  { name: "Falcon 9 (reutilizado)", usdPerKg: 2_700, note: "estimativas de 2026" },
  { name: "New Glenn", usdPerKg: 6_000, note: "faixa de US$ 4–8 mil/kg" },
  { name: "Ariane 6 (A62)", usdPerKg: 10_000, note: "~€100 mi para 10,35 t" },
  { name: "Electron", usdPerKg: 25_000, note: "~US$ 7,5 mi para ~300 kg" },
] as const;

export const engineById = (id: string) => ENGINES.find((e) => e.id === id);
export const boosterById = (id: string) => BOOSTERS.find((b) => b.id === id);
