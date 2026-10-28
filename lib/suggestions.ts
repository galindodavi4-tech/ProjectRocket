import type { LaunchInput } from "./schemas";

/** Perguntas sugeridas no chat vazio — uma por tema. */
export const SUGGESTIONS = [
  "Qual é a missão tripulada mais recente?",
  "Meu foguete: 1 estágio, 20 t secas, 300 t de propelente, empuxo 2.900 kN, Isp 290 s, 5 motores, 2 t de carga para LEO, sem aletas. Pode lançar?",
  "Mostre um foguete de 3 estágios com aletas.",
  "Quais são as maiores tendências econômicas agora?",
] as const;

/** As especificações escritas na segunda sugestão, já estruturadas. */
export const SAMPLE_ROCKET: LaunchInput = {
  name: "Foguete de exemplo",
  stages: [{ dryMassKg: 20_000, propellantMassKg: 300_000, thrustN: 2_900_000, ispSeconds: 290, engineCount: 5 }],
  payloadMassKg: 2_000,
  targetOrbit: "LEO",
  hasFins: false,
};
