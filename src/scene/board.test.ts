import { expect, test } from 'vitest';
import { BASE, HOME } from '../domain/board';
import { route } from './board';

test('steps forward hole by hole, wrapping the board', () => expect(route(70, 1, 1)).toEqual([71, 0, 1]));
test('steps backward for a 4', () => expect(route(2, 70, 1)).toEqual([1, 0, 71, 70]));
test('turns into home at the entrance', () =>
  expect(route(68, HOME + 1, 0)).toEqual([69, 70, HOME, HOME + 1]));
test('moves deeper inside home', () => expect(route(HOME, HOME + 2, 0)).toEqual([HOME + 1, HOME + 2]));
test('leaving or going back to base is a jump, not a walk', () => {
  expect(route(BASE, 0, 0)).toBeNull();
  expect(route(10, BASE, 0)).toBeNull();
});
test('swaps further than a K are jumps', () => expect(route(5, 40, 0)).toBeNull());
