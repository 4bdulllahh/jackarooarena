// The players around the table: floating heads (hair and beard, no face) and floating hands
// holding cards, plus a snack tray beside every cushion. Seat s sits at angle s * 90°.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { type Card, cardName, isRed } from '../domain/cards';

const SEAT_RADIUS = 1.25;
const OWN_Y = -0.25; // camera space: your cards sit low in your view so the board stays clear
const OTHER_Y = 0.6;

const lambert = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.75 });

interface Look {
  skin: string;
  hair: string;
  beard: 'full' | 'goatee' | 'stubble';
  shemagh: boolean; // red-and-white headscarf
}

export const LOOKS: Look[] = [
  { skin: '#c68a5e', hair: '#1c120c', beard: 'full', shemagh: false },
  { skin: '#a8714a', hair: '#3a2416', beard: 'goatee', shemagh: true },
  { skin: '#d39b70', hair: '#2a1a10', beard: 'stubble', shemagh: false },
  { skin: '#8f5c3a', hair: '#120b07', beard: 'full', shemagh: true },
];

function shemaghTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#efe6d8';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#b3242a';
  for (let i = 0; i < 128; i += 16) {
    g.fillRect(i, 0, 4, 128);
    g.fillRect(0, i, 128, 4);
    g.fillRect(i + 7, i + 7, 3, 3); // a small diamond dot in every square
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

let strands: THREE.CanvasTexture | null = null;

/** Short strokes in grey, used as a bump map so hair and beards look like hair, not plastic. */
function strandTexture(): THREE.CanvasTexture {
  if (strands) return strands;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 128, 128);
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.lineWidth = 1;
  for (let i = 0; i < 1800; i++) {
    const x = rnd() * 128;
    const y = rnd() * 128;
    g.strokeStyle = rnd() < 0.5 ? '#404040' : '#c0c0c0';
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rnd() - 0.5) * 3, y + 4 + rnd() * 6);
    g.stroke();
  }
  strands = new THREE.CanvasTexture(canvas);
  strands.wrapS = strands.wrapT = THREE.RepeatWrapping;
  strands.repeat.set(3, 3);
  return strands;
}

const hairMaterial = (color: string, opacity = 1) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    bumpMap: strandTexture(),
    bumpScale: 2,
    transparent: opacity < 1,
    opacity,
  });

/** A faceless head: skull, jaw and ears, hair or a shemagh on top, and a beard. Faces -z. */
function head(look: Look): THREE.Group {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.6 });
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 24), skin);
  skull.scale.set(0.95, 1.15, 1);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), skin);
  jaw.scale.set(0.95, 0.8, 1);
  jaw.position.set(0, -0.055, -0.012);
  group.add(skull, jaw);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), skin);
    ear.scale.set(0.45, 1, 0.75);
    ear.position.set(side * 0.103, -0.005, 0.01);
    group.add(ear);
  }

  const hair = hairMaterial(look.hair);
  const top = look.shemagh ? new THREE.MeshStandardMaterial({ map: shemaghTexture(), roughness: 0.9 }) : hair;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.117, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), top);
  cap.scale.set(0.97, 1.17, 1.03);
  cap.position.y = 0.012;
  group.add(cap);
  if (look.shemagh) {
    // The scarf falls in folds down the back and sides, held by a double black agal.
    const drapeGeometry = new THREE.CylinderGeometry(
      0.122,
      0.18,
      0.22,
      48,
      6,
      true,
      Math.PI * 0.2,
      Math.PI * 1.6,
    );
    const p = drapeGeometry.attributes.position!;
    for (let i = 0; i < p.count; i++) {
      const lower = 0.5 - p.getY(i) / 0.22; // 0 at the top, 1 at the bottom
      const fold = 1 + Math.sin(Math.atan2(p.getX(i), p.getZ(i)) * 9) * 0.07 * lower;
      p.setXYZ(i, p.getX(i) * fold, p.getY(i), p.getZ(i) * fold);
    }
    drapeGeometry.computeVertexNormals();
    const drape = new THREE.Mesh(
      drapeGeometry,
      new THREE.MeshStandardMaterial({ map: top.map, roughness: 0.9, side: THREE.DoubleSide }),
    );
    drape.rotation.y = Math.PI;
    drape.position.y = -0.05;
    group.add(drape);
    const agal = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.5 });
    for (const y of [0.066, 0.084]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.107, 0.009, 8, 40), agal);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      group.add(ring);
    }
  } else {
    // Hair down the back of the head, below the cap.
    const back = new THREE.Mesh(
      new THREE.SphereGeometry(0.113, 32, 12, 0, Math.PI, Math.PI * 0.35, Math.PI * 0.3),
      hair,
    );
    back.scale.set(0.97, 1.15, 1.02);
    group.add(back);
  }

  const moustache = (thick: number) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(thick, 0.045, 4, 10), hair);
    m.rotation.z = Math.PI / 2;
    m.position.set(0, -0.058, -0.1);
    group.add(m);
  };
  if (look.beard === 'full') {
    const beard = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 32, 12, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.5, Math.PI * 0.42),
      hair,
    );
    beard.rotation.y = Math.PI / 2;
    beard.scale.set(1.05, 1.3, 1.05);
    beard.position.set(0, -0.02, -0.012);
    group.add(beard);
    moustache(0.009);
  } else if (look.beard === 'goatee') {
    const goatee = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.065, 16), hair);
    goatee.rotation.x = Math.PI;
    goatee.position.set(0, -0.128, -0.075);
    group.add(goatee);
    moustache(0.007);
  } else {
    const stubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.112, 32, 12, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.55, Math.PI * 0.35),
      hairMaterial(look.hair, 0.5),
    );
    stubble.rotation.y = Math.PI / 2;
    stubble.scale.set(1, 1.15, 1);
    group.add(stubble);
  }
  return group;
}

const FINGER = new THREE.CapsuleGeometry(0.0068, 0.008, 4, 10);

/**
 * A hand: a rounded palm, four fingers with two joints and a thumb. Fingers point +y and bend by
 * `curl` (positive toward +z, in front of the palm; negative behind it).
 */
export function hand(skin: string, left: boolean, curl = -0.9): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 });
  group.add(new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.06, 0.022, 3, 0.009), mat));
  const side = left ? 1 : -1; // the thumb's side
  [0.03, 0.033, 0.031, 0.026].forEach((length, i) => {
    const base = new THREE.Group();
    base.position.set(side * (0.0195 - i * 0.013), 0.027, 0);
    base.rotation.x = curl * 0.5;
    const near = new THREE.Mesh(FINGER, mat);
    near.scale.y = (length * 0.55) / 0.022;
    near.position.y = length * 0.275;
    const joint = new THREE.Group();
    joint.position.y = length * 0.55;
    joint.rotation.x = curl * 0.8;
    const far = new THREE.Mesh(FINGER, mat);
    far.scale.set(0.92, (length * 0.45) / 0.022, 0.92);
    far.position.y = length * 0.2;
    joint.add(far);
    base.add(near, joint);
    group.add(base);
  });
  const thumb = new THREE.Mesh(FINGER, mat);
  thumb.scale.set(1.15, 1.4, 1.15);
  thumb.position.set(side * 0.031, -0.004, 0.009);
  thumb.rotation.z = -side * 0.75;
  group.add(thumb);
  return group;
}

/** An istikana: a small waisted tea glass with a gold rim, dark amber tea inside. */
export function istikana(): THREE.Group {
  const group = new THREE.Group();
  const outline = (points: number[][]) => points.map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.Mesh(
    new THREE.LatheGeometry(
      outline([
        [0, 0],
        [0.015, 0],
        [0.016, 0.004],
        [0.012, 0.028],
        [0.0135, 0.04],
        [0.018, 0.058],
        [0.0185, 0.06],
      ]),
      24,
    ),
    new THREE.MeshStandardMaterial({ color: '#fff8ee', transparent: true, opacity: 0.3, roughness: 0.05 }),
  );
  glass.renderOrder = 1; // drawn after the tea so the tea shows through
  const tea = new THREE.Mesh(
    new THREE.LatheGeometry(
      outline([
        [0, 0.003],
        [0.014, 0.004],
        [0.011, 0.028],
        [0.0125, 0.04],
        [0.0155, 0.048],
        [0, 0.048],
      ]),
      24,
    ),
    new THREE.MeshStandardMaterial({ color: '#8a2e0c', roughness: 0.15, transparent: true, opacity: 0.92 }),
  );
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.0185, 0.0012, 6, 24),
    new THREE.MeshStandardMaterial({ color: '#d9a441', metalness: 0.9, roughness: 0.3 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.06;
  group.add(tea, glass, rim);
  return group;
}

const cardTextures = new Map<Card | 'back', THREE.CanvasTexture>();

function cardTexture(card: Card | 'back'): THREE.CanvasTexture {
  const cached = cardTextures.get(card);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 48 * 4;
  canvas.height = 64 * 4;
  const g = canvas.getContext('2d')!;
  g.scale(4, 4); // drawn in 48 x 64 units, 4x sharper
  g.fillStyle = '#f4ead6';
  g.fillRect(0, 0, 48, 64);
  if (card === 'back') {
    g.fillStyle = '#8e1f1f';
    g.fillRect(3, 3, 42, 58);
    g.fillStyle = '#d9a441';
    for (let y = 6; y < 60; y += 6)
      for (let x = 6 + (y % 12 === 0 ? 3 : 0); x < 44; x += 6) g.fillRect(x, y, 2, 2);
  } else {
    const name = cardName(card);
    g.fillStyle = isRed(card) ? '#c0221f' : '#1b1410';
    g.font = 'bold 16px system-ui, sans-serif';
    g.textBaseline = 'top';
    g.fillText(name.slice(0, -1), 4, 3);
    g.font = '28px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(name.slice(-1), 24, 38);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  cardTextures.set(card, tex);
  return tex;
}

const CARD_GEOMETRY = new THREE.PlaneGeometry(0.06, 0.08);

/** A fan of cards; faces +z (toward whoever holds it). */
function fan(cards: (Card | 'back')[]): THREE.Group {
  const group = new THREE.Group();
  const spread = 0.16;
  cards.forEach((card, i) => {
    const t = cards.length === 1 ? 0 : i / (cards.length - 1) - 0.5;
    const mesh = new THREE.Mesh(
      CARD_GEOMETRY,
      new THREE.MeshStandardMaterial({ map: cardTexture(card), side: THREE.DoubleSide }),
    );
    mesh.position.set(t * spread * Math.min(1, cards.length / 4), -Math.abs(t) * 0.02, i * 0.002);
    mesh.userData = { card, baseY: mesh.position.y };
    mesh.rotation.z = -t * 0.5;
    group.add(mesh);
  });
  return group;
}

/** Tea, sunflower seeds, chips and water on a brass tray. */
function snackTray(): THREE.Group {
  const tray = new THREE.Group();
  tray.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.19, 0.015, 24),
      new THREE.MeshStandardMaterial({ color: '#b8862f', metalness: 0.85, roughness: 0.35 }),
    ),
  );
  const at = (mesh: THREE.Object3D, x: number, y: number, z: number) => {
    mesh.position.set(x, y, z);
    tray.add(mesh);
  };
  // Istikana on a saucer.
  at(
    new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.006, 24), lambert('#e9dcc0')),
    -0.08,
    0.011,
    0.05,
  );
  at(istikana(), -0.08, 0.014, 0.05);
  // Bowls of seeds and chips.
  const bowl = (color: string, fill: string, x: number, z: number) => {
    at(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
        lambert(color),
      ),
      x,
      0.055,
      z,
    );
    at(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 8), lambert(fill)), x, 0.05, z);
  };
  bowl('#2f5d7a', '#3d3226', 0.07, 0.06); // sunflower seeds
  bowl('#e9dcc0', '#e3b341', 0.02, -0.09); // chips
  // Water bottle.
  at(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8),
      new THREE.MeshStandardMaterial({ color: '#9fd0e8', transparent: true, opacity: 0.6, roughness: 0.1 }),
    ),
    -0.11,
    0.09,
    -0.07,
  );
  at(
    new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6), lambert('#2a6fb0')),
    -0.11,
    0.18,
    -0.07,
  );
  return tray;
}

interface Seat {
  group: THREE.Group; // turned to face the table from seat s
  head: THREE.Group;
  hands: THREE.Group;
  cards: THREE.Group;
  shown: string; // what the fan currently shows, to rebuild only on change
}

export interface PlayersView {
  hand: Card[];
  handSizes: number[];
  turn: number;
}

export class Players {
  readonly group = new THREE.Group();
  private seats: Seat[] = [];
  private me = 0;
  private selected: Card | null = null;
  /** How far your own cards sit below their place (while the phone menu is up). */
  ownDrop = 0;

  /** Your own hands ride on the camera, so your cards stay at the bottom of the view in every camera mode. */
  constructor(private camera: THREE.Camera) {
    for (let s = 0; s < 4; s++) {
      const group = new THREE.Group();
      group.rotation.y = (s * Math.PI) / 2;
      const look = LOOKS[s]!;
      const h = head(look);
      h.position.set(0, 0.92, SEAT_RADIUS);
      const hands = new THREE.Group();
      const left = hand(look.skin, true);
      left.position.set(-0.09, -0.02, 0.01);
      const right = hand(look.skin, false);
      right.position.set(0.09, -0.02, 0.01);
      const cards = new THREE.Group();
      hands.add(left, right, cards);
      const tray = snackTray();
      tray.position.set(0.62, 0.008, SEAT_RADIUS - 0.05);
      group.add(h, hands, tray);
      this.group.add(group);
      this.seats.push({ group, head: h, hands, cards, shown: '' });
    }
    this.setSeat(0);
  }

  /** Which seat is you: your own head is hidden and your hands move onto the camera. */
  setSeat(seat: number): void {
    this.me = seat;
    this.seats.forEach((s, i) => {
      s.head.visible = i !== seat;
      if (i === seat) {
        this.camera.add(s.hands);
        s.hands.position.set(0, OWN_Y, -0.4);
        s.hands.scale.setScalar(0.75);
        s.hands.rotation.set(-0.3, 0, 0);
      } else {
        s.group.add(s.hands);
        s.hands.position.set(0, OTHER_Y, SEAT_RADIUS - 0.3);
        s.hands.scale.setScalar(1);
        s.hands.rotation.set(-0.35, 0, 0); // cards tilted toward their owner
      }
    });
  }

  /** Show everyone's cards: yours face up, the others face down. */
  setCards(view: PlayersView): void {
    this.seats.forEach((s, i) => {
      const cards: (Card | 'back')[] =
        i === this.me ? view.hand : Array<'back'>(view.handSizes[i] ?? 0).fill('back');
      const key = cards.join(',');
      if (key === s.shown) return;
      s.shown = key;
      s.cards.clear();
      const f = fan(cards); // faces +z, toward the owner
      f.position.set(0, 0.03, 0);
      s.cards.add(f);
    });
    this.select(this.selected);
  }

  /** A player's head (for placing speech bubbles). */
  headOf(seat: number): THREE.Object3D {
    return this.seats[seat]!.head;
  }

  /** Your card meshes, for clicking. Each has `userData.card`. */
  ownCards(): THREE.Object3D[] {
    return this.seats[this.me]!.cards.children[0]?.children ?? [];
  }

  /** Lift the chosen card out of the fan (or none). */
  select(card: Card | null): void {
    this.selected = card;
    for (const mesh of this.ownCards())
      mesh.position.y = mesh.userData.baseY + (mesh.userData.card === card ? 0.025 : 0);
  }

  update(time: number, turn: number | null): void {
    this.seats.forEach((s, i) => {
      const bob = Math.sin(time / 900 + i * 1.3) * 0.006;
      s.head.position.y = 0.92 + bob;
      s.head.lookAt(0, 0.4, 0); // everyone watches the board
      s.head.rotateY(Math.PI); // our heads are built facing -z; lookAt points +z
      s.hands.position.y =
        (i === this.me ? OWN_Y : OTHER_Y) +
        bob * (i === this.me ? 0.3 : 1) +
        (turn === i && i !== this.me ? 0.03 : 0) -
        (i === this.me ? this.ownDrop : 0);
    });
  }
}
