import { z } from "zod";
import {
  LaunchInputSchema,
  ShowRocketInputSchema,
  type LaunchResult,
  type StreamEvent,
} from "../schemas";
import { checkLaunch } from "./checkLaunch";
import { showRocket } from "./showRocket";

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
] as const;

/** JSON Schema da entrada, gerado do mesmo schema zod que valida no servidor. */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema) as Record<string, unknown>;
  return json;
}

export const toolStatusLabel = (name: string) =>
  name === "check_launch" ? "Checando o lançamento…" : "Montando o foguete 3D…";

export type ToolState = { lastCheck?: LaunchResult };
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

  return error(`Ferramenta desconhecida: ${name}`);
}
