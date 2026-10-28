import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import type { ChatMessage, StreamEvent } from "../schemas";
import { buildSystemPrompt } from "../systemPrompt";
import { executeTool, LOCAL_TOOLS, toJsonSchema, toolStatusLabel, type ToolState } from "../tools";

const MAX_ITERATIONS = 8;

const TOOLS: ChatCompletionTool[] = LOCAL_TOOLS.map((t) => ({
  type: "function",
  function: { name: t.name, description: t.description, parameters: toJsonSchema(t.schema) },
}));

type Emit = (event: StreamEvent) => void;
type PendingCall = { id: string; name: string; args: string };

/**
 * Loop do agente para qualquer API compatível com a da OpenAI (Grok, Gemini,
 * Groq, OpenRouter, DeepSeek, OpenAI…). Mesmas ferramentas locais; sem busca na web.
 */
export async function runOpenAICompatibleAgent(
  history: ChatMessage[],
  emit: Emit,
  opts: { apiKey: string; model: string; baseURL?: string; signal?: AbortSignal },
) {
  const client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL });
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt({ webSearch: false }) },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];
  const state: ToolState = {};

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = await client.chat.completions.create(
      { model: opts.model, messages, tools: TOOLS, stream: true },
      { signal: opts.signal },
    );

    let text = "";
    let finish: string | null = null;
    const calls: PendingCall[] = [];

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      const delta = choice.delta;
      if (delta?.content) {
        text += delta.content;
        emit({ type: "text", delta: delta.content });
      }
      // As chamadas de ferramenta chegam em pedaços, indexadas; junta os argumentos.
      for (const tc of delta?.tool_calls ?? []) {
        const call = (calls[tc.index] ??= { id: "", name: "", args: "" });
        if (tc.id) call.id = tc.id;
        if (tc.function?.name && !call.name) {
          call.name = tc.function.name;
          emit({ type: "status", label: toolStatusLabel(call.name) });
        }
        if (tc.function?.arguments) call.args += tc.function.arguments;
      }
      if (choice.finish_reason) finish = choice.finish_reason;
    }

    const toolCalls = calls.filter(Boolean);
    if (toolCalls.length === 0) break;
    if (finish === "length") {
      emit({ type: "error", message: "A resposta foi cortada antes de terminar a ferramenta." });
      break;
    }

    messages.push({
      role: "assistant",
      content: text || null,
      tool_calls: toolCalls.map((c, n) => ({
        id: c.id || `call_${i}_${n}`,
        type: "function",
        function: { name: c.name, arguments: c.args || "{}" },
      })),
    });
    toolCalls.forEach((c, n) => {
      let input: unknown;
      let content: string;
      try {
        input = JSON.parse(c.args || "{}");
        content = executeTool(c.name, input, state, emit).content;
      } catch {
        content = "Erro: os argumentos não vieram em JSON válido. Tente de novo.";
      }
      messages.push({ role: "tool", tool_call_id: c.id || `call_${i}_${n}`, content });
    });
    emit({ type: "text", delta: "\n\n" });
  }
}
