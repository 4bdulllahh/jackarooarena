import { expect, test } from 'vitest';
import { HOME } from '../domain/board';
import { cardOf } from '../domain/cards';
import { newMarbles } from '../domain/move';
import { landing } from './controls';

const board = (placed: Record<number, number>) => {
  const m = newMarbles();
  for (const [k, v] of Object.entries(placed)) m[Number(k)] = v;
  return m;
};

test('a move lands where the rules say', () =>
  expect(
    landing(board({ 0: 10 }), 0, { kind: 'move', card: cardOf(3, 'clubs'), marble: 0, steps: 3 }),
  ).toEqual({ marble: 0, pos: 13 }));
test('exit lands the first base marble on your start', () =>
  expect(landing(board({}), 0, { kind: 'exit', card: cardOf(1, 'clubs') })).toEqual({ marble: 0, pos: 0 }));
test("an opponent's 5 lands past their home", () =>
  expect(
    landing(board({ 4: 14 }), 0, { kind: 'move', card: cardOf(5, 'clubs'), marble: 4, steps: 5 }),
  ).toEqual({ marble: 4, pos: 19 }));
test("a partner's 5 lands in their home", () =>
  expect(
    landing(board({ 8: 32 }), 0, { kind: 'move', card: cardOf(5, 'clubs'), marble: 8, steps: 5 }),
  ).toEqual({ marble: 8, pos: HOME + 2 }));
test('a swap lands on the target', () =>
  expect(
    landing(board({ 0: 5, 4: 30 }), 0, { kind: 'swap', card: cardOf(11, 'hearts'), marble: 0, target: 4 }),
  ).toEqual({ marble: 0, pos: 30 }));
test('burns have no landing', () =>
  expect(landing(board({}), 0, { kind: 'burn', card: cardOf(2, 'clubs') })).toBeNull());
test('base stays base for exits when the base is empty', () =>
  expect(
    landing(board({ 0: 1, 1: 2, 2: 3, 3: 4 }), 0, { kind: 'exit', card: cardOf(1, 'clubs') }),
  ).toBeNull());
