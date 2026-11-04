"use client";

import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, CanvasTexture, SRGBColorSpace, type Group } from "three";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { COUNTRIES, type Country, type CountryId } from "@/lib/countries";

const W = 2048;
const H = 1024;
const R = 1.6;
const COLORS = { ocean: "#0a2a35", land: "#24474d", available: "#2b7a72", selected: "#2ee6d6", border: "#0b1f26" };

type Shape = Feature<Polygon | MultiPolygon, { name: string }> & { id?: string | number };

const shapes: Shape[] = (() => {
  const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  return (feature(topo, topo.objects.countries) as FeatureCollection<Polygon | MultiPolygon, { name: string }>).features as Shape[];
})();

const toX = (lon: number) => ((lon + 180) / 360) * W;
const toY = (lat: number) => ((90 - lat) / 180) * H;

/** Desenha os anéis "desdobrando" a longitude, e repete deslocado para cobrir a emenda de ±180°. */
function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
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

const isoToCountry = new Map(COUNTRIES.map((c) => [c.iso, c]));

/** Textura do mapa e um "mapa de ids" escondido para saber em que país se clicou. */
function useMaps(selected: CountryId | null) {
  const idCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = W / 4;
    c.height = H / 4;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.scale(0.25, 0.25);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    shapes.forEach((s) => {
      const country = isoToCountry.get(String(s.id));
      if (!country) return;
      const index = COUNTRIES.indexOf(country) + 1;
      ctx.fillStyle = `rgb(${index * 20},0,0)`;
      drawShape(ctx, s);
      ctx.fill();
    });
    return ctx;
  }, []);

  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = COLORS.ocean;
    ctx.fillRect(0, 0, W, H);
    // Grade de latitude/longitude.
    ctx.strokeStyle = "rgba(110,234,223,0.08)";
    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) {
      ctx.beginPath();
      ctx.moveTo(toX(lon), 0);
      ctx.lineTo(toX(lon), H);
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      ctx.moveTo(0, toY(lat));
      ctx.lineTo(W, toY(lat));
      ctx.stroke();
    }
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1.2;
    shapes.forEach((s) => {
      const country = isoToCountry.get(String(s.id));
      ctx.fillStyle = country ? (country.id === selected ? COLORS.selected : COLORS.available) : COLORS.land;
      drawShape(ctx, s);
      ctx.fill();
      ctx.stroke();
    });
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [selected]);

  useEffect(() => () => texture?.dispose(), [texture]);

  const countryAtUv = (u: number, v: number): Country | null => {
    if (!idCanvas) return null;
    const px = Math.floor(u * (W / 4));
    const py = Math.floor((1 - v) * (H / 4));
    const r = idCanvas.getImageData(px, py, 1, 1).data[0];
    const index = Math.round(r / 20);
    return index > 0 ? (COUNTRIES[index - 1] ?? null) : null;
  };

  return { texture, countryAtUv };
}

/** Posição de lat/lon na esfera, no mesmo mapeamento da textura do SphereGeometry. */
function toVec(lat: number, lon: number, r = R): [number, number, number] {
  const phi = ((lon + 180) / 360) * Math.PI * 2;
  const theta = ((90 - lat) / 180) * Math.PI;
  return [-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta)];
}

function Marker({ country, active, onPick }: { country: Country; active: boolean; onPick: (id: CountryId) => void }) {
  const [hover, setHover] = useState(false);
  const pos = toVec(country.lat, country.lon, R * 1.005);
  const ring = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ring.current) {
      const s = 1 + ((clock.elapsedTime * 0.8) % 1) * 1.6;
      ring.current.scale.set(s, s, s);
    }
  });
  return (
    <group position={pos}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onPick(country.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[active ? 0.045 : 0.032, 16, 16]} />
        <meshBasicMaterial color={active ? "#ffc29a" : "#ffffff"} />
      </mesh>
      <group ref={ring}>
        <mesh>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color={active ? "#ffc29a" : "#6eeadf"} transparent opacity={0.25} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      {(hover || active) && (
        <Html center distanceFactor={6} style={{ pointerEvents: "none" }} position={[0, 0.14, 0]}>
          <span className="rounded-lg bg-bg-deep/85 px-2 py-1 text-xs font-semibold whitespace-nowrap text-ink">{country.name}</span>
        </Html>
      )}
    </group>
  );
}

function Earth({ selected, onPick }: { selected: CountryId | null; onPick: (id: CountryId) => void }) {
  const { texture, countryAtUv } = useMaps(selected);
  const tilt = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const target = useMemo(() => {
    const c = COUNTRIES.find((x) => x.id === selected);
    if (!c) return null;
    const phi = ((c.lon + 180) / 360) * Math.PI * 2;
    return { y: Math.PI / 2 - phi, x: (c.lat * Math.PI) / 180 };
  }, [selected]);

  useFrame((_, dt) => {
    if (!spin.current || !tilt.current) return;
    if (!target) {
      spin.current.rotation.y += dt * 0.12;
      tilt.current.rotation.x += (0.3 - tilt.current.rotation.x) * Math.min(1, dt * 2);
      return;
    }
    // Gira pelo caminho mais curto até o país ficar de frente.
    const cur = spin.current.rotation.y;
    const diff = Math.atan2(Math.sin(target.y - cur), Math.cos(target.y - cur));
    spin.current.rotation.y = cur + diff * Math.min(1, dt * 3);
    tilt.current.rotation.x += (target.x - tilt.current.rotation.x) * Math.min(1, dt * 3);
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!e.uv) return;
    const c = countryAtUv(e.uv.x, e.uv.y);
    if (c) {
      e.stopPropagation();
      onPick(c.id);
    }
  };

  return (
    <group ref={tilt}>
      <group ref={spin}>
        <mesh onClick={click}>
          <sphereGeometry args={[R, 96, 64]} />
          {texture && <meshStandardMaterial map={texture} roughness={0.85} metalness={0.05} emissive="#0a2f3a" emissiveIntensity={0.35} />}
        </mesh>
        {COUNTRIES.map((c) => (
          <Marker key={c.id} country={c} active={c.id === selected} onPick={onPick} />
        ))}
      </group>
      <mesh scale={1.06}>
        <sphereGeometry args={[R, 64, 48]} />
        <meshBasicMaterial color="#2ee6d6" transparent opacity={0.08} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Globo 3D: arraste para girar; clique num país destacado (ou no marcador da base). */
export function Globe({ selected, onPick }: { selected: CountryId | null; onPick: (id: CountryId) => void }) {
  return (
    <Canvas camera={{ position: [0, 0, 4.6], fov: 45 }} dpr={[1, 2]} className="!touch-none">
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 3, 5]} intensity={1.4} />
      <pointLight position={[-5, -2, -3]} intensity={20} color="#2ee6d6" />
      <Stars radius={40} depth={20} count={1500} factor={2.5} fade speed={0.4} />
      <Earth selected={selected} onPick={onPick} />
      <OrbitControls enablePan={false} enableZoom minDistance={3.2} maxDistance={7} rotateSpeed={0.6} />
    </Canvas>
  );
}
