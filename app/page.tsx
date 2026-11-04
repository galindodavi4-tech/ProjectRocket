"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { BuilderPanel } from "@/components/builder/BuilderPanel";
import { Chat } from "@/components/Chat";
import { FlightHud } from "@/components/flight/FlightHud";
import { toFlightView } from "@/components/flight/flightView";
import { useFlight } from "@/components/flight/useFlight";
import { FinancePanel } from "@/components/panels/FinancePanel";
import { MissionPanel } from "@/components/panels/MissionPanel";
import { PerformancePanel } from "@/components/panels/PerformancePanel";
import type { RocketViewerHandle } from "@/components/RocketViewer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { HomeIcon, PlusIcon, ReturnIcon } from "@/components/ui/icons";
import { Slider } from "@/components/ui/Slider";
import { Stat } from "@/components/ui/Stat";
import { StatPill } from "@/components/ui/StatPill";
import { Tabs } from "@/components/ui/Tabs";
import { useDesign } from "@/components/useDesign";
import { useSpaceAgent } from "@/components/useSpaceAgent";
import { analyzeDesign, type RocketDesign } from "@/lib/design";
import { costBreakdown, defaultPlan, evaluatePlan, usd, type FinancePlan } from "@/lib/economics";
import { force, mass, num, ORBIT_SHORT } from "@/lib/format";
import { designToModel } from "@/lib/rocketModel";
import type { RocketModel } from "@/lib/schemas";
import { simulateAscent } from "@/lib/sim/ascent";

const RocketViewer = dynamic(() => import("@/components/RocketViewer").then((m) => m.RocketViewer), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink-faint">Carregando 3D…</div>,
});

type Tab = "build" | "perf" | "money" | "mission";

export default function Home() {
  const { design, setDesign, saved, save, remove } = useDesign();
  const analysis = useMemo(() => analyzeDesign(design), [design]);
  const cost = useMemo(() => costBreakdown(design, analysis), [design, analysis]);
  const capacity = analysis.maxPayload[design.targetOrbit];

  // Plano de negócio: o preço acompanha o custo até a pessoa mexer nele.
  const [planEdits, setPlanEdits] = useState<FinancePlan | null>(null);
  const [priceTouched, setPriceTouched] = useState(false);
  const suggested = defaultPlan(cost);
  const plan: FinancePlan = planEdits
    ? { ...planEdits, pricePerLaunchUsd: priceTouched ? planEdits.pricePerLaunchUsd : suggested.pricePerLaunchUsd }
    : suggested;
  const finance = evaluatePlan(cost, analysis.maxPayload.LEO, plan);

  const flight = useFlight();
  const [tab, setTab] = useState<Tab>("build");
  const [chatRocket, setChatRocket] = useState<RocketModel | null>(null);
  const [spread, setSpread] = useState(0);
  const viewer = useRef<RocketViewerHandle>(null);
  const stage = useRef<HTMLDivElement>(null);

  const designRef = useRef(design);
  designRef.current = design;

  const launch = useCallback(() => {
    const d = designRef.current;
    setChatRocket(null);
    setSpread(0);
    flight.start(simulateAscent(d, analyzeDesign(d)));
    setTab("mission");
  }, [flight]);
  const launchRef = useRef(launch);
  launchRef.current = launch;

  const changeDesign = useCallback(
    (d: RocketDesign) => {
      if (flight.active) flight.stop();
      designRef.current = d;
      setChatRocket(null);
      setDesign(d);
    },
    [flight, setDesign],
  );

  const agent = useSpaceAgent({
    getDesign: () => designRef.current,
    onDesign: changeDesign,
    onFlight: () => launchRef.current(),
    onRocket: (m) => {
      if (flight.active) flight.stop();
      setChatRocket(m);
    },
  });

  const designModel = useMemo(() => designToModel(design, analysis), [design, analysis]);
  const model = chatRocket ?? designModel;
  const flightView = toFlightView(flight, model.stageCount);
  const m = analysis.launch.metrics;

  const fullscreen = () => {
    const el = stage.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  return (
    <main className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="ds-gradient-primary grid size-11 place-items-center rounded-2xl text-lg font-bold text-bg-deep shadow-[var(--shadow-glow)]">✦</span>
          <div>
            <h1 className="text-xl leading-tight font-semibold">Space Agent</h1>
            <p className="text-xs text-ink-muted">Construa · Lance · Financie · Pergunte</p>
          </div>
        </div>
        <nav className="flex gap-3" aria-label="Ações">
          <IconButton label="Nova conversa" onClick={agent.reset}>
            <PlusIcon />
          </IconButton>
          <IconButton label="Refazer a última pergunta" onClick={agent.retry} disabled={agent.busy || agent.messages.length === 0}>
            <ReturnIcon />
          </IconButton>
          <IconButton label="Recentralizar o foguete" onClick={() => viewer.current?.resetCamera()}>
            <HomeIcon />
          </IconButton>
        </nav>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[340px_minmax(0,1fr)_400px]">
        <div className="order-3 min-w-0 lg:col-span-2 xl:order-1 xl:col-span-1">
          <Chat
            className="h-[70dvh] xl:sticky xl:top-5 xl:h-[calc(100dvh-7.5rem)]"
            messages={agent.messages}
            busy={agent.busy}
            status={agent.status}
            onSend={agent.send}
            onStop={agent.stop}
          />
        </div>

        <div className="order-1 min-w-0 space-y-5 xl:order-2">
          <Card className="flex flex-col">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <h2 className="truncate text-lg font-semibold">{model.name}</h2>
                {chatRocket ? (
                  <StatPill tone="neutral">Foguete do chat</StatPill>
                ) : analysis.launch.canLaunch ? (
                  <StatPill tone="primary">✓ Pode lançar</StatPill>
                ) : (
                  <StatPill tone="danger">✕ Não passa na checagem</StatPill>
                )}
              </div>
              <div className="flex gap-2">
                {chatRocket && (
                  <Button variant="ghost" className="!h-10 !px-4 !text-xs" onClick={() => setChatRocket(null)}>
                    Voltar ao meu projeto
                  </Button>
                )}
                <Button variant="ghost" className="!h-10 !px-4 !text-xs" onClick={fullscreen}>
                  Tela cheia
                </Button>
                <Button className="!h-10 !px-5 !text-xs" onClick={launch} disabled={flight.status === "running"}>
                  🚀 Lançar
                </Button>
              </div>
            </div>

            <div ref={stage} className="relative h-[52dvh] min-h-[380px] overflow-hidden rounded-2xl bg-bg-deep [&:fullscreen]:h-screen [&:fullscreen]:rounded-none">
              <RocketViewer ref={viewer} model={model} spread={spread} flight={flightView} />
              {flight.active && <FlightHud flight={flight} onClose={flight.stop} />}
            </div>

            {!flight.active && (
              <>
                {model.parts.some((p) => p.status === "fail") && (
                  <ul className="mt-3 space-y-1 text-xs">
                    {model.parts.filter((p) => p.status === "fail").map((p) => (
                      <li key={p.id} className="flex gap-2">
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-danger" />
                        <span><strong className="text-ink">{p.label}:</strong> <span className="text-ink-muted">{p.reason}</span></span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex items-center gap-3">
                  <span className="ds-label shrink-0">Explodir</span>
                  <div className="flex-1">
                    <Slider label="separação das peças" value={spread} min={0} max={1.2} onChange={setSpread} />
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-ink-faint">
                  Arraste para girar, role para dar zoom, passe o cursor numa peça para ver o status. Valores aproximados e regras
                  simplificadas — é educativo, não é engenharia de verdade.
                </p>
              </>
            )}
          </Card>

          {!chatRocket && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
              <Stat label="Massa" value={mass(analysis.liftoffMassKg)} sub={`${num(analysis.heightM)} m de altura`} />
              <Stat label="Empuxo / peso" value={num(m.twr, 2)} tone={m.twr > 1.2 ? "ok" : "bad"} sub={force(m.twr * analysis.liftoffMassKg * 9.81)} />
              <Stat label="Δv" value={`${num(m.deltaVMs)} m/s`} tone={m.deltaVMs >= m.requiredDeltaVMs ? "ok" : "bad"} sub={`precisa ${num(m.requiredDeltaVMs)}`} />
              <Stat label={`Máx. ${ORBIT_SHORT[design.targetOrbit]}`} value={capacity > 0 ? mass(capacity) : "—"}
                tone={capacity >= design.payloadMassKg && capacity > 0 ? "ok" : "bad"} sub={`levando ${mass(design.payloadMassKg)}`} />
              <Stat label="Custo por voo" value={usd(cost.perLaunchUsd)} sub={cost.usdPerKg ? `${usd(cost.usdPerKg)}/kg` : undefined} />
              <Stat label="Negócio" value={finance.paybackYears ? `${num(finance.paybackYears, 1)} anos` : "não se paga"}
                tone={finance.verdict === "viable" ? "ok" : finance.verdict === "risky" ? "warn" : "bad"} sub="para dar retorno" />
            </div>
          )}
        </div>

        <div className="order-2 min-w-0 xl:order-3">
          <Card className="space-y-4">
            <Tabs<Tab>
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "build", label: "Construir" },
                { id: "perf", label: "Desempenho", badge: analysis.launch.canLaunch ? undefined : "!" },
                { id: "money", label: "Finanças" },
                { id: "mission", label: "Missão" },
              ]}
            />
            {tab === "build" && (
              <BuilderPanel design={design} analysis={analysis} onChange={changeDesign} saved={saved} onSave={save} onRemoveSaved={remove} />
            )}
            {tab === "perf" && <PerformancePanel design={design} analysis={analysis} />}
            {tab === "money" && (
              <FinancePanel
                cost={cost}
                capacityKg={analysis.maxPayload.LEO}
                plan={plan}
                result={finance}
                onPlan={(p) => {
                  if (p.pricePerLaunchUsd !== plan.pricePerLaunchUsd) setPriceTouched(true);
                  setPlanEdits(p);
                }}
                onResetPrice={() => setPriceTouched(false)}
              />
            )}
            {tab === "mission" && (
              <MissionPanel design={design} analysis={analysis} result={flight.result} t={flight.t} onLaunch={launch} flying={flight.status === "running" || flight.status === "paused"} />
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
