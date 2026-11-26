import { expect, test } from 'vitest';
import { isRoomCode, newRoomCode } from './roomCode';

test('new codes are 4 valid letters', () => {
  for (let i = 0; i < 1000; i++) expect(isRoomCode(newRoomCode())).toBe(true);
});

test('rejects bad codes', () => {
  for (const bad of ['', 'ABC', 'ABCDE', 'abcd', 'ABIO', 'AB1D']) expect(isRoomCode(bad)).toBe(false);
});
