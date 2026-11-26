// shortcut: flat 2D board used by the debug page and the temporary online view; the 3D table replaces it in M9-M11.
import { BASE, HOME, type Player, TRACK, entranceOf, ownerOf, startOf } from '../domain/board';
import { cardName } from '../domain/cards';
import type { Play } from '../domain/game';

export const COLORS = ['#e04040', '#3a7be0', '#e0b020', '#30a050'];
const COLOR_NAMES = ['red', 'blue', 'yellow', 'green'];

const C = 320;
const R = 280;
const angle = (tile: number) => (tile / TRACK) * Math.PI * 2 - Math.PI / 2;
const at = (radius: number, a: number) => [C + Math.cos(a) * radius, C + Math.sin(a) * radius] as const;

function xy(pos: number, marble: number): readonly [number, number] {
  const owner = ownerOf(marble);
  if (pos >= HOME) return at(R - 34 - (pos - HOME) * 26, angle(entranceOf(owner)));
  if (pos === BASE) return at(R + 24, angle(startOf(owner) - 3 - (marble % 4)));
  return at(R - 6, angle(pos));
}

/** Draw the board and marbles on a 640x640 canvas. */
export function drawBoard(ctx: CanvasRenderingContext2D, marbles: readonly number[]): void {
  const dot = ([x, y]: readonly [number, number], r: number, fill: string, stroke = '#00000088') => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.stroke();
  };
  ctx.clearRect(0, 0, 640, 640);
  ctx.font = '9px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let t = 0; t < TRACK; t++) {
    const start = [0, 1, 2, 3].find((p) => startOf(p as Player) === t);
    dot(at(R - 6, angle(t)), 9, start === undefined ? '#3b2412' : COLORS[start]! + '66');
    ctx.fillStyle = '#c9a27a';
    ctx.fillText(String((t % 18) + 1), ...at(R - 26, angle(t)));
  }
  for (let p = 0; p < 4; p++) {
    for (let h = 0; h < 4; h++)
      dot(at(R - 34 - h * 26, angle(entranceOf(p as Player))), 9, COLORS[p]! + '44');
    for (let b = 0; b < 4; b++) dot(at(R + 24, angle(startOf(p as Player) - 3 - b)), 9, '#00000033');
  }
  marbles.forEach((pos, m) => {
    const p = xy(pos, m);
    dot(p, 7, COLORS[ownerOf(m)]!, '#fff');
    ctx.fillStyle = '#fff';
    ctx.fillText(String((m % 4) + 1), ...p);
  });
}

const marbleName = (m: number) => `${COLOR_NAMES[ownerOf(m)]} ${(m % 4) + 1}`;

/** A play in words, for buttons and logs. */
export function describePlay(play: Play): string {
  const card = 'card' in play ? cardName(play.card) + ' ' : '';
  switch (play.kind) {
    case 'exit':
      return card + 'bring a marble out';
    case 'move':
      return `${card}${marbleName(play.marble)} ${play.steps > 0 ? '+' : ''}${play.steps}`;
    case 'king':
      return `${card}${marbleName(play.marble)} +13, kill path`;
    case 'split':
      return `${card}${marbleName(play.a.marble)} +${play.a.steps}, ${marbleName(play.b.marble)} +${play.b.steps}`;
    case 'swap':
      return `${card}swap ${marbleName(play.marble)} with ${marbleName(play.target)}`;
    case 'burnNext':
      return card + 'next player burns a card';
    case 'pickNext':
      return card + "burn one of the next player's cards";
    case 'burn':
      return card + 'burn';
    case 'pickBurn':
      return `pick their card #${play.index + 1}`;
  }
}
