# Dados reais usados no construtor

Os números do catálogo (`lib/catalog.ts`) são **aproximados e educativos**. Quando
não há fonte pública confiável — principalmente o custo de cada motor —, o item
fica marcado como `estimated: true` no código e aparece como "(estimativa)" na tela.

## Motores

| Motor | Empuxo nível do mar / vácuo | Isp nível do mar / vácuo | Massa | Fonte |
|---|---|---|---|---|
| Merlin 1D | 845 / 914 kN | 282 / 311 s | 470 kg | [Wikipedia — SpaceX Merlin](https://en.wikipedia.org/wiki/SpaceX_Merlin) |
| Merlin Vacuum | — / 981 kN | — / 348 s | ~490 kg | idem |
| RS-25 | 1.860 / 2.279 kN | 366 / 452 s | 3.527 kg | [Wikipedia — RS-25](https://en.wikipedia.org/wiki/RS-25) |
| RD-180 | 3.830 / 4.152 kN | 311 / 338 s | 5.480 kg | [infográfico de motores](https://www.jeffreydonenfeld.com/blog/2024/03/infographics-the-5-most-popular-rocket-engines-in-use-today/) |
| RL10 | — / ~106 kN | — / ~453–465 s | ~231 kg (510 lb) | [Wikipedia — RL10](https://en.wikipedia.org/wiki/RL10), [L3Harris](https://www.l3harris.com/all-capabilities/rl10-engine) |
| Rutherford | 24,9 kN | 311 s (vácuo: 343 s na versão de vácuo) | ~35 kg | [Wikipedia — Rutherford](https://en.wikipedia.org/wiki/Rutherford_(rocket_engine)) |
| Raptor 2, BE-4 | ~2.256 / ~2.400 kN | ~327–350 / ~340 s | — | [BGR — Raptor × BE-4](https://www.bgr.com/2012796/spacex-raptor-engine-vs-blue-origin-be-4-whats-the-difference-rocket-engines/) (valores informais) |
| F-1, J-2, Raptor Vacuum, GEM 63, P120C | — | — | — | valores conhecidos de referência, sem fonte checada nesta pesquisa: tratar como estimativa |

**Custo dos motores** (todos estimados): Merlin ~US$ 1–2 mi; Raptor 2 ~US$ 0,5–1 mi (meta);
RS-25 > US$ 100 mi no contrato do SLS; RL10 ~US$ 20–25 mi; BE-4 ~US$ 8 mi.
Fontes: [Hacker News](https://news.ycombinator.com/item?id=23059911), [NASASpaceflight Forum](https://forum.nasaspaceflight.com/index.php?topic=43053.0),
[Medium — Money Pits in Rocket Production](https://timucin1erbas.medium.com/money-pits-in-rocket-production-patent-article-i-9e7317d009a),
[Space Launch Live — Raptor](https://spacelaunchlive.com/articles/raptor/).

## Propelentes

| Propelente | US$/kg | Densidade média | Fonte |
|---|---|---|---|
| Oxigênio líquido | 0,27 | — | [PatentPC](https://patentpc.com/blog/rocket-fuel-innovations-how-efficient-are-new-propulsion-systems-energy-cost-stats) (dados do Defense Working Capital Fund) |
| RP-1 (querosene) | 2,3 | ~1.030 kg/m³ com LOX | idem |
| Metano | 0,6 (GNL comercial) | ~830 kg/m³ com LOX | estimativa; a tabela militar dos EUA lista valor maior |
| Hidrogênio líquido | 6 (faixa de 3 a 30) | ~360 kg/m³ com LOX | [Space Insider](https://spaceinsider.tech/2023/06/13/how-much-does-rocket-fuel-cost/) |

O propelente de um Falcon 9 custa menos de US$ 0,5 mi — menos de 1% do preço do lançamento
([Falcon 9 — Wikipedia](https://en.wikipedia.org/wiki/Falcon_9)).

## Materiais

Matéria-prima: aço inox ~US$ 3–4/kg, alumínio-lítio ~€36/kg, fibra de carbono ~US$ 135/kg
([IMDEA Materials](https://materials.imdea.org/why-elon-musk-uses-stainless-steel-for-his-new-spacecraft/),
[NextBigFuture](https://www.nextbigfuture.com/2019/01/elon-musk-explains-why-spacex-switched-to-a-stainless-steel-rocket.html)).
O custo da estrutura pronta (fabricação incluída) e a massa por kg de propelente são
**calibrados** para o 1º estágio do Falcon 9 dar ~US$ 30 mi e ~5% da massa do propelente.

## Mercado e reutilização

- Preço por kg em órbita baixa: Falcon 9 ~US$ 2.700; New Glenn ~US$ 4–8 mil; Ariane 6 ~€9.700 (≈ €100 mi / 10,35 t); Electron ~US$ 25 mil
  ([Space Odyssey Hub](https://spaceodysseyhub.com/articles/launch-cost-comparison-2025), [Ariane 6 — Wikipedia](https://en.wikipedia.org/wiki/Ariane_6), [Orbital Radar](https://orbitalradar.com/glossary/launch-cost)).
- Reutilização: custo marginal de um Falcon 9 reutilizado ~US$ 15 mi (Musk, 2020); revisão do propulsor de < US$ 0,3 mi a ~US$ 1 mi; reutilizar custa até 40% da carga útil
  ([Inverse](https://www.inverse.com/innovation/spacex-elon-musk-falcon-9-economics), [ElonX](https://www.elonx.net/how-much-does-it-cost-to-launch-a-reused-falcon-9-elon-musk-explains-why-reusability-is-worth-it/)).

## Financiamento

- Electron: desenvolvimento ~US$ 100 mi; ~US$ 250 mi em capital de risco até voar
  ([Payload Research](https://payloadspace.com/rocket-development-costs-by-vehicle-payload-research/), [TechCrunch](https://techcrunch.com/2018/11/15/after-first-commercial-launch-rocket-lab-announces-140-million-in-funding)).
- NASA COTS: US$ 288 mi em pagamentos por marcos para a Orbital Sciences; a Kistler perdeu o contrato ao não cumprir marcos
  ([SEC](https://www.sec.gov/Archives/edgar/data/820736/000082073612000080/R16.htm), [Rocketplane Kistler — Wikipedia](https://en.wikipedia.org/wiki/Rocketplane_Kistler)).
- Rocket Lab: US$ 355 mi em títulos conversíveis em 2024 ([Rocket Lab Report](https://arkaea-static-assets.s3.us-east-1.amazonaws.com/Rocket_Lab_Report_Final.pdf)).

## Quão perto o modelo chega dos foguetes reais

Verificado nos testes (`tests/builder.test.ts`):

| Foguete | Modelo do app | Real |
|---|---|---|
| Falcon 9 reutilizável → LEO | ~15 t | ~17,5 t |
| Falcon 9 descartável → LEO | ~19 t | ~22,8 t |
| Electron → LEO | ~360 kg | ~300 kg |
| Saturn V → Lua | ~49 t | ~48 t |
| Atlas V 541 → GTO | ~6,5 t | ~8 t |
| Falcon 9: custo por voo | ~US$ 49 mi descartável, ~US$ 22 mi reutilizado | ~US$ 50 mi / ~US$ 15–28 mi |
| Electron: desenvolvimento | ~US$ 96 mi | ~US$ 100 mi |
