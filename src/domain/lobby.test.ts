import { describe, expect, test } from 'vitest';
import {
  type Lobby,
  type LobbyResult,
  cleanName,
  join,
  leave,
  lobbyView,
  newLobby,
  sit,
  start,
} from './lobby';

const ok = (r: LobbyResult): Lobby => {
  if ('error' in r) throw new Error(r.error);
  return r;
};

describe('names', () => {
  test('trims and collapses spaces', () => expect(cleanName('  Abu   Ali ')).toBe('Abu Ali'));
  test('Arabic names are fine', () => expect(cleanName('عبدالله')).toBe('عبدالله'));
  test('1 to 14 letters', () => {
    expect(cleanName('')).toBeNull();
    expect(cleanName('   ')).toBeNull();
    expect(cleanName('a'.repeat(14))).toBe('a'.repeat(14));
    expect(cleanName('a'.repeat(15))).toBeNull();
    expect(cleanName(42)).toBeNull();
  });
});

describe('lobby', () => {
  test('first to join is host, players fill seats in order', () => {
    const l = ok(join(ok(join(newLobby(), 'a', 'Ali')), 'b', 'Badr'));
    expect(l.host).toBe('a');
    expect(l.seats.map((s) => s?.name ?? null)).toEqual(['Ali', 'Badr', null, null]);
  });

  test('rejoining keeps your seat and updates your name', () => {
    const l = ok(join(ok(join(newLobby(), 'a', 'Ali')), 'a', 'Ali 2'));
    expect(l.seats[0]).toEqual({ id: 'a', name: 'Ali 2' });
    expect(l.seats[1]).toBeNull();
  });

  test('a fifth player is turned away', () => {
    let l = newLobby();
    for (const id of ['a', 'b', 'c', 'd']) l = ok(join(l, id, id));
    expect(join(l, 'e', 'e')).toEqual({ error: 'This room is full.' });
  });

  test('pick a seat to pick your team', () => {
    const l = ok(sit(ok(join(newLobby(), 'a', 'Ali')), 'a', 2));
    expect(l.seats.map((s) => s?.id ?? null)).toEqual([null, null, 'a', null]);
    expect(sit(l, 'a', 5)).toEqual({ error: 'No such seat.' });
    const two = ok(join(l, 'b', 'Badr'));
    expect(sit(two, 'b', 2)).toEqual({ error: 'That seat is taken.' });
  });

  test('host leaving passes host on', () => {
    const l = leave(ok(join(ok(join(newLobby(), 'a', 'Ali')), 'b', 'Badr')), 'a');
    expect(l.host).toBe('b');
    expect(l.seats[0]).toBeNull();
  });

  test('only the host starts, and no one joins after', () => {
    const l = ok(join(ok(join(newLobby(), 'a', 'Ali')), 'b', 'Badr'));
    expect(start(l, 'b')).toEqual({ error: 'Only the host can start the game.' });
    const started = ok(start(l, 'a'));
    expect(join(started, 'c', 'Cyrus')).toEqual({ error: 'This game has already started.' });
    expect(ok(join(started, 'b', 'Badr')).seats[1]?.id).toBe('b'); // reconnecting is fine
  });

  test('the view never leaks private ids', () => {
    const l = ok(join(ok(join(newLobby(), 'secret-a', 'Ali')), 'secret-b', 'Badr'));
    const view = lobbyView(l, 'secret-b');
    expect(JSON.stringify(view)).not.toContain('secret');
    expect(view).toMatchObject({ hostSeat: 0, you: 1, started: false });
  });
});
