// The players around the table: floating low-poly heads (hair and beard, no face) and floating
// hands holding cards, plus a snack tray beside every cushion. Seat s sits at angle s * 90°.
import * as THREE from 'three';
import { type Card, cardName, isRed } from '../domain/cards';

const SEAT_RADIUS = 1.25;
const OWN_Y = -0.25; // camera space: your cards sit low in your view so the board stays clear
const OTHER_Y = 0.6;

const lambert = (color: string) => new THREE.MeshLambertMaterial({ color });

interface Look {
  skin: string;
  hair: string;
  beard: 'full' | 'goatee' | 'stubble';
  shemagh: boolean; // red-and-white headscarf
}

const LOOKS: Look[] = [
  { skin: '#c68a5e', hair: '#1c120c', beard: 'full', shemagh: false },
  { skin: '#a8714a', hair: '#3a2416', beard: 'goatee', shemagh: true },
  { skin: '#d39b70', hair: '#2a1a10', beard: 'stubble', shemagh: false },
  { skin: '#8f5c3a', hair: '#120b07', beard: 'full', shemagh: true },
];

function shemaghTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#efe6d8';
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = '#b3242a';
  for (let i = 0; i < 32; i += 4) {
    g.fillRect(i, 0, 1, 32);
    g.fillRect(0, i, 32, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/** A faceless head: skin, hair or shemagh on top, and a beard on the lower front. Faces -z. */
function head(look: Look): THREE.Group {
  const group = new THREE.Group();
  const skin = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), lambert(look.skin));
  skin.scale.set(1, 1.15, 1);
  group.add(skin);

  const top = look.shemagh ? new THREE.MeshLambertMaterial({ map: shemaghTexture() }) : lambert(look.hair);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.118, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2.2), top);
  cap.scale.set(1, 1.15, 1);
  cap.position.y = 0.01;
  group.add(cap);
  if (look.shemagh) {
    // The scarf falls down the back and sides, held by a black agal ring.
    const drape = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.17, 0.2, 8, 1, true, Math.PI * 0.2, Math.PI * 1.6),
      top,
    );
    drape.rotation.y = Math.PI;
    drape.position.y = -0.05;
    const agal = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.012, 4, 12), lambert('#111111'));
    agal.rotation.x = Math.PI / 2;
    agal.position.y = 0.07;
    group.add(drape, agal);
  }

  const beardMat = lambert(look.hair);
  if (look.beard === 'full') {
    const beard = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 4, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.5, Math.PI * 0.4),
      beardMat,
    );
    beard.rotation.y = Math.PI / 2;
    beard.scale.set(1.05, 1.3, 1.05);
    beard.position.set(0, -0.015, -0.012);
    group.add(beard);
  } else if (look.beard === 'goatee') {
    const goatee = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 5), beardMat);
    goatee.rotation.x = Math.PI;
    goatee.position.set(0, -0.13, -0.075);
    const moustache = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.014, 0.02), beardMat);
    moustache.position.set(0, -0.06, -0.103);
    group.add(goatee, moustache);
  } else {
    const stubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.112, 8, 4, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.55, Math.PI * 0.35),
      new THREE.MeshLambertMaterial({ color: look.hair, transparent: true, opacity: 0.55 }),
    );
    stubble.rotation.y = Math.PI / 2;
    stubble.scale.set(1, 1.15, 1);
    group.add(stubble);
  }
  return group;
}

/** A simple mitten hand: palm plus a thumb. */
function hand(skin: string, left: boolean): THREE.Group {
  const group = new THREE.Group();
  const mat = lambert(skin);
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.025), mat);
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.045, 0.02), mat);
  thumb.position.set(left ? 0.035 : -0.035, -0.005, -0.012);
  thumb.rotation.z = left ? -0.6 : 0.6;
  group.add(palm, thumb);
  return group;
}

const cardTextures = new Map<Card | 'back', THREE.CanvasTexture>();

function cardTexture(card: Card | 'back'): THREE.CanvasTexture {
  const cached = cardTextures.get(card);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 64;
  const g = canvas.getContext('2d')!;
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
  tex.magFilter = THREE.NearestFilter;
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
      new THREE.MeshLambertMaterial({ map: cardTexture(card), side: THREE.DoubleSide }),
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
  tray.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.015, 16), lambert('#b8862f')));
  const at = (mesh: THREE.Object3D, x: number, y: number, z: number) => {
    mesh.position.set(x, y, z);
    tray.add(mesh);
  };
  // Istikana: a small waisted tea glass on a saucer, amber tea inside.
  at(
    new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.006, 10), lambert('#e9dcc0')),
    -0.08,
    0.011,
    0.05,
  );
  const glass = new THREE.Mesh(
    new THREE.LatheGeometry(
      [new THREE.Vector2(0.016, 0), new THREE.Vector2(0.012, 0.03), new THREE.Vector2(0.019, 0.06)],
      8,
    ),
    new THREE.MeshLambertMaterial({ color: '#b5501c', transparent: true, opacity: 0.85 }),
  );
  at(glass, -0.08, 0.014, 0.05);
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
      new THREE.MeshLambertMaterial({ color: '#9fd0e8', transparent: true, opacity: 0.6 }),
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
        (turn === i && i !== this.me ? 0.03 : 0);
    });
  }
}
