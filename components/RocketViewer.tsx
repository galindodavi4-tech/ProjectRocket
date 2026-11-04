"use client";

import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ComponentRef } from "react";
import { AdditiveBlending, Color, type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial } from "three";
import { partIds } from "@/lib/parts";
import { defaultGeometry, FLAME_COLORS } from "@/lib/rocketModel";
import type { Part, RocketGeometry, RocketModel } from "@/lib/schemas";

const COLORS = {
  hull: "#d9efec",
  hullUpper: "#eef8f6",
  band: "#123a40",
  engine: "#58787c",
  nose: "#2ee6d6",
  fin: "#14b8a6",
  booster: "#f2f4f3",
  fail: "#ff3b4d",
  hover: "#6eeadf",
  payload: "#d4a83a",
};

/** Altura do foguete na cena, em unidades 3D. */
const SCENE_HEIGHT = 7;
const SPACE = new Color("#04121a");
const SKY = new Color("#5fa8cf");

export type FlightView = {
  altKm: number;
  pitchDeg: number;
  burning: boolean;
  /** Estágio que está queimando (1 = base). */
  activeStage: number;
  boostersAttached: boolean;
  boostersBurning: boolean;
  fairingAttached: boolean;
  exploded: boolean;
  onPad: boolean;
};

type Hover = { part: Part; point: [number, number, number] } | null;

export type RocketViewerHandle = { resetCamera: () => void };

/** Medidas da montagem em unidades da cena, de baixo para cima. */
function layout(geo: RocketGeometry) {
  const nose = geo.diameterM * 1.9;
  const total = geo.stages.reduce((a, s) => a + s.lengthM, 0) + nose;
  const k = SCENE_HEIGHT / total;
  let y = 0;
  const stages = geo.stages.map((s, i) => {
    const length = s.lengthM * k;
    const engineH = Math.min(length * 0.3, geo.diameterM * k * (i === 0 ? 0.42 : 0.5));
    const seg = { index: i, bottom: y, length, engineH, ...s };
    y += length;
    return seg;
  });
  return { k, r: (geo.diameterM / 2) * k, stages, noseBottom: y, noseH: nose * k, total: y + nose * k };
}

/** Posições dos sinos dos motores na base do estágio. */
function bellLayout(count: number, r: number, vacuum: boolean) {
  if (count === 1) return { bellR: r * (vacuum ? 0.8 : 0.55), spots: [[0, 0]] as [number, number][] };
  const spots: [number, number][] = [];
  const rings: [number, number][] =
    count <= 8 ? [[count, r * 0.6]] : count <= 13 ? [[1, 0], [count - 1, r * 0.68]] : [[1, 0], [Math.round((count - 1) / 3), r * 0.38], [count - 1 - Math.round((count - 1) / 3), r * 0.76]];
  let outer = 0;
  for (const [n, rr] of rings) {
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2;
      spots.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    if (rr > 0) outer = Math.max(outer, (Math.PI * rr) / n);
  }
  const bellR = Math.min(r * 0.42, outer * 0.92);
  return { bellR, spots };
}

type MeshProps = {
  part: Part | undefined;
  hovered: boolean;
  onHover?: (h: Hover) => void;
  baseColor: string;
  ghost?: boolean;
  metal?: number;
  children: React.ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
};

/** Uma malha do foguete. Peça reprovada fica vermelha e pulsa (emissivo). */
function PartMesh({ part, hovered, onHover, baseColor, ghost, metal = 0.55, children, position, rotation }: MeshProps) {
  const mat = useRef<MeshStandardMaterial>(null);
  const failed = part?.status === "fail";
  useFrame(({ clock }) => {
    if (mat.current && failed) mat.current.emissiveIntensity = 0.55 + Math.sin(clock.elapsedTime * 3) * 0.35;
  });
  const handlers =
    part && onHover
      ? {
          onPointerMove: (e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            onHover({ part, point: [e.point.x, e.point.y, e.point.z] });
          },
          onPointerOut: () => onHover(null),
        }
      : {};
  return (
    <mesh position={position} rotation={rotation} castShadow {...handlers}>
      {children}
      <meshStandardMaterial
        ref={mat}
        color={failed ? COLORS.fail : hovered ? COLORS.hover : baseColor}
        emissive={failed ? "#ff2236" : hovered ? "#0f8f86" : "#000000"}
        emissiveIntensity={failed ? 0.6 : 0.35}
        metalness={metal}
        roughness={0.38}
        transparent={ghost}
        opacity={ghost ? 0.35 : 1}
        wireframe={ghost}
      />
    </mesh>
  );
}

/** Chama de um motor: núcleo claro e envelope colorido, tremendo; cresce no vácuo. */
function Flame({ radius, length, colors, x, z, y }: { radius: number; length: number; colors: { core: string; outer: string }; x: number; z: number; y: number }) {
  const outer = useRef<Mesh>(null);
  const inner = useRef<Mesh>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    const f = 1 + Math.sin(clock.elapsedTime * 38 + seed) * 0.06 + Math.sin(clock.elapsedTime * 23 + seed * 2) * 0.05;
    if (outer.current) outer.current.scale.set(1, f, 1);
    if (inner.current) inner.current.scale.set(1, 2 - f, 1);
  });
  return (
    <group position={[x, y, z]}>
      <mesh ref={outer} position={[0, -length / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[radius, length, 20, 1, true]} />
        <meshBasicMaterial color={colors.outer} transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={inner} position={[0, -length * 0.22, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[radius * 0.55, length * 0.45, 16, 1, true]} />
        <meshBasicMaterial color={colors.core} transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

type AssemblyProps = {
  model: RocketModel;
  geo: RocketGeometry;
  spread: number;
  hover: Hover;
  onHover?: (h: Hover) => void;
  flight: FlightView | null;
};

/** O foguete montado. Em voo, só aparecem os estágios que ainda estão presos. */
function Assembly({ model, geo, spread, hover, onHover, flight }: AssemblyProps) {
  const byId = useMemo(() => new Map(model.parts.map((p) => [p.id, p])), [model.parts]);
  const L = useMemo(() => layout(geo), [geo]);
  const isHovered = (id: string) => hover?.part.id === id;
  const firstStage = flight ? Math.min(flight.activeStage, geo.stages.length) - 1 : 0;
  const gap = flight ? 0 : spread;

  const finsPart = byId.get(partIds.fins);
  const showFins = geo.stability === "fins" || finsPart?.status === "fail";
  const pieces: React.ReactNode[] = [];
  let y = 0;
  let flameY = 0;
  let flameStage: (typeof L.stages)[number] | null = null;

  for (const s of L.stages) {
    if (s.index < firstStage) continue;
    const stageNo = s.index + 1;
    const tankId = partIds.tank(stageNo);
    const enginesId = partIds.engines(stageNo);
    const { bellR, spots } = bellLayout(s.engineCount, L.r, s.vacuumEngine);
    const bellH = s.engineH;
    if (s.index === firstStage) {
      flameY = y;
      flameStage = s;
    }
    spots.forEach(([bx, bz], b) =>
      pieces.push(
        <PartMesh key={`${enginesId}-${b}`} part={byId.get(enginesId)} hovered={isHovered(enginesId)} onHover={onHover} baseColor={COLORS.engine}
          position={[bx, y + bellH / 2, bz]}>
          <cylinderGeometry args={[bellR * 0.45, bellR, bellH, 18, 1, true]} />
        </PartMesh>,
      ),
    );
    const tankH = s.length - bellH;
    pieces.push(
      <PartMesh key={tankId} part={byId.get(tankId)} hovered={isHovered(tankId)} onHover={onHover}
        baseColor={s.index === 0 ? COLORS.hull : COLORS.hullUpper} position={[0, y + bellH + gap + tankH / 2, 0]}>
        <cylinderGeometry args={[L.r, L.r, tankH, 40]} />
      </PartMesh>,
    );
    // Faixa escura no topo de cada estágio (interestágio).
    pieces.push(
      <mesh key={`band-${s.index}`} position={[0, y + bellH + gap + tankH - L.r * 0.15, 0]}>
        <cylinderGeometry args={[L.r * 1.01, L.r * 1.01, L.r * 0.3, 40]} />
        <meshStandardMaterial color={COLORS.band} metalness={0.3} roughness={0.6} />
      </mesh>,
    );

    if (s.index === 0 && showFins && firstStage === 0) {
      for (let f = 0; f < 4; f++) {
        const a = (f / 4) * Math.PI * 2 + Math.PI / 4;
        const dist = L.r * 1.55 + gap * 0.5;
        pieces.push(
          <PartMesh key={`fin-${f}`} part={finsPart} hovered={isHovered(partIds.fins)} onHover={onHover} baseColor={COLORS.fin}
            ghost={geo.stability !== "fins"} position={[Math.cos(a) * dist, y + bellH + L.r * 1.1, Math.sin(a) * dist]} rotation={[0, -a, 0]}>
            <boxGeometry args={[L.r * 1.1, L.r * 2.2, L.r * 0.08]} />
          </PartMesh>,
        );
      }
    }
    y += s.length + gap;
  }

  // Propulsores laterais presos ao 1º estágio.
  const boosterNodes: React.ReactNode[] = [];
  if (geo.boosters && firstStage === 0 && (!flight || flight.boostersAttached)) {
    const bd = geo.boosters.diameterM * L.k;
    const bl = Math.min(geo.boosters.lengthM * L.k, L.stages[0].length * 1.1);
    for (let b = 0; b < geo.boosters.count; b++) {
      const a = (b / geo.boosters.count) * Math.PI * 2;
      const dist = L.r + bd / 2 + gap * 0.6;
      const bx = Math.cos(a) * dist;
      const bz = Math.sin(a) * dist;
      boosterNodes.push(
        <group key={`booster-${b}`} position={[bx, 0, bz]}>
          <PartMesh part={byId.get(partIds.boosters)} hovered={isHovered(partIds.boosters)} onHover={onHover} baseColor={COLORS.booster} position={[0, bl / 2 + bd * 0.3, 0]}>
            <cylinderGeometry args={[bd / 2, bd / 2, bl, 24]} />
          </PartMesh>
          <PartMesh part={byId.get(partIds.boosters)} hovered={isHovered(partIds.boosters)} onHover={onHover} baseColor={COLORS.booster} position={[0, bl + bd * 0.3 + bd * 0.5, 0]}>
            <coneGeometry args={[bd / 2, bd, 24]} />
          </PartMesh>
          <mesh position={[0, bd * 0.15, 0]}>
            <cylinderGeometry args={[bd * 0.28, bd * 0.42, bd * 0.3, 16, 1, true]} />
            <meshStandardMaterial color={COLORS.engine} metalness={0.5} roughness={0.4} />
          </mesh>
          {flight?.boostersBurning && <Flame radius={bd * 0.45} length={bd * 4} colors={FLAME_COLORS.solid} x={0} z={0} y={0} />}
        </group>,
      );
    }
  }

  // Coifa (ou a carga exposta depois que a coifa sai).
  const noseY = y;
  const fairingOn = !flight || flight.fairingAttached;
  const cylH = L.noseH * 0.42;
  const coneH = L.noseH - cylH;
  const nose = fairingOn ? (
    <group key="nose">
      <PartMesh part={byId.get(partIds.nose)} hovered={isHovered(partIds.nose)} onHover={onHover} baseColor={COLORS.hullUpper} position={[0, noseY + cylH / 2, 0]}>
        <cylinderGeometry args={[L.r, L.r, cylH, 40]} />
      </PartMesh>
      <PartMesh part={byId.get(partIds.nose)} hovered={isHovered(partIds.nose)} onHover={onHover} baseColor={COLORS.nose} position={[0, noseY + cylH + coneH / 2, 0]}>
        <coneGeometry args={[L.r, coneH, 40]} />
      </PartMesh>
    </group>
  ) : (
    <mesh key="payload" position={[0, noseY + L.r * 0.6, 0]}>
      <boxGeometry args={[L.r * 1.1, L.r * 1.2, L.r * 1.1]} />
      <meshStandardMaterial color={COLORS.payload} metalness={0.8} roughness={0.25} emissive="#5a4310" emissiveIntensity={0.3} />
    </mesh>
  );

  // Chamas do estágio ativo.
  const flames: React.ReactNode[] = [];
  if (flight?.burning && flameStage) {
    const colors = FLAME_COLORS[flameStage.propellant];
    const { bellR, spots } = bellLayout(flameStage.engineCount, L.r, flameStage.vacuumEngine);
    const grow = 1 + 3.5 * Math.min(1, flight.altKm / 70);
    const len = L.r * 3.2 * grow;
    spots.forEach(([bx, bz], i) =>
      flames.push(<Flame key={`flame-${i}`} radius={bellR * (0.9 + 0.5 * Math.min(1, flight.altKm / 70))} length={len} colors={colors} x={bx} z={bz} y={flameY} />),
    );
  }

  // Centraliza o que sobrou do foguete.
  const bottom = firstStage > 0 ? L.stages[firstStage].bottom : 0;
  const top = noseY + (fairingOn ? L.noseH : L.r * 1.2);
  return (
    <group position={[0, -(bottom + top) / 2, 0]}>
      {pieces}
      {boosterNodes}
      {nose}
      {flames}
      {flight?.burning && <pointLight position={[0, flameY - L.r * 2, 0]} intensity={60} distance={12} color={flameStage ? FLAME_COLORS[flameStage.propellant].outer : "#ff8a3d"} />}
    </group>
  );
}

type Debris = { id: number; kind: "stage" | "booster" | "fairing"; born: number; size: [number, number]; dir: number };

/** Peças que se soltam: caem, giram e somem em alguns segundos. */
function DebrisField({ items }: { items: Debris[] }) {
  const refs = useRef<Map<number, Group>>(new Map());
  useFrame(() => {
    const now = performance.now();
    for (const d of items) {
      const g = refs.current.get(d.id);
      if (!g) continue;
      const tau = (now - d.born) / 1000;
      const out = d.kind === "stage" ? 0.15 : 1.4;
      g.position.set(Math.cos(d.dir) * out * tau, -1.4 * tau * tau - 1 * tau, Math.sin(d.dir) * out * tau);
      g.rotation.set(0.25 * tau * Math.sin(d.dir), 0, 0.6 * tau * Math.cos(d.dir));
      g.visible = tau < 6;
    }
  });
  return (
    <group>
      {items.map((d) => (
        <group key={d.id} ref={(g) => { if (g) refs.current.set(d.id, g); else refs.current.delete(d.id); }}>
          <mesh>
            {d.kind === "fairing" ? <coneGeometry args={[d.size[0], d.size[1], 20, 1, true, d.dir, Math.PI]} /> : <cylinderGeometry args={[d.size[0], d.size[0], d.size[1], 24]} />}
            <meshStandardMaterial color={d.kind === "fairing" ? COLORS.nose : COLORS.hull} metalness={0.5} roughness={0.4} side={2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Explosão: clarão e estilhaços voando. */
function Explosion() {
  const born = useMemo(() => performance.now(), []);
  const bits = useMemo(
    () => Array.from({ length: 36 }, () => ({ v: [(Math.random() - 0.5) * 6, (Math.random() - 0.3) * 5, (Math.random() - 0.5) * 6], s: 0.08 + Math.random() * 0.22, spin: Math.random() * 6 })),
    [],
  );
  const group = useRef<Group>(null);
  const flash = useRef<Mesh>(null);
  useFrame(() => {
    const tau = (performance.now() - born) / 1000;
    group.current?.children.forEach((c, i) => {
      const b = bits[i];
      c.position.set(b.v[0] * tau, b.v[1] * tau - 2 * tau * tau, b.v[2] * tau);
      c.rotation.set(b.spin * tau, b.spin * tau * 0.7, 0);
    });
    if (flash.current) {
      const s = 0.5 + tau * 5;
      flash.current.scale.set(s, s, s);
      (flash.current.material as MeshBasicMaterial).opacity = Math.max(0, 0.9 - tau * 0.7);
    }
  });
  return (
    <group>
      <mesh ref={flash}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight intensity={200} distance={30} color="#ff8a3d" />
      <group ref={group}>
        {bits.map((b, i) => (
          <mesh key={i}>
            <boxGeometry args={[b.s, b.s * 0.6, b.s * 0.3]} />
            <meshStandardMaterial color={i % 3 ? "#cfd8d6" : "#ff5a36"} emissive={i % 3 ? "#000" : "#ff3300"} emissiveIntensity={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Céu que escurece com a altitude, chão que se afasta, nuvens e a Terra lá embaixo. */
function Environment({ flight, rocketBottom }: { flight: FlightView | null; rocketBottom: number }) {
  const { scene } = useThree();
  const earth = useRef<Group>(null);
  const ground = useRef<Group>(null);
  const clouds = useRef<Group>(null);
  const cloudSeeds = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({ h: 1.5 + (i % 8) * 0.9, x: Math.sin(i * 7.1) * 7, z: -3 - (i % 5) * 2.2, s: 1 + (i % 3) * 0.7 })),
    [],
  );

  useFrame(() => {
    const alt = flight?.altKm ?? 0;
    if (!scene.background || !(scene.background instanceof Color)) scene.background = new Color();
    const bg = scene.background as Color;
    if (!flight) bg.copy(SPACE);
    else bg.lerpColors(SKY, SPACE, Math.min(1, Math.pow(alt / 55, 0.7)));

    if (ground.current) {
      const altM = alt * 1000;
      const drop = 70 * (1 - Math.exp(-(altM * 0.03) / 70));
      ground.current.position.y = rocketBottom - drop;
      ground.current.visible = !flight || alt < 6;
    }
    if (clouds.current) {
      clouds.current.visible = !!flight && alt < 14;
      clouds.current.children.forEach((c, i) => {
        const seed = cloudSeeds[i];
        c.position.set(seed.x, (seed.h - alt) * 4, seed.z);
      });
    }
    if (earth.current) {
      const a = Math.min(1, alt / 300);
      earth.current.visible = !!flight && alt > 12;
      earth.current.position.set(0, -92 - 6 * a, -75);
    }
  });

  return (
    <>
      <group ref={ground}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[60, 64]} />
          <meshStandardMaterial color={flight ? "#2c4a3a" : "#0e3038"} metalness={0.1} roughness={0.9} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[2.4, 48]} />
          <meshStandardMaterial color="#5d6f70" metalness={0.3} roughness={0.7} />
        </mesh>
        {flight && (
          <mesh position={[2.6, SCENE_HEIGHT * 0.55, 0]}>
            <boxGeometry args={[0.35, SCENE_HEIGHT * 1.1, 0.35]} />
            <meshStandardMaterial color="#8a2a22" metalness={0.4} roughness={0.6} wireframe />
          </mesh>
        )}
      </group>
      <group ref={clouds}>
        {cloudSeeds.map((c, i) => (
          <mesh key={i} scale={[c.s * 2.2, c.s * 0.6, c.s]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.55} roughness={1} />
          </mesh>
        ))}
      </group>
      <group ref={earth}>
        <mesh>
          <sphereGeometry args={[90, 96, 64]} />
          <meshStandardMaterial color="#1d5f8f" emissive="#0a2f4a" emissiveIntensity={0.6} roughness={0.8} />
        </mesh>
        <mesh scale={1.025}>
          <sphereGeometry args={[90, 96, 64]} />
          <meshBasicMaterial color="#6fd3ff" transparent opacity={0.18} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}

/** Cartão flutuante com o nome da peça e o motivo da falha, no ponto do cursor. */
function Tooltip({ hover }: { hover: Hover }) {
  if (!hover) return null;
  const { part, point } = hover;
  return (
    <Html position={point} style={{ pointerEvents: "none" }} zIndexRange={[20, 0]}>
      <div className="ds-card w-56 -translate-x-1/2 -translate-y-[calc(100%+14px)] !rounded-2xl px-3.5 py-2.5 text-xs">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <span className={`size-2 rounded-full ${part.status === "fail" ? "bg-danger" : "bg-success"}`} />
          {part.label}
        </p>
        <p className="mt-1 text-ink-muted">{part.reason ?? (part.status === "fail" ? "Reprovada" : "Sem problemas")}</p>
      </div>
    </Html>
  );
}

/** Gira devagar na vitrine; em voo, inclina conforme a trajetória e treme na decolagem. */
function Pose({ children, flight }: { children: React.ReactNode; flight: FlightView | null }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (!flight) {
      g.rotation.z = 0;
      g.rotation.y += dt * 0.25;
      g.position.set(0, 0, 0);
      return;
    }
    // Inclina para a direita (leste), como a trajetória; sem girar em torno do eixo.
    const tilt = -((90 - Math.max(0, Math.min(90, flight.pitchDeg))) * Math.PI) / 180;
    g.rotation.y = 0;
    g.rotation.z += (tilt * 0.85 - g.rotation.z) * Math.min(1, dt * 3);
    const shake = flight.burning && flight.altKm < 1.5 ? 0.025 : 0;
    g.position.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0);
  });
  return <group ref={ref}>{children}</group>;
}

type Props = { model: RocketModel; spread: number; flight: FlightView | null };

/** Visualizador 3D: vitrine do projeto (girar, zoom, peças) e animação do lançamento. */
export const RocketViewer = forwardRef<RocketViewerHandle, Props>(function RocketViewer({ model, spread, flight }, ref) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [hover, setHover] = useState<Hover>(null);
  const geo = useMemo(() => model.geometry ?? defaultGeometry(model), [model]);
  const L = useMemo(() => layout(geo), [geo]);
  useImperativeHandle(ref, () => ({ resetCamera: () => controls.current?.reset() }), []);

  // Peças que se soltam durante o voo.
  const [debris, setDebris] = useState<Debris[]>([]);
  const prev = useRef<FlightView | null>(null);
  const nextId = useRef(1);
  useEffect(() => {
    const p = prev.current;
    prev.current = flight;
    if (!flight) {
      setDebris([]);
      return;
    }
    if (!p) return;
    const born = performance.now();
    const add: Debris[] = [];
    if (flight.activeStage > p.activeStage && p.activeStage <= geo.stages.length) {
      const s = L.stages[p.activeStage - 1];
      if (s) add.push({ id: nextId.current++, kind: "stage", born, size: [L.r, s.length], dir: Math.random() * 6 });
    }
    if (p.boostersAttached && !flight.boostersAttached && geo.boosters) {
      for (let b = 0; b < geo.boosters.count; b++) {
        add.push({ id: nextId.current++, kind: "booster", born, size: [(geo.boosters.diameterM * L.k) / 2, geo.boosters.lengthM * L.k], dir: (b / geo.boosters.count) * Math.PI * 2 });
      }
    }
    if (p.fairingAttached && !flight.fairingAttached) {
      add.push({ id: nextId.current++, kind: "fairing", born, size: [L.r, L.noseH], dir: 0 });
      add.push({ id: nextId.current++, kind: "fairing", born, size: [L.r, L.noseH], dir: Math.PI });
    }
    if (add.length) setDebris((d) => [...d.filter((x) => born - x.born < 6000), ...add]);
  }, [flight, geo, L]);

  const flying = !!flight;
  return (
    <Canvas shadows camera={{ position: [6.5, 2.5, 10], fov: 42 }} dpr={[1, 2]} className="!touch-none">
      {!flying && <fog attach="fog" args={["#04121a", 18, 40]} />}
      <ambientLight intensity={flying ? 0.7 : 0.45} />
      <directionalLight position={[5, 8, 5]} intensity={1.6} castShadow />
      <pointLight position={[-4, 2, -3]} intensity={30} color="#2ee6d6" />
      <pointLight position={[3, -3, 4]} intensity={18} color="#ffc29a" />
      {(!flying || (flight?.altKm ?? 0) > 25) && <Stars radius={60} depth={30} count={2200} factor={3} fade speed={0.6} />}
      <Environment flight={flight} rocketBottom={-SCENE_HEIGHT / 2} />
      {flight?.exploded ? (
        <Explosion />
      ) : (
        <Pose flight={flight}>
          <Assembly model={model} geo={geo} spread={spread} hover={hover} onHover={flying ? undefined : setHover} flight={flight} />
        </Pose>
      )}
      <DebrisField items={debris} />
      {!flying && <Tooltip hover={hover} />}
      <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={4} maxDistance={30} />
    </Canvas>
  );
});
