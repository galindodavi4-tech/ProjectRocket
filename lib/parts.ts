import type { Part } from "./schemas";

/** IDs estáveis que ligam a checagem de lançamento às malhas do visualizador. */
export const partIds = {
  nose: "nose",
  fins: "fins",
  boosters: "boosters",
  tank: (stage: number) => `stage-${stage}-tank`,
  engines: (stage: number) => `stage-${stage}-engines`,
};

/** Lista de peças de um foguete, todas "ok", na ordem de cima para baixo. */
export function buildPartList(stageCount: number, includeFins: boolean, includeBoosters = false): Part[] {
  const parts: Part[] = [{ id: partIds.nose, label: "Coifa / carga útil", status: "ok" }];
  for (let s = stageCount; s >= 1; s--) {
    parts.push({ id: partIds.tank(s), label: `Tanque do estágio ${s}`, status: "ok" });
    parts.push({ id: partIds.engines(s), label: `Motores do estágio ${s}`, status: "ok" });
  }
  if (includeBoosters) parts.push({ id: partIds.boosters, label: "Propulsores laterais", status: "ok" });
  if (includeFins) parts.push({ id: partIds.fins, label: "Aletas", status: "ok" });
  return parts;
}
