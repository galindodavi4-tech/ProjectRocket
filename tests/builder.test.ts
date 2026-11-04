import { describe, expect, it } from "vitest";
import { ENGINES, MATERIALS, PROPELLANTS, propellantPricePerKg } from "../lib/catalog";
import { analyzeDesign, maxPayloadKg, toLaunchInput, type RocketDesign } from "../lib/design";
import { costBreakdown, defaultPlan, developmentCostUsd, evaluatePlan, usd } from "../lib/economics";
import { PRESETS, STARTER_DESIGN } from "../lib/presets";
import { simulateAscent } from "../lib/sim/ascent";
import { checkLaunch } from "../lib/tools/checkLaunch";

const preset = (id: string) => PRESETS.find((p) => p.id === id)!.design;
const within = (value: number, real: number, tolerance: number) =>
  expect(Math.abs(value - real) / real).toBeLessThan(tolerance);

describe("catálogo", () => {
  it("todo motor tem números físicos coerentes", () => {
    for (const e of ENGINES) {
      expect(e.thrustVacKN).toBeGreaterThanOrEqual(e.thrustSlKN);
      expect(e.ispVacS).toBeGreaterThanOrEqual(e.ispSlS);
      expect(PROPELLANTS[e.propellant]).toBeDefined();
    }
  });

  it("hidrogênio rende mais por kg mas é o menos denso", () => {
    expect(PROPELLANTS.hydrogen.densityKgM3).toBeLessThan(PROPELLANTS.methane.densityKgM3);
    expect(propellantPricePerKg(PROPELLANTS.kerosene)).toBeLessThan(2);
    expect(MATERIALS.carbon.structureFactor).toBeLessThan(MATERIALS.steel.structureFactor);
  });
});

describe("modelo do projeto — perto dos foguetes reais", () => {
  it("Falcon 9: ~17,5 t reutilizável e ~22,8 t descartável para LEO (tolerância 25%)", () => {
    within(maxPayloadKg(preset("falcon-9")), 17_500, 0.25);
    within(maxPayloadKg({ ...preset("falcon-9"), reuse: "none" }), 22_800, 0.25);
  });

  it("Electron ~300 kg, Saturn V ~48 t rumo à Lua, Atlas V ~8 t para GTO", () => {
    within(maxPayloadKg(preset("electron")), 300, 0.35);
    within(maxPayloadKg(preset("saturn-v"), "Moon"), 48_000, 0.2);
    within(maxPayloadKg(preset("atlas-v"), "GTO"), 8_000, 0.25);
  });

  it("reutilizar o 1º estágio custa carga útil (reserva para pousar)", () => {
    const f9 = preset("falcon-9");
    expect(maxPayloadKg({ ...f9, reuse: "rtls" })).toBeLessThan(maxPayloadKg({ ...f9, reuse: "drone" }));
    expect(maxPayloadKg({ ...f9, reuse: "drone" })).toBeLessThan(maxPayloadKg({ ...f9, reuse: "none" }));
  });

  it("propulsores laterais somam empuxo na decolagem e entram no Δv", () => {
    const atlas = preset("atlas-v");
    const sem = checkLaunch(toLaunchInput({ ...atlas, boosters: null }));
    const com = checkLaunch(toLaunchInput(atlas));
    expect(com.metrics.twr).toBeGreaterThan(sem.metrics.twr);
    expect(com.metrics.deltaVMs).toBeGreaterThan(sem.metrics.deltaVMs);
    expect(com.parts.some((p) => p.id === "boosters")).toBe(true);
  });

  it("gimbal estabiliza sem aletas; sem nenhum dos dois, reprova", () => {
    const base: RocketDesign = { ...STARTER_DESIGN, stability: "gimbal" };
    expect(analyzeDesign(base).launch.parts.find((p) => p.id === "fins")?.status).toBe("ok");
    expect(analyzeDesign({ ...base, stability: "none" }).launch.parts.find((p) => p.id === "fins")?.status).toBe("fail");
  });

  it("motor de vácuo no 1º estágio não tira o foguete do chão", () => {
    const d: RocketDesign = { ...STARTER_DESIGN, stages: [{ ...STARTER_DESIGN.stages[0], engineId: "rl10", engineCount: 3 }] };
    expect(analyzeDesign(d).launch.parts.find((p) => p.id === "stage-1-engines")?.status).toBe("fail");
  });
});

describe("custos e financiamento", () => {
  it("Falcon 9: ~US$ 50 mi descartável, bem menos reutilizando", () => {
    const f9 = preset("falcon-9");
    const exp = { ...f9, reuse: "none" as const };
    const expendable = costBreakdown(exp, analyzeDesign(exp)).perLaunchUsd;
    const reused = costBreakdown(f9, analyzeDesign(f9)).perLaunchUsd;
    within(expendable, 50_000_000, 0.3);
    expect(reused).toBeLessThan(expendable * 0.6);
  });

  it("desenvolvimento do Electron fica perto de US$ 100 mi", () => {
    const e = preset("electron");
    within(developmentCostUsd(costBreakdown(e, analyzeDesign(e))), 100_000_000, 0.3);
  });

  it("plano de negócio: preço abaixo do custo nunca se paga", () => {
    const d = STARTER_DESIGN;
    const a = analyzeDesign(d);
    const c = costBreakdown(d, a);
    const plan = { ...defaultPlan(c), pricePerLaunchUsd: c.perLaunchUsd * 0.9 };
    const r = evaluatePlan(c, a.maxPayload.LEO, plan);
    expect(r.paybackYears).toBeNull();
    expect(r.verdict).toBe("unviable");
    expect(evaluatePlan(c, a.maxPayload.LEO, defaultPlan(c)).profitPerYear).toBeGreaterThan(0);
  });

  it("formata dinheiro em reais de leitura fácil", () => {
    expect(usd(1_234_000_000)).toBe("US$ 1,23 bi");
    expect(usd(22_500_000)).toBe("US$ 22,5 mi");
    expect(usd(850_000)).toBe("US$ 850 mil");
    expect(usd(1_491)).toBe("US$ 1.491");
  });
});

describe("simulador de voo", () => {
  it("Falcon 9 com a carga padrão chega à órbita e conta a história do voo", () => {
    const d = preset("falcon-9");
    const r = simulateAscent(d, analyzeDesign(d));
    expect(r.outcome.kind).toBe("target");
    const kinds = r.events.map((e) => e.kind);
    for (const k of ["liftoff", "maxq", "meco", "separation", "orbit", "landing"]) expect(kinds).toContain(k);
    expect(r.maxQKpa).toBeGreaterThan(15);
    expect(r.maxQKpa).toBeLessThan(60);
  });

  it("Saturn V leva ~45 t rumo à Lua", () => {
    const d = preset("saturn-v");
    expect(simulateAscent(d, analyzeDesign(d)).outcome.kind).toBe("target");
  });

  it("falhas viram eventos: sem empuxo não decola, sem estabilização se parte, sem Δv cai", () => {
    const weak: RocketDesign = { ...STARTER_DESIGN, stages: [{ ...STARTER_DESIGN.stages[0], engineCount: 1 }, STARTER_DESIGN.stages[1]] };
    expect(simulateAscent(weak, analyzeDesign(weak)).outcome.kind).toBe("no-liftoff");
    const wobbly: RocketDesign = { ...STARTER_DESIGN, stability: "none" };
    expect(simulateAscent(wobbly, analyzeDesign(wobbly)).outcome.kind).toBe("breakup");
    const heavy: RocketDesign = { ...STARTER_DESIGN, payloadMassKg: 9_000 };
    expect(["suborbital", "breakup"]).toContain(simulateAscent(heavy, analyzeDesign(heavy)).outcome.kind);
  });
});
