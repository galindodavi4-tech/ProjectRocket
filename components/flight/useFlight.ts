"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FlightEvent, FlightResult, FlightSample } from "@/lib/sim/ascent";

export type FlightStatus = "idle" | "running" | "paused" | "done";

/** Velocidade automática: devagar na decolagem, rápido no meio, bem rápido no voo livre. */
function autoSpeed(t: number, sample: FlightSample | null) {
  if (t < 12) return 2;
  if (sample && !sample.burning && sample.altKm > 120) return 80;
  return 20;
}

/** Interpola a telemetria no instante t (as amostras vêm de segundo em segundo). */
function sampleAt(samples: FlightSample[], t: number): FlightSample | null {
  if (samples.length === 0) return null;
  if (t <= samples[0].t) return samples[0];
  const last = samples[samples.length - 1];
  if (t >= last.t) return last;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const k = (t - a.t) / (b.t - a.t || 1);
  const mix = (x: number, y: number) => x + (y - x) * k;
  return {
    ...a,
    t,
    altKm: mix(a.altKm, b.altKm),
    downrangeKm: mix(a.downrangeKm, b.downrangeKm),
    speedMs: mix(a.speedMs, b.speedMs),
    accelG: mix(a.accelG, b.accelG),
    qKpa: mix(a.qKpa, b.qKpa),
    pitchDeg: mix(a.pitchDeg, b.pitchDeg),
    fuel: mix(a.fuel, b.fuel),
  };
}

/** Reprodução do voo simulado: relógio próprio, pausa, velocidade e pular para o fim. */
export function useFlight() {
  const [result, setResult] = useState<FlightResult | null>(null);
  const [status, setStatus] = useState<FlightStatus>("idle");
  const [t, setT] = useState(0);
  const [speedOverride, setSpeedOverride] = useState<number | null>(null);
  const tRef = useRef(0);
  const statusRef = useRef<FlightStatus>("idle");
  const speedRef = useRef<number | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    speedRef.current = speedOverride;
  }, [speedOverride]);

  const endTime = result ? Math.max(result.samples.at(-1)?.t ?? 0, result.events.at(-1)?.t ?? 0) : 0;

  useEffect(() => {
    if (!result || status !== "running") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const sample = sampleAt(result.samples, tRef.current);
      const speed = speedRef.current ?? autoSpeed(tRef.current, sample);
      tRef.current = Math.min(endTime, tRef.current + dt * speed);
      setT(tRef.current);
      if (tRef.current >= endTime) {
        setStatus("done");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result, status, endTime]);

  const start = useCallback((r: FlightResult) => {
    tRef.current = 0;
    setT(0);
    setResult(r);
    setSpeedOverride(null);
    setStatus("running");
  }, []);

  const stop = useCallback(() => {
    setStatus("idle");
    setResult(null);
    tRef.current = 0;
    setT(0);
  }, []);

  const skip = useCallback(() => {
    tRef.current = endTime;
    setT(endTime);
    setStatus("done");
  }, [endTime]);

  const togglePause = useCallback(() => {
    setStatus((s) => (s === "running" ? "paused" : s === "paused" ? "running" : s));
  }, []);

  const sample = result ? sampleAt(result.samples, t) : null;
  const passed: FlightEvent[] = result ? result.events.filter((e) => e.t <= t) : [];

  return {
    result,
    status,
    t,
    sample,
    passed,
    speed: speedOverride ?? autoSpeed(t, sample),
    speedOverride,
    setSpeedOverride,
    start,
    stop,
    skip,
    togglePause,
    active: status !== "idle",
  };
}

export type FlightState = ReturnType<typeof useFlight>;
