/**
 * Qual IA o app usa, decidido pelas variáveis de ambiente (na Vercel:
 * Settings → Environment Variables). A primeira que existir vence:
 *
 * 1. AI_API_KEY + AI_MODEL (+ AI_BASE_URL) — qualquer API compatível com a da OpenAI
 * 2. ANTHROPIC_API_KEY — Claude (com busca na web)
 * 3. XAI_API_KEY — Grok
 * 4. OPENAI_API_KEY — OpenAI
 *
 * AI_MODEL troca o modelo em qualquer um deles.
 */
export type Provider =
  | { kind: "anthropic"; label: string; apiKey: string; model: string }
  | { kind: "openai-compatible"; label: string; apiKey: string; model: string; baseURL?: string };

export type ProviderResult = { provider: Provider } | { error: string };

type Env = Record<string, string | undefined>;

export function resolveProvider(env: Env = process.env): ProviderResult {
  const model = env.AI_MODEL?.trim() || undefined;

  if (env.AI_API_KEY) {
    if (!model) return { error: "Defina AI_MODEL com o nome do modelo (o mesmo que aparece no painel do provedor)." };
    return {
      provider: {
        kind: "openai-compatible",
        label: model,
        apiKey: env.AI_API_KEY,
        model,
        baseURL: env.AI_BASE_URL?.trim() || undefined,
      },
    };
  }
  if (env.ANTHROPIC_API_KEY) {
    return { provider: { kind: "anthropic", label: "Claude", apiKey: env.ANTHROPIC_API_KEY, model: model ?? "claude-sonnet-5-5" } };
  }
  if (env.XAI_API_KEY) {
    return {
      provider: { kind: "openai-compatible", label: "Grok", apiKey: env.XAI_API_KEY, model: model ?? "grok-4.6", baseURL: "https://api.x.ai/v1" },
    };
  }
  if (env.OPENAI_API_KEY) {
    if (!model) return { error: "Defina AI_MODEL com o nome do modelo da OpenAI." };
    return { provider: { kind: "openai-compatible", label: "OpenAI", apiKey: env.OPENAI_API_KEY, model } };
  }
  return {
    error: "Nenhuma IA configurada. Na Vercel, crie XAI_API_KEY (Grok), ANTHROPIC_API_KEY (Claude) ou AI_API_KEY + AI_MODEL + AI_BASE_URL (outra IA).",
  };
}
