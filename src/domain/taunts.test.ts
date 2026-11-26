import { expect, test } from 'vitest';
import { isTaunt, killed } from './taunts';

test('only preset taunts are accepted', () => {
  expect(isTaunt('yalla')).toBe(true);
  expect(isTaunt('<script>')).toBe(false);
  expect(isTaunt(3)).toBe(false);
});

test('spots a kill', () => {
  expect(killed([5, -1], [-1, 0])).toBe(true);
  expect(killed([-1, 5], [0, 7])).toBe(false);
});
