import { describe, expect, it } from "vitest";
import { resolveProvider } from "../lib/providers";

describe("resolveProvider", () => {
  it("sem nenhuma chave, explica o que configurar", () => {
    const r = resolveProvider({});
    expect("error" in r && r.error).toMatch(/XAI_API_KEY/);
  });

  it("XAI_API_KEY usa o Grok pela API compatível com a OpenAI", () => {
    const r = resolveProvider({ XAI_API_KEY: "x" });
    expect("provider" in r && r.provider).toMatchObject({ kind: "openai-compatible", baseURL: "https://api.x.ai/v1", label: "Grok" });
  });

  it("AI_MODEL troca o modelo do Grok", () => {
    const r = resolveProvider({ XAI_API_KEY: "x", AI_MODEL: "grok-outro" });
    expect("provider" in r && r.provider.model).toBe("grok-outro");
  });

  it("AI_API_KEY genérica vence as outras e exige AI_MODEL", () => {
    expect("error" in resolveProvider({ AI_API_KEY: "k", XAI_API_KEY: "x" })).toBe(true);
    const r = resolveProvider({ AI_API_KEY: "k", AI_MODEL: "m", AI_BASE_URL: "https://exemplo.ai/v1", ANTHROPIC_API_KEY: "a" });
    expect("provider" in r && r.provider).toMatchObject({ kind: "openai-compatible", model: "m", baseURL: "https://exemplo.ai/v1" });
  });

  it("ANTHROPIC_API_KEY vem antes do Grok", () => {
    const r = resolveProvider({ ANTHROPIC_API_KEY: "a", XAI_API_KEY: "x" });
    expect("provider" in r && r.provider.kind).toBe("anthropic");
  });
});
