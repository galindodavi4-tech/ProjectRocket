import { describe, expect, it } from "vitest";
import { PRESETS, STARTER_DESIGN } from "../lib/presets";
import type { StreamEvent } from "../lib/schemas";
import { executeTool, type ToolState } from "../lib/tools";

const run = (name: string, input: unknown, state: ToolState) => {
  const events: StreamEvent[] = [];
  const out = executeTool(name, input, state, (e) => events.push(e));
  return { out, events };
};

describe("ferramentas do construtor para a IA", () => {
  it("update_design muda só o que foi pedido, avisa a tela e devolve os números recalculados", () => {
    const state: ToolState = { design: STARTER_DESIGN };
    const { out, events } = run("update_design", { stability: "gimbal", payloadMassKg: 2_000 }, state);
    expect(out.isError).toBe(false);
    expect(state.design?.stability).toBe("gimbal");
    expect(state.design?.stages).toEqual(STARTER_DESIGN.stages);
    expect(events[0]).toMatchObject({ type: "design" });
    const parsed = JSON.parse(out.content);
    expect(parsed.analysis.maxPayloadKg.LEO).toBeGreaterThan(0);
    expect(parsed.analysis.costPerLaunchUsd).toBeGreaterThan(0);
  });

  it("update_design recusa motor fora do catálogo sem mexer no projeto", () => {
    const state: ToolState = { design: STARTER_DESIGN };
    const bad = { stages: [{ engineId: "motor-inventado", engineCount: 3, propellantMassKg: 90_000, material: "aluminum" }] };
    const { out, events } = run("update_design", bad, state);
    expect(out.isError).toBe(true);
    expect(out.content).toMatch(/motor-inventado/);
    expect(state.design).toBe(STARTER_DESIGN);
    expect(events).toHaveLength(0);
  });

  it("launch_flight dispara a animação e devolve o resultado da simulação", () => {
    const state: ToolState = { design: PRESETS[0].design };
    const { out, events } = run("launch_flight", {}, state);
    expect(events).toEqual([{ type: "flight" }]);
    expect(JSON.parse(out.content).outcome.kind).toBe("target");
  });

  it("sem projeto aberto, as ferramentas do construtor explicam o erro", () => {
    expect(run("launch_flight", {}, {}).out.isError).toBe(true);
    expect(run("update_design", {}, {}).out.isError).toBe(true);
  });
});
