import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlock,
  BetaMessageParam,
  BetaToolResultBlockParam,
  BetaToolUnion,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { ChatMessage, Source, StreamEvent } from "../schemas";
import { buildSystemPrompt } from "../systemPrompt";
import { executeTool, LOCAL_TOOLS, toJsonSchema, toolStatusLabel, type ToolState } from "../tools";

const MAX_ITERATIONS = 8;
const MAX_SEARCHES_PER_TURN = 3;

const TOOLS: BetaToolUnion[] = [
  { type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES_PER_TURN },
  ...LOCAL_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: toJsonSchema(t.schema) as Anthropic.Tool.InputSchema,
    eager_input_streaming: true,
  })),
];

type Emit = (event: StreamEvent) => void;
type ToolUse = Extract<BetaContentBlock, { type: "tool_use" }>;

/** Junta as fontes citadas nas respostas que usaram busca, sem repetir URL. */
function collectSources(content: BetaContentBlock[], into: Map<string, Source>) {
  for (const block of content) {
    if (block.type !== "text" || !block.citations) continue;
    for (const c of block.citations) {
      if (c.type === "web_search_result_location" && !into.has(c.url)) {
        into.set(c.url, { title: c.title ?? c.url, url: c.url });
      }
    }
  }
}

/**
 * Loop do agente com o Claude: manda a conversa, executa as ferramentas locais
 * que ele pedir, devolve os resultados e repete até a resposta final. A busca na
 * web roda nos servidores da Anthropic.
 */
export async function runAnthropicAgent(
  history: ChatMessage[],
  emit: Emit,
  opts: { apiKey: string; model: string; signal?: AbortSignal },
) {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const messages: BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const state: ToolState = {};
  const sources = new Map<string, Source>();
  const system = buildSystemPrompt({ webSearch: true });

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = client.beta.messages.stream(
      {
        model: opts.model,
        max_tokens: 16_000,
        system,
        tools: TOOLS,
        messages,
        output_config: { effort: "medium" },
        // Se o modelo recusar por política, o servidor tenta o substituto recomendado.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal: opts.signal },
    );

    stream.on("text", (delta) => emit({ type: "text", delta }));
    stream.on("streamEvent", (event) => {
      if (event.type !== "content_block_start") return;
      const block = event.content_block;
      if (block.type === "server_tool_use") emit({ type: "status", label: "Pesquisando na web…" });
      if (block.type === "tool_use") emit({ type: "status", label: toolStatusLabel(block.name) });
    });

    const message = await stream.finalMessage();
    collectSources(message.content, sources);

    if (message.stop_reason === "refusal") {
      emit({ type: "error", message: "O modelo recusou este pedido." });
      break;
    }
    // A busca no servidor atingiu o limite de passos: reenviar retoma de onde parou.
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }

    const toolUses = message.content.filter((b): b is ToolUse => b.type === "tool_use");
    if (toolUses.length === 0) break;
    if (message.stop_reason === "max_tokens") {
      emit({ type: "error", message: "A resposta foi cortada antes de terminar a ferramenta." });
      break;
    }

    messages.push({ role: "assistant", content: message.content });
    messages.push({
      role: "user",
      content: toolUses.map((b): BetaToolResultBlockParam => {
        const out = executeTool(b.name, b.input, state, emit);
        return { type: "tool_result", tool_use_id: b.id, content: out.content, ...(out.isError && { is_error: true }) };
      }),
    });
    // Separa visualmente o texto antes e depois das ferramentas.
    emit({ type: "text", delta: "\n\n" });
  }

  if (sources.size > 0) emit({ type: "sources", sources: [...sources.values()] });
}
