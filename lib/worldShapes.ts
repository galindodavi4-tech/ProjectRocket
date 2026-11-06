import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";

/** Contornos dos países (Natural Earth 1:110m, domínio público), embutidos no app. */
export type Shape = Feature<Polygon | MultiPolygon, { name: string }> & { id?: string | number };

export const shapes: Shape[] = (() => {
  const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  return (feature(topo, topo.objects.countries) as FeatureCollection<Polygon | MultiPolygon, { name: string }>).features as Shape[];
})();

/** Desenha um país num mapa equirretangular W×H, sem riscos na emenda de ±180°. */
export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, W: number, H: number) {
  const toX = (lon: number) => ((lon + 180) / 360) * W;
  const toY = (lat: number) => ((90 - lat) / 180) * H;
  const polys = shape.geometry.type === "Polygon" ? [shape.geometry.coordinates] : shape.geometry.coordinates;
  ctx.beginPath();
  for (const poly of polys) {
    for (const ring of poly) {
      let prev = ring[0][0];
      let offset = 0;
      const pts = ring.map(([lon, lat]) => {
        if (lon - prev > 180) offset -= 360;
        else if (prev - lon > 180) offset += 360;
        prev = lon;
        return [lon + offset, lat];
      });
      for (const shift of [-360, 0, 360]) {
        pts.forEach(([lon, lat], i) => (i === 0 ? ctx.moveTo(toX(lon + shift), toY(lat)) : ctx.lineTo(toX(lon + shift), toY(lat))));
        ctx.closePath();
      }
    }
  }
}

/** Mapa "de satélite" simplificado para a Terra vista do foguete: oceano, terra e gelo nos polos. */
export function earthCanvas(W = 2048, H = 1024): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const ocean = ctx.createLinearGradient(0, 0, 0, H);
  ocean.addColorStop(0, "#1b4f7a");
  ocean.addColorStop(0.5, "#1d6aa0");
  ocean.addColorStop(1, "#1b4f7a");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, W, H);
  shapes.forEach((s, i) => {
    const lat = s.geometry.type === "Polygon" ? s.geometry.coordinates[0][0][1] : s.geometry.coordinates[0][0][0][1];
    // Tons de verde a marrom conforme a latitude (desertos perto dos trópicos), gelo nos polos.
    const abs = Math.abs(lat);
    ctx.fillStyle = abs > 65 ? "#e8f0f2" : abs > 15 && abs < 35 && i % 3 === 0 ? "#a88b5a" : i % 2 ? "#3f7a45" : "#4f8a4a";
    drawShape(ctx, s, W, H);
    ctx.fill();
  });
  // Calotas polares.
  ctx.fillStyle = "rgba(240,248,250,0.9)";
  ctx.fillRect(0, 0, W, H * 0.04);
  ctx.fillRect(0, H * 0.94, W, H * 0.06);
  return c;
}
