// The majlis: a warm, well-lit sitting room with floor cushions along the walls, a big carpet,
// a low round table in the middle and a brass chandelier. All geometry is low-poly and made here.
import * as THREE from 'three';
import { brass, carpet, frieze, plaster, sadu, wood } from './textures';

export const ROOM = 7; // the room is 7 x 7 m
const HEIGHT = 3.2;
export const TABLE_HEIGHT = 0.34;
export const TABLE_RADIUS = 0.8;

const lambert = (map: THREE.Texture, color = '#ffffff') => new THREE.MeshLambertMaterial({ map, color });

function repeat(tex: THREE.Texture, x: number, y: number) {
  tex.repeat.set(x, y);
  return tex;
}

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

/** A pointed arch outline (rectangle with an ogee-ish top), used for the wall niches. */
function archShape(width: number, height: number): THREE.Shape {
  const w = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-w, 0);
  shape.lineTo(-w, height - w);
  shape.quadraticCurveTo(-w, height - w * 0.2, 0, height);
  shape.quadraticCurveTo(w, height - w * 0.2, w, height - w);
  shape.lineTo(w, 0);
  shape.lineTo(-w, 0);
  return shape;
}

function walls(group: THREE.Group) {
  const wallMat = lambert(repeat(plaster(), 6, 3));
  const nicheOuter = new THREE.MeshLambertMaterial({ color: '#b08a5c' });
  const nicheInner = new THREE.MeshLambertMaterial({ color: '#7a5634' });
  const friezeMat = lambert(repeat(frieze(), 14, 1));
  const half = ROOM / 2;

  for (let side = 0; side < 4; side++) {
    const wall = new THREE.Group();
    wall.rotation.y = (side * Math.PI) / 2;
    // Walls run past the floor and ceiling so the PS1 vertex snapping can't open cracks at the edges.
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(ROOM + 0.4, HEIGHT + 0.4), wallMat);
    plane.position.set(0, HEIGHT / 2, -half);
    wall.add(plane);

    const band = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, 0.32), friezeMat);
    band.position.set(0, HEIGHT - 0.45, -half + 0.01);
    wall.add(band);

    for (const x of [-2.2, 0, 2.2]) {
      const outer = new THREE.Mesh(new THREE.ShapeGeometry(archShape(1.15, 1.9), 6), nicheOuter);
      outer.position.set(x, 0.75, -half + 0.015);
      const inner = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.95, 1.75), 6), nicheInner);
      inner.position.set(x, 0.8, -half + 0.02);
      wall.add(outer, inner);
    }
    group.add(wall);
  }

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM, ROOM),
    lambert(repeat(wood('#4a2b16', 5), 4, 4)),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = HEIGHT;
  group.add(ceiling);
  const beam = lambert(wood('#3a2010', 6));
  for (const x of [-2.4, -0.8, 0.8, 2.4]) group.add(box(0.18, 0.16, ROOM, beam, x, HEIGHT - 0.08, 0));
}

function floor(group: THREE.Group) {
  const tiles = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM, ROOM),
    lambert(repeat(plaster(), 10, 10), '#9c7a58'),
  );
  tiles.rotation.x = -Math.PI / 2;
  group.add(tiles);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), lambert(carpet()));
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.005;
  group.add(rug);
}

/** Majlis seating: a long floor cushion and back cushions along every wall, with arm bolsters. */
function seating(group: THREE.Group) {
  const seat = lambert(repeat(sadu(3), 6, 1));
  const back = lambert(repeat(sadu(4), 6, 1));
  const bolster = lambert(sadu(7));
  const half = ROOM / 2;
  for (let side = 0; side < 4; side++) {
    const run = new THREE.Group();
    run.rotation.y = (side * Math.PI) / 2;
    run.add(box(ROOM - 1.4, 0.16, 0.75, seat, 0, 0.08, -half + 0.45));
    run.add(box(ROOM - 1.4, 0.5, 0.2, back, 0, 0.4, -half + 0.12));
    for (const x of [-2.4, -0.8, 0.8, 2.4]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 8), bolster);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(x, 0.27, -half + 0.5);
      run.add(arm);
    }
    group.add(run);
  }
}

/** The low round table everyone sits around, plus the 4 floor cushions the players sit on. */
function table(group: THREE.Group) {
  const top = lambert(wood('#7a4522', 8));
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(TABLE_RADIUS, TABLE_RADIUS, 0.05, 24), top);
  tableTop.position.y = TABLE_HEIGHT - 0.025;
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(TABLE_RADIUS - 0.03, TABLE_RADIUS - 0.08, 0.09, 24),
    top,
  );
  rim.position.y = TABLE_HEIGHT - 0.09;
  group.add(tableTop, rim);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    group.add(
      box(
        0.07,
        TABLE_HEIGHT - 0.1,
        0.07,
        top,
        Math.cos(a) * 0.55,
        (TABLE_HEIGHT - 0.1) / 2,
        Math.sin(a) * 0.55,
      ),
    );
  }
  const cushion = lambert(sadu(9));
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const c = box(0.75, 0.12, 0.75, cushion, Math.sin(a) * 1.25, 0.06, Math.cos(a) * 1.25);
    c.rotation.y = a;
    group.add(c);
  }
}

/** Brass chandelier with candle bulbs. Returns the bulbs so they can flicker. */
function chandelier(group: THREE.Group): THREE.Mesh[] {
  const metal = lambert(brass());
  const glow = new THREE.MeshBasicMaterial({ color: '#ffd38a' });
  const top = HEIGHT;
  const hang = 2.25;
  group.add(box(0.025, top - hang - 0.1, 0.025, metal, 0, (top + hang + 0.1) / 2, 0));

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), metal);
  body.position.y = hang;
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 8), metal);
  finial.rotation.x = Math.PI;
  finial.position.y = hang - 0.25;
  group.add(body, finial);

  const bulbs: THREE.Mesh[] = [];
  for (const [radius, y, count] of [
    [0.55, hang - 0.05, 8],
    [0.32, hang + 0.22, 6],
  ] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.02, 4, 16), metal);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    group.add(ring);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      const arm = box(0.02, 0.02, radius, metal, x / 2, y, z / 2);
      arm.rotation.y = -a + Math.PI / 2;
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6), metal);
      candle.position.set(x, y + 0.06, z);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), glow);
      bulb.position.set(x, y + 0.15, z);
      group.add(arm, candle, bulb);
      bulbs.push(bulb);
    }
  }
  return bulbs;
}

export interface Majlis {
  group: THREE.Group;
  update(time: number): void;
}

export function buildMajlis(): Majlis {
  const group = new THREE.Group();
  walls(group);
  floor(group);
  seating(group);
  table(group);
  const bulbs = chandelier(group);

  // Two lights only, so weak PCs cope: a warm fill and the chandelier.
  const fill = new THREE.HemisphereLight('#ffe0b0', '#5a3018', 1.1);
  const lamp = new THREE.PointLight('#ffc070', 9, 9, 1.4);
  lamp.position.set(0, 2.1, 0);
  group.add(fill, lamp);

  return {
    group,
    update(time) {
      const flicker = 1 + Math.sin(time * 0.011) * 0.03 + Math.sin(time * 0.037) * 0.02;
      lamp.intensity = 9 * flicker;
      bulbs.forEach((b, i) => b.scale.setScalar(1 + Math.sin(time * 0.02 + i * 1.7) * 0.08));
    },
  };
}
