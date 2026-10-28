import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runOpenAICompatibleAgent } from "../lib/agents/openaiCompatible";
import type { StreamEvent } from "../lib/schemas";

/** Servidor falso no formato da OpenAI: 1ª chamada pede check_launch em pedaços, 2ª responde texto. */
let server: Server;
let baseURL = "";
const requests: { messages: { role: string; tool_call_id?: string; content?: string }[] }[] = [];

const args = JSON.stringify({
  name: "Teste",
  stages: [{ dryMassKg: 20000, propellantMassKg: 300000, thrustN: 2900000, ispSeconds: 290, engineCount: 5 }],
  payloadMassKg: 2000,
  targetOrbit: "LEO",
  hasFins: false,
});

const sse = (chunks: object[]) => chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
const chunk = (delta: object, finish: string | null = null) => ({
  id: "c", object: "chat.completion.chunk", created: 0, model: "fake",
  choices: [{ index: 0, delta, finish_reason: finish }],
});

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      requests.push(JSON.parse(body));
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      if (requests.length === 1) {
        res.end(sse([
          chunk({ role: "assistant", tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "check_launch", arguments: "" } }] }),
          chunk({ tool_calls: [{ index: 0, function: { arguments: args.slice(0, 40) } }] }),
          chunk({ tool_calls: [{ index: 0, function: { arguments: args.slice(40) } }] }),
          chunk({}, "tool_calls"),
        ]));
      } else {
        res.end(sse([chunk({ content: "Não pode " }), chunk({ content: "lançar." }), chunk({}, "stop")]));
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});

afterAll(() => server.close());

describe("agente compatível com a OpenAI", () => {
  it("monta a chamada em pedaços, roda a checagem local e devolve o resultado ao modelo", async () => {
    const events: StreamEvent[] = [];
    await runOpenAICompatibleAgent([{ role: "user", content: "Pode lançar?" }], (e) => events.push(e), {
      apiKey: "k",
      model: "fake",
      baseURL,
    });

    const launch = events.find((e) => e.type === "launch");
    expect(launch?.type === "launch" && launch.result.canLaunch).toBe(false);
    expect(events).toContainEqual({ type: "status", label: "Checando o lançamento…" });

    const second = requests[1].messages;
    const toolMsg = second.find((m) => m.role === "tool");
    expect(toolMsg?.tool_call_id).toBe("call_1");
    expect(JSON.parse(toolMsg?.content ?? "{}").canLaunch).toBe(false);

    const text = events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("");
    expect(text).toContain("Não pode lançar.");
  });
});
