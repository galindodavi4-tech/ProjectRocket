import { countryById, type CountryId } from "./countries";
import type { RocketDesign } from "./design";
import type { FlightResult } from "./sim/ascent";
import { TargetOrbit } from "./schemas";
import type { z } from "zod";

/**
 * Simulador de empresa espacial, em trimestres. Funções puras: recebem o estado
 * e devolvem um novo. A sorte vem de um gerador com semente, então a mesma
 * sequência de decisões dá o mesmo resultado (bom para testes e para ensaiar a
 * apresentação). Números simplificados e didáticos.
 */

export const START_CASH = 100_000_000;
const RESCUE = "Empréstimo de emergência";
export const ACTIONS_PER_QUARTER = 3;
export const UNICORN = 1_000_000_000;

type Orbit = z.infer<typeof TargetOrbit>;

export type Mission = {
  id: string;
  client: string;
  description: string;
  payloadKg: number;
  orbit: Orbit;
  paymentUsd: number;
};

export type Offer = {
  id: string;
  kind: "equity" | "grant" | "loan";
  from: string;
  text: string;
  amountUsd: number;
  /** Participação da empresa entregue ao investidor (%). */
  equityPct?: number;
  /** Juros por trimestre (%). */
  ratePct?: number;
  /** Para contratos do governo: missões de sucesso exigidas até o prazo. */
  requiredSuccesses?: number;
  deadlineQuarter?: number;
  expiresQuarter: number;
};

export type Obligation = {
  id: string;
  from: string;
  amountUsd: number;
  requiredSuccesses: number;
  successesAtStart: number;
  deadlineQuarter: number;
};

export type Loan = { from: string; balanceUsd: number; ratePct: number };

export type RocketProgram = {
  key: string;
  name: string;
  devCostUsd: number;
  paidUsd: number;
  quartersLeft: number;
};

export type MarketEvent = {
  id: string;
  title: string;
  text: string;
  paymentFactor: number;
  offerFactor: number;
  fixedCostFactor: number;
};

export type LogEntry = { quarter: number; kind: "good" | "bad" | "info"; text: string };

export type Company = {
  version: 1;
  name: string;
  countryId: CountryId;
  quarter: number;
  cashUsd: number;
  /** Quanto da empresa ainda é seu (%). */
  founderPct: number;
  reputation: number;
  status: "private" | "public";
  actionsLeft: number;
  programs: RocketProgram[];
  missions: Mission[];
  offers: Offer[];
  obligations: Obligation[];
  loans: Loan[];
  successes: number;
  failures: number;
  revenueByQuarter: number[];
  event: MarketEvent;
  log: LogEntry[];
  seed: number;
  /** Contatos já feitos neste trimestre (cada um, uma vez por trimestre). */
  contactsUsed?: ContactId[];
  bankrupt: boolean;
  unicornReached: boolean;
};

/* ---------- sorte com semente ---------- */

function makeRng(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (a: number, b: number) => a + (b - a) * next(),
    pick: <T,>(list: readonly T[]) => list[Math.floor(next() * list.length)],
    seed: () => s,
  };
}

const round = (v: number, step: number) => Math.round(v / step) * step;

export const quarterLabel = (q: number) => `T${(q % 4) + 1} de ${2027 + Math.floor(q / 4)}`;

/** Chave estável do projeto: o mesmo foguete dá a mesma chave. */
export function designKey(design: RocketDesign) {
  const { name: _name, payloadMassKg: _p, targetOrbit: _o, ...rest } = design;
  return JSON.stringify(rest);
}

/* ---------- mercado ---------- */

const EVENTS: MarketEvent[] = [
  { id: "calm", title: "Trimestre tranquilo", text: "Nada de especial no mercado.", paymentFactor: 1, offerFactor: 1, fixedCostFactor: 1 },
  { id: "boom", title: "Satélites em alta", text: "Muitas empresas querem lançar: missões pagam 20% a mais.", paymentFactor: 1.2, offerFactor: 1.1, fixedCostFactor: 1 },
  { id: "crisis", title: "Juros subiram", text: "Investidores ficaram cautelosos: ofertas 30% menores.", paymentFactor: 1, offerFactor: 0.7, fixedCostFactor: 1 },
  { id: "rival", title: "Concorrente baixou preços", text: "Os clientes pagam 15% menos pelas missões.", paymentFactor: 0.85, offerFactor: 1, fixedCostFactor: 1 },
  { id: "talent", title: "Engenheiros chegando", text: "Contratar ficou mais fácil: custos fixos 10% menores.", paymentFactor: 1, offerFactor: 1, fixedCostFactor: 0.9 },
  { id: "hype", title: "Espaço na moda", text: "Muita notícia sobre foguetes: ofertas 20% maiores.", paymentFactor: 1, offerFactor: 1.2, fixedCostFactor: 1 },
];

/**
 * Preço por kg que os clientes pagam (simplificado). Cargas pequenas pagam bem
 * mais por kg — como no mercado real: o Electron cobra ~US$ 7,5 mi por ~300 kg.
 */
export function pricePerKg(orbit: Orbit, kg: number) {
  if (orbit === "LEO") return 6_000 + 25_000 * Math.exp(-kg / 1_000);
  if (orbit === "GTO") return 18_000 + 10_000 * Math.exp(-kg / 2_000);
  return 60_000;
}
/** Lançamento dedicado tem preço mínimo: o foguete inteiro voa só para esse cliente (Electron: ~US$ 7,5 mi). */
const MIN_PAYMENT: Record<Orbit, number> = { LEO: 7_500_000, GTO: 25_000_000, Moon: 60_000_000 };

const TEMPLATES: { client: (country: string) => string; description: string; orbit: Orbit; kg: [number, number] }[] = [
  { client: (c) => `Universidade · ${c}`, description: "Cubesats de pesquisa em órbita baixa", orbit: "LEO", kg: [80, 400] },
  { client: () => "StarNet Comunicações", description: "Lote de satélites de internet", orbit: "LEO", kg: [4_000, 14_000] },
  { client: () => "ClimaSat", description: "Satélite meteorológico", orbit: "LEO", kg: [800, 3_500] },
  { client: () => "Agência espacial parceira", description: "Carga para uma estação espacial", orbit: "LEO", kg: [2_500, 8_000] },
  { client: () => "TV Orbital", description: "Satélite de TV geoestacionário", orbit: "GTO", kg: [2_500, 6_000] },
  { client: () => "Lunar Labs", description: "Sonda para pousar na Lua", orbit: "Moon", kg: [600, 4_000] },
  { client: () => "AgroVisão", description: "Satélite de observação de lavouras", orbit: "LEO", kg: [300, 1_500] },
];

/** Missões bem pequenas (até 400 kg em órbita baixa): toda rodada tem uma, para foguetes pequenos terem trabalho. */
const SMALL = TEMPLATES.map((t, i) => (t.orbit === "LEO" && t.kg[1] <= 400 ? i : -1)).filter((i) => i >= 0);

function generateMissions(c: Pick<Company, "countryId" | "quarter" | "event">, rng: ReturnType<typeof makeRng>): Mission[] {
  const country = countryById(c.countryId).name;
  const used = new Set<number>();
  const out: Mission[] = [];
  while (out.length < 3) {
    const i = out.length === 0 ? rng.pick(SMALL) : Math.floor(rng.next() * TEMPLATES.length);
    if (used.has(i)) continue;
    used.add(i);
    const t = TEMPLATES[i];
    const kg = round(rng.between(t.kg[0], t.kg[1]), t.kg[1] > 2000 ? 100 : 10);
    const pay = Math.max(MIN_PAYMENT[t.orbit], kg * pricePerKg(t.orbit, kg)) * rng.between(0.85, 1.25) * c.event.paymentFactor;
    out.push({ id: `m${c.quarter}-${i}`, client: t.client(country), description: t.description, payloadKg: kg, orbit: t.orbit, paymentUsd: round(pay, 100_000) });
  }
  return out;
}

/* ---------- valor da empresa ---------- */

export function debtUsd(c: Company) {
  return c.loans.reduce((a, l) => a + l.balanceUsd, 0);
}

/**
 * Valor de mercado (simplificado): caixa líquido + 3× a receita do último ano +
 * 60% do que já foi investido em foguetes prontos + prêmio por missões e reputação.
 */
export function valuationUsd(c: Company) {
  const lastYear = c.revenueByQuarter.slice(-4).reduce((a, b) => a + b, 0);
  const rockets = c.programs.filter((p) => p.quartersLeft === 0).reduce((a, p) => a + p.devCostUsd * 0.6, 0);
  const track = c.successes * 30_000_000 * (0.5 + c.reputation / 100);
  const base = Math.max(0, c.cashUsd - debtUsd(c)) + 3 * lastYear + rockets + track;
  return base * (c.status === "public" ? 1.25 : 1);
}

export function fixedCostsPerQuarter(c: Company) {
  const country = countryById(c.countryId);
  const engineering = c.programs.reduce((a, p) => a + p.devCostUsd, 0) * 0.015;
  return (2_500_000 + engineering + (c.status === "public" ? 1_000_000 : 0)) * country.costFactor * c.event.fixedCostFactor;
}

/** Desenvolvimento fica mais barato ou mais caro conforme o país (salários). */
export function adjustedDevCost(devCostUsd: number, countryId: CountryId) {
  return devCostUsd * (0.6 + 0.4 * countryById(countryId).costFactor);
}

export const devQuarters = (devCostUsd: number) => Math.max(1, Math.min(4, Math.round(devCostUsd / 150_000_000) + 1));

export function ipoEligibility(c: Company) {
  const reasons: string[] = [];
  if (c.status === "public") reasons.push("A empresa já é de capital aberto.");
  if (c.successes < 3) reasons.push(`Precisa de 3 missões de sucesso (tem ${c.successes}).`);
  if (c.reputation < 60) reasons.push(`Precisa de reputação 60 (tem ${Math.round(c.reputation)}).`);
  if (valuationUsd(c) < 400_000_000) reasons.push("Precisa valer pelo menos US$ 400 mi.");
  return { ok: reasons.length === 0, reasons };
}

/* ---------- ações ---------- */

const log = (c: Company, kind: LogEntry["kind"], text: string): Company => ({ ...c, log: [{ quarter: c.quarter, kind, text }, ...c.log].slice(0, 40) });

const spendAction = (c: Company): Company => ({ ...c, actionsLeft: c.actionsLeft - 1 });

export class CompanyError extends Error {}

function needAction(c: Company) {
  if (c.bankrupt) throw new CompanyError("A empresa faliu. Comece de novo.");
  if (c.actionsLeft <= 0) throw new CompanyError("Sem ações neste trimestre. Avance para o próximo.");
}

export function startCompany(name: string, countryId: CountryId, seed = Date.now() % 2_147_483_647): Company {
  const rng = makeRng(seed);
  const event = EVENTS[0];
  const base: Company = {
    version: 1,
    name: name.trim() || "Minha Empresa Espacial",
    countryId,
    quarter: 0,
    cashUsd: START_CASH,
    founderPct: 100,
    reputation: 20,
    status: "private",
    actionsLeft: ACTIONS_PER_QUARTER,
    programs: [],
    missions: [],
    offers: [],
    obligations: [],
    loans: [],
    successes: 0,
    failures: 0,
    revenueByQuarter: [],
    event,
    log: [],
    seed,
    bankrupt: false,
    unicornReached: false,
  };
  const missions = generateMissions(base, rng);
  const country = countryById(countryId);
  // Primeira decisão de dinheiro: um investidor-anjo quer entrar logo no começo.
  const angelUsd = round(30_000_000 * country.investorFactor, 1_000_000);
  const angel: Offer = {
    id: "o0-angel", kind: "equity", from: "Investidor-anjo", amountUsd: angelUsd, equityPct: 15, expiresQuarter: 2,
    text: `${fmtUsd(angelUsd)} por 15% da empresa. Ajuda a pagar o primeiro foguete.`,
  };
  return log({ ...base, missions, offers: [angel], seed: rng.seed() }, "info", `${base.name} foi fundada em ${country.name} com US$ 100 milhões. Base: ${country.site}.`);
}

/** Começa a desenvolver o foguete do construtor. O custo é pago ao longo dos trimestres. */
export function developRocket(c: Company, design: RocketDesign, baseDevCostUsd: number): Company {
  needAction(c);
  const key = designKey(design);
  if (c.programs.some((p) => p.key === key)) throw new CompanyError("Este foguete já está em desenvolvimento ou pronto.");
  const devCostUsd = round(adjustedDevCost(baseDevCostUsd, c.countryId), 100_000);
  const quarters = devQuarters(devCostUsd);
  const next = spendAction({ ...c, programs: [...c.programs, { key, name: design.name, devCostUsd, paidUsd: 0, quartersLeft: quarters }] });
  return log(next, "info", `Começou o desenvolvimento do ${design.name}: ${fmtUsd(devCostUsd)} em ${quarters} trimestre(s).`);
}

export function rocketStatus(c: Company, design: RocketDesign) {
  return c.programs.find((p) => p.key === designKey(design)) ?? null;
}

export type ContactId = "fair" | "agency" | "fund" | "bank" | "bigtech";

export const CONTACTS: Record<ContactId, { name: string; costUsd: number; text: string; minReputation: number }> = {
  fair: { name: "Feira espacial internacional", costUsd: 1_500_000, minReputation: 0, text: "Estande, viagem e networking. Pode render uma oferta de investidores de risco." },
  agency: { name: "Reunião com a agência espacial", costUsd: 300_000, minReputation: 15, text: "O governo pode oferecer um contrato por marcos: dinheiro que não precisa devolver, se você cumprir as missões." },
  fund: { name: "Pitch para fundos de investimento", costUsd: 800_000, minReputation: 30, text: "Fundos grandes pagam mais, mas querem ver missões de sucesso." },
  bank: { name: "Banco de fomento", costUsd: 100_000, minReputation: 0, text: "Empréstimo com juros: você não perde participação, mas paga juros todo trimestre." },
  bigtech: { name: "Parceria com uma big tech", costUsd: 2_000_000, minReputation: 60, text: "Empresas de tecnologia investem em foguetes para lançar seus satélites." },
};

/** Faz um contato: custa dinheiro e uma ação, e pode virar uma oferta. */
export function makeContact(c: Company, id: ContactId): Company {
  needAction(c);
  const contact = CONTACTS[id];
  if (c.reputation < contact.minReputation) throw new CompanyError(`Precisa de reputação ${contact.minReputation} para este contato.`);
  if (c.cashUsd < contact.costUsd) throw new CompanyError("Dinheiro insuficiente para este contato.");
  if ((c.contactsUsed ?? []).includes(id)) throw new CompanyError("Você já fez esse contato neste trimestre. Tente outro ou avance.");
  const rng = makeRng(c.seed);
  const country = countryById(c.countryId);
  const val = Math.max(valuationUsd(c), 50_000_000);
  const factor = c.event.offerFactor;
  let next: Company = spendAction({ ...c, cashUsd: c.cashUsd - contact.costUsd, contactsUsed: [...(c.contactsUsed ?? []), id] });
  const chance = id === "bank" ? 0.95 : id === "agency" ? 0.55 + c.reputation / 200 : 0.35 + c.reputation / 150;
  const expires = c.quarter + 2;

  if (rng.next() > Math.min(0.95, chance)) {
    next = log({ ...next, seed: rng.seed() }, "bad", `${contact.name}: boas conversas, mas nenhuma oferta desta vez.`);
    return next;
  }

  let offer: Offer;
  const oid = `o${c.quarter}-${id}-${Math.floor(rng.next() * 1e6)}`;
  if (id === "agency") {
    const amount = round(rng.between(10_000_000, 40_000_000) * country.grantFactor * factor, 1_000_000);
    const req = c.successes >= 2 ? 2 : 1;
    offer = {
      id: oid, kind: "grant", from: country.agency, amountUsd: amount, requiredSuccesses: req, deadlineQuarter: c.quarter + 4, expiresQuarter: expires,
      text: `${fmtUsd(amount)} agora, sem perder participação, se você fizer ${req} missão(ões) de sucesso até ${quarterLabel(c.quarter + 4)}. Se não cumprir, devolve tudo.`,
    };
  } else if (id === "bank") {
    const amount = round(rng.between(20_000_000, 80_000_000) * factor, 1_000_000);
    const rate = Math.round(rng.between(2, 4) * 10) / 10;
    offer = { id: oid, kind: "loan", from: "Banco de fomento", amountUsd: amount, ratePct: rate, expiresQuarter: expires, text: `Empréstimo de ${fmtUsd(amount)} a ${rate}% ao trimestre.` };
  } else {
    const share = id === "fair" ? rng.between(0.1, 0.2) : id === "fund" ? rng.between(0.15, 0.3) : rng.between(0.2, 0.35);
    const proven = id === "fund" && c.successes === 0 ? 0.6 : 1;
    const amount = round(val * share * country.investorFactor * factor * proven, 1_000_000);
    // Investidores negociam: pedem um pouco mais de participação do que o dinheiro vale.
    const equityPct = Math.min(45, Math.round(((amount / val) * 100 * rng.between(1.0, 1.35)) * 10) / 10);
    const from = id === "fair" ? rng.pick(["Órbita Ventures", "Estrela Capital", "LaunchPad VC"]) : id === "fund" ? rng.pick(["Fundo Andrômeda", "Galáxia Investimentos"]) : rng.pick(["Nimbus Tech", "Quantum Cloud"]);
    offer = { id: oid, kind: "equity", from, amountUsd: amount, equityPct, expiresQuarter: expires, text: `${fmtUsd(amount)} por ${equityPct}% da empresa.` };
  }
  next = { ...next, offers: [...next.offers, offer], seed: rng.seed() };
  return log(next, "good", `${contact.name}: ${offer.from} fez uma oferta.`);
}

export function acceptOffer(c: Company, offerId: string): Company {
  const offer = c.offers.find((o) => o.id === offerId);
  if (!offer) throw new CompanyError("Oferta não encontrada.");
  let next: Company = { ...c, offers: c.offers.filter((o) => o.id !== offerId), cashUsd: c.cashUsd + offer.amountUsd };
  if (offer.kind === "equity") {
    next = { ...next, founderPct: Math.round(c.founderPct * (1 - (offer.equityPct ?? 0) / 100) * 10) / 10 };
    return log(next, "good", `Aceitou ${fmtUsd(offer.amountUsd)} de ${offer.from} por ${offer.equityPct}% da empresa.`);
  }
  if (offer.kind === "loan") {
    next = { ...next, loans: [...c.loans, { from: offer.from, balanceUsd: offer.amountUsd, ratePct: offer.ratePct ?? 3 }] };
    return log(next, "info", `Pegou ${fmtUsd(offer.amountUsd)} emprestados a ${offer.ratePct}% ao trimestre.`);
  }
  next = {
    ...next,
    obligations: [...c.obligations, { id: offer.id, from: offer.from, amountUsd: offer.amountUsd, requiredSuccesses: offer.requiredSuccesses ?? 1, successesAtStart: c.successes, deadlineQuarter: offer.deadlineQuarter ?? c.quarter + 4 }],
  };
  return log(next, "good", `Contrato com ${offer.from}: recebeu ${fmtUsd(offer.amountUsd)}.`);
}

export function declineOffer(c: Company, offerId: string): Company {
  const offer = c.offers.find((o) => o.id === offerId);
  return log({ ...c, offers: c.offers.filter((o) => o.id !== offerId) }, "info", `Recusou a oferta de ${offer?.from ?? "?"}.`);
}

export function repayLoans(c: Company): Company {
  const debt = debtUsd(c);
  if (debt === 0) return c;
  if (c.cashUsd < debt) throw new CompanyError("Dinheiro insuficiente para quitar as dívidas.");
  return log({ ...c, cashUsd: c.cashUsd - debt, loans: [] }, "info", `Quitou ${fmtUsd(debt)} em empréstimos.`);
}

/** Pode tentar a missão com este foguete? (A carga tem que caber.) */
export function canFly(c: Company, design: RocketDesign, maxPayload: Record<Orbit, number>, mission: Mission) {
  const program = rocketStatus(c, design);
  if (!program) return { ok: false, reason: "Desenvolva este foguete primeiro." };
  if (program.quartersLeft > 0) return { ok: false, reason: `Foguete pronto em ${program.quartersLeft} trimestre(s).` };
  if (maxPayload[mission.orbit] < mission.payloadKg) return { ok: false, reason: `O foguete leva só ${Math.round(maxPayload[mission.orbit])} kg para esse destino.` };
  return { ok: true, reason: "" };
}

/**
 * Registra o resultado de uma missão. O voo é simulado fora (para animar na
 * tela) e o resultado chega aqui. Sucesso paga o cliente + incentivo do país.
 */
export function recordMission(c: Company, missionId: string, flight: FlightResult, launchCostUsd: number): Company {
  needAction(c);
  const mission = c.missions.find((m) => m.id === missionId);
  if (!mission) throw new CompanyError("Missão não encontrada.");
  const country = countryById(c.countryId);
  const success = flight.outcome.kind === "target";
  let next: Company = spendAction({ ...c, missions: c.missions.filter((m) => m.id !== missionId), cashUsd: c.cashUsd - launchCostUsd });
  const revenue = [...next.revenueByQuarter];
  while (revenue.length <= c.quarter) revenue.push(0);
  if (success) {
    const bonus = mission.paymentUsd * country.missionBonus;
    revenue[c.quarter] += mission.paymentUsd + bonus;
    next = {
      ...next,
      cashUsd: next.cashUsd + mission.paymentUsd + bonus,
      successes: c.successes + 1,
      reputation: Math.min(100, c.reputation + 10),
      revenueByQuarter: revenue,
    };
    return log(next, "good", `Missão para ${mission.client} cumprida! +${fmtUsd(mission.paymentUsd)} do cliente e +${fmtUsd(bonus)} de incentivo de ${country.name}.`);
  }
  next = { ...next, failures: c.failures + 1, reputation: Math.max(0, c.reputation - 15), revenueByQuarter: revenue };
  return log(next, "bad", `Missão para ${mission.client} falhou (${flight.outcome.label}). Perdeu ${fmtUsd(launchCostUsd)} do lançamento e reputação.`);
}

export function goPublic(c: Company): Company {
  const { ok, reasons } = ipoEligibility(c);
  if (!ok) throw new CompanyError(reasons.join(" "));
  const val = valuationUsd(c);
  const raised = round(val * 0.25, 1_000_000);
  const next: Company = { ...c, status: "public", cashUsd: c.cashUsd + raised, founderPct: Math.round(c.founderPct * 0.8 * 10) / 10, reputation: Math.min(100, c.reputation + 10) };
  return log(next, "good", `IPO! A empresa abriu capital na bolsa e levantou ${fmtUsd(raised)} vendendo 20% em ações.`);
}

/** Fecha o trimestre: paga desenvolvimento, custos fixos e juros; sorteia o próximo cenário. */
export function advanceQuarter(c: Company): Company {
  if (c.bankrupt) return c;
  const rng = makeRng(c.seed);
  let next: Company = { ...c };
  const notes: LogEntry[] = [];
  const note = (kind: LogEntry["kind"], text: string) => notes.push({ quarter: c.quarter, kind, text });

  // Parcelas do desenvolvimento.
  next.programs = c.programs.map((p) => {
    if (p.quartersLeft === 0) return p;
    const installment = (p.devCostUsd - p.paidUsd) / p.quartersLeft;
    next.cashUsd -= installment;
    const done = p.quartersLeft - 1 === 0;
    if (done) note("good", `${p.name} está pronto para voar!`);
    return { ...p, paidUsd: p.paidUsd + installment, quartersLeft: p.quartersLeft - 1 };
  });

  const fixed = fixedCostsPerQuarter(c);
  next.cashUsd -= fixed;
  const interest = c.loans.reduce((a, l) => a + (l.balanceUsd * l.ratePct) / 100, 0);
  next.cashUsd -= interest;
  if (interest > 0) note("info", `Juros dos empréstimos: ${fmtUsd(interest)}.`);

  // Contratos do governo: cumpriu os marcos?
  next.obligations = c.obligations.filter((o) => {
    const done = c.successes - o.successesAtStart >= o.requiredSuccesses;
    if (done) {
      note("good", `Marcos do contrato com ${o.from} cumpridos.`);
      next.reputation = Math.min(100, next.reputation + 5);
      return false;
    }
    if (c.quarter + 1 >= o.deadlineQuarter) {
      next.cashUsd -= o.amountUsd;
      next.reputation = Math.max(0, next.reputation - 10);
      note("bad", `Não cumpriu os marcos de ${o.from}: devolveu ${fmtUsd(o.amountUsd)}.`);
      return false;
    }
    return true;
  });

  // Empresa aberta sem resultado no trimestre: o mercado cobra.
  const hadSuccess = (c.revenueByQuarter[c.quarter] ?? 0) > 0;
  if (c.status === "public" && !hadSuccess) {
    next.reputation = Math.max(0, next.reputation - 5);
    note("bad", "Acionistas cobraram resultados: nenhuma missão neste trimestre.");
  }

  next.quarter = c.quarter + 1;
  next.event = rng.pick(EVENTS);
  next.revenueByQuarter = [...c.revenueByQuarter];
  while (next.revenueByQuarter.length <= c.quarter) next.revenueByQuarter.push(0);
  next.missions = generateMissions(next, rng);
  next.offers = c.offers.filter((o) => o.expiresQuarter > next.quarter);
  next.actionsLeft = ACTIONS_PER_QUARTER;
  next.contactsUsed = [];
  next.seed = rng.seed();
  note("info", `Custos fixos do trimestre: ${fmtUsd(fixed)}. Novo cenário: ${next.event.title}.`);

  if (next.cashUsd < 0) {
    // O banco cobre o rombo uma vez, com juros altos, se a empresa ainda tiver valor
    // (foguetes em desenvolvimento contam pela metade do que já foi pago).
    const gap = -next.cashUsd + 5_000_000;
    const assets = valuationUsd(next) + next.programs.filter((p) => p.quartersLeft > 0).reduce((a, p) => a + p.paidUsd * 0.5, 0);
    const alreadyRescued = next.loans.some((l) => l.from === RESCUE);
    if (!alreadyRescued && debtUsd(next) + gap <= assets * 0.6) {
      next.loans = [...next.loans, { from: RESCUE, balanceUsd: gap, ratePct: 6 }];
      next.cashUsd = 5_000_000;
      note("bad", `O caixa ficou negativo: o banco cobriu com ${fmtUsd(gap)} de empréstimo de emergência a 6% ao trimestre. Da próxima vez, é falência.`);
    } else {
      next.bankrupt = true;
      note("bad", "O dinheiro acabou: a empresa faliu.");
    }
  }
  if (!next.unicornReached && valuationUsd(next) >= UNICORN) {
    next.unicornReached = true;
    note("good", "Unicórnio espacial! A empresa passou de US$ 1 bilhão.");
  }
  return { ...next, log: [...notes.reverse(), ...c.log].slice(0, 40) };
}

/** Resumo para a IA dar conselhos com números do próprio jogo. */
export function summarizeCompany(c: Company) {
  const country = countryById(c.countryId);
  return {
    name: c.name,
    country: country.name,
    quarter: quarterLabel(c.quarter),
    status: c.status,
    cashUsd: Math.round(c.cashUsd),
    debtUsd: Math.round(debtUsd(c)),
    valuationUsd: Math.round(valuationUsd(c)),
    founderPct: c.founderPct,
    reputation: Math.round(c.reputation),
    actionsLeft: c.actionsLeft,
    fixedCostsPerQuarterUsd: Math.round(fixedCostsPerQuarter(c)),
    successes: c.successes,
    failures: c.failures,
    rockets: c.programs.map((p) => ({ name: p.name, ready: p.quartersLeft === 0, quartersLeft: p.quartersLeft, devCostUsd: p.devCostUsd })),
    missions: c.missions.map((m) => ({ client: m.client, payloadKg: m.payloadKg, orbit: m.orbit, paymentUsd: m.paymentUsd })),
    offers: c.offers.map((o) => ({ from: o.from, kind: o.kind, text: o.text })),
    marketEvent: c.event.title,
    ipo: ipoEligibility(c),
    bankrupt: c.bankrupt,
  };
}

function fmtUsd(v: number) {
  const a = Math.abs(v);
  const f = (n: number, d: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });
  if (a >= 1e9) return `US$ ${f(v / 1e9, 2)} bi`;
  if (a >= 1e6) return `US$ ${f(v / 1e6, 1)} mi`;
  return `US$ ${f(v / 1e3, 0)} mil`;
}
