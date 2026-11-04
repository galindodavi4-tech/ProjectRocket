import type { FlightView } from "../RocketViewer";
import type { FlightState } from "./useFlight";

/** O que o visualizador precisa saber do voo neste instante. */
export function toFlightView(flight: FlightState, stageCount: number): FlightView | null {
  if (!flight.active || !flight.sample) return null;
  const s = flight.sample;
  const has = (k: string) => flight.passed.some((e) => e.kind === k);
  const exploded = has("breakup");
  const noLiftoff = has("no-liftoff");
  const boostersAttached = !has("boosters");
  return {
    altKm: Math.max(0, s.altKm),
    pitchDeg: s.altKm < 0.2 ? 90 : s.pitchDeg,
    burning: s.burning && !exploded && !noLiftoff,
    activeStage: Math.min(s.stage, stageCount),
    boostersAttached,
    boostersBurning: boostersAttached && s.burning && !exploded && !noLiftoff && s.stage === 1,
    fairingAttached: !has("fairing"),
    exploded,
    onPad: s.altKm < 0.05,
  };
}
