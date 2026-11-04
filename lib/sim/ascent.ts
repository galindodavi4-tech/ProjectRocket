import { REQUIRED_DELTA_V_MS } from "../schemas";
import { MAX_PROPELLANT_FRACTION } from "../tools/checkLaunch";
import { boosterOf, type DesignAnalysis, type RocketDesign } from "../design";

/**
 * Simulador de subida em 2D: gravidade, arrasto do ar, empuxo que melhora com a
 * altitude, separação de estágios e propulsores, guiagem simples até a órbita
 * baixa (~200 km). Educativo — não é uma simulação de engenharia.
 */

const G0 = 9.80665;
const MU = 3.986e14;
const R_EARTH = 6_371_000;
const OMEGA = 7.2921e-5;
const SCALE_HEIGHT = 8_500;
const CD = 0.3;
const MAX_G = 4.5;
/** Pressão dinâmica máxima que um foguete aguenta (~2× a Max-Q típica). */
const MAX_Q_PA = 80_000;
const TARGET_PERIGEE = 180_000;
const TARGET_APOGEE = 200_000;
const DT = 0.25;
const SAMPLE_EVERY = 1;
const MAX_TIME = 1_800;

export type FlightSample = {
  t: number;
  altKm: number;
  downrangeKm: number;
  speedMs: number;
  accelG: number;
  qKpa: number;
  stage: number;
  /** Ângulo da trajetória com o horizonte, em graus. */
  pitchDeg: number;
  /** Propelente que resta no estágio ativo, de 0 a 1. */
  fuel: number;
  burning: boolean;
};

export type FlightEventKind =
  | "liftoff" | "maxq" | "boosters" | "meco" | "separation" | "ignition" | "fairing" | "orbit" | "injection"
  | "apogee" | "impact" | "breakup" | "no-liftoff" | "landing" | "cutoff" | "circularize";

export type FlightEvent = { t: number; kind: FlightEventKind; label: string };

export type FlightOutcome =
  | { kind: "target"; label: string; detail: string }
  | { kind: "leo-only"; label: string; detail: string }
  | { kind: "suborbital"; label: string; detail: string }
  | { kind: "no-liftoff"; label: string; detail: string }
  | { kind: "breakup"; label: string; detail: string };

export type FlightResult = {
  samples: FlightSample[];
  events: FlightEvent[];
  outcome: FlightOutcome;
  maxQKpa: number;
  maxAltKm: number;
  /** Δv que sobrou ao chegar na órbita baixa (m/s). */
  spareDeltaVMs: number | null;
  perigeeKm: number | null;
  apogeeKm: number | null;
};

type SimStage = {
  dry: number;
  prop: number;
  reserve: number;
  thrustSl: number;
  thrustVac: number;
  flow: number;
  ispVac: number;
};

const fmt = (n: number, d = 0) => n.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });

function orbitOf(x: number, y: number, vx: number, vy: number) {
  const r = Math.hypot(x, y);
  const v2 = vx * vx + vy * vy;
  const energy = v2 / 2 - MU / r;
  const h = x * vy - y * vx;
  const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (MU * MU)));
  if (energy >= 0) return { perigee: (h * h) / MU / (1 + e) - R_EARTH, apogee: Infinity };
  const a = -MU / (2 * energy);
  return { perigee: a * (1 - e) - R_EARTH, apogee: a * (1 + e) - R_EARTH };
}

export function simulateAscent(design: RocketDesign, analysis: DesignAnalysis): FlightResult {
  const stages: SimStage[] = analysis.stages.map((s) => ({
    dry: s.dryMassKg,
    prop: s.propellantMassKg - s.reserveKg,
    reserve: s.reserveKg,
    thrustSl: s.thrustSlN,
    thrustVac: s.thrustVacN,
    flow: s.thrustVacN / (s.ispVac * G0),
    ispVac: s.ispVac,
  }));
  const startProp = stages.map((s) => s.prop);
  const booster = boosterOf(design);
  const bCount = design.boosters?.count ?? 0;
  const boost = booster
    ? {
        prop: booster.propellantMassKg * bCount,
        dry: booster.dryMassKg * bCount,
        thrustSl: booster.thrustSlKN * 1000 * bCount,
        thrustVac: booster.thrustVacKN * 1000 * bCount,
        flow: (booster.thrustVacKN * 1000 * bCount) / (booster.ispVacS * G0),
      }
    : null;

  const area = Math.PI * (design.diameterM / 2) ** 2 * (bCount ? 1.6 : 1);
  const weakStructure = analysis.launch.metrics.propellantFractions.some((f) => f > MAX_PROPELLANT_FRACTION);

  let x = 0;
  let y = R_EARTH;
  let vx = OMEGA * R_EARTH * Math.cos((28.5 * Math.PI) / 180);
  let vy = 0;
  let t = 0;
  let active = 0;
  let coast = 0;
  let boostersOn = !!boost;
  let fairingOn = true;
  let lifted = false;
  let maxQ = 0;
  let maxQT = 0;
  let maxQAnnounced = false;
  let maxAlt = 0;
  let apogeeAnnounced = false;
  let reachedOrbit = false;
  let ended: FlightOutcome | null = null;
  let phase: "ascent" | "coast" | "circularize" = "ascent";
  const onPadCheck = () => !lifted;

  const samples: FlightSample[] = [];
  const events: FlightEvent[] = [];
  const event = (kind: FlightEventKind, label: string) => events.push({ t: Math.round(t), kind, label });

  const payload = design.payloadMassKg;
  const mass = () => {
    let m = payload;
    for (let i = active; i < stages.length; i++) m += stages[i].dry + stages[i].prop + stages[i].reserve;
    if (boost && boostersOn) m += boost.dry + boost.prop;
    return m;
  };

  event("liftoff", "Ignição");
  let lastSample = -SAMPLE_EVERY;

  while (t < MAX_TIME && !ended) {
    const r = Math.hypot(x, y);
    const alt = r - R_EARTH;
    const upX = x / r;
    const upY = y / r;
    const eastX = upY;
    const eastY = -upX;
    const vr = vx * upX + vy * upY;
    const vt = vx * eastX + vy * eastY;
    const speed = Math.hypot(vx, vy);
    const pressure = alt < 150_000 ? Math.exp(-alt / SCALE_HEIGHT) : 0;
    const rho = 1.225 * pressure;

    // Ar gira com a Terra: arrasto usa a velocidade relativa a ele.
    const relX = vx - OMEGA * r * eastX;
    const relY = vy - OMEGA * r * eastY;
    const vRel = Math.hypot(relX, relY);
    const q = 0.5 * rho * vRel * vRel;
    if (q > MAX_Q_PA) {
      event("breakup", "Pressão do ar alta demais: o foguete se desfez");
      ended = {
        kind: "breakup",
        label: "Falha aerodinâmica",
        detail: `Voou rápido demais ainda no ar denso (${fmt(q / 1000)} kPa; foguetes reais aguentam ~${fmt(MAX_Q_PA / 1000)}). Falta empuxo para subir antes de acelerar.`,
      };
      maxQ = Math.max(maxQ, q);
      break;
    }
    if (q > maxQ) {
      maxQ = q;
      maxQT = t;
    } else if (!maxQAnnounced && maxQ > 5_000 && q < maxQ * 0.97) {
      maxQAnnounced = true;
      events.push({ t: Math.round(maxQT), kind: "maxq", label: `Max-Q: ${fmt(maxQ / 1000, 0)} kPa de pressão do ar` });
      if (design.stability === "none") {
        event("breakup", "Sem aletas nem gimbal, perdeu o controle e se partiu");
        ended = { kind: "breakup", label: "Falha: instabilidade", detail: "Sem aletas nem motores com gimbal, o foguete começou a girar na Max-Q e se partiu." };
        break;
      }
      if (weakStructure) {
        event("breakup", "Estrutura não aguentou a Max-Q");
        ended = {
          kind: "breakup",
          label: "Falha estrutural",
          detail: `Algum estágio tem mais de ${fmt(MAX_PROPELLANT_FRACTION * 100)}% de propelente: a estrutura ficou fina demais e cedeu na Max-Q.`,
        };
        break;
      }
    }

    // Empuxo do estágio ativo e dos propulsores laterais.
    const st = stages[active];
    let thrust = 0;
    let flow = 0;
    const burning = !!st && coast <= 0 && st.prop > 0 && !reachedOrbit && phase !== "coast";
    if (burning) {
      thrust += st.thrustVac - (st.thrustVac - st.thrustSl) * pressure;
      flow += st.flow;
    }
    if (boost && boostersOn && boost.prop > 0 && phase !== "coast") {
      thrust += boost.thrustVac - (boost.thrustVac - boost.thrustSl) * pressure;
      flow += boost.flow;
    }
    let m = mass();
    let throttle = 1;
    if (thrust > MAX_G * G0 * m && burning) {
      throttle = Math.max(0.4, (MAX_G * G0 * m) / thrust);
    }
    thrust *= throttle;
    flow *= throttle;

    // Guiagem em três fases, como nos foguetes reais:
    // 1) subida: começa reto e inclina conforme sobe, até o apogeu previsto chegar a ~200 km;
    // 2) voo livre até perto do topo; 3) queima de circularização na horizontal.
    const g = MU / (r * r);
    const accelNow = thrust / m || 1e-9;
    if (phase === "ascent" && !onPadCheck() && orbitOf(x, y, vx, vy).apogee >= TARGET_APOGEE) {
      phase = "coast";
      event("cutoff", `Motores desligados: subindo em voo livre até ${fmt(TARGET_APOGEE / 1000)} km`);
    }
    if (phase === "coast") {
      const vCirc = Math.sqrt(MU / r);
      const top = stages[active] ?? null;
      const topAccel = top ? (top.thrustVac / mass()) : 0;
      const burnTime = topAccel > 0 ? Math.max(0, vCirc - vt) / topAccel : Infinity;
      if (vr <= 0 || vr / g <= burnTime / 2) {
        phase = "circularize";
        event("circularize", "Queima de circularização");
      }
    }
    let pitch: number;
    if (phase === "ascent") {
      if (alt < 1_000 || t < 8) pitch = Math.PI / 2;
      else pitch = ((90 - 88 * Math.sqrt(Math.min(1, alt / 85_000))) * Math.PI) / 180;
      // Nunca deixa a subida virar descida antes de desligar.
      if (vr < 150) pitch = Math.max(pitch, (35 * Math.PI) / 180);
    } else {
      const want = -vr / 10 + g - (vt * vt) / r;
      pitch = Math.asin(Math.max(-0.5, Math.min(1, want / accelNow)));
    }

    let ax = -g * upX;
    let ay = -g * upY;
    if (thrust > 0) {
      ax += (thrust / m) * (Math.cos(pitch) * eastX + Math.sin(pitch) * upX);
      ay += (thrust / m) * (Math.cos(pitch) * eastY + Math.sin(pitch) * upY);
    }
    if (vRel > 0 && q > 0) {
      const drag = (q * CD * area) / m;
      ax -= (drag * relX) / vRel;
      ay -= (drag * relY) / vRel;
    }

    // Parado na plataforma enquanto o empuxo não vence o peso.
    const onPad = !lifted;
    if (onPad) {
      const netUp = ax * upX + ay * upY;
      if (netUp <= 0) {
        if (t > 6) {
          event("no-liftoff", "Não decolou");
          ended = { kind: "no-liftoff", label: "Não decolou", detail: "O empuxo dos motores é menor que o peso do foguete. Precisa de mais motores ou menos massa." };
          break;
        }
        ax = 0;
        ay = 0;
      } else lifted = true;
    }

    const accelG = Math.hypot(ax + g * upX, ay + g * upY) / G0;

    if (t - lastSample >= SAMPLE_EVERY - 1e-9) {
      lastSample = t;
      const angle = Math.atan2(x, y);
      samples.push({
        t: Math.round(t * 100) / 100,
        altKm: alt / 1000,
        downrangeKm: (angle * R_EARTH) / 1000,
        speedMs: speed,
        accelG,
        qKpa: q / 1000,
        stage: active + 1,
        pitchDeg: (Math.atan2(vr, vt) * 180) / Math.PI,
        fuel: st ? Math.max(0, st.prop / (startProp[active] || 1)) : 0,
        burning: thrust > 0,
      });
    }

    // Integra (Euler semi-implícito).
    vx += ax * DT;
    vy += ay * DT;
    x += vx * DT;
    y += vy * DT;
    t += DT;
    m -= flow * DT;

    if (burning && st) {
      // Consumo do núcleo; se houver propulsores, eles queimam o deles.
      st.prop -= st.flow * throttle * DT;
    }
    if (boost && boostersOn && boost.prop > 0 && phase !== "coast") {
      boost.prop -= boost.flow * throttle * DT;
      if (boost.prop <= 0) {
        boostersOn = false;
        event("boosters", `Propulsores laterais se soltam (${fmt(alt / 1000, 0)} km)`);
      }
    }
    if (coast > 0) {
      coast -= DT;
      if (coast <= 0 && stages[active]) event("ignition", `Ignição do ${active + 1}º estágio`);
    }

    const newAlt = Math.hypot(x, y) - R_EARTH;
    maxAlt = Math.max(maxAlt, newAlt);
    if (fairingOn && newAlt > 110_000) {
      fairingOn = false;
      event("fairing", "Coifa descartada");
    }

    // Fim do propelente do estágio ativo: separa e acende o próximo.
    if (st && st.prop <= 0 && !reachedOrbit) {
      st.prop = 0;
      if (active === 0) event("meco", "Desligamento dos motores do 1º estágio (MECO)");
      else event("meco", `Fim do ${active + 1}º estágio`);
      if (active + 1 < stages.length) {
        active += 1;
        coast = 3;
        event("separation", `Separação: ${active}º estágio se solta${active === 1 && design.reuse !== "none" ? " e volta para pousar" : ""}`);
      } else {
        active += 1;
      }
    }

    const orbit = orbitOf(x, y, vx, vy);
    if (!reachedOrbit && orbit.perigee >= TARGET_PERIGEE && newAlt > 120_000) {
      reachedOrbit = true;
      event("orbit", `Em órbita: ${fmt(orbit.perigee / 1000)} × ${fmt(Math.min(orbit.apogee, 99_999_000) / 1000)} km`);
    }
    if (reachedOrbit && t > (events.find((e) => e.kind === "orbit")?.t ?? 0) + 60) break;

    const vrNow = (vx * x + vy * y) / Math.hypot(x, y);
    if (!reachedOrbit && active >= stages.length && vrNow < 0 && !apogeeAnnounced) {
      apogeeAnnounced = true;
      event("apogee", `Apogeu: ${fmt(maxAlt / 1000)} km — sem velocidade para ficar em órbita`);
    }
    if (newAlt < 0 && lifted) {
      event("impact", "Caiu de volta");
      break;
    }
  }

  // Δv que sobrou depois da órbita: propelente restante em vácuo.
  let spare: number | null = null;
  if (reachedOrbit) {
    spare = 0;
    for (let i = Math.min(active, stages.length - 1); i < stages.length; i++) {
      const s = stages[i];
      if (s.prop <= 0) continue;
      let above = payload;
      for (let j = i + 1; j < stages.length; j++) above += stages[j].dry + stages[j].prop + stages[j].reserve;
      const m0 = s.dry + s.prop + s.reserve + above;
      spare += s.ispVac * G0 * Math.log(m0 / (m0 - s.prop));
    }
  }

  const final = orbitOf(x, y, vx, vy);
  if (design.reuse !== "none" && stages.length > 1 && events.some((e) => e.kind === "separation")) {
    const sep = events.find((e) => e.kind === "separation")!;
    events.push({ t: sep.t + 420, kind: "landing", label: design.reuse === "drone" ? "1º estágio pousa na balsa" : "1º estágio pousa na base" });
    events.sort((a, b) => a.t - b.t);
  }

  if (!ended) {
    if (reachedOrbit) {
      const extra = REQUIRED_DELTA_V_MS[design.targetOrbit] - REQUIRED_DELTA_V_MS.LEO;
      const where = design.targetOrbit === "Moon" ? "a Lua" : design.targetOrbit === "GTO" ? "a órbita de transferência geoestacionária" : "";
      if (extra === 0) {
        ended = { kind: "target", label: "Missão cumprida!", detail: `Carga em órbita baixa, sobrando ${fmt(spare ?? 0)} m/s de Δv.` };
      } else if ((spare ?? 0) >= extra) {
        event("injection", `Queima de injeção rumo a ${where}`);
        ended = { kind: "target", label: "Missão cumprida!", detail: `Chegou à órbita baixa e ainda tinha ${fmt(spare ?? 0)} m/s para seguir rumo a ${where} (precisa ~${fmt(extra)}).` };
      } else {
        ended = {
          kind: "leo-only",
          label: "Parou na órbita baixa",
          detail: `Sobraram ${fmt(spare ?? 0)} m/s, mas seguir rumo a ${where} pede ~${fmt(extra)} m/s.`,
        };
      }
    } else {
      ended = {
        kind: "suborbital",
        label: "Voo suborbital",
        detail: `Subiu até ${fmt(maxAlt / 1000)} km, mas acabou o propelente antes da velocidade de órbita (~7.800 m/s).`,
      };
    }
  }

  return {
    samples,
    events,
    outcome: ended,
    maxQKpa: maxQ / 1000,
    maxAltKm: maxAlt / 1000,
    spareDeltaVMs: spare,
    perigeeKm: reachedOrbit ? final.perigee / 1000 : null,
    apogeeKm: reachedOrbit ? Math.min(final.apogee, 1e9) / 1000 : null,
  };
}
