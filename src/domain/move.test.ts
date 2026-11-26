import { describe, expect, test } from 'vitest';
import { BASE, HOME, entranceOf, startOf } from './board';
import { exitMarble, fiveEntersHome, kingMove, moveMarble, newMarbles } from './move';

// Player 0 = red (marbles 0-3), 1 = marbles 4-7, 2 = red's partner (8-11), 3 = marbles 12-15.
// Board tile n of red's section is index n - 1.
function board(placed: Record<number, number>): number[] {
  const m = newMarbles();
  for (const [marble, pos] of Object.entries(placed)) m[Number(marble)] = pos;
  return m;
}

describe('board layout', () => {
  test('starts and home entrances', () => {
    expect([0, 1, 2, 3].map((p) => startOf(p as 0))).toEqual([0, 18, 36, 54]);
    expect(entranceOf(0)).toBe(70); // tile 17 of the section before red's start
    expect(entranceOf(1)).toBe(16);
  });
});

describe("user's jump example: red on 1, marbles on 2 and 7", () => {
  const start = board({ 0: 0, 4: 1, 12: 6 });
  test('A (1) kills the marble on 2', () => expect(moveMarble(start, 0, 1)).toEqual(board({ 0: 1, 12: 6 })));
  test('3 jumps the marble on 2 to 4', () => expect(moveMarble(start, 0, 3)?.[0]).toBe(3));
  test('5 stops behind the marble on 7', () => expect(moveMarble(start, 0, 5)?.[0]).toBe(5));
  test('6 kills the marble on 7', () => expect(moveMarble(start, 0, 6)).toEqual(board({ 0: 6, 4: 1 })));
  test('8 is illegal: it jumps 2 marbles', () => expect(moveMarble(start, 0, 8)).toBeNull());
});

describe('jumping', () => {
  test('never over your own marble', () => expect(moveMarble(board({ 0: 3, 1: 5 }), 0, 4)).toBeNull());
  test("over your partner's marble is fine", () =>
    expect(moveMarble(board({ 0: 3, 8: 5 }), 0, 4)?.[0]).toBe(7));
  test('landing on your own marble is illegal', () =>
    expect(moveMarble(board({ 0: 3, 1: 5 }), 0, 2)).toBeNull());
  test('backward 4 obeys the same limits', () => {
    expect(moveMarble(board({ 0: 10, 4: 8 }), 0, -4)?.[0]).toBe(6);
    expect(moveMarble(board({ 0: 10, 4: 8, 12: 7 }), 0, -4)).toBeNull();
  });
});

describe('invincible start tile', () => {
  // Player 1's marble sits on its own start (18).
  const blocked = board({ 0: 15, 4: 18 });
  test("can't jump it", () => expect(moveMarble(blocked, 0, 5)).toBeNull());
  test("can't land on it", () => expect(moveMarble(blocked, 0, 3)).toBeNull());
  test("can't be killed by a K", () => expect(kingMove(board({ 0: 8, 4: 18 }), 0)).toBeNull());
  test("a marble on someone else's start is not protected", () =>
    expect(moveMarble(board({ 0: 15, 8: 18 }), 0, 3)).toEqual(board({ 0: 18 })));
});

describe('K', () => {
  test('moves 13 and kills everything in its path, own marbles included', () => {
    const crowded = board({ 0: 0, 1: 2, 4: 3, 5: 5, 8: 7, 12: 9, 13: 13 });
    expect(kingMove(crowded, 0)).toEqual(board({ 0: 13 }));
  });
  test('9 to an invincible start 10 steps away: K not playable', () =>
    expect(kingMove(board({ 0: 8, 4: 18, 12: 10 }), 0)).toBeNull());
});

describe('leaving base', () => {
  test('puts a marble on the start tile', () => expect(exitMarble(newMarbles(), 0)?.[0]).toBe(0));
  test('not while your own marble is on your start', () => expect(exitMarble(board({ 0: 0 }), 0)).toBeNull());
  test('kills another colour on your start', () =>
    expect(exitMarble(board({ 4: 0 }), 0)).toEqual(board({ 0: 0 })));
  test('not with an empty base', () => expect(exitMarble(board({ 0: 1, 1: 2, 2: 3, 3: 4 }), 0)).toBeNull());
});

describe('home', () => {
  test('4 back from the start, then a 5 goes in (the shortcut)', () => {
    const back = moveMarble(board({ 0: 0 }), 0, -4)!;
    expect(back[0]).toBe(68);
    expect(moveMarble(back, 0, 5)?.[0]).toBe(HOME + 2);
  });
  test('entering is forced: too many steps is illegal', () =>
    expect(moveMarble(board({ 0: 68 }), 0, 9)).toBeNull());
  test('any marble on the entrance blocks entering', () => {
    expect(moveMarble(board({ 0: 68, 4: 70 }), 0, 4)).toBeNull();
    expect(moveMarble(board({ 0: 68, 8: 70 }), 0, 4)).toBeNull();
  });
  test('landing on the entrance kills the blocker', () =>
    expect(moveMarble(board({ 0: 68, 4: 70 }), 0, 2)).toEqual(board({ 0: 70 })));
  test('no jumping inside home', () => {
    expect(moveMarble(board({ 0: 69, 1: HOME + 1 }), 0, 4)).toBeNull();
    expect(moveMarble(board({ 0: 69, 1: HOME + 1 }), 0, 2)?.[0]).toBe(HOME);
  });
  test('marbles in home move deeper with an exact count', () => {
    expect(moveMarble(board({ 0: HOME }), 0, 3)?.[0]).toBe(HOME + 3);
    expect(moveMarble(board({ 0: HOME }), 0, 4)).toBeNull();
    expect(moveMarble(board({ 0: HOME + 1 }), 0, -4)).toBeNull();
  });
  test("other players' home holes don't block you", () =>
    expect(moveMarble(board({ 0: 69, 4: HOME, 5: HOME + 1 }), 0, 3)?.[0]).toBe(HOME + 1));
  test('K can enter home', () => expect(kingMove(board({ 0: 61 }), 0)?.[0]).toBe(HOME + 3));
  test("an opponent's 5 pushes past the entrance instead", () => {
    expect(fiveEntersHome(1, 0)).toBe(false);
    expect(moveMarble(board({ 0: 68 }), 0, 5, false)?.[0]).toBe(1);
  });
  test("a partner's 5 pushes into home", () => {
    expect(fiveEntersHome(2, 0)).toBe(true);
    expect(moveMarble(board({ 0: 68 }), 0, 5, fiveEntersHome(2, 0))?.[0]).toBe(HOME + 2);
  });
  test('base marbles never move', () => expect(moveMarble(board({ 0: BASE }), 0, 3)).toBeNull());
});
