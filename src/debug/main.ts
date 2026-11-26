// Dev-only rules debug board (open /debug.html in `npm run dev`). Not part of the build.
import { BASE, HOME, type Player, TRACK, entranceOf, ownerOf, startOf } from '../domain/board';
import { botPlay } from '../domain/bot';
import { cardName } from '../domain/cards';
import { type Game, type Play, applyPlay, legalPlays, newGame } from '../domain/game';

const ME: Player = 0;
const COLORS = ['#e04040', '#3a7be0', '#e0b020', '#30a050'];
const NAMES = ['You (red)', 'Blue bot', 'Yellow bot (partner)', 'Green bot'];
const random = () => Math.random();

const canvas = document.querySelector<HTMLCanvasElement>('#board')!;
const ctx = canvas.getContext('2d')!;
const $ = (id: string) => document.getElementById(id)!;

let game: Game = newGame(random);
let timer = 0;

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

function dot([x, y]: readonly [number, number], r: number, fill: string, stroke = '#00000088') {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function draw() {
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
  game.marbles.forEach((pos, m) => {
    const p = xy(pos, m);
    dot(p, 7, COLORS[ownerOf(m)]!, '#fff');
    ctx.fillStyle = '#fff';
    ctx.fillText(String((m % 4) + 1), ...p);
  });
}

const marbleName = (m: number) => `${['red', 'blue', 'yellow', 'green'][ownerOf(m)]} ${(m % 4) + 1}`;

function describe(play: Play): string {
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

const actor = (): Player => (game.pending?.kind === 'pick' ? game.pending.by : game.turn);

function log(who: Player, play: Play) {
  const li = document.createElement('li');
  li.textContent = `${NAMES[who]}: ${describe(play)}`;
  li.style.color = COLORS[who]!;
  $('log').prepend(li);
}

function doPlay(who: Player, play: Play) {
  const next = applyPlay(game, who, play, random);
  if (!next) throw new Error(`Illegal play: ${JSON.stringify(play)}`);
  log(who, play);
  game = next;
  render();
}

function render() {
  draw();
  clearTimeout(timer);
  const hand = game.hands[ME]!.map(cardName).join('  ');
  $('hand').textContent = `Your hand: ${hand || '(empty)'}`;
  const plays = $('plays');
  plays.replaceChildren();
  if (game.winner !== null) {
    $('status').textContent = game.winner === ME % 2 ? 'Your team wins!' : 'The other team wins.';
    return;
  }
  const who = actor();
  $('status').textContent = `${NAMES[who]} to play${game.pending ? ` (${game.pending.kind})` : ''}`;
  if (who === ME && !($('auto') as HTMLInputElement).checked) {
    for (const play of legalPlays(game, ME)) {
      const button = document.createElement('button');
      button.textContent = describe(play);
      button.onclick = () => doPlay(ME, play);
      plays.append(button);
    }
  } else {
    timer = window.setTimeout(() => doPlay(who, botPlay(game, who, random)), 350);
  }
}

$('new').onclick = () => {
  game = newGame(random);
  $('log').replaceChildren();
  render();
};
$('auto').onchange = render;
render();
