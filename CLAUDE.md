# Space Agent

Web app (Next.js App Router + TypeScript + Tailwind v4) com chat e visualizador 3D,
que funciona com qualquer IA: Claude (`lib/agents/anthropic.ts`) ou qualquer API
compatível com a da OpenAI (`lib/agents/openaiCompatible.ts`). A escolha sai das
variáveis de ambiente em `lib/providers.ts`. PRD analisado em `docs/ANALISE.md`.

## Regras do projeto

- A IA conversa; o código calcula. Veredito de lançamento só sai de
  `lib/tools/checkLaunch.ts`. Não mover lógica de decisão para o prompt.
- IDs de peça vêm de `lib/parts.ts` e ligam a checagem ao 3D. Mudou um, mude nos dois lados.
- Ferramentas locais e sua execução ficam em `lib/tools/index.ts`, compartilhadas pelos dois loops.
- Schemas zod em `lib/schemas.ts` são a fonte única: geram o JSON Schema das ferramentas
  e validam a entrada no servidor.
- Cores, raios e sombras só pelos tokens de `app/globals.css` (design system “Turquesa”,
  `docs/DESIGN-SYSTEM.md`). Nada de hex solto nos componentes, exceto no material 3D.
- Textos da interface em português do Brasil.
- Nunca commitar `.env.local`.

## Comandos

- `npm run dev` — desenvolvimento (precisa da chave de uma IA no `.env.local`; ver `.env.example`)
- `npm test` — testes Vitest (checagem, escolha da IA, loop compatível com a OpenAI)
- `npm run typecheck` — TypeScript
- `npm run build` — build de produção
