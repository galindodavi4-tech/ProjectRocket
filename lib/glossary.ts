/**
 * Explicações curtas e simples para cada termo do app. Aparecem ao clicar no
 * botão "?" ao lado de cada campo — pensado para uma apresentação escolar.
 */
export type GlossaryEntry = { title: string; text: string; example?: string };

export const GLOSSARY = {
  presets: {
    title: "Foguetes reais",
    text: "Carrega um foguete que existe de verdade, com números aproximados. É um bom ponto de partida para comparar com o seu.",
    example: "O Falcon 9 é o foguete mais lançado do mundo hoje.",
  },
  diameter: {
    title: "Diâmetro",
    text: "A largura do foguete. Mais largo cabe mais propelente sem ficar comprido demais, mas enfrenta mais resistência do ar e a coifa custa mais.",
    example: "Falcon 9: 3,7 m. Saturn V: 10,1 m.",
  },
  stage: {
    title: "Estágio",
    text: "Um foguete é uma pilha de foguetes menores. Quando o de baixo esvazia, ele se solta e cai — assim o resto fica mais leve e acelera mais.",
    example: "O Falcon 9 tem 2 estágios; o Saturn V tinha 3.",
  },
  propellant: {
    title: "Propelente",
    text: "Combustível + oxidante (oxigênio líquido), que queimam juntos no motor. Cada tipo tem vantagens: o querosene é denso e barato, o metano é limpo, o hidrogênio rende mais por kg mas ocupa muito espaço.",
  },
  engine: {
    title: "Motor",
    text: "Onde o propelente queima e sai em alta velocidade pelo bocal, empurrando o foguete para o outro lado (3ª lei de Newton). Todos os motores da lista existem de verdade.",
  },
  engineCount: {
    title: "Quantidade de motores",
    text: "Mais motores = mais empuxo para levantar o foguete, mas mais peso e mais custo.",
    example: "O Falcon 9 usa 9 motores Merlin no 1º estágio.",
  },
  propellantMass: {
    title: "Propelente no tanque",
    text: "Quanto propelente o estágio carrega. Mais propelente dá mais Δv (velocidade), mas deixa o foguete mais pesado para decolar.",
  },
  material: {
    title: "Material da estrutura",
    text: "Do que são feitos os tanques. Fibra de carbono é leve e cara; aço inox é pesado e baratíssimo; alumínio-lítio fica no meio.",
  },
  boosters: {
    title: "Propulsores laterais",
    text: "Foguetes de combustível sólido presos do lado, que dão um empurrão extra na decolagem e se soltam depois de ~2 minutos.",
    example: "O Atlas V pode usar até 5 propulsores GEM 63.",
  },
  stability: {
    title: "Estabilidade",
    text: "Um foguete precisa voar reto. Aletas funcionam como as penas de uma flecha. Gimbal é quando os motores giram alguns graus para corrigir o rumo. Sem nenhum dos dois, ele gira e se parte.",
  },
  reuse: {
    title: "Reutilização",
    text: "O 1º estágio volta e pousa para voar de novo. Economiza muito dinheiro, mas guarda propelente para o pouso — então leva menos carga.",
    example: "Propulsores do Falcon 9 já voaram mais de 30 vezes.",
  },
  payload: {
    title: "Carga útil",
    text: "O que o foguete leva para o espaço: satélites, sondas, astronautas. Normalmente é só 1% a 4% do peso total do foguete!",
  },
  orbit: {
    title: "Destino",
    text: "Órbita baixa (LEO) fica a ~200–2.000 km, onde está a Estação Espacial. GTO leva satélites de TV rumo a 36.000 km. Lua é o mais difícil.",
    example: "Δv necessário: LEO ~9.400 m/s, GTO ~11.800 m/s, Lua ~12.500 m/s.",
  },
  twr: {
    title: "Empuxo / peso (TWR)",
    text: "A força dos motores dividida pelo peso do foguete. Abaixo de 1, ele nem sai do chão. A regra do app pede mais de 1,2 para ter folga.",
  },
  deltaV: {
    title: "Δv (delta-v)",
    text: "Quanta velocidade o foguete consegue ganhar queimando todo o propelente. É o \"orçamento\" da viagem: cada destino pede um tanto de Δv.",
    example: "Para ficar em órbita é preciso ~7.800 m/s — mais ~1.600 perdidos lutando contra a gravidade e o ar.",
  },
  isp: {
    title: "Isp (impulso específico)",
    text: "A \"eficiência\" do motor: quanto mais alto, mais velocidade ele tira de cada kg de propelente. É como o km por litro de um carro.",
  },
  maxPayload: {
    title: "Carga máxima",
    text: "O maior peso que este foguete consegue levar até cada destino, calculado pelo Δv.",
  },
  propellantFraction: {
    title: "Fração de propelente",
    text: "Quanto do peso de um estágio é propelente. Entre 50% e 95% é o razoável: abaixo disso o estágio é pesado demais; acima, a estrutura fica fina e frágil.",
  },
  maxQ: {
    title: "Max-Q",
    text: "O momento de maior pressão do ar sobre o foguete, quando ele já está rápido mas o ar ainda é denso. É o momento mais perigoso da subida.",
  },
  costPerLaunch: {
    title: "Custo por lançamento",
    text: "Quanto custa fabricar (ou reaproveitar) o foguete, o propelente e a operação de um voo. O propelente é quase sempre menos de 1%!",
  },
  costPerKg: {
    title: "Custo por kg",
    text: "Custo do lançamento dividido pela carga levada. É assim que o mercado compara foguetes: quanto mais barato por kg, mais clientes.",
  },
  price: {
    title: "Preço de venda",
    text: "Quanto você cobra do cliente por lançamento. A diferença para o custo é a sua margem de lucro.",
  },
  launchesPerYear: {
    title: "Lançamentos por ano",
    text: "Quantas vezes o foguete voa por ano. Mais voos dividem os custos fixos (equipe, fábrica) e fazem a reutilização valer a pena.",
  },
  development: {
    title: "Custo de desenvolvimento",
    text: "Quanto custa projetar e testar o foguete antes do primeiro voo comercial. É o grande investimento inicial de uma empresa de foguetes.",
    example: "Electron: ~US$ 100 milhões. Falcon 9: ~US$ 390 milhões.",
  },
  investors: {
    title: "Investidores",
    text: "Dão dinheiro em troca de uma parte da empresa (participação). Você não devolve o dinheiro, mas passa a dividir o lucro e as decisões.",
  },
  government: {
    title: "Contratos do governo",
    text: "A agência espacial paga se você cumprir marcos (por exemplo, fazer 2 missões). Não precisa devolver — a menos que não cumpra.",
    example: "No programa COTS, a NASA pagou empresas por marcos cumpridos.",
  },
  loan: {
    title: "Empréstimo",
    text: "Dinheiro do banco que você devolve com juros. Você não perde participação, mas paga juros todo trimestre.",
  },
  payback: {
    title: "Retorno do investimento",
    text: "Quantos anos de lucro são necessários para devolver o que investidores e bancos colocaram. Até 7 anos é considerado viável aqui.",
  },
  valuation: {
    title: "Valor da empresa",
    text: "Quanto a empresa vale no mercado. Aqui é calculado com o dinheiro em caixa, a receita, os foguetes prontos e a fama das missões.",
    example: "Uma empresa que passa de US$ 1 bilhão é chamada de \"unicórnio\".",
  },
  founderPct: {
    title: "Sua participação",
    text: "Quanto da empresa ainda é seu. Cada investimento que você aceita diminui essa porcentagem — mas a empresa pode valer bem mais.",
  },
  reputation: {
    title: "Reputação",
    text: "A confiança do mercado. Missões de sucesso aumentam; falhas derrubam. Reputação alta abre portas para fundos maiores, big techs e a bolsa.",
  },
  actions: {
    title: "Ações do trimestre",
    text: "Tempo é limitado: a cada trimestre (3 meses) você pode fazer 3 ações — desenvolver um foguete, fazer um contato ou lançar uma missão.",
  },
  privatePublic: {
    title: "Privada ou aberta (IPO)",
    text: "Privada: poucos donos e mais liberdade. Abrir capital (IPO) é vender ações na bolsa: entra muito dinheiro, mas os acionistas cobram resultados todo trimestre.",
  },
  contacts: {
    title: "Contatos",
    text: "Feiras, reuniões e apresentações (pitch) para conseguir dinheiro. Custam um pouco e nem sempre dão certo — reputação alta ajuda.",
  },
  missions: {
    title: "Missões",
    text: "Clientes que pagam para levar uma carga a um destino. Se a missão der certo, você recebe o pagamento mais um incentivo do seu país.",
  },
  country: {
    title: "País da empresa",
    text: "Muda os custos (salários), o tamanho do mercado de investidores, o apoio do governo e a base de lançamento. Bases perto do Equador ganham velocidade grátis da rotação da Terra.",
  },
  fixedCosts: {
    title: "Custos fixos",
    text: "Gastos de todo trimestre, voando ou não: salários, fábrica, base de lançamento. Se o dinheiro acabar, a empresa quebra.",
  },
} satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;
