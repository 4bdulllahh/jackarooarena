import {
  BASE,
  HOME,
  HOME_SIZE,
  MARBLES_PER_PLAYER,
  TRACK,
  type Player,
  type Pos,
  entranceOf,
  isHome,
  isTrack,
  marblesOf,
  ownerOf,
  sameTeam,
  startOf,
} from './board';

/** Where every marble is, indexed by marble number (see ownerOf). */
export type Marbles = readonly Pos[];

export const newMarbles = (): Pos[] => Array<Pos>(4 * MARBLES_PER_PLAYER).fill(BASE);

const marbleAt = (marbles: Marbles, pos: Pos, owner: Player): number => {
  if (isHome(pos)) return marblesOf(owner).find((m) => marbles[m] === pos) ?? -1;
  return marbles.findIndex((p) => p === pos);
};

/** A marble on its owner's start tile can't be jumped, landed on, killed or swapped. */
export const isInvincible = (marbles: Marbles, marble: number): boolean =>
  marbles[marble] === startOf(ownerOf(marble));

/** The tiles a marble passes through, ending on its destination, or null if it can't go that far. */
function walk(from: Pos, owner: Player, steps: number, intoHome: boolean): Pos[] | null {
  if (!isTrack(from) && !(isHome(from) && steps > 0)) return null;
  const path: Pos[] = [];
  let cur = from;
  for (let s = 0; s < Math.abs(steps); s++) {
    if (steps < 0) cur = (cur - 1 + TRACK) % TRACK;
    else if (isHome(cur)) cur += 1;
    else if (intoHome && cur === entranceOf(owner)) cur = HOME;
    else cur = (cur + 1) % TRACK;
    if (cur >= HOME + HOME_SIZE) return null; // overshoots home, and skipping home isn't allowed
    path.push(cur);
  }
  return path;
}

const entersHome = (from: Pos, path: Pos[]): boolean => !isHome(from) && path.some(isHome);

/**
 * Move a marble `steps` tiles (negative = backward, the 4). Returns the new positions, or null
 * if the move is illegal. `intoHome` is false only when an opponent's 5 pushes the marble: then
 * it goes past its home entrance instead of in. Jump limits apply to the marble's own colour.
 */
export function moveMarble(marbles: Marbles, marble: number, steps: number, intoHome = true): Pos[] | null {
  const owner = ownerOf(marble);
  const from = marbles[marble]!;
  const path = walk(from, owner, steps, intoHome);
  if (!path || path.length === 0) return null;

  const others = marbles.map((p, m) => (m === marble ? BASE : p));
  let jumps = 0;
  for (const pos of path.slice(0, -1)) {
    const hit = marbleAt(others, pos, owner);
    if (hit < 0) continue;
    if (isHome(pos) || ownerOf(hit) === owner || isInvincible(others, hit)) return null;
    jumps++;
  }
  if (jumps > 1) return null;
  if (entersHome(from, path) && marbleAt(others, entranceOf(owner), owner) >= 0) return null;

  const dest = path[path.length - 1]!;
  const victim = marbleAt(others, dest, owner);
  if (victim >= 0 && (isHome(dest) || ownerOf(victim) === owner || isInvincible(others, victim))) return null;

  const next = [...marbles];
  if (victim >= 0) next[victim] = BASE;
  next[marble] = dest;
  return next;
}

/** K: move 13 and kill every marble on the track tiles it passes, your own included. */
export function kingMove(marbles: Marbles, marble: number): Pos[] | null {
  const owner = ownerOf(marble);
  const from = marbles[marble]!;
  const path = walk(from, owner, 13, true);
  if (!path) return null;

  const others = marbles.map((p, m) => (m === marble ? BASE : p));
  const victims: number[] = [];
  for (const pos of path) {
    const hit = marbleAt(others, pos, owner);
    if (hit < 0) continue;
    if (isHome(pos) || isInvincible(others, hit)) return null;
    victims.push(hit);
  }

  const next = [...marbles];
  for (const v of victims) next[v] = BASE;
  next[marble] = path[path.length - 1]!;
  return next;
}

/** A or K: bring a marble from base onto its start tile, killing any other colour sitting there. */
export function exitMarble(marbles: Marbles, player: Player): Pos[] | null {
  const marble = marblesOf(player).find((m) => marbles[m] === BASE);
  if (marble === undefined) return null;
  const start = startOf(player);
  const victim = marbles.findIndex((p) => p === start);
  if (victim >= 0 && ownerOf(victim) === player) return null;

  const next = [...marbles];
  if (victim >= 0) next[victim] = BASE;
  next[marble] = start;
  return next;
}

/** True when the pusher's 5 should send this marble into its home (own or partner's marble). */
export const fiveEntersHome = (pusher: Player, marble: number): boolean => sameTeam(pusher, ownerOf(marble));
