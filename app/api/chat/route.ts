import Anthropic from "@anthropic-ai/sdk";
import { runAgent } from "@/lib/agent";
import { runDemo } from "@/lib/demo";
import { ChatRequestSchema, type StreamEvent } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

function errorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Chave da API inválida. Confira o ANTHROPIC_API_KEY.";
  if (err instanceof Anthropic.RateLimitError) return "Muitas requisições agora. Tente de novo em alguns segundos.";
  if (err instanceof Anthropic.APIConnectionError) return "Não consegui falar com a API da Anthropic.";
  if (err instanceof Anthropic.APIError) {
    const detail = apiErrorDetail(err);
    if (/credit balance/i.test(detail)) {
      return "Sem créditos na API da Anthropic. Adicione créditos em console.anthropic.com → Billing.";
    }
    return `Erro da API (${err.status ?? "?"})${detail ? `: ${detail}` : ". Tente de novo."}`;
  }
  return "Algo deu errado no servidor.";
}

function isNoCredit(err: unknown): boolean {
  return err instanceof Anthropic.APIError && /credit balance/i.test(apiErrorDetail(err));
}

/** Mensagem que a própria API mandou no corpo do erro (ex.: crédito esgotado). */
function apiErrorDetail(err: InstanceType<typeof Anthropic.APIError>): string {
  const body = err.error as { error?: { message?: unknown } } | undefined;
  return typeof body?.error?.message === "string" ? body.error.message : "";
}

export async function POST(req: Request) {
  const parsed = ChatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sentText = false;
      const emit = (event: StreamEvent) => {
        if (event.type === "text") sentText = true;
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        if (!process.env.ANTHROPIC_API_KEY || process.env.DEMO_MODE === "1") {
          await runDemo(parsed.data.messages, emit, req.signal);
        } else {
          await runAgent(parsed.data.messages, emit, req.signal);
        }
      } catch (err) {
        // Sem crédito na API: responde pelo modo demonstração em vez de travar.
        if (!sentText && isNoCredit(err)) {
          await runDemo(parsed.data.messages, emit, req.signal);
        } else if (!req.signal.aborted) {
          console.error(err);
          emit({ type: "error", message: errorMessage(err) });
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
