import { describe, expect, test } from 'vitest';
import { BASE, HOME, TRACK, type Player } from './board';
import { type Card, cardOf } from './cards';
import { type Game, type Play, applyPlay, legalPlays, newGame, viewFor } from './game';
import { newMarbles } from './move';

// Small seeded random so games are repeatable.
function seeded(seed: number): () => number {
  return () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
}

const A = cardOf(1, 'spades');
const FOUR = cardOf(4, 'clubs');
const FIVE = cardOf(5, 'spades');
const SEVEN = cardOf(7, 'spades');
const TEN_BLACK = cardOf(10, 'spades');
const TEN_RED = cardOf(10, 'hearts');
const J_BLACK = cardOf(11, 'clubs');
const J_RED = cardOf(11, 'diamonds');
const Q_RED = cardOf(12, 'hearts');
const K = cardOf(13, 'clubs');
const TWO = cardOf(2, 'clubs');
const THREE = cardOf(3, 'clubs');
const NINE = cardOf(9, 'clubs');

/** A game in the middle of a deal, with the given hands and marbles (player 0 to move). */
function game(hands: Card[][], placed: Record<number, number> = {}): Game {
  const marbles = newMarbles();
  for (const [m, pos] of Object.entries(placed)) marbles[Number(m)] = pos;
  return { marbles, hands, deck: [], discard: [], dealer: 3, deal: 0, turn: 0, pending: null, winner: null };
}

const kinds = (plays: Play[]) => new Set(plays.map((p) => p.kind));
const play = (g: Game, p: Player, pl: Play) => applyPlay(g, p, pl, seeded(1));

describe('dealing and turns', () => {
  test('the dealer deals 4 each and the next player starts', () => {
    const g = newGame(seeded(7), 0);
    expect(g.hands.map((h) => h.length)).toEqual([4, 4, 4, 4]);
    expect(g.turn).toBe(1);
    expect(g.deck.length).toBe(36);
  });

  test('play passes to the next player', () => {
    const g = game([[TWO], [THREE], [NINE], [NINE + 13]], { 0: 5 });
    expect(play(g, 0, { kind: 'move', card: TWO, marble: 0, steps: 2 })?.turn).toBe(1);
  });

  test('players with no cards are skipped', () => {
    const g = game([[TWO], [], [NINE], []], { 0: 5 });
    expect(play(g, 0, { kind: 'move', card: TWO, marble: 0, steps: 2 })?.turn).toBe(2);
  });

  test('when everyone is out, the dealer moves one seat and deals the next round', () => {
    const g = { ...game([[TWO], [], [], []], { 0: 5 }), deck: Array.from({ length: 16 }, (_, i) => i + 20) };
    const after = play(g, 0, { kind: 'move', card: TWO, marble: 0, steps: 2 })!;
    expect(after.dealer).toBe(0);
    expect(after.turn).toBe(1);
    expect(after.deal).toBe(1);
    expect(after.hands.map((h) => h.length)).toEqual([4, 4, 4, 4]);
  });

  test('after the third deal (5 cards) a fresh deck is shuffled', () => {
    const g = { ...game([[TWO], [], [], []], { 0: 5 }), deal: 2, discard: [1, 2, 3] };
    const after = play(g, 0, { kind: 'move', card: TWO, marble: 0, steps: 2 })!;
    expect(after.deal).toBe(0);
    expect(after.hands.map((h) => h.length)).toEqual([4, 4, 4, 4]);
    expect(after.deck.length).toBe(36);
  });

  test("you can't play out of turn", () =>
    expect(legalPlays(game([[TWO], [THREE], [], []], { 0: 5, 4: 20 }), 1)).toEqual([]));
});

describe('cards', () => {
  test('A: exit, 1 or 11', () => {
    const plays = legalPlays(game([[A], [], [], []], { 0: 5 }), 0);
    expect(plays).toContainEqual({ kind: 'exit', card: A });
    expect(plays).toContainEqual({ kind: 'move', card: A, marble: 0, steps: 1 });
    expect(plays).toContainEqual({ kind: 'move', card: A, marble: 0, steps: 11 });
  });

  test('4 moves backward only', () =>
    expect(legalPlays(game([[FOUR], [], [], []], { 0: 10 }), 0)).toEqual([
      { kind: 'move', card: FOUR, marble: 0, steps: -4 },
    ]));

  test('5 can move any marble except one on its own start', () => {
    const marbles = legalPlays(game([[FIVE], [], [], []], { 0: 10, 4: 30, 8: 40, 12: 54 }), 0).map(
      (p) => (p as { marble: number }).marble,
    );
    expect(marbles.sort()).toEqual([0, 4, 8]);
  });

  test("an opponent's 5 pushes past their home; a partner's 5 pushes in", () => {
    // Player 1's entrance is 16, player 2's is 34. Both marbles sit 2 before their entrance.
    const g = game([[FIVE], [], [], []], { 0: 60, 4: 14, 8: 32 });
    expect(play(g, 0, { kind: 'move', card: FIVE, marble: 4, steps: 5 })?.marbles[4]).toBe(19);
    expect(play(g, 0, { kind: 'move', card: FIVE, marble: 8, steps: 5 })?.marbles[8]).toBe(HOME + 2);
  });

  test('7 can move one marble 7 or split between two', () => {
    const plays = legalPlays(game([[SEVEN], [], [], []], { 0: 10, 1: 20 }), 0);
    expect(plays).toContainEqual({ kind: 'move', card: SEVEN, marble: 0, steps: 7 });
    expect(plays).toContainEqual({
      kind: 'split',
      card: SEVEN,
      a: { marble: 0, steps: 4 },
      b: { marble: 1, steps: 3 },
    });
  });

  test('7 split: once your 4th marble is home, the rest moves your partner', () => {
    const g = game([[SEVEN], [], [], []], { 0: HOME + 3, 1: HOME + 2, 2: HOME + 1, 3: 69, 8: 40 });
    const after = play(g, 0, {
      kind: 'split',
      card: SEVEN,
      a: { marble: 3, steps: 2 },
      b: { marble: 8, steps: 5 },
    });
    expect(after?.marbles[3]).toBe(HOME);
    expect(after?.marbles[8]).toBe(45);
  });

  test('black 10/J/Q move 10/11/12, red ones do not move', () => {
    const g = game([[TEN_BLACK, J_BLACK, TEN_RED, J_RED], [TWO], [], []], { 0: 5 });
    const steps = legalPlays(g, 0)
      .filter((p) => p.kind === 'move')
      .map((p) => (p as { steps: number }).steps);
    expect(steps.sort((a, b) => a - b)).toEqual([10, 11]);
  });

  test('red J swaps with an opponent or partner marble on the track', () => {
    const g = game([[J_RED], [], [], []], { 0: 10, 4: 30, 8: 40, 12: 54, 5: HOME });
    const targets = legalPlays(g, 0).map((p) => (p as { target: number }).target);
    expect(targets.sort()).toEqual([4, 8]); // not 12 (own start), not 5 (home)
    const after = play(g, 0, { kind: 'swap', card: J_RED, marble: 0, target: 4 })!;
    expect([after.marbles[0], after.marbles[4]]).toEqual([30, 10]);
  });

  test('K: exit or move 13', () => {
    expect(kinds(legalPlays(game([[K], [], [], []], { 0: 5 }), 0))).toEqual(new Set(['exit', 'king']));
  });
});

describe('burning', () => {
  test('no legal play: burn any card and pass', () => {
    const g = game([[TWO, THREE], [NINE], [], []]); // all marbles in base, no A or K
    expect(legalPlays(g, 0)).toEqual([
      { kind: 'burn', card: TWO },
      { kind: 'burn', card: THREE },
    ]);
    const after = play(g, 0, { kind: 'burn', card: THREE })!;
    expect(after.hands[0]).toEqual([TWO]);
    expect(after.turn).toBe(1);
  });

  test('red 10: the next player must burn, and that is their whole turn', () => {
    const g = game([[TEN_RED], [TWO, THREE], [NINE], []], { 4: 20 });
    const hit = play(g, 0, { kind: 'burnNext', card: TEN_RED })!;
    expect(hit.turn).toBe(1);
    expect(legalPlays(hit, 1)).toEqual([
      { kind: 'burn', card: TWO },
      { kind: 'burn', card: THREE },
    ]);
    const after = play(hit, 1, { kind: 'burn', card: TWO })!;
    expect(after.hands[1]).toEqual([THREE]);
    expect(after.turn).toBe(2);
  });

  test("red Q: you pick one of the next player's cards blind, and that is their turn", () => {
    const g = game([[Q_RED], [TWO, THREE, NINE], [FOUR], []]);
    const hit = play(g, 0, { kind: 'pickNext', card: Q_RED })!;
    expect(hit.pending).toEqual({ kind: 'pick', by: 0, victim: 1 });
    expect(legalPlays(hit, 1)).toEqual([]);
    expect(legalPlays(hit, 0)).toHaveLength(3);
    const after = play(hit, 0, { kind: 'pickBurn', index: 0 })!;
    expect(after.hands[1]).toHaveLength(2);
    expect(after.turn).toBe(2);
  });

  test('red 10 and Q need someone else holding cards', () => {
    const g = game([[TEN_RED, Q_RED], [], [], []]);
    expect(kinds(legalPlays(g, 0))).toEqual(new Set(['burn']));
  });
});

describe('teams', () => {
  test("a finished player moves their partner's marbles", () => {
    const g = game([[TWO], [], [], []], { 0: HOME, 1: HOME + 1, 2: HOME + 2, 3: HOME + 3, 8: 40 });
    expect(legalPlays(g, 0)).toEqual([{ kind: 'move', card: TWO, marble: 8, steps: 2 }]);
  });

  test("a finished player can bring out their partner's marble", () =>
    expect(
      play(game([[A], [], [], []], { 0: HOME, 1: HOME + 1, 2: HOME + 2, 3: HOME + 3 }), 0, {
        kind: 'exit',
        card: A,
      })?.marbles[8],
    ).toBe(36));

  test('the team with all 8 home wins', () => {
    // Player 0 is done and moves partner 2's last marble: 32 -> 33 -> 34 (entrance) -> HOME.
    const placed = {
      0: HOME,
      1: HOME + 1,
      2: HOME + 2,
      3: HOME + 3,
      8: HOME + 1,
      9: HOME + 2,
      10: HOME + 3,
      11: 32,
    };
    const after = play(game([[THREE], [TWO], [], []], placed), 0, {
      kind: 'move',
      card: THREE,
      marble: 11,
      steps: 3,
    })!;
    expect(after.marbles[11]).toBe(HOME);
    expect(after.winner).toBe(0);
    expect(legalPlays(after, 1)).toEqual([]);
  });
});

describe('random full games keep every invariant', () => {
  test('cards are conserved, tiles hold one marble, hands stay private', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const random = seeded(seed);
      let g = newGame(random, (seed % 4) as Player);
      for (let turn = 0; turn < 3000 && g.winner === null; turn++) {
        const actor = (g.pending?.kind === 'pick' ? g.pending.by : g.turn) as Player;
        const plays = legalPlays(g, actor);
        expect(plays.length).toBeGreaterThan(0);
        g = applyPlay(g, actor, plays[Math.floor(random() * plays.length)]!, random)!;
        expect(g).not.toBeNull();

        const held = g.hands.flat().length + g.deck.length + g.discard.length;
        expect(held).toBe(52);
        const onTrack = g.marbles.filter((p) => p >= 0 && p < TRACK);
        expect(new Set(onTrack).size).toBe(onTrack.length);
        expect(g.marbles.every((p) => p === BASE || p >= 0)).toBe(true);
        const view = viewFor(g, actor);
        expect(view.hand).toEqual(g.hands[actor]);
        expect(JSON.stringify(view)).not.toContain('"hands"');
      }
    }
  });
});
