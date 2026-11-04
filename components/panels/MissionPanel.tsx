"use client";

import type { DesignAnalysis, RocketDesign } from "@/lib/design";
import { clock, num, ORBIT_LABEL } from "@/lib/format";
import type { FlightResult, FlightSample } from "@/lib/sim/ascent";
import { AreaChart } from "../ui/AreaChart";
import { Button } from "../ui/Button";
import { Stat } from "../ui/Stat";

function downsample(samples: FlightSample[], n: number) {
  if (samples.length <= n) return samples;
  const step = (samples.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => samples[Math.round(i * step)]);
}

/** Trajetória vista de lado: a Terra curva para baixo com a distância; altitude medida a partir do chão. */
function Trajectory({ samples, upTo }: { samples: FlightSample[]; upTo: number }) {
  const pts = samples.filter((s) => s.t <= upTo);
  const W = 320;
  const H = 150;
  const maxX = Math.max(50, ...samples.map((s) => s.downrangeKm));
  const maxAlt = Math.max(50, ...samples.map((s) => s.altKm)) * 1.15;
  const drop = (x: number) => (x * x) / (2 * 6371);
  const sy = (H - 24) / (maxAlt + drop(maxX));
  const px = (x: number) => 10 + (x / maxX) * (W - 20);
  const groundY = (x: number) => 10 + maxAlt * sy + drop(x) * sy;
  const at = (x: number, alt: number) => `${px(x)},${groundY(x) - alt * sy}`;
  const curve = (alt: number) => Array.from({ length: 41 }, (_, i) => at((i / 40) * maxX, alt)).join(" ");
  const last = pts.at(-1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trajetória do voo">
      <defs>
        <linearGradient id="traj" x1="0" x2="1">
          <stop offset="0" stopColor="var(--color-peach)" />
          <stop offset="1" stopColor="var(--color-primary)" />
        </linearGradient>
      </defs>
      <polyline points={curve(0)} fill="none" stroke="var(--color-primary-700)" strokeWidth="3" />
      {maxAlt > 100 && <polyline points={curve(100)} fill="none" stroke="var(--color-ink-faint)" strokeDasharray="3 4" strokeWidth="0.8" />}
      {maxAlt > 100 && <text x={14} y={groundY(0) - 100 * sy - 3} className="fill-ink-faint text-[8px]">100 km · começo do espaço</text>}
      <polyline points={pts.map((s) => at(s.downrangeKm, Math.max(0, s.altKm))).join(" ")} fill="none" stroke="url(#traj)" strokeWidth="2.5" strokeLinecap="round" />
      {last && <circle cx={px(last.downrangeKm)} cy={groundY(last.downrangeKm) - Math.max(0, last.altKm) * sy} r="4" fill="var(--color-ink)" />}
      <text x="10" y={H - 2} className="fill-ink-faint text-[8px]">plataforma</text>
      <text x={W - 10} y={H - 2} textAnchor="end" className="fill-ink-faint text-[8px]">{num(maxX)} km de distância</text>
    </svg>
  );
}

type Props = {
  design: RocketDesign;
  analysis: DesignAnalysis;
  result: FlightResult | null;
  t: number;
  onLaunch: () => void;
  flying: boolean;
};

export function MissionPanel({ design, analysis, result, t, onLaunch, flying }: Props) {
  if (!result) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Lance o <strong className="text-ink">{design.name}</strong> rumo a <strong className="text-ink">{ORBIT_LABEL[design.targetOrbit].toLowerCase()}</strong> com{" "}
          {num(design.payloadMassKg)} kg de carga. O simulador calcula a subida segundo a segundo: gravidade, resistência do ar, Max-Q, separação de estágios e a queima para entrar em órbita.
        </p>
        <Button onClick={onLaunch} className="w-full">🚀 Lançar agora</Button>
        <ul className="space-y-1.5 text-xs text-ink-muted">
          <li>• A checagem diz <strong className={analysis.launch.canLaunch ? "text-primary" : "text-danger"}>{analysis.launch.canLaunch ? "pode lançar" : "não pode lançar"}</strong>. Que tal ver o que acontece mesmo assim?</li>
          <li>• Falhas viram cenas: sem empuxo não decola, sem estabilização gira e se parte, sem Δv cai de volta.</li>
          <li>• Durante o voo, use 1×, 10× ou 50× para controlar o tempo.</li>
        </ul>
      </div>
    );
  }

  const s = result.samples;
  const shown = flying ? s.filter((x) => x.t <= t) : s;
  const view = downsample(shown.length > 1 ? shown : s.slice(0, 2), 48);
  const success = result.outcome.kind === "target";
  const disagree = analysis.launch.canLaunch !== success;
  const endT = Math.max(s.at(-1)?.t ?? 0, result.events.at(-1)?.t ?? 0);
  const finished = !flying || t >= endT;
  // Durante o voo, os números param no instante atual — sem adiantar o final.
  const seen = finished ? s : shown.length ? shown : s.slice(0, 1);
  const maxSpeed = Math.max(...seen.map((x) => x.speedMs));
  const maxG = Math.max(...seen.map((x) => x.accelG));
  const maxAlt = Math.max(...seen.map((x) => x.altKm));
  const maxQ = Math.max(...seen.map((x) => x.qKpa));

  return (
    <div className="space-y-5">
      {finished ? (
        <div className={`rounded-2xl px-4 py-3 ring-1 ${success ? "bg-primary/10 ring-primary/40" : "bg-danger/10 ring-danger/40"}`}>
          <p className={`font-semibold ${success ? "text-primary" : "text-danger"}`}>{result.outcome.label}</p>
          <p className="mt-1 text-xs text-ink-muted">{result.outcome.detail}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-bg-deep/40 px-4 py-3 text-sm">Voo em andamento · T+{clock(t)}</div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Altitude máxima" value={`${num(maxAlt)} km`} />
        <Stat label="Velocidade máxima" value={`${num(maxSpeed * 3.6)} km/h`} sub={`${num(maxSpeed / 1000, 2)} km/s`} />
        <Stat label="Max-Q" value={`${num(maxQ)} kPa`} />
        <Stat label="Aceleração máx." value={`${num(maxG, 1)} g`} />
        {finished && result.perigeeKm !== null && result.apogeeKm !== null && <Stat label="Órbita" value={`${num(result.perigeeKm)} × ${num(result.apogeeKm)} km`} />}
        {finished && result.spareDeltaVMs !== null && <Stat label="Δv sobrando" value={`${num(result.spareDeltaVMs)} m/s`} />}
      </div>

      <div>
        <h3 className="ds-label mb-2">Trajetória</h3>
        <Trajectory samples={s} upTo={flying ? t : Infinity} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="ds-label mb-1">Altitude</h3>
          <AreaChart labels={view.map((x, i) => (i % 12 === 0 ? clock(x.t) : ""))} series={[{ values: view.map((x) => Math.max(0, x.altKm)), from: "#6eeadf", to: "#0f8f86" }]} caption="km × tempo" />
        </div>
        <div>
          <h3 className="ds-label mb-1">Velocidade</h3>
          <AreaChart labels={view.map((x, i) => (i % 12 === 0 ? clock(x.t) : ""))} series={[{ values: view.map((x) => x.speedMs / 1000), from: "#ffc29a", to: "#f47b6b" }]} caption="km/s × tempo" />
        </div>
      </div>

      <div>
        <h3 className="ds-label mb-2">Linha do tempo</h3>
        <ol className="space-y-1.5 text-xs">
          {result.events.map((e, i) => (
            <li key={i} className={`flex gap-3 ${flying && e.t > t ? "opacity-35" : ""}`}>
              <span className="w-14 shrink-0 font-mono text-ink-faint">T+{clock(e.t)}</span>
              <span className={e.kind === "breakup" || e.kind === "no-liftoff" || e.kind === "impact" ? "text-danger" : e.kind === "orbit" || e.kind === "injection" ? "text-primary" : "text-ink"}>{e.label}</span>
            </li>
          ))}
        </ol>
      </div>

      {disagree && finished && (
        <p className="rounded-2xl bg-bg-deep/40 px-4 py-3 text-[11px] text-ink-muted">
          A checagem simplificada e a simulação discordaram. A checagem usa margens fixas (empuxo/peso acima de 1,2 e Δv tabelado);
          a simulação calcula gravidade e arrasto segundo a segundo. Perto do limite, as duas podem dar respostas diferentes — como no Saturn V real, que decolou com empuxo/peso ~1,16.
        </p>
      )}

      <Button variant="ghost" onClick={onLaunch} className="w-full">Lançar de novo</Button>
    </div>
  );
}
