import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "../components/Markdown";

const html = (text: string) => renderToStaticMarkup(createElement(Markdown, { text })).replace(/ class="[^"]*"/g, "");

describe("formatação das respostas do chat", () => {
  it("título, lista e tabela no meio do texto", () => {
    const out = html("Olá!\n\n### Onde estamos agora\n- **Nome:** Meu foguete\n- Estágios: 2\n\n| Item | Valor |\n|---|---|\n| TWR | **2,17** |\n\nPronto?");
    expect(out).toContain("<h3>Onde estamos agora</h3>");
    expect(out).toContain("<ul><li><strong>Nome:</strong> Meu foguete</li><li>Estágios: 2</li></ul>");
    expect(out).toContain("<th>Item</th>");
    expect(out).toContain("<td><strong>2,17</strong></td>");
    expect(out).not.toContain("###");
  });

  it("título colado no texto, sem linha em branco", () => {
    const out = html("Texto\n### Seção\nMais texto");
    expect(out).toContain("<h3>Seção</h3>");
  });
});
