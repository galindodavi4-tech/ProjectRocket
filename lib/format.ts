const nf = (d: number) => (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });

export const num = (n: number, d = 0) => nf(d)(n);

/** "850 kg", "12,5 t", "2.160 t". */
export function mass(kg: number) {
  if (kg >= 100_000) return `${num(kg / 1000)} t`;
  if (kg >= 1000) return `${num(kg / 1000, 1)} t`;
  return `${num(kg)} kg`;
}

/** "845 kN", "7,6 MN". */
export function force(n: number) {
  return n >= 1e7 ? `${num(n / 1e6, 1)} MN` : `${num(n / 1000)} kN`;
}

export const ORBIT_LABEL = { LEO: "Órbita baixa", GTO: "Geoestacionária (GTO)", Moon: "Lua" } as const;
export const ORBIT_SHORT = { LEO: "LEO", GTO: "GTO", Moon: "Lua" } as const;

export function clock(t: number) {
  const s = Math.max(0, Math.round(t));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
