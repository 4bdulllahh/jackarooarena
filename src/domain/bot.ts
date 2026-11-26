import { BASE, HOME, type Player, TRACK, ownerOf, sameTeam, startOf } from './board';
import { type Card, rankOf } from './cards';
import { type Game, type Play, applyPlay, legalPlays } from './game';

/** How far a marble has got: base 0, then distance from its start, then home holes. */
function progress(pos: number, owner: Player): number {
  if (pos === BASE) return 0;
  if (pos >= HOME) return 100 + (pos - HOME) * 3;
  return 10 + ((pos - startOf(owner) + TRACK) % TRACK);
}

/** The board from `player`'s team's side: our progress minus theirs. */
function score(game: Game, player: Player): number {
  if (game.winner !== null) return game.winner === player % 2 ? 1e6 : -1e6;
  return game.marbles.reduce((sum, pos, m) => {
    const value = progress(pos, ownerOf(m));
    return sum + (sameTeam(ownerOf(m), player) ? value : -value);
  }, 0);
}

// Cards worth keeping: exits (A, K), the flexible 5 and 7, the red specials.
function keepValue(card: Card): number {
  return [0, 6, 1, 1, 3, 5, 1, 4, 1, 1, 2, 2, 2, 6][rankOf(card)]!;
}

/**
 * Pick a play for a bot: the one that leaves our team furthest ahead, saving good cards on ties.
 * Burning a card from an opponent's hand counts as a small win; from our partner's, a loss.
 */
export function botPlay(game: Game, player: Player, random: () => number): Play {
  const plays = legalPlays(game, player);
  if (plays.length === 0) throw new Error(`Player ${player} has nothing to play`);
  if (plays[0]!.kind === 'pickBurn') return plays[Math.floor(random() * plays.length)]!;

  let best: Play = plays[0]!;
  let bestValue = -Infinity;
  for (const play of plays) {
    const after = applyPlay(game, player, play, random)!;
    let value = score(after, player);
    if (play.kind === 'burnNext' || play.kind === 'pickNext') {
      const victim = after.pending?.kind === 'pick' ? after.pending.victim : after.turn;
      value += sameTeam(victim, player) ? -8 : 8;
    }
    value -= 'card' in play ? keepValue(play.card) : 0;
    value += random() * 0.5; // break ties so bots don't all play the same way
    if (value > bestValue) [best, bestValue] = [play, value];
  }
  return best;
}
