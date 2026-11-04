import { buildPartList, partIds } from "../parts";
import { REQUIRED_DELTA_V_MS, type LaunchInput, type LaunchResult, type Part } from "../schemas";

export const G0 = 9.81;
export const MIN_TWR = 1.2;
export const MIN_PROPELLANT_FRACTION = 0.5;
export const MAX_PROPELLANT_FRACTION = 0.95;

const fmt = (n: number, digits = 0) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits });

/**
 * Δv de cada fase de queima. Com propulsores laterais, a primeira fase é o
 * 1º estágio queimando junto com eles; quando eles acabam, se soltam e o
 * 1º estágio segue sozinho com o que sobrou. A reserva de pouso não entra.
 */
export function deltaVByStage(input: LaunchInput): number[] {
  const { stages, payloadMassKg, sideBoosters } = input;
  const stageMass = stages.map((s) => s.dryMassKg + s.propellantMassKg);
  const usable = stages.map((s) => s.propellantMassKg - Math.min(s.reservePropellantKg ?? 0, s.propellantMassKg));
  const above = (i: number) => stageMass.slice(i + 1).reduce((a, b) => a + b, 0) + payloadMassKg;

  return stages.map((stage, i) => {
    let m0 = stageMass[i] + above(i);
    let burnable = usable[i];
    let dv = 0;

    if (i === 0 && sideBoosters) {
      const b = sideBoosters;
      const boosterMass = b.count * (b.dryMassKg + b.propellantMassKg);
      const coreFlow = stage.thrustN / (stage.ispSeconds * G0);
      const boosterFlow = (b.count * b.thrustN) / (b.ispSeconds * G0);
      const burnTime = (b.count * b.propellantMassKg) / boosterFlow;
      const coreUsed = Math.min(burnable, coreFlow * burnTime);
      const ispMix = (stage.thrustN + b.count * b.thrustN) / ((coreFlow + boosterFlow) * G0);
      const start = m0 + boosterMass;
      const end = start - b.count * b.propellantMassKg - coreUsed;
      dv += ispMix * G0 * Math.log(start / end);
      burnable -= coreUsed;
      m0 -= coreUsed;
    }

    dv += stage.ispSeconds * G0 * Math.log(m0 / (m0 - burnable));
    return dv;
  });
}

/**
 * Checagem simplificada de lançamento (regras do PRD). Determinística: o
 * modelo nunca decide o veredito, só chama esta função e explica o resultado.
 * Regras educativas — não é análise real de segurança de voo.
 */
export function checkLaunch(input: LaunchInput): LaunchResult {
  const { stages, payloadMassKg, targetOrbit, sideBoosters } = input;
  const failures = new Map<string, string[]>();
  const fail = (id: string, reason: string) => {
    failures.set(id, [...(failures.get(id) ?? []), reason]);
  };

  const stageMass = stages.map((s) => s.dryMassKg + s.propellantMassKg);
  const boosterMass = sideBoosters ? sideBoosters.count * (sideBoosters.dryMassKg + sideBoosters.propellantMassKg) : 0;
  const totalMassKg = stageMass.reduce((a, b) => a + b, 0) + payloadMassKg + boosterMass;

  // 1. Empuxo/peso na decolagem (1º estágio + propulsores laterais).
  const liftoffThrust = stages[0].thrustN + (sideBoosters ? sideBoosters.count * sideBoosters.thrustN : 0);
  const twr = liftoffThrust / (totalMassKg * G0);
  if (twr <= MIN_TWR) {
    fail(
      partIds.engines(1),
      `Empuxo/peso de ${fmt(twr, 2)} na decolagem; precisa ser maior que ${fmt(MIN_TWR, 1)}.`,
    );
  }

  // 2. Orçamento de Δv: cada estágio empurra a si mesmo, os de cima e a carga.
  const stageDeltaVMs = deltaVByStage(input);
  const deltaVMs = stageDeltaVMs.reduce((a, b) => a + b, 0);
  const requiredDeltaVMs = REQUIRED_DELTA_V_MS[targetOrbit];
  if (deltaVMs < requiredDeltaVMs) {
    const reason = `Δv total de ${fmt(deltaVMs)} m/s; ${targetOrbit} pede ~${fmt(requiredDeltaVMs)} m/s.`;
    stages.forEach((_, i) => fail(partIds.tank(i + 1), reason));
  }

  // 3. Fração de propelente de cada estágio.
  const propellantFractions = stages.map((s, i) => s.propellantMassKg / stageMass[i]);
  propellantFractions.forEach((f, i) => {
    if (f < MIN_PROPELLANT_FRACTION || f > MAX_PROPELLANT_FRACTION) {
      fail(
        partIds.tank(i + 1),
        `Fração de propelente de ${fmt(f * 100)}%; o razoável fica entre ${fmt(MIN_PROPELLANT_FRACTION * 100)}% e ${fmt(MAX_PROPELLANT_FRACTION * 100)}%.`,
      );
    }
  });

  // 4. Estabilidade: aletas ou motores que giram (gimbal). Sem nenhum dos dois, reprova.
  if (!input.hasFins && !input.hasThrustVectoring) {
    fail(partIds.fins, "Sem aletas nem motores com gimbal, o foguete não passa na checagem de estabilidade.");
  }

  // 5. Capacidade do tanque (vale para o tanque de cada estágio).
  if (input.fuelTankCapacityKg !== undefined) {
    const capacity = input.fuelTankCapacityKg;
    stages.forEach((s, i) => {
      if (s.propellantMassKg > capacity) {
        fail(
          partIds.tank(i + 1),
          `Leva ${fmt(s.propellantMassKg)} kg de propelente num tanque de ${fmt(capacity)} kg.`,
        );
      }
    });
  }

  // As aletas aparecem sempre: quando faltam, o visualizador mostra o vazio em vermelho.
  const parts: Part[] = buildPartList(stages.length, true, !!sideBoosters).map((part) => {
    const reasons = failures.get(part.id);
    return reasons ? { ...part, status: "fail", reason: reasons.join(" ") } : part;
  });

  const failed = parts.filter((p) => p.status === "fail");
  const canLaunch = failed.length === 0;
  const summary = canLaunch
    ? `${input.name} pode lançar para ${targetOrbit}: empuxo/peso ${fmt(twr, 2)} e Δv ${fmt(deltaVMs)} m/s (precisa ~${fmt(requiredDeltaVMs)}).`
    : `${input.name} não pode lançar. Falhou em: ${failed.map((p) => p.label.toLowerCase()).join(", ")}.`;

  return {
    canLaunch,
    summary,
    metrics: { twr, deltaVMs, requiredDeltaVMs, stageDeltaVMs, propellantFractions },
    parts,
  };
}
