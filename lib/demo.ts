import type { ChatMessage, StreamEvent } from "./schemas";
import { SAMPLE_ROCKET, SUGGESTIONS } from "./suggestions";
import { checkLaunch } from "./tools/checkLaunch";
import { showRocket } from "./tools/showRocket";

type Emit = (event: StreamEvent) => void;

const fmt = (n: number, d = 0) => n.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const ONLINE_ONLY =
  "No **modo demonstração** eu não pesquiso na web, então não tenho como responder isso com informação atual e fonte confiável. " +
  "Com a IA ligada (chave da Anthropic com crédito), essa pergunta é respondida com busca e as fontes aparecem embaixo da resposta.";

const HELP =
  "Estou no **modo demonstração**: sem IA, então não entendo perguntas livres. O que funciona aqui:\n\n" +
  "- **Checagem de lançamento** do foguete de exemplo (use a sugestão “Meu foguete: …”).\n" +
  "- **Foguete 3D** de 1 a 4 estágios, com ou sem aletas (ex.: “Mostre um foguete de 2 estágios sem aletas”).\n\n" +
  "A checagem e o 3D são cálculo puro — funcionam igual com ou sem IA.";

/** Solta o texto em pedaços, para parecer o streaming real. */
async function streamText(text: string, emit: Emit, signal?: AbortSignal) {
  for (const chunk of text.match(/\S+\s*/g) ?? []) {
    if (signal?.aborted) return;
    emit({ type: "text", delta: chunk });
    await new Promise((r) => setTimeout(r, 18));
  }
}

/**
 * Respostas sem IA. Usa as mesmas ferramentas determinísticas do agente
 * (checkLaunch e showRocket) e nunca inventa fatos atuais.
 */
export async function runDemo(history: ChatMessage[], emit: Emit, signal?: AbortSignal) {
  emit({ type: "mode", demo: true });
  const question = history[history.length - 1].content;
  const q = normalize(question);

  if (question.trim() === SUGGESTIONS[1]) {
    emit({ type: "status", label: "Checando o lançamento…" });
    const result = checkLaunch(SAMPLE_ROCKET);
    emit({ type: "launch", result });
    emit({ type: "rocket", model: showRocket({ name: SAMPLE_ROCKET.name, stageCount: 1, hasFins: false }, result) });
    const failed = result.parts.filter((p) => p.status === "fail");
    const lines = failed.map((p) => `- **${p.label}:** ${p.reason}`).join("\n");
    await streamText(
      `${result.canLaunch ? "**Veredito: pode lançar.**" : "**Veredito: não pode lançar.**"}\n\n` +
        (failed.length ? `${lines}\n\n` : "") +
        `Empuxo/peso ${fmt(result.metrics.twr, 2)} e Δv ${fmt(result.metrics.deltaVMs)} m/s, contra ~${fmt(result.metrics.requiredDeltaVMs)} m/s para LEO. ` +
        "As peças reprovadas estão em vermelho no 3D — passe o cursor para ver o motivo.\n\n" +
        "*Regras simplificadas e educativas, não aprovação de engenharia real.*",
      emit,
      signal,
    );
    return;
  }

  const stagesMatch = q.match(/([1-4])\s*estagios?/) ?? q.match(/\b(um|dois|tres|quatro)\s+estagios?/);
  if (stagesMatch || /foguete/.test(q)) {
    const words: Record<string, number> = { um: 1, dois: 2, tres: 3, quatro: 4 };
    const raw = stagesMatch?.[1] ?? "2";
    const stageCount = words[raw] ?? Number(raw);
    const hasFins = !/sem aletas?/.test(q);
    emit({ type: "status", label: "Montando o foguete 3D…" });
    emit({ type: "rocket", model: showRocket({ name: `Foguete de ${stageCount} estágio${stageCount > 1 ? "s" : ""}`, stageCount, hasFins }) });
    await streamText(
      `Pronto: foguete de **${stageCount} estágio${stageCount > 1 ? "s" : ""}**, ${hasFins ? "com" : "sem"} aletas, no visualizador. ` +
        "Arraste para girar e use o slider para a vista explodida.\n\n" +
        "Sem especificações ele aparece neutro. Para ver peças em vermelho, rode a checagem do foguete de exemplo.",
      emit,
      signal,
    );
    return;
  }

  if (/missao|tripulad|lancament|nasa|spacex|tendencia|economi|marketing|mercado|noticia|hoje|agora|recente/.test(q)) {
    await streamText(ONLINE_ONLY, emit, signal);
    return;
  }

  await streamText(HELP, emit, signal);
}
