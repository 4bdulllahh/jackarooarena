// The Classic 2v2 circle board (docs/braindump.md items 13 and 36-49).
// Track tiles are 0..71. Player p's section is tiles p*18 .. p*18+17, numbered 1..18 on the
// real board, so tile 1 (index p*18) is p's start. Marbles move toward higher indexes, i.e.
// toward the next player in turn order.

export type Player = 0 | 1 | 2 | 3;
export const PLAYERS: readonly Player[] = [0, 1, 2, 3];

export const TRACK = 72;
export const SECTION = 18;
export const HOME_SIZE = 4;
export const MARBLES_PER_PLAYER = 4;

/** A marble's position: BASE, a track tile 0..71, or home hole HOME + 0..3 (deepest is HOME + 3). */
export type Pos = number;
export const BASE: Pos = -1;
export const HOME: Pos = TRACK;

export const isTrack = (pos: Pos): boolean => pos >= 0 && pos < TRACK;
export const isHome = (pos: Pos): boolean => pos >= HOME;

export const startOf = (p: Player): Pos => p * SECTION;
// Tile 17 of the section before p's start: two tiles before the start. p's home lane leaves from here.
export const entranceOf = (p: Player): Pos => (startOf(p) - 2 + TRACK) % TRACK;
export const partnerOf = (p: Player): Player => ((p + 2) % 4) as Player;
export const sameTeam = (a: Player, b: Player): boolean => a % 2 === b % 2;

/** Marbles are numbered 0..15; marble m belongs to player floor(m / 4). */
export const ownerOf = (marble: number): Player => Math.floor(marble / MARBLES_PER_PLAYER) as Player;
export const marblesOf = (p: Player): number[] =>
  Array.from({ length: MARBLES_PER_PLAYER }, (_, i) => p * MARBLES_PER_PLAYER + i);
