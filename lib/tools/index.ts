import { z } from "zod";
import {
  LaunchInputSchema,
  ShowRocketInputSchema,
  type LaunchResult,
  type StreamEvent,
} from "../schemas";
import { RocketDesignSchema, type RocketDesign } from "../design";
import { summarizeDesign } from "../designSummary";
import { analyzeDesign } from "../design";
import { engineById, boosterById } from "../catalog";
import { simulateAscent } from "../sim/ascent";
import { checkLaunch } from "./checkLaunch";
import { showRocket } from "./showRocket";

/** Mudança parcial no projeto; `stages`, se vier, substitui a lista inteira. */
export const DesignPatchSchema = RocketDesignSchema.partial();
const LaunchFlightSchema = z.object({});

/** Ferramentas que rodam no nosso servidor, iguais para qualquer provedor de IA. */
export const LOCAL_TOOLS = [
  {
    name: "check_launch",
    description:
      "Runs the deterministic launch check for a spaceship and returns canLaunch, metrics (TWR, delta-v) and a per-part status list. Call it whenever the user describes a ship with enough specs; never judge launch feasibility yourself.",
    schema: LaunchInputSchema,
  },
  {
    name: "show_rocket",
    description:
      "Updates the 3D rocket viewer in the user's browser. Call it when the user asks about a rocket or right after check_launch; failed parts from the latest check are highlighted in red automatically.",
    schema: ShowRocketInputSchema,
  },
  {
    name: "update_design",
    description:
      "Changes the rocket open in the user's builder (the 3D viewer and all panels update). Send only the fields to change; if you send `stages`, send the full list of stages. Use catalog IDs from the system prompt. Returns the recomputed numbers (TWR, delta-v, max payload per orbit, cost per launch) — explain the effect using them.",
    schema: DesignPatchSchema,
  },
  {
    name: "launch_flight",
    description:
      "Launches the builder's current rocket in the flight simulator (the user sees the animation) and returns the outcome, key events and telemetry. Call it when the user asks to launch, test or fly the rocket.",
    schema: LaunchFlightSchema,
  },
] as const;

/** JSON Schema da entrada, gerado do mesmo schema zod que valida no servidor. */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema) as Record<string, unknown>;
  return json;
}

const STATUS: Record<string, string> = {
  check_launch: "Checando o lançamento…",
  show_rocket: "Montando o foguete 3D…",
  update_design: "Alterando o projeto…",
  launch_flight: "Lançando o foguete…",
};
export const toolStatusLabel = (name: string) => STATUS[name] ?? "Trabalhando…";

export type ToolState = { lastCheck?: LaunchResult; design?: RocketDesign };
export type ToolOutcome = { isError: boolean; content: string };
type Emit = (event: StreamEvent) => void;

/** Executa uma ferramenta local. Entrada inválida volta para o modelo como erro. */
export function executeTool(name: string, input: unknown, state: ToolState, emit: Emit): ToolOutcome {
  const error = (content: string): ToolOutcome => ({ isError: true, content });

  if (name === "check_launch") {
    const parsed = LaunchInputSchema.safeParse(input);
    if (!parsed.success) return error(`Entrada inválida: ${z.prettifyError(parsed.error)}`);
    const result = checkLaunch(parsed.data);
    state.lastCheck = result;
    emit({ type: "launch", result });
    return { isError: false, content: JSON.stringify(result) };
  }

  if (name === "show_rocket") {
    const parsed = ShowRocketInputSchema.safeParse(input);
    if (!parsed.success) return error(`Entrada inválida: ${z.prettifyError(parsed.error)}`);
    const model = showRocket(parsed.data, state.lastCheck);
    emit({ type: "rocket", model });
    return { isError: false, content: `Visualizador atualizado com ${model.parts.length} peças.` };
  }

  if (name === "update_design") {
    if (!state.design) return error("Não há projeto aberto no construtor.");
    const patch = DesignPatchSchema.safeParse(input);
    if (!patch.success) return error(`Entrada inválida: ${z.prettifyError(patch.error)}`);
    const next = RocketDesignSchema.safeParse({ ...state.design, ...patch.data });
    if (!next.success) return error(`Projeto inválido: ${z.prettifyError(next.error)}`);
    const badEngine = next.data.stages.find((s) => !engineById(s.engineId));
    if (badEngine) return error(`Motor desconhecido: ${badEngine.engineId}. Use um ID do catálogo.`);
    if (next.data.boosters && !boosterById(next.data.boosters.boosterId)) return error(`Propulsor desconhecido: ${next.data.boosters.boosterId}.`);
    state.design = next.data;
    emit({ type: "design", design: next.data });
    return { isError: false, content: JSON.stringify({ design: next.data, analysis: summarizeDesign(next.data) }) };
  }

  if (name === "launch_flight") {
    if (!state.design) return error("Não há projeto aberto no construtor.");
    const r = simulateAscent(state.design, analyzeDesign(state.design));
    emit({ type: "flight" });
    return {
      isError: false,
      content: JSON.stringify({
        outcome: r.outcome,
        events: r.events.map((e) => `T+${e.t}s ${e.label}`),
        maxAltitudeKm: Math.round(r.maxAltKm),
        maxQKpa: Math.round(r.maxQKpa),
        orbitKm: r.perigeeKm !== null ? { perigee: Math.round(r.perigeeKm), apogee: Math.round(r.apogeeKm ?? 0) } : null,
        spareDeltaVMs: r.spareDeltaVMs !== null ? Math.round(r.spareDeltaVMs) : null,
      }),
    };
  }

  return error(`Ferramenta desconhecida: ${name}`);
}
