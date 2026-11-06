"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BuilderPanel } from "@/components/builder/BuilderPanel";
import { Chat } from "@/components/Chat";
import { CompanyPanel } from "@/components/company/CompanyPanel";
import { CompanySetup } from "@/components/company/CompanySetup";
import { useCompany } from "@/components/company/useCompany";
import { FlightHud } from "@/components/flight/FlightHud";
import { GuideBar, useGuide, type GuideStep } from "@/components/GuideBar";
import { toFlightView } from "@/components/flight/flightView";
import { useFlight } from "@/components/flight/useFlight";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { FinancePanel } from "@/components/panels/FinancePanel";
import { MissionPanel } from "@/components/panels/MissionPanel";
import { PerformancePanel } from "@/components/panels/PerformancePanel";
import type { RocketViewerHandle } from "@/components/RocketViewer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { HomeIcon, PlusIcon, ReturnIcon } from "@/components/ui/icons";
import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { Stat } from "@/components/ui/Stat";
import { StatPill } from "@/components/ui/StatPill";
import { Tabs } from "@/components/ui/Tabs";
import { useDesign } from "@/components/useDesign";
import { useSpaceAgent } from "@/components/useSpaceAgent";
import {
  acceptOffer, advanceQuarter, CompanyError, declineOffer, developRocket, goPublic, makeContact, recordMission, repayLoans,
  startCompany, summarizeCompany, type Company, type ContactId, type Mission,
} from "@/lib/company";
import { countryById } from "@/lib/countries";
import { analyzeDesign, type RocketDesign } from "@/lib/design";
import { costBreakdown, defaultPlan, developmentCostUsd, evaluatePlan, usd, type FinancePlan } from "@/lib/economics";
import { force, mass, num, ORBIT_SHORT } from "@/lib/format";
import { music } from "@/lib/music";
import { designToModel } from "@/lib/rocketModel";
import type { RocketModel } from "@/lib/schemas";
import { simulateAscent, type FlightResult } from "@/lib/sim/ascent";

const RocketViewer = dynamic(() => import("@/components/RocketViewer").then((m) => m.RocketViewer), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink-faint">Carregando 3D…</div>,
});

type Mode = "lab" | "company";
type Tab = "company" | "build" | "perf" | "money" | "mission";

const ONBOARDED_KEY = "space-agent:onboarded:v1";
const MUSIC_KEY = "space-agent:music:v1";
const MODE_KEY = "space-agent:mode:v1";

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* sem armazenamento */
    }
  },
};

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
  const [mode, setModeState] = useState<Mode>("lab");
  const [tab, setTab] = useState<Tab>("build");
  const [chatRocket, setChatRocket] = useState<RocketModel | null>(null);
  const [spread, setSpread] = useState(0);
  const viewer = useRef<RocketViewerHandle>(null);
  const stage = useRef<HTMLDivElement>(null);

  // Tutorial, música e empresa.
  const [showTutorial, setShowTutorial] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const { company, setCompany } = useCompany();
  const [showSetup, setShowSetup] = useState(false);
  const [notice, setNotice] = useState<{ kind: "good" | "bad"; text: string } | null>(null);
  const pending = useRef<{ missionId: string; result: FlightResult; cost: number } | null>(null);

  useEffect(() => {
    if (!store.get(ONBOARDED_KEY)) setShowTutorial(true);
    if (store.get(MUSIC_KEY) === "off") setMusicOn(false);
    if (store.get(MODE_KEY) === "company") {
      setModeState("company");
      setTab("company");
    }
  }, []);

  const toggleMusic = useCallback((on: boolean) => {
    setMusicOn(on);
    store.set(MUSIC_KEY, on ? "on" : "off");
    if (on) void music().start();
    else music().stop();
  }, []);

  // Navegadores só tocam som depois de um clique: liga a música no primeiro.
  useEffect(() => {
    if (!musicOn || showTutorial) return;
    const first = () => void music().start();
    window.addEventListener("pointerdown", first, { once: true });
    return () => window.removeEventListener("pointerdown", first);
  }, [musicOn, showTutorial]);

  const setMode = (m: Mode) => {
    setModeState(m);
    store.set(MODE_KEY, m);
    setTab(m === "company" ? "company" : "build");
    if (m === "company" && !company) setShowSetup(true);
  };

  const designRef = useRef(design);
  designRef.current = design;

  const launch = useCallback(() => {
    const d = designRef.current;
    setChatRocket(null);
    setSpread(0);
    pending.current = null;
    flight.start(simulateAscent(d, analyzeDesign(d)));
    if (mode === "lab") setTab("mission");
  }, [flight, mode]);
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

  const companyRef = useRef(company);
  companyRef.current = company;

  const agent = useSpaceAgent({
    getDesign: () => designRef.current,
    getCompany: () => (companyRef.current ? summarizeCompany(companyRef.current) : undefined),
    onDesign: changeDesign,
    onFlight: () => launchRef.current(),
    onRocket: (m) => {
      if (flight.active) flight.stop();
      setChatRocket(m);
    },
  });

  /* ---------- empresa ---------- */

  const act = (fn: (c: Company) => Company, ok?: string) => {
    if (!company) return;
    try {
      const next = fn(company);
      setCompany(next);
      const latest = next.log[0];
      setNotice(ok ? { kind: "good", text: ok } : latest && latest !== company.log[0] ? { kind: latest.kind === "bad" ? "bad" : "good", text: latest.text } : null);
    } catch (e) {
      if (e instanceof CompanyError) setNotice({ kind: "bad", text: e.message });
      else throw e;
    }
  };

  const missionDesign = (m: Mission): RocketDesign => ({ ...designRef.current, payloadMassKg: m.payloadKg, targetOrbit: m.orbit });
  const missionCost = (m: Mission) => {
    const d = missionDesign(m);
    return costBreakdown(d, analyzeDesign(d)).perLaunchUsd;
  };

  const launchMission = (m: Mission) => {
    if (!company) return;
    const d = missionDesign(m);
    const a = analyzeDesign(d);
    const result = simulateAscent(d, a, { latitudeDeg: countryById(company.countryId).lat });
    pending.current = { missionId: m.id, result, cost: costBreakdown(d, a).perLaunchUsd };
    setChatRocket(null);
    setSpread(0);
    setNotice({ kind: "good", text: `Lançando a missão para ${m.client}…` });
    flight.start(result);
  };

  // A missão só entra no caixa quando o voo termina (ou é interrompido).
  useEffect(() => {
    const p = pending.current;
    if (!p || !company) return;
    if (flight.status === "done" || flight.status === "idle") {
      pending.current = null;
      act((c) => recordMission(c, p.missionId, p.result, p.cost));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight.status]);

  // Passo a passo: marca sozinho o que a pessoa já fez.
  const guide = useGuide();
  const { mark } = guide;
  useEffect(() => {
    if (flight.status === "done") mark("launch");
  }, [flight.status, mark]);
  useEffect(() => {
    if (tab === "money") mark("money");
  }, [tab, mark]);
  useEffect(() => {
    if (company) mark("company");
    if (company && company.successes > 0) mark("mission");
  }, [company, mark]);
  useEffect(() => {
    if (agent.messages.length > 0) mark("ask");
  }, [agent.messages.length, mark]);

  const goToStep = (step: GuideStep) => {
    if (step === "pick") {
      setMode("lab");
      setTab("build");
    } else if (step === "launch") launch();
    else if (step === "money") {
      setMode("lab");
      setTab("money");
    } else if (step === "company" || step === "mission") setMode("company");
    else {
      const input = document.getElementById("prompt");
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus();
    }
  };

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

  const tabs: { id: Tab; label: string; badge?: string }[] =
    mode === "company"
      ? [
          { id: "company", label: "Empresa", badge: company?.offers.length ? String(company.offers.length) : undefined },
          { id: "build", label: "Construir" },
          { id: "mission", label: "Voo" },
        ]
      : [
          { id: "build", label: "Construir" },
          { id: "perf", label: "Desempenho", badge: analysis.launch.canLaunch ? undefined : "!" },
          { id: "money", label: "Finanças" },
          { id: "mission", label: "Missão" },
        ];

  return (
    <main className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6">
      {showTutorial && (
        <Onboarding
          musicOn={musicOn}
          onMusic={toggleMusic}
          onFinish={(next) => {
            store.set(ONBOARDED_KEY, "1");
            setShowTutorial(false);
            setMode(next);
          }}
        />
      )}
      {showSetup && (
        <CompanySetup
          onCancel={() => {
            setShowSetup(false);
            if (!company) setMode("lab");
          }}
          onFound={(name, countryId, fixedLuck) => {
            const c = startCompany(name, countryId, fixedLuck ? 2027 : undefined);
            setCompany(c);
            setShowSetup(false);
            setModeState("company");
            store.set(MODE_KEY, "company");
            setTab("company");
            setNotice({ kind: "good", text: c.log[0].text });
          }}
        />
      )}

      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="ds-gradient-primary grid size-11 place-items-center rounded-2xl text-lg font-bold text-bg-deep shadow-[var(--shadow-glow)]">✦</span>
          <div>
            <h1 className="text-xl leading-tight font-semibold">Space Agent</h1>
            <p className="text-xs text-ink-muted">Construa · Lance · Financie · Pergunte</p>
          </div>
        </div>
        <div className="w-full max-w-xs sm:w-72">
          <Segmented label="Modo" value={mode} onChange={setMode} options={[{ value: "lab", label: "🔧 Laboratório" }, { value: "company", label: "🏢 Empresa" }]} />
        </div>
        <nav className="flex gap-3" aria-label="Ações">
          <IconButton label={musicOn ? "Desligar a música" : "Ligar a música"} onClick={() => toggleMusic(!musicOn)}>
            <span className="text-lg">{musicOn ? "🎵" : "🔇"}</span>
          </IconButton>
          <IconButton label="Ver o tutorial" onClick={() => setShowTutorial(true)}>
            <span className="text-lg font-bold">?</span>
          </IconButton>
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

      <GuideBar done={guide.done} onGo={goToStep} onReset={guide.reset} />

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

        {/* O foguete fica fixo na tela enquanto as laterais rolam. */}
        <div className="order-1 min-w-0 space-y-5 lg:sticky lg:top-5 lg:self-start xl:order-2">
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
                {mode === "lab" && (
                  <Button className="!h-10 !px-5 !text-xs" onClick={launch} disabled={flight.status === "running"}>
                    🚀 Lançar
                  </Button>
                )}
              </div>
            </div>

            <div ref={stage} className="relative h-[48dvh] min-h-[340px] overflow-hidden rounded-2xl bg-bg-deep [&:fullscreen]:h-screen [&:fullscreen]:rounded-none">
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
              </>
            )}
          </Card>

          {!chatRocket && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
              <Stat label="Massa" value={mass(analysis.liftoffMassKg)} sub={`${num(analysis.heightM)} m de altura`} />
              <Stat label="Empuxo / peso" info="twr" value={num(m.twr, 2)} tone={m.twr > 1.2 ? "ok" : "bad"} sub={force(m.twr * analysis.liftoffMassKg * 9.81)} />
              <Stat label="Δv" info="deltaV" value={`${num(m.deltaVMs)} m/s`} tone={m.deltaVMs >= m.requiredDeltaVMs ? "ok" : "bad"} sub={`precisa ${num(m.requiredDeltaVMs)}`} />
              <Stat label={`Máx. ${ORBIT_SHORT[design.targetOrbit]}`} info="maxPayload" value={capacity > 0 ? mass(capacity) : "—"}
                tone={capacity >= design.payloadMassKg && capacity > 0 ? "ok" : "bad"} sub={`levando ${mass(design.payloadMassKg)}`} />
              <Stat label="Custo por voo" info="costPerLaunch" value={usd(cost.perLaunchUsd)} sub={cost.usdPerKg ? `${usd(cost.usdPerKg)}/kg` : undefined} />
              {mode === "company" && company ? (
                <Stat label="Caixa da empresa" info="fixedCosts" value={usd(company.cashUsd)} tone={company.cashUsd > 0 ? undefined : "bad"} sub={company.name} />
              ) : (
                <Stat label="Negócio" info="payback" value={finance.paybackYears ? `${num(finance.paybackYears, 1)} anos` : "não se paga"}
                  tone={finance.verdict === "viable" ? "ok" : finance.verdict === "risky" ? "warn" : "bad"} sub="para dar retorno" />
              )}
            </div>
          )}
        </div>

        <div className="order-2 min-w-0 xl:order-3">
          <Card className="space-y-4">
            <Tabs<Tab> value={tab} onChange={setTab} tabs={tabs} />
            {notice && mode === "company" && (
              <div role="status" className={`flex items-start justify-between gap-2 rounded-2xl px-4 py-2.5 text-xs ${notice.kind === "good" ? "bg-primary/10 text-ink ring-1 ring-primary/40" : "bg-danger/10 text-ink ring-1 ring-danger/40"}`}>
                <span>{notice.text}</span>
                <button type="button" aria-label="Fechar aviso" onClick={() => setNotice(null)} className="text-ink-faint hover:text-ink">×</button>
              </div>
            )}
            {tab === "company" &&
              (company ? (
                <CompanyPanel
                  company={company}
                  design={design}
                  analysis={analysis}
                  devCostUsd={developmentCostUsd(cost)}
                  missionCost={missionCost}
                  busy={!!pending.current || flight.status === "running"}
                  onDevelop={() => act((c) => developRocket(c, design, developmentCostUsd(cost)))}
                  onContact={(id: ContactId) => act((c) => makeContact(c, id))}
                  onAccept={(id) => act((c) => acceptOffer(c, id))}
                  onDecline={(id) => act((c) => declineOffer(c, id))}
                  onRepay={() => act(repayLoans)}
                  onLaunch={launchMission}
                  onIpo={() => act(goPublic)}
                  onAdvance={() => act(advanceQuarter)}
                  onRestart={() => setShowSetup(true)}
                  onOpenBuilder={() => setTab("build")}
                />
              ) : (
                <div className="space-y-3 text-sm text-ink-muted">
                  <p>Você ainda não tem uma empresa.</p>
                  <Button onClick={() => setShowSetup(true)} className="w-full">Criar minha empresa</Button>
                </div>
              ))}
            {tab === "build" && (
              <BuilderPanel design={design} analysis={analysis} onChange={(d) => { mark("pick"); changeDesign(d); }} saved={saved} onSave={save} onRemoveSaved={remove} />
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
