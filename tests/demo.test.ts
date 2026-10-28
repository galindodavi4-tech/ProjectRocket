import { describe, expect, it } from "vitest";
import { runDemo } from "../lib/demo";
import type { StreamEvent } from "../lib/schemas";
import { SUGGESTIONS } from "../lib/suggestions";

async function ask(question: string) {
  const events: StreamEvent[] = [];
  await runDemo([{ role: "user", content: question }], (e) => events.push(e));
  const text = events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("");
  return { events, text };
}

describe("modo demonstração", () => {
  it("roda a checagem real no foguete de exemplo e marca as peças", async () => {
    const { events, text } = await ask(SUGGESTIONS[1]);
    const launch = events.find((e) => e.type === "launch");
    const rocket = events.find((e) => e.type === "rocket");
    expect(launch?.type === "launch" && launch.result.canLaunch).toBe(false);
    expect(rocket?.type === "rocket" && rocket.model.parts.filter((p) => p.status === "fail").map((p) => p.id)).toEqual(
      expect.arrayContaining(["stage-1-engines", "stage-1-tank", "fins"]),
    );
    expect(text).toMatch(/não pode lançar/);
  });

  it("monta o foguete pedido em texto livre", async () => {
    const { events } = await ask("Mostre um foguete de três estágios sem aletas");
    const rocket = events.find((e) => e.type === "rocket");
    expect(rocket?.type === "rocket" && rocket.model.stageCount).toBe(3);
    expect(rocket?.type === "rocket" && rocket.model.hasFins).toBe(false);
  });

  it("não inventa fatos atuais: perguntas que pedem busca explicam o limite", async () => {
    for (const q of [SUGGESTIONS[0], SUGGESTIONS[3]]) {
      const { events, text } = await ask(q);
      expect(events[0]).toEqual({ type: "mode", demo: true });
      expect(text).toMatch(/não pesquiso na web/);
    }
  });
});
