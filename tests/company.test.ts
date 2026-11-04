import { describe, expect, it } from "vitest";
import {
  acceptOffer, advanceQuarter, canFly, CompanyError, developRocket, goPublic, ipoEligibility, makeContact,
  recordMission, startCompany, START_CASH, valuationUsd, type Company,
} from "../lib/company";
import { rotationBoostMs } from "../lib/countries";
import { analyzeDesign } from "../lib/design";
import { costBreakdown, developmentCostUsd } from "../lib/economics";
import { PRESETS } from "../lib/presets";
import { simulateAscent } from "../lib/sim/ascent";

const f9 = PRESETS[0].design;
const a = analyzeDesign(f9);
const cost = costBreakdown(f9, a);
const fakeFlight = (kind: "target" | "suborbital") => ({ ...simulateAscent(f9, a), outcome: { kind, label: kind, detail: "" } }) as ReturnType<typeof simulateAscent>;

describe("empresa espacial", () => {
  it("começa com US$ 100 mi, 100% do fundador, 3 ações, 3 missões e um investidor-anjo", () => {
    const c = startCompany("Turquesa Aeroespacial", "BR", 42);
    expect(c.offers[0]).toMatchObject({ kind: "equity", from: "Investidor-anjo", equityPct: 15 });
    expect(c.cashUsd).toBe(START_CASH);
    expect(c.founderPct).toBe(100);
    expect(c.actionsLeft).toBe(3);
    expect(c.missions).toHaveLength(3);
    expect(valuationUsd(c)).toBe(START_CASH);
  });

  it("mesma semente, mesmas missões (dá para ensaiar a apresentação)", () => {
    expect(startCompany("A", "US", 7).missions).toEqual(startCompany("A", "US", 7).missions);
  });

  it("desenvolver leva trimestres e é pago em parcelas; antes de ficar pronto não voa", () => {
    const electron = PRESETS[1].design;
    const ea = analyzeDesign(electron);
    let c = developRocket(startCompany("A", "BR", 1), electron, developmentCostUsd(costBreakdown(electron, ea)));
    const p = c.programs[0];
    expect(p.quartersLeft).toBeGreaterThan(0);
    expect(canFly(c, electron, ea.maxPayload, c.missions[0]).ok).toBe(false);
    for (let q = 0; q < p.quartersLeft; q++) c = advanceQuarter(c);
    expect(c.programs[0].quartersLeft).toBe(0);
    expect(c.programs[0].paidUsd).toBeCloseTo(p.devCostUsd, -2);
  });

  it("um Falcon 9 custa mais que os US$ 100 mi iniciais: sem investidores, a empresa quebra", () => {
    let c = developRocket(startCompany("A", "BR", 1), f9, developmentCostUsd(cost));
    for (let q = 0; q < 6 && !c.bankrupt; q++) c = advanceQuarter(c);
    expect(c.bankrupt).toBe(true);
  });

  it("o país muda o custo: desenvolver no Brasil sai mais barato que nos EUA", () => {
    const br = developRocket(startCompany("A", "BR", 1), f9, 300_000_000).programs[0].devCostUsd;
    const us = developRocket(startCompany("A", "US", 1), f9, 300_000_000).programs[0].devCostUsd;
    expect(br).toBeLessThan(us);
  });

  it("missão de sucesso paga cliente + incentivo e sobe a reputação; falha custa o lançamento", () => {
    const c = startCompany("A", "BR", 3);
    const m = c.missions[0];
    const ok = recordMission(c, m.id, fakeFlight("target"), cost.perLaunchUsd);
    expect(ok.cashUsd).toBeCloseTo(START_CASH - cost.perLaunchUsd + m.paymentUsd * 1.15, -2);
    expect(ok.reputation).toBeGreaterThan(c.reputation);
    const bad = recordMission(c, m.id, fakeFlight("suborbital"), cost.perLaunchUsd);
    expect(bad.cashUsd).toBeCloseTo(START_CASH - cost.perLaunchUsd, -2);
    expect(bad.reputation).toBeLessThan(c.reputation);
  });

  it("investimento dá dinheiro em troca de participação", () => {
    const c: Company = startCompany("A", "US", 11);
    const offer = c.offers.find((o) => o.kind === "equity")!;
    expect(offer).toBeDefined();
    const after = acceptOffer(c, offer.id);
    expect(after.cashUsd).toBe(c.cashUsd + offer.amountUsd);
    expect(after.founderPct).toBeLessThan(100);
  });

  it("ações acabam no trimestre; IPO exige histórico; sem dinheiro, falência", () => {
    let c = startCompany("A", "BR", 5);
    c = makeContact(c, "bank");
    expect(() => makeContact(c, "bank")).toThrow(CompanyError); // cada contato, uma vez por trimestre
    c = makeContact(makeContact(c, "fair"), "agency");
    expect(() => makeContact(c, "fund")).toThrow(CompanyError); // acabaram as 3 ações
    expect(ipoEligibility(c).ok).toBe(false);
    expect(() => goPublic(c)).toThrow(CompanyError);
    // 1ª vez no vermelho: empréstimo de emergência (se ainda houver valor); depois, falência.
    const rescued = advanceQuarter({ ...c, cashUsd: -1_000_000, successes: 3, revenueByQuarter: [50_000_000] });
    expect(rescued.bankrupt).toBe(false);
    expect(rescued.loans.some((l) => l.from === "Empréstimo de emergência")).toBe(true);
    const broke = advanceQuarter({ ...rescued, cashUsd: -50_000_000 });
    expect(broke.bankrupt).toBe(true);
  });

  it("base perto do Equador ganha mais velocidade da rotação da Terra", () => {
    expect(rotationBoostMs(-2.3)).toBeGreaterThan(rotationBoostMs(28.5) + 50);
  });
});

describe("mercado de missões", () => {
  it("toda rodada tem uma missão pequena, e cargas pequenas pagam mais por kg", async () => {
    const { pricePerKg } = await import("../lib/company");
    for (const seed of [1, 2, 3, 4, 5]) {
      const c = startCompany("A", "BR", seed);
      expect(c.missions.some((m) => m.orbit === "LEO" && m.payloadKg <= 350)).toBe(true);
    }
    expect(pricePerKg("LEO", 300)).toBeGreaterThan(20_000);
    expect(pricePerKg("LEO", 15_000)).toBeLessThan(7_000);
  });
});
