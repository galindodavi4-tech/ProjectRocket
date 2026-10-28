import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { runAnthropicAgent } from "@/lib/agents/anthropic";
import { runOpenAICompatibleAgent } from "@/lib/agents/openaiCompatible";
import { resolveProvider, type Provider } from "@/lib/providers";
import { ChatRequestSchema, type StreamEvent } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Mensagem que o provedor mandou no corpo do erro (ex.: crédito esgotado, modelo inexistente). */
function apiDetail(err: { error?: unknown; message?: string }): string {
  const body = err.error as { error?: { message?: unknown }; message?: unknown } | undefined;
  const msg = body?.error?.message ?? body?.message;
  return typeof msg === "string" ? msg : "";
}

function errorMessage(err: unknown, provider: Provider): string {
  const status = err instanceof Anthropic.APIError || err instanceof OpenAI.APIError ? err.status : undefined;
  if (err instanceof Anthropic.APIConnectionError || err instanceof OpenAI.APIConnectionError) {
    return `Não consegui falar com a API do ${provider.label}.`;
  }
  if (status === undefined) return "Algo deu errado no servidor.";
  const detail = apiDetail(err as { error?: unknown });
  if (status === 401 || status === 403) return `Chave da IA (${provider.label}) recusada. Confira a variável na Vercel.`;
  if (status === 404) return `Modelo “${provider.model}” não encontrado. Ajuste AI_MODEL na Vercel.${detail ? ` (${detail})` : ""}`;
  if (status === 429) return `Limite de uso da IA atingido. Tente de novo daqui a pouco.${detail ? ` (${detail})` : ""}`;
  return `Erro da API (${status})${detail ? `: ${detail}` : ". Tente de novo."}`;
}

export async function POST(req: Request) {
  const parsed = ChatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const resolved = resolveProvider();
  if ("error" in resolved) {
    return Response.json({ error: resolved.error }, { status: 500 });
  }
  const { provider } = resolved;

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      const history = parsed.data.messages;
      try {
        if (provider.kind === "anthropic") {
          await runAnthropicAgent(history, emit, { apiKey: provider.apiKey, model: provider.model, signal: req.signal });
        } else {
          await runOpenAICompatibleAgent(history, emit, {
            apiKey: provider.apiKey,
            model: provider.model,
            baseURL: provider.baseURL,
            signal: req.signal,
          });
        }
      } catch (err) {
        if (!req.signal.aborted) {
          console.error(err);
          emit({ type: "error", message: errorMessage(err, provider) });
        }
      } finally {
        if (!req.signal.aborted) {
          emit({ type: "done" });
          controller.close();
        }
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
