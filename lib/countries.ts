/**
 * Países onde dá para abrir a empresa, cada um com uma base de lançamento real.
 * Latitude e base são reais; os fatores de custo, investimento e incentivo são
 * uma simplificação didática (não são dados oficiais).
 */

export type CountryId = "BR" | "US" | "FR" | "CN" | "IN" | "JP" | "NZ" | "UK" | "KR" | "AU";

export type Country = {
  id: CountryId;
  name: string;
  /** Código numérico ISO 3166 (é o id do país no mapa world-atlas). */
  iso: string;
  site: string;
  /** Coordenadas da base de lançamento. */
  lat: number;
  lon: number;
  agency: string;
  /** Salários, impostos e aluguel: 1 = média. */
  costFactor: number;
  /** Força do mercado de investidores: 1 = média. */
  investorFactor: number;
  /** Quanto o governo apoia empresas espaciais: 1 = média. */
  grantFactor: number;
  /** Incentivo extra sobre o pagamento de cada missão bem-sucedida (fração). */
  missionBonus: number;
  fact: string;
};

export const COUNTRIES: Country[] = [
  {
    id: "BR", name: "Brasil", iso: "076", site: "Centro de Lançamento de Alcântara (MA)", lat: -2.3, lon: -44.4, agency: "Agência Espacial Brasileira (AEB)",
    costFactor: 0.6, investorFactor: 0.6, grantFactor: 0.8, missionBonus: 0.15,
    fact: "Alcântara fica quase na Linha do Equador: a rotação da Terra dá um empurrão de ~463 m/s, um dos melhores do mundo.",
  },
  {
    id: "US", name: "Estados Unidos", iso: "840", site: "Cabo Canaveral (Flórida)", lat: 28.5, lon: -80.6, agency: "NASA",
    costFactor: 1.3, investorFactor: 1.5, grantFactor: 1.2, missionBonus: 0.05,
    fact: "O maior mercado de investidores do setor espacial. Caro para contratar, mas é onde está o dinheiro.",
  },
  {
    id: "FR", name: "França / Europa", iso: "250", site: "Kourou (Guiana Francesa)", lat: 5.2, lon: -52.8, agency: "CNES e ESA",
    costFactor: 1.2, investorFactor: 1.0, grantFactor: 1.3, missionBonus: 0.1,
    fact: "Kourou, perto do Equador, lança os foguetes Ariane. A Europa apoia muito as empresas do continente.",
  },
  {
    id: "CN", name: "China", iso: "156", site: "Wenchang (Hainan)", lat: 19.6, lon: 110.9, agency: "CNSA",
    costFactor: 0.7, investorFactor: 1.1, grantFactor: 1.2, missionBonus: 0.1,
    fact: "Dezenas de empresas privadas de foguetes surgiram na China nos últimos anos.",
  },
  {
    id: "IN", name: "Índia", iso: "356", site: "Sriharikota", lat: 13.7, lon: 80.2, agency: "ISRO",
    costFactor: 0.5, investorFactor: 0.8, grantFactor: 0.9, missionBonus: 0.1,
    fact: "A ISRO é famosa por missões baratas, como a sonda que pousou perto do polo sul da Lua.",
  },
  {
    id: "JP", name: "Japão", iso: "392", site: "Tanegashima", lat: 30.4, lon: 131.0, agency: "JAXA",
    costFactor: 1.1, investorFactor: 0.9, grantFactor: 1.0, missionBonus: 0.05,
    fact: "Tanegashima é chamada de a base de lançamento mais bonita do mundo.",
  },
  {
    id: "NZ", name: "Nova Zelândia", iso: "554", site: "Península de Mahia", lat: -39.3, lon: 177.9, agency: "Agência Espacial da Nova Zelândia",
    costFactor: 0.9, investorFactor: 0.7, grantFactor: 0.7, missionBonus: 0.05,
    fact: "É de lá que voa o Electron, da Rocket Lab: prova de que um país pequeno pode ter foguetes.",
  },
  {
    id: "UK", name: "Reino Unido", iso: "826", site: "SaxaVord (Shetland)", lat: 60.8, lon: -0.8, agency: "UK Space Agency",
    costFactor: 1.1, investorFactor: 1.1, grantFactor: 0.9, missionBonus: 0.05,
    fact: "Bem ao norte: ótimo para órbitas polares, ruim para aproveitar a rotação da Terra.",
  },
  {
    id: "KR", name: "Coreia do Sul", iso: "410", site: "Centro Espacial Naro", lat: 34.4, lon: 127.5, agency: "KASA",
    costFactor: 0.9, investorFactor: 0.9, grantFactor: 1.0, missionBonus: 0.1,
    fact: "A Coreia do Sul colocou o foguete Nuri em órbita com tecnologia própria.",
  },
  {
    id: "AU", name: "Austrália", iso: "036", site: "Bowen (Queensland)", lat: -19.9, lon: 148.2, agency: "Agência Espacial Australiana",
    costFactor: 1.0, investorFactor: 0.8, grantFactor: 0.8, missionBonus: 0.05,
    fact: "Muito espaço vazio e céu limpo: bom lugar para novas bases de lançamento.",
  },
];

export const countryById = (id: CountryId) => COUNTRIES.find((c) => c.id === id) ?? COUNTRIES[0];

/** Velocidade que a rotação da Terra dá de graça na base (m/s, lançando para o leste). */
export const rotationBoostMs = (lat: number) => 465.1 * Math.cos((lat * Math.PI) / 180);
