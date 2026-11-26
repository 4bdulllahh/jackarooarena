// Playing with the mouse in 3D: click a card, the marbles it can move glow, click a marble,
// glowing rings show where it can go, click a ring to play. A small panel lists the same
// choices as buttons, so everything also works by keyboard (number keys pick a card).
import * as THREE from 'three';
import { BASE, HOME, type Player, marblesOf, partnerOf } from '../domain/board';
import { type Card, cardName, rankOf } from '../domain/cards';
import type { Play } from '../domain/game';
import { exitMarble, fiveEntersHome, kingMove, moveMarble } from '../domain/move';
import { describePlay } from '../debug/board2d';
import { type Board, holeWorld } from './board';
import type { Players } from './players';

/** The marble a play mainly moves, and where it ends up. Null for plays without a marble. */
export function landing(
  marbles: readonly number[],
  me: Player,
  play: Play,
): { marble: number; pos: number } | null {
  const own = marblesOf(me).every((m) => marbles[m]! >= HOME) ? partnerOf(me) : me;
  const after = (result: number[] | null, marble: number) =>
    result ? { marble, pos: result[marble]! } : null;
  switch (play.kind) {
    case 'move': {
      const intoHome = rankOf(play.card) === 5 ? fiveEntersHome(me, play.marble) : true;
      return after(moveMarble(marbles, play.marble, play.steps, intoHome), play.marble);
    }
    case 'king':
      return after(kingMove(marbles, play.marble), play.marble);
    case 'split':
      return after(moveMarble(marbles, play.a.marble, play.a.steps), play.a.marble);
    case 'swap':
      return { marble: play.marble, pos: marbles[play.target]! };
    case 'exit': {
      const marble = marblesOf(own).find((m) => marbles[m] === BASE);
      return marble === undefined ? null : after(exitMarble(marbles, own), marble);
    }
    default:
      return null;
  }
}

export class Controls {
  private plays: Play[] = [];
  private marbles: number[] = [];
  private me: Player = 0;
  private card: Card | null = null;
  private marble: number | null = null;
  private narrowed: Play[] | null = null; // a ring with several plays (7 splits) narrows the panel to them
  private rings = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  // A filled disc, not a thin ring, so a click anywhere on the hole hits it.
  private ringGeometry = new THREE.CircleGeometry(0.026, 12);
  private ringMaterial = new THREE.MeshBasicMaterial({
    color: '#ffe08a',
    transparent: true,
    opacity: 0.6,
    depthTest: false,
  });

  constructor(
    private camera: THREE.Camera,
    private canvas: HTMLCanvasElement,
    private board: Board,
    private players: Players,
    private panel: HTMLElement,
    private send: (play: Play) => void,
  ) {
    board.group.add(this.rings);
    canvas.addEventListener('click', (e) => this.click(e));
    addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      const n = Number(e.key);
      const hand = [...new Set(this.plays.map((p) => ('card' in p ? p.card : null)))].filter(
        (c) => c !== null,
      );
      if (n >= 1 && n <= hand.length) this.pickCard(hand[n - 1]!);
      if (e.key === 'Escape') this.reset();
    });
  }

  /** New state from the server (or the demo): positions, your seat and your legal plays. */
  setState(marbles: number[], me: Player, plays: Play[]): void {
    this.marbles = marbles;
    this.me = me;
    this.plays = plays;
    this.reset();
  }

  private reset(): void {
    this.card = null;
    this.marble = null;
    this.narrowed = null;
    this.players.select(null);
    this.render();
  }

  private pickCard(card: Card): void {
    if (this.card === card) return this.reset();
    this.card = card;
    this.marble = null;
    this.narrowed = null;
    this.players.select(card);
    const marbles = new Set(this.cardPlays().map((p) => landing(this.marbles, this.me, p)?.marble));
    if (marbles.size === 1) this.marble = [...marbles][0] ?? null;
    this.render();
  }

  private cardPlays(): Play[] {
    return this.plays.filter((p) => 'card' in p && p.card === this.card);
  }

  /** Plays shown in the panel: the card's plays, narrowed to the chosen marble; or a red Q pick. */
  private choices(): Play[] {
    if (this.plays.length > 0 && this.plays.every((p) => p.kind === 'pickBurn')) return this.plays;
    if (this.narrowed) return this.narrowed;
    if (this.card === null) return [];
    const plays = this.cardPlays();
    if (this.marble === null) return plays;
    return plays.filter((p) => landing(this.marbles, this.me, p)?.marble === this.marble);
  }

  private render(): void {
    const plays = this.choices();
    const movable = new Set<number>();
    for (const p of this.card === null ? [] : this.cardPlays()) {
      const land = landing(this.marbles, this.me, p);
      if (land) movable.add(land.marble);
    }
    this.board.highlight(this.marble === null ? movable : [this.marble]);

    this.rings.clear();
    if (this.marble !== null) {
      const byHole = new Map<number, Play[]>();
      for (const p of plays) {
        const land = landing(this.marbles, this.me, p);
        if (land) byHole.set(land.pos, [...(byHole.get(land.pos) ?? []), p]);
      }
      for (const [pos, options] of byHole) {
        const ring = new THREE.Mesh(this.ringGeometry, this.ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(holeWorld(pos, this.marble));
        ring.renderOrder = 1;
        ring.userData.plays = options;
        this.rings.add(ring);
      }
    }

    const label = this.card === null ? '' : `${cardName(this.card)}: `;
    this.panel.hidden = plays.length === 0;
    this.panel.replaceChildren(
      ...plays.map((play) => {
        const button = document.createElement('button');
        button.textContent = describePlay(play).replace(label, '');
        button.onclick = () => this.send(play);
        return button;
      }),
    );
  }

  private click(event: MouseEvent): void {
    if (this.plays.length === 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    // A glowing target wins over a marble sitting on it (that's how you click a kill).
    const hits = this.raycaster.intersectObjects(
      [...this.players.ownCards(), ...this.rings.children, ...this.board.marbleMeshes()],
      false,
    );
    const hit = (hits.find((h) => h.object.userData.plays) ?? hits[0])?.object;
    if (!hit) return;
    if (hit.userData.card !== undefined) return this.pickCard(hit.userData.card as Card);
    if (hit.userData.plays) {
      const options = hit.userData.plays as Play[];
      if (options.length === 1) return this.send(options[0]!);
      this.narrowed = options;
      return this.render();
    }
    const marble = hit.userData.marble as number | undefined;
    if (marble !== undefined && this.card !== null) {
      const ok = this.cardPlays().some((p) => landing(this.marbles, this.me, p)?.marble === marble);
      if (ok) {
        this.marble = marble;
        this.narrowed = null;
        this.render();
      }
    }
  }
}
