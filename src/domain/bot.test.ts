import { expect, test } from 'vitest';
import type { Player } from './board';
import { botPlay } from './bot';
import { cardOf } from './cards';
import { type Game, applyPlay, legalPlays, newGame } from './game';
import { newMarbles } from './move';

function seeded(seed: number): () => number {
  return () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
}

function game(hands: number[][], placed: Record<number, number>): Game {
  const marbles = newMarbles();
  for (const [m, pos] of Object.entries(placed)) marbles[Number(m)] = pos;
  return { marbles, hands, deck: [], discard: [], dealer: 3, deal: 0, turn: 0, pending: null, winner: null };
}

test('takes a kill over a plain move', () => {
  const SIX = cardOf(6, 'clubs');
  const play = botPlay(game([[SIX], [], [], []], { 0: 10, 1: 30, 4: 16 }), 0, seeded(1));
  expect(play).toEqual({ kind: 'move', card: SIX, marble: 0, steps: 6 });
});

test("doesn't kill its partner", () => {
  const SIX = cardOf(6, 'clubs');
  const play = botPlay(game([[SIX], [], [], []], { 0: 10, 1: 30, 8: 16 }), 0, seeded(1));
  expect(play).toEqual({ kind: 'move', card: SIX, marble: 1, steps: 6 });
});

test('uses a 5 to push an opponent past their home', () => {
  const FIVE = cardOf(5, 'clubs');
  // Player 1's marble waits at 14, two tiles before its entrance (16).
  const play = botPlay(game([[FIVE], [], [], []], { 0: 40, 4: 14 }), 0, seeded(1));
  expect(play).toEqual({ kind: 'move', card: FIVE, marble: 4, steps: 5 });
});

test('bots beat random players most of the time', () => {
  let botWins = 0;
  const games = 20;
  for (let seed = 1; seed <= games; seed++) {
    const random = seeded(seed);
    let g = newGame(random, (seed % 4) as Player);
    for (let turn = 0; turn < 5000 && g.winner === null; turn++) {
      const actor = (g.pending?.kind === 'pick' ? g.pending.by : g.turn) as Player;
      const plays = legalPlays(g, actor);
      const play = actor % 2 === 0 ? botPlay(g, actor, random) : plays[Math.floor(random() * plays.length)]!;
      g = applyPlay(g, actor, play, random)!;
    }
    if (g.winner === 0) botWins++;
  }
  expect(botWins).toBeGreaterThanOrEqual(games * 0.8);
});
