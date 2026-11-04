"use client";

import { clock, num } from "@/lib/format";
import type { FlightState } from "./useFlight";

const SPEEDS: { label: string; value: number | null }[] = [
  { label: "Auto", value: null },
  { label: "1×", value: 1 },
  { label: "10×", value: 10 },
  { label: "50×", value: 50 },
];

/** Painel sobre o 3D durante o voo: relógio, telemetria, eventos e controles. */
export function FlightHud({ flight, onClose }: { flight: FlightState; onClose: () => void }) {
  const s = flight.sample;
  const r = flight.result;
  if (!s || !r) return null;
  const latest = flight.passed.at(-1);
  const done = flight.status === "done";
  const success = r.outcome.kind === "target";

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 text-ink">
      <div className="flex items-start justify-between gap-2">
        <div className="pointer-events-auto rounded-2xl bg-bg-deep/75 px-3.5 py-2.5 backdrop-blur">
          <p className="font-mono text-2xl font-semibold tabular-nums">T+{clock(flight.t)}</p>
          <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <dt className="text-ink-faint">Altitude</dt><dd className="text-right font-semibold tabular-nums">{num(Math.max(0, s.altKm), 1)} km</dd>
            <dt className="text-ink-faint">Velocidade</dt><dd className="text-right font-semibold tabular-nums">{num(s.speedMs * 3.6)} km/h</dd>
            <dt className="text-ink-faint">Aceleração</dt><dd className="text-right font-semibold tabular-nums">{num(s.accelG, 1)} g</dd>
            <dt className="text-ink-faint">Pressão do ar</dt><dd className="text-right font-semibold tabular-nums">{num(s.qKpa, 1)} kPa</dd>
          </dl>
          <div className="mt-2">
            <p className="text-[10px] tracking-widest text-ink-faint uppercase">{s.stage}º estágio · propelente</p>
            <div className="mt-1 h-1.5 w-40 rounded-full bg-surface">
              <div className="ds-gradient-warm h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, s.fuel)) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex gap-1 rounded-xl bg-bg-deep/75 p-1 backdrop-blur">
            {SPEEDS.map((sp) => (
              <button key={sp.label} type="button" onClick={() => flight.setSpeedOverride(sp.value)}
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${flight.speedOverride === sp.value ? "ds-gradient-primary text-bg-deep" : "text-ink-muted hover:text-ink"}`}>
                {sp.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {!done && (
              <>
                <button type="button" onClick={flight.togglePause} className="rounded-xl bg-bg-deep/75 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:text-primary">
                  {flight.status === "paused" ? "Continuar" : "Pausar"}
                </button>
                <button type="button" onClick={flight.skip} className="rounded-xl bg-bg-deep/75 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:text-primary">
                  Pular para o fim
                </button>
              </>
            )}
            <button type="button" onClick={onClose} className="rounded-xl bg-bg-deep/75 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:text-coral">
              {done ? "Voltar ao projeto" : "Abortar"}
            </button>
          </div>
          {!done && <p className="rounded-lg bg-bg-deep/60 px-2 py-0.5 text-[10px] text-ink-faint">tempo {num(flight.speed)}× mais rápido</p>}
        </div>
      </div>

      {done ? (
        <div className={`pointer-events-auto mx-auto w-full max-w-md rounded-2xl px-5 py-4 text-center backdrop-blur ${success ? "bg-primary/20 ring-1 ring-primary/60" : "bg-danger/20 ring-1 ring-danger/60"}`}>
          <p className={`text-xl font-semibold ${success ? "text-primary" : "text-danger"}`}>{success ? "🚀 " : ""}{r.outcome.label}</p>
          <p className="mt-1 text-sm text-ink">{r.outcome.detail}</p>
          <p className="mt-2 text-[11px] text-ink-muted">Veja a telemetria completa na aba Missão.</p>
        </div>
      ) : (
        latest && (
          <p key={latest.label} className="mx-auto max-w-md animate-[fadein_.4s_ease] rounded-xl bg-bg-deep/75 px-4 py-2 text-center text-sm font-semibold backdrop-blur">
            {latest.label}
          </p>
        )
      )}
    </div>
  );
}
