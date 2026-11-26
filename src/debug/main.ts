// Dev-only rules debug board (open /debug.html in `npm run dev`). Not part of the build.
import type { Player } from '../domain/board';
import { botPlay } from '../domain/bot';
import { cardName } from '../domain/cards';
import { type Game, type Play, applyPlay, legalPlays, newGame } from '../domain/game';
import { COLORS, describePlay, drawBoard } from './board2d';

const ME: Player = 0;
const NAMES = ['You (red)', 'Blue bot', 'Yellow bot (partner)', 'Green bot'];
const random = () => Math.random();

const ctx = document.querySelector<HTMLCanvasElement>('#board')!.getContext('2d')!;
const $ = (id: string) => document.getElementById(id)!;

let game: Game = newGame(random);
let timer = 0;

const actor = (): Player => (game.pending?.kind === 'pick' ? game.pending.by : game.turn);

function log(who: Player, play: Play) {
  const li = document.createElement('li');
  li.textContent = `${NAMES[who]}: ${describePlay(play)}`;
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
  drawBoard(ctx, game.marbles);
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
      button.textContent = describePlay(play);
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
