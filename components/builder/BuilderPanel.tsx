"use client";

import { useState } from "react";
import { BOOSTERS, ENGINES, MATERIALS, PROPELLANTS, REUSE, engineById, type MaterialId, type PropellantId } from "@/lib/catalog";
import type { DesignAnalysis, DesignStage, RocketDesign } from "@/lib/design";
import { usd } from "@/lib/economics";
import { force, mass, num, ORBIT_SHORT } from "@/lib/format";
import { PRESETS, STARTER_DESIGN } from "@/lib/presets";
import type { GlossaryKey } from "@/lib/glossary";
import { Chip } from "../ui/Chip";
import { InfoTip } from "../ui/InfoTip";
import { PlusIcon } from "../ui/icons";
import { RangeField } from "../ui/RangeField";
import { Segmented } from "../ui/Segmented";
import { SelectField } from "../ui/SelectField";
import { Stepper } from "../ui/Stepper";
import type { SavedProject } from "../useDesign";

type Props = {
  design: RocketDesign;
  analysis: DesignAnalysis;
  onChange: (d: RocketDesign) => void;
  saved: SavedProject[];
  onSave: () => void;
  onRemoveSaved: (name: string) => void;
  disabled?: boolean;
};

const PROPELLANT_OPTIONS = (Object.keys(PROPELLANTS) as PropellantId[]).map((id) => ({ value: id, label: PROPELLANTS[id].short, hint: PROPELLANTS[id].pros }));
const MATERIAL_SHORT: Record<MaterialId, string> = { aluminum: "Alumínio", "al-li": "Al-Li", steel: "Aço inox", carbon: "Carbono" };

function Section({ title, children, aside, info }: { title: string; children: React.ReactNode; aside?: React.ReactNode; info?: GlossaryKey }) {
  return (
    <section className="border-t border-line/40 pt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="ds-label flex items-center gap-1.5">{title}{info && <InfoTip term={info} />}</h3>
        {aside}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/** Melhor motor para trocar de propelente: no 1º estágio evita os de vácuo; em cima, prefere. */
function pickEngine(propellant: PropellantId, upper: boolean) {
  const list = ENGINES.filter((e) => e.propellant === propellant);
  return (list.find((e) => e.vacuumOnly === upper) ?? list[0]).id;
}

function StageEditor({ stage, index, analysis, onChange, onRemove }: {
  stage: DesignStage;
  index: number;
  analysis: DesignAnalysis;
  onChange: (s: DesignStage) => void;
  onRemove?: () => void;
}) {
  const engine = engineById(stage.engineId) ?? ENGINES[0];
  const info = analysis.stages[index];
  const dv = analysis.launch.metrics.stageDeltaVMs[index] ?? 0;
  const frac = analysis.launch.metrics.propellantFractions[index] ?? 0;
  const tank = analysis.launch.parts.find((p) => p.id === `stage-${index + 1}-tank`);
  const engines = analysis.launch.parts.find((p) => p.id === `stage-${index + 1}-engines`);
  const options = ENGINES.filter((e) => e.propellant === engine.propellant).map((e) => ({
    value: e.id,
    label: `${e.name} · ${num(e.thrustVacKN)} kN · Isp ${e.ispVacS} s${e.vacuumOnly ? " · vácuo" : ""}`,
  }));

  return (
    <div className="rounded-2xl bg-bg-deep/40 p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {index + 1}º estágio <span className="font-normal text-ink-faint">· {mass(info.dryMassKg + info.propellantMassKg)}</span>
        </p>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-xs text-ink-faint hover:text-danger">
            Remover
          </button>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs text-ink-muted">Propelente <InfoTip term="propellant" /></p>
          <Segmented size="sm" label={`Propelente do ${index + 1}º estágio`} value={engine.propellant} options={PROPELLANT_OPTIONS}
            onChange={(p) => onChange({ ...stage, engineId: pickEngine(p, index > 0) })} />
        </div>
        <SelectField label="Motor" info="engine" value={engine.id} options={options} onChange={(id) => onChange({ ...stage, engineId: id })} />
        <p className="text-[11px] leading-relaxed text-ink-faint">
          {engine.flies}. {engine.note} Custa ~{usd(engine.costUsd)} cada{engine.estimated ? " (estimativa)" : ""}.
          {index === 0 && engine.vacuumOnly && <span className="text-coral"> Motor de vácuo quase não empurra no nível do mar!</span>}
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-ink-muted">Quantidade de motores <InfoTip term="engineCount" /></span>
          <Stepper label="motores" value={stage.engineCount} min={1} max={40} onChange={(n) => onChange({ ...stage, engineCount: n })} />
        </div>
        <RangeField label="Propelente no tanque" info="propellantMass" value={stage.propellantMassKg} min={1_000} max={3_500_000} log format={mass}
          onChange={(v) => onChange({ ...stage, propellantMassKg: v })} />
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs text-ink-muted">Material da estrutura <InfoTip term="material" /></p>
          <Segmented size="sm" label={`Material do ${index + 1}º estágio`} value={stage.material as MaterialId}
            options={(Object.keys(MATERIALS) as MaterialId[]).map((m) => ({ value: m, label: MATERIAL_SHORT[m], hint: MATERIALS[m].note }))}
            onChange={(m) => onChange({ ...stage, material: m })} />
        </div>
        <dl className="grid grid-cols-3 gap-2 text-[11px]">
          <div><dt className="flex items-center gap-1 text-ink-faint">Empuxo <InfoTip term="twr" /></dt><dd className={`font-semibold ${engines?.status === "fail" ? "text-danger" : ""}`}>{force(index === 0 ? info.thrustSlN : info.thrustVacN)}</dd></div>
          <div><dt className="flex items-center gap-1 text-ink-faint">Δv <InfoTip term="deltaV" /></dt><dd className="font-semibold">{num(dv)} m/s</dd></div>
          <div><dt className="flex items-center gap-1 text-ink-faint">Fração <InfoTip term="propellantFraction" /></dt><dd className={`font-semibold ${tank?.status === "fail" ? "text-danger" : ""}`}>{num(frac * 100)}%</dd></div>
        </dl>
      </div>
    </div>
  );
}

/** Painel do construtor: tudo o que dá para escolher no foguete. */
export function BuilderPanel({ design, analysis, onChange, saved, onSave, onRemoveSaved, disabled }: Props) {
  const [presetNote, setPresetNote] = useState<string | null>(null);
  const set = (patch: Partial<RocketDesign>) => onChange({ ...design, ...patch });
  const setStage = (i: number, s: DesignStage) => set({ stages: design.stages.map((x, j) => (j === i ? s : x)) });
  const capacity = analysis.maxPayload[design.targetOrbit];

  const addStage = () => {
    const last = design.stages[design.stages.length - 1];
    const engine = engineById(last.engineId) ?? ENGINES[0];
    set({
      stages: [...design.stages, { engineId: pickEngine(engine.propellant, true), engineCount: 1, propellantMassKg: Math.max(1_000, Math.round(last.propellantMassKg * 0.25)), material: last.material }],
    });
  };

  return (
    <fieldset disabled={disabled} className="space-y-4 disabled:opacity-60">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs text-ink-muted">Começar de um foguete real <InfoTip term="presets" /></p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Chip key={p.id} onClick={() => { onChange(structuredClone(p.design)); setPresetNote(p.real); }}>{p.label}</Chip>
          ))}
          <Chip onClick={() => { onChange(structuredClone(STARTER_DESIGN)); setPresetNote(null); }}>Do zero</Chip>
        </div>
        {presetNote && <p className="mt-2 text-[11px] text-ink-faint">{presetNote}</p>}
      </div>

      <Section title="Projeto" aside={<button type="button" onClick={onSave} className="text-xs font-semibold text-primary hover:underline">Salvar</button>}>
        <div>
          <label htmlFor="design-name" className="mb-1 block text-xs text-ink-muted">Nome do foguete</label>
          <input id="design-name" value={design.name} maxLength={40} onChange={(e) => set({ name: e.target.value || "Sem nome" })}
            className="h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface/70 px-3 text-sm text-ink focus:border-primary focus:outline-none" />
        </div>
        {saved.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {saved.map((p) => (
              <span key={p.name} className="inline-flex items-center gap-1 rounded-full border border-line/70 bg-surface/60 pl-3 text-xs">
                <button type="button" onClick={() => onChange(structuredClone(p.design))} className="py-1 text-ink-muted hover:text-ink">{p.name}</button>
                <button type="button" aria-label={`Apagar ${p.name}`} onClick={() => onRemoveSaved(p.name)} className="px-2 py-1 text-ink-faint hover:text-danger">×</button>
              </span>
            ))}
          </div>
        )}
        <RangeField label="Diâmetro" info="diameter" value={design.diameterM} min={0.6} max={12} step={0.1} format={(v) => `${num(v, 1)} m`} onChange={(v) => set({ diameterM: v })} />
      </Section>

      <Section title="Estágios" info="stage" aside={<span className="text-xs text-ink-faint">{design.stages.length} de 3</span>}>
        {design.stages.map((s, i) => (
          <StageEditor key={i} stage={s} index={i} analysis={analysis} onChange={(n) => setStage(i, n)}
            onRemove={design.stages.length > 1 ? () => set({ stages: design.stages.filter((_, j) => j !== i) }) : undefined} />
        ))}
        {design.stages.length < 3 && (
          <button type="button" onClick={addStage}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-3 text-sm text-ink-muted hover:border-primary hover:text-ink [&_svg]:size-4">
            <PlusIcon /> Adicionar estágio
          </button>
        )}
      </Section>

      <Section title="Propulsores laterais" info="boosters">
        <Segmented label="Propulsores laterais" value={design.boosters?.boosterId ?? "none"}
          options={[{ value: "none", label: "Nenhum" }, ...BOOSTERS.map((b) => ({ value: b.id, label: b.name, hint: `${b.flies} · ${num(b.thrustSlKN)} kN cada` }))]}
          onChange={(id) => set({ boosters: id === "none" ? null : { boosterId: id, count: design.boosters?.count ?? 2 } })} />
        {design.boosters && (
          <Segmented size="sm" label="Quantidade de propulsores" value={String(design.boosters.count) as "2" | "4" | "6"}
            options={["2", "4", "6"].map((n) => ({ value: n as "2" | "4" | "6", label: `${n} propulsores` }))}
            onChange={(n) => set({ boosters: { ...design.boosters!, count: Number(n) as 2 | 4 | 6 } })} />
        )}
        <p className="text-[11px] text-ink-faint">Combustível sólido: muito empuxo na decolagem, queimam ~2 minutos e se soltam.</p>
      </Section>

      <Section title="Estabilidade" info="stability">
        <Segmented label="Estabilidade" value={design.stability}
          options={[{ value: "fins", label: "Aletas" }, { value: "gimbal", label: "Gimbal" }, { value: "none", label: "Nenhuma" }]}
          onChange={(v) => set({ stability: v })} />
        <p className="text-[11px] text-ink-faint">
          {design.stability === "fins" && "Aletas fixas na base, como uma flecha. Simples, mas pesam e geram arrasto."}
          {design.stability === "gimbal" && "Os motores giram alguns graus para corrigir o rumo (vetorização de empuxo). É o que Falcon 9 e Electron usam."}
          {design.stability === "none" && "Sem aletas nem gimbal o foguete gira descontrolado ao enfrentar o ar. Vai dar errado!"}
        </p>
      </Section>

      <Section title="Reutilização do 1º estágio" info="reuse">
        <Segmented label="Reutilização" value={design.reuse}
          options={(Object.keys(REUSE) as (keyof typeof REUSE)[]).map((r) => ({ value: r, label: REUSE[r].name.replace("Pouso em balsa no mar", "Balsa no mar") }))}
          onChange={(v) => set({ reuse: v, reuseFlights: v === "none" ? 1 : Math.max(design.reuseFlights, 10) })} />
        <p className="text-[11px] text-ink-faint">{REUSE[design.reuse].note}</p>
        {design.reuse !== "none" && (
          <RangeField label="Voos por 1º estágio" value={design.reuseFlights} min={2} max={30} step={1} format={(v) => `${num(v)} voos`}
            onChange={(v) => set({ reuseFlights: v })} hint="O Falcon 9 já passou de 30 voos com o mesmo propulsor." />
        )}
      </Section>

      <Section title="Missão" info="orbit">
        <Segmented label="Destino" value={design.targetOrbit}
          options={[{ value: "LEO", label: "Órbita baixa" }, { value: "GTO", label: "GTO" }, { value: "Moon", label: "Lua" }]}
          onChange={(v) => set({ targetOrbit: v })} />
        <RangeField label="Carga útil" info="payload" value={Math.max(10, design.payloadMassKg)} min={10} max={200_000} log format={mass}
          onChange={(v) => set({ payloadMassKg: v })}
          hint={capacity > 0 ? `Este foguete leva até ${mass(capacity)} para ${ORBIT_SHORT[design.targetOrbit]}.` : "Com estas escolhas, nada chega a esse destino."} />
      </Section>
    </fieldset>
  );
}
