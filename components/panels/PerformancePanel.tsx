import type { DesignAnalysis, RocketDesign } from "@/lib/design";
import { force, mass, num, ORBIT_SHORT } from "@/lib/format";
import { MAX_PROPELLANT_FRACTION, MIN_PROPELLANT_FRACTION, MIN_TWR } from "@/lib/tools/checkLaunch";
import { AreaChart } from "../ui/AreaChart";
import { BarList } from "../ui/BarList";
import { DonutGauge } from "../ui/DonutGauge";
import { MeterBars } from "../ui/MeterBars";
import { Stat } from "../ui/Stat";

/** Tudo o que a checagem e o modelo dizem sobre o projeto. */
export function PerformancePanel({ design, analysis }: { design: RocketDesign; analysis: DesignAnalysis }) {
  const { launch, stages, maxPayload } = analysis;
  const m = launch.metrics;
  const failed = launch.parts.filter((p) => p.status === "fail");
  const okShare = launch.parts.filter((p) => p.status === "ok").length / launch.parts.length;
  const cumulative = m.stageDeltaVMs.reduce<number[]>((acc, v) => [...acc, (acc.at(-1) ?? 0) + v], [0]);

  const totals = {
    propellant: stages.reduce((a, s) => a + s.propellantMassKg, 0),
    structure: stages.reduce((a, s) => a + s.structureMassKg + s.fairingMassKg + s.avionicsMassKg, 0),
    engines: stages.reduce((a, s) => a + s.engineMassKg, 0),
  };
  const boosters = analysis.liftoffMassKg - totals.propellant - totals.structure - totals.engines - design.payloadMassKg;

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl px-4 py-3 ${launch.canLaunch ? "bg-primary/10 ring-1 ring-primary/40" : "bg-danger/10 ring-1 ring-danger/40"}`}>
        <p className={`font-semibold ${launch.canLaunch ? "text-primary" : "text-danger"}`}>
          {launch.canLaunch ? "✓ Passa na checagem de lançamento" : "✕ Não passa na checagem"}
        </p>
        {failed.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs">
            {failed.map((p) => (
              <li key={p.id}><strong className="text-ink">{p.label}:</strong> <span className="text-ink-muted">{p.reason}</span></li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-ink-muted">Empuxo, Δv, estrutura e estabilidade dentro das regras.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Massa" value={mass(analysis.liftoffMassKg)} sub="na decolagem" />
        <Stat label="Altura" value={`${num(analysis.heightM)} m`} sub={`${num(design.diameterM, 1)} m de diâmetro`} />
        <Stat label="Empuxo" value={force(m.twr * analysis.liftoffMassKg * 9.81)} sub="na decolagem" />
        {(["LEO", "GTO", "Moon"] as const).map((o) => (
          <Stat key={o} label={`Máx. ${ORBIT_SHORT[o]}`} sub="de carga útil" value={maxPayload[o] > 0 ? mass(maxPayload[o]) : "—"}
            tone={o === design.targetOrbit ? (maxPayload[o] >= design.payloadMassKg && maxPayload[o] > 0 ? "ok" : "bad") : undefined} />
        ))}
      </div>

      <div className="flex justify-around gap-2">
        <DonutGauge label="TWR" value={num(m.twr, 2)} fraction={m.twr / (MIN_TWR * 2)} color="var(--color-coral)" colorTo="var(--color-peach)" danger={m.twr <= MIN_TWR} />
        <DonutGauge label="Δv" value={`${num((m.deltaVMs / m.requiredDeltaVMs) * 100)}%`} fraction={m.deltaVMs / m.requiredDeltaVMs} color="var(--color-lavender)" colorTo="#6c5ce7" danger={m.deltaVMs < m.requiredDeltaVMs} />
        <DonutGauge label="Peças ok" value={`${num(okShare * 100)}%`} fraction={okShare} color="var(--color-primary-300)" colorTo="var(--color-primary-600)" />
      </div>

      <div>
        <h3 className="ds-label mb-2">Orçamento de Δv</h3>
        <AreaChart
          labels={cumulative.map((_, i) => (i === 0 ? "solo" : `E${i}`))}
          series={[
            { values: cumulative, from: "#6eeadf", to: "#0f8f86" },
            { values: [0, ...m.stageDeltaVMs], from: "#ffc29a", to: "#f47b6b" },
          ]}
          target={{ value: m.requiredDeltaVMs, label: `necessário · ${ORBIT_SHORT[design.targetOrbit]}` }}
          caption="Acumulado (turquesa) e por estágio"
          unit="m/s"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="flex flex-col items-center">
          <h3 className="ds-label mb-2">Propelente</h3>
          <MeterBars min={MIN_PROPELLANT_FRACTION} max={MAX_PROPELLANT_FRACTION}
            bars={m.propellantFractions.map((f, i) => ({ label: `E${i + 1}`, fraction: f, danger: f < MIN_PROPELLANT_FRACTION || f > MAX_PROPELLANT_FRACTION }))} />
        </div>
        <div>
          <h3 className="ds-label mb-3">Para onde vai a massa</h3>
          <BarList bars={[
            { label: "Propelente", value: totals.propellant, display: mass(totals.propellant) },
            { label: "Estrutura, coifa e eletrônica", value: totals.structure, display: mass(totals.structure) },
            { label: "Motores", value: totals.engines, display: mass(totals.engines) },
            ...(boosters > 1 ? [{ label: "Propulsores laterais", value: boosters, display: mass(boosters) }] : []),
            { label: "Carga útil", value: design.payloadMassKg, display: mass(design.payloadMassKg), highlight: true },
          ]} />
          <p className="mt-3 text-[11px] text-ink-faint">
            A carga útil costuma ser só 1% a 4% da massa de um foguete. Aqui: {num((design.payloadMassKg / analysis.liftoffMassKg) * 100, 1)}%.
          </p>
        </div>
      </div>
    </div>
  );
}
