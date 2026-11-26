// The round wooden Jackaroo board on the table, and the marbles that hop from groove to groove.
// Grooves are painted into one texture plus a matching height map that carves them in (cheap),
// and marbles sit sunk into them.
import * as THREE from 'three';
import { blobTexture } from './textures';
import { BASE, HOME, type Player, TRACK, entranceOf, ownerOf, startOf } from '../domain/board';
import { TABLE_HEIGHT } from './majlis';

export const BOARD_RADIUS = 0.7;
const THICKNESS = 0.035;
export const BOARD_TOP = TABLE_HEIGHT + THICKNESS;
const TEX = 512; // drawing units; the canvas is SHARP times larger
const SHARP = 4;
const HOLE = 0.028; // groove radius, as a fraction of the board radius
const MARBLE = HOLE * BOARD_RADIUS * 0.85;
export const PLAYER_COLORS = ['#d63a3a', '#3a72d6', '#e0b52a', '#2f9e55'];

// Seat p sits on the side the board's angle p*90° points at, so your own start is right in
// front of you. Tiles run from your start toward the player on your right.
const tileAngle = (tile: number) => Math.PI / 2 - (tile / TRACK) * Math.PI * 2;
const polar = (angle: number, r: number): [number, number] => [Math.cos(angle) * r, Math.sin(angle) * r];

/** Where a marble sits, in board units (-1..1 on x and z). */
export function holeAt(pos: number, marble: number): [number, number] {
  const owner = ownerOf(marble);
  if (pos >= HOME) return polar(tileAngle(entranceOf(owner)), 0.77 - (pos - HOME) * 0.09);
  if (pos === BASE) return baseHole(owner, marble % 4);
  return polar(tileAngle(pos), 0.86);
}

function baseHole(owner: Player, i: number): [number, number] {
  const a = tileAngle(startOf(owner)) - 0.13 - (i % 2) * 0.11;
  return polar(a, i < 2 ? 0.7 : 0.6);
}

/**
 * The board's face. With `height` it draws the matching bump map instead: mid grey wood, grooves
 * deep in the middle, numbers and the outer ring lightly engraved.
 */
function boardTexture(height = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEX * SHARP;
  const g = canvas.getContext('2d')!;
  g.scale(SHARP, SHARP);
  const px = (n: number) => ((n + 1) / 2) * TEX;
  const size = (n: number) => (n / 2) * TEX;
  const engraved = '#5c5c5c';

  // Dark wood with wavy grain.
  g.fillStyle = height ? '#808080' : '#3b2415';
  g.fillRect(0, 0, TEX, TEX);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < TEX; y += 0.7 + rnd() * 2.5) {
    g.strokeStyle = height ? `rgba(0,0,0,${rnd() * 0.08})` : `rgba(0,0,0,${0.05 + rnd() * 0.15})`;
    g.lineWidth = 0.3 + rnd() * 0.9;
    const wave = rnd() * 2;
    const phase = rnd() * 6;
    g.beginPath();
    for (let x = 0; x <= TEX; x += 8) g.lineTo(x, y + Math.sin(x / 40 + phase) * wave);
    g.stroke();
  }
  g.strokeStyle = height ? engraved : '#8a5a30';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(TEX / 2, TEX / 2, size(0.985), 0, Math.PI * 2);
  g.stroke();

  const groove = ([x, z]: [number, number], ring?: string) => {
    const cx = px(x);
    const cy = px(z);
    const r = size(HOLE);
    if (height) {
      const dish = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      dish.addColorStop(0, '#000000');
      dish.addColorStop(0.75, '#303030');
      dish.addColorStop(1, '#808080');
      g.fillStyle = dish;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
      return;
    }
    const grad = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    grad.addColorStop(0, '#6b4628'); // shadowed far side of the dish
    grad.addColorStop(0.7, '#c99a64'); // lighter wood exposed by drilling
    grad.addColorStop(1, '#e0b47a');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    if (ring) {
      g.strokeStyle = ring;
      g.lineWidth = 2.5;
      g.stroke();
    }
  };

  g.fillStyle = '#d9a46a';
  g.font = `bold ${Math.round(size(0.034))}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let t = 0; t < TRACK; t++) {
    const owner = [0, 1, 2, 3].find((p) => startOf(p as Player) === t);
    groove(polar(tileAngle(t), 0.86), owner === undefined ? undefined : PLAYER_COLORS[owner]);
    const [lx, lz] = polar(tileAngle(t), 0.945);
    g.fillStyle = height ? engraved : '#d9a46a';
    g.fillText(String((t % 18) + 1), px(lx), px(lz));
  }
  for (let p = 0; p < 4; p++) {
    for (let h = 0; h < 4; h++) groove(holeAt(HOME + h, p * 4), PLAYER_COLORS[p]);
    for (let b = 0; b < 4; b++) groove(baseHole(p as Player, b), PLAYER_COLORS[p] + '88');
  }

  // Centre medallion: an eight-point star.
  const star = (r: number, color: string) => {
    g.fillStyle = color;
    for (const rot of [0, Math.PI / 4]) {
      g.save();
      g.translate(TEX / 2, TEX / 2);
      g.rotate(rot);
      g.fillRect(-size(r), -size(r), size(r) * 2, size(r) * 2);
      g.restore();
    }
  };
  star(0.2, height ? '#8c8c8c' : '#8a5a30'); // a raised inlay
  star(0.16, height ? '#707070' : '#2a180d');
  star(0.08, height ? '#909090' : '#c99a64');

  const tex = new THREE.CanvasTexture(canvas);
  if (!height) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** A glass marble's colour with two pale swirls through it. */
function marbleTexture(color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const g = canvas.getContext('2d')!;
  g.fillStyle = color;
  g.fillRect(0, 0, 128, 64);
  g.lineCap = 'round';
  for (const [alpha, shift, width] of [
    [0.55, 0, 5],
    [0.3, 40, 3],
  ] as const) {
    g.strokeStyle = `rgba(255,250,235,${alpha})`;
    g.lineWidth = width;
    g.beginPath();
    for (let x = 0; x <= 128; x += 4) g.lineTo(x, 32 + Math.sin((x + shift) / 13) * 18);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface Hop {
  from: THREE.Vector3;
  to: THREE.Vector3;
  start: number;
  duration: number;
  height: number;
}

const HOP_MS = 110;
/** World position of a marble sitting in a hole. */
export const holeWorld = (pos: number, marble: number) => toWorld(holeAt(pos, marble));
const toWorld = ([x, z]: [number, number]) =>
  new THREE.Vector3(x * BOARD_RADIUS, BOARD_TOP + MARBLE * 0.45, z * BOARD_RADIUS);

/** The positions a marble passes through, hole by hole, or null when it jumps (exit, kill, swap). */
export function route(from: number, to: number, owner: Player): number[] | null {
  if (from === BASE || to === BASE) return null;
  for (const dir of [1, -1]) {
    const path: number[] = [];
    let cur = from;
    for (let i = 0; i < 14; i++) {
      if (dir < 0) cur = cur >= HOME ? -99 : (cur - 1 + TRACK) % TRACK;
      else if (cur >= HOME) cur += 1;
      else if (cur === entranceOf(owner) && to >= HOME) cur = HOME;
      else cur = (cur + 1) % TRACK;
      path.push(cur);
      if (cur === to) return path;
    }
  }
  return null;
}

export class Board {
  readonly group = new THREE.Group();
  private marbles: THREE.Mesh[] = [];
  private positions: number[] = Array<number>(16).fill(BASE);
  private hops: Hop[][] = Array.from({ length: 16 }, () => []);
  /** Called with the marble number whenever a marble settles into a groove (for sounds later). */
  onLand: (marble: number, final: boolean) => void = () => {};
  /** Called the moment a killed marble is knocked off (when the killer lands). */
  onKill: () => void = () => {};

  /** `blobs`: soft fake shadows under the marbles, for Low graphics where real shadows are off. */
  constructor(blobs: boolean) {
    const wood = new THREE.MeshStandardMaterial({ color: '#4a2c18', roughness: 0.45 });
    const top = new THREE.MeshStandardMaterial({
      map: boardTexture(),
      bumpMap: boardTexture(true),
      bumpScale: 4,
      roughness: 0.8, // oiled, not lacquered: a glossy face glares under the table spotlight
    });
    // The board's edge: tapered sides and a rounded top lip, open in the middle for the face.
    const R = BOARD_RADIUS;
    const edge = [
      [R * 0.97, TABLE_HEIGHT],
      [R, TABLE_HEIGHT + 0.008],
      [R + 0.004, BOARD_TOP - 0.012],
      [R + 0.003, BOARD_TOP - 0.004],
      [R, BOARD_TOP - 0.0005],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const body = new THREE.Mesh(new THREE.LatheGeometry(edge, 96), wood);
    const face = new THREE.Mesh(new THREE.CircleGeometry(BOARD_RADIUS, 96), top);
    face.rotation.x = -Math.PI / 2;
    face.position.y = BOARD_TOP; // the cylinder is open-ended so the face cannot z-fight with its cap
    this.group.add(body, face);

    const geometry = new THREE.SphereGeometry(MARBLE, 32, 20);
    const swirls = PLAYER_COLORS.map(marbleTexture);
    // Every marble shows its swirl turned a different way (clones share the same image).
    const swirl = (m: number) => {
      const tex = swirls[ownerOf(m)]!.clone();
      tex.wrapS = THREE.RepeatWrapping;
      tex.offset.x = m * 0.27;
      return tex;
    };
    const blob = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false });
    const blobGeometry = new THREE.PlaneGeometry(MARBLE * 3.2, MARBLE * 3.2).rotateX(-Math.PI / 2);
    for (let m = 0; m < 16; m++) {
      // Glassy, with a clear coat: the room shows in it through the environment map.
      const material = new THREE.MeshPhysicalMaterial({
        map: swirl(m),
        roughness: 0.15,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      });
      const mesh = new THREE.Mesh(geometry, material);
      if (blobs) {
        const shadow = new THREE.Mesh(blobGeometry, blob);
        shadow.position.y = -MARBLE + 0.001;
        mesh.add(shadow);
      }
      mesh.position.copy(toWorld(holeAt(BASE, m)));
      mesh.userData.marble = m;
      this.marbles.push(mesh);
      this.group.add(mesh);
    }
  }

  private ends: number[] = Array<number>(16).fill(0);

  /** Move marbles to a new game state, animating each one along its path. Killed marbles fly home last. */
  setPositions(next: readonly number[], now = performance.now()): void {
    let latest = now;
    const killed: number[] = [];
    next.forEach((to, m) => {
      if (this.positions[m] === to) return;
      if (to === BASE) killed.push(m);
      else latest = Math.max(latest, this.queueMove(m, to, now));
    });
    for (const m of killed) this.queueMove(m, BASE, latest);
    if (killed.length) setTimeout(() => this.onKill(), latest - now);
  }

  /** Queue a marble's hops after `after`; returns when it lands. */
  private queueMove(m: number, to: number, after: number): number {
    const steps = route(this.positions[m]!, to, ownerOf(m));
    const queue = this.hops[m]!;
    let at = queue.at(-1)?.to ?? this.marbles[m]!.position.clone();
    let start = Math.max(after, this.ends[m]!);
    for (const pos of steps ?? [to]) {
      const target = toWorld(holeAt(pos, m));
      const duration = steps ? HOP_MS : HOP_MS * 4;
      queue.push({ from: at, to: target, start, duration, height: steps ? 0.02 : 0.12 });
      at = target;
      start += duration;
    }
    this.positions[m] = to;
    this.ends[m] = start;
    return start;
  }

  private lit = new Set<number>();

  /** Marble meshes, for clicking. Each has `userData.marble`. */
  marbleMeshes(): THREE.Object3D[] {
    return this.marbles;
  }

  /** Make these marbles glow (the ones the chosen card can move). */
  highlight(marbles: Iterable<number>): void {
    this.lit = new Set(marbles);
    this.marbles.forEach((mesh, m) => {
      if (!this.lit.has(m)) (mesh.material as THREE.MeshPhysicalMaterial).emissive.setScalar(0);
    });
  }

  update(now = performance.now()): void {
    const glow = 0.25 + Math.sin(now / 150) * 0.15;
    for (const m of this.lit)
      (this.marbles[m]!.material as THREE.MeshPhysicalMaterial).emissive.setRGB(glow, glow * 0.8, glow * 0.4);
    this.hops.forEach((queue, m) => {
      const hop = queue[0];
      if (!hop || now < hop.start) return;
      const t = Math.min(1, (now - hop.start) / hop.duration);
      const mesh = this.marbles[m]!;
      mesh.position.lerpVectors(hop.from, hop.to, t);
      mesh.position.y += Math.sin(t * Math.PI) * hop.height;
      if (t === 1) {
        queue.shift();
        this.onLand(m, queue.length === 0);
      }
    });
  }
}
