import { BASE, HOME, type Player, type Pos, isTrack, marblesOf, ownerOf, partnerOf } from './board';
import { type Card, isRed, rankOf, shuffle, shuffledDeck } from './cards';
import { exitMarble, fiveEntersHome, isInvincible, kingMove, moveMarble, newMarbles } from './move';

/** One step of a 7 split. */
export interface Part {
  marble: number;
  steps: number;
}

export type Play =
  | { kind: 'exit'; card: Card } // A or K: bring a marble out of base
  | { kind: 'move'; card: Card; marble: number; steps: number }
  | { kind: 'king'; card: Card; marble: number } // K: move 13, killing everything in the path
  | { kind: 'split'; card: Card; a: Part; b: Part } // 7 split between 2 marbles
  | { kind: 'swap'; card: Card; marble: number; target: number } // red J
  | { kind: 'burnNext'; card: Card } // red 10: the next player burns a card of their choice
  | { kind: 'pickNext'; card: Card } // red Q: pick one of the next player's face-down cards to burn
  | { kind: 'burn'; card: Card } // no legal play, or answering a red 10
  | { kind: 'pickBurn'; index: number }; // the red Q player's blind pick

export type Pending =
  | { kind: 'mustBurn' } // the player whose turn it is was hit by a red 10
  | { kind: 'pick'; by: Player; victim: Player }; // waiting for the red Q player's pick

export interface Game {
  marbles: Pos[];
  hands: Card[][];
  deck: Card[];
  discard: Card[];
  dealer: Player;
  /** Which deal of the current deck: 0, 1 or 2 (4, 4, then 5 cards each). */
  deal: number;
  turn: Player;
  pending: Pending | null;
  /** The winning team (0 = players 0 and 2, 1 = players 1 and 3), or null while playing. */
  winner: 0 | 1 | null;
}

const DEAL_SIZES = [4, 4, 5];
const next = (p: Player): Player => ((p + 1) % 4) as Player;

const isFinished = (marbles: Pos[], p: Player): boolean => marblesOf(p).every((m) => marbles[m]! >= HOME);

/** The player whose marbles p moves: themselves, or their partner once all 4 of theirs are home. */
const controlledBy = (marbles: Pos[], p: Player): Player => (isFinished(marbles, p) ? partnerOf(p) : p);

/** Start a game. The dealer deals to the next player, who starts. */
export function newGame(random: () => number, dealer: Player = 0): Game {
  const game: Game = {
    marbles: newMarbles(),
    hands: [[], [], [], []],
    deck: shuffledDeck(random),
    discard: [],
    dealer,
    deal: 0,
    turn: next(dealer),
    pending: null,
    winner: null,
  };
  dealCards(game);
  return game;
}

function dealCards(game: Game): void {
  const size = DEAL_SIZES[game.deal]!;
  for (let i = 0; i < size; i++)
    for (let s = 1; s <= 4; s++) game.hands[(game.dealer + s) % 4]!.push(game.deck.pop()!);
}

const fixedSteps = (card: Card): number[] => {
  const rank = rankOf(card);
  if (rank === 1) return [1, 11];
  if (rank === 4) return [-4];
  if (rank === 10 || rank === 11 || rank === 12) return isRed(card) ? [] : [rank === 10 ? 10 : rank];
  if (rank === 5 || rank === 13) return [];
  return [rank];
};

/** The next player who still holds cards, or null if nobody does. */
function nextWithCards(game: Game, from: Player): Player | null {
  for (let p = next(from), i = 0; i < 4; p = next(p), i++) if (game.hands[p]!.length > 0) return p;
  return null;
}

interface Option {
  play: Play;
  marbles: Pos[];
}

/** Every play the card allows, with the marbles after it. */
function optionsFor(game: Game, player: Player, card: Card): Option[] {
  const { marbles } = game;
  const out: Option[] = [];
  const add = (play: Play, result: Pos[] | null) => result && out.push({ play, marbles: result });
  const own = controlledBy(marbles, player);
  const ownMarbles = marblesOf(own);
  const rank = rankOf(card);

  if (rank === 1 || rank === 13) add({ kind: 'exit', card }, exitMarble(marbles, own));
  for (const steps of fixedSteps(card))
    for (const marble of ownMarbles)
      add({ kind: 'move', card, marble, steps }, moveMarble(marbles, marble, steps));
  if (rank === 13)
    for (const marble of ownMarbles) add({ kind: 'king', card, marble }, kingMove(marbles, marble));
  if (rank === 5)
    for (let marble = 0; marble < marbles.length; marble++) {
      if (marbles[marble] === BASE || isInvincible(marbles, marble)) continue;
      add(
        { kind: 'move', card, marble, steps: 5 },
        moveMarble(marbles, marble, 5, fiveEntersHome(player, marble)),
      );
    }
  if (rank === 7)
    for (const a of ownMarbles)
      for (let first = 1; first <= 6; first++) {
        const half = moveMarble(marbles, a, first);
        if (!half) continue;
        for (const b of marblesOf(controlledBy(half, player))) {
          if (b === a) continue;
          add(
            { kind: 'split', card, a: { marble: a, steps: first }, b: { marble: b, steps: 7 - first } },
            moveMarble(half, b, 7 - first),
          );
        }
      }
  if (rank === 11 && isRed(card))
    for (const marble of ownMarbles)
      for (let target = 0; target < marbles.length; target++) {
        const ok = (m: number) => isTrack(marbles[m]!) && !isInvincible(marbles, m);
        if (ownerOf(target) === own || !ok(marble) || !ok(target)) continue;
        const swapped = [...marbles];
        [swapped[marble], swapped[target]] = [marbles[target]!, marbles[marble]!];
        add({ kind: 'swap', card, marble, target }, swapped);
      }
  if ((rank === 10 || rank === 12) && isRed(card)) {
    const victim = nextWithCards(game, player);
    if (victim !== null && victim !== player)
      add({ kind: rank === 10 ? 'burnNext' : 'pickNext', card }, [...marbles]);
  }
  return out;
}

const playKey = (p: Play): string => JSON.stringify(Object.entries(p).sort(([a], [b]) => a.localeCompare(b)));

function options(game: Game, player: Player): Option[] {
  if (game.winner !== null) return [];
  const { pending } = game;
  if (pending?.kind === 'pick') {
    if (player !== pending.by) return [];
    return game.hands[pending.victim]!.map((_, index) => ({
      play: { kind: 'pickBurn', index },
      marbles: game.marbles,
    }));
  }
  if (player !== game.turn) return [];
  const hand = game.hands[player]!;
  const burns = hand.map((card): Option => ({ play: { kind: 'burn', card }, marbles: game.marbles }));
  if (pending?.kind === 'mustBurn') return burns;
  const plays = hand.flatMap((card) => optionsFor(game, player, card));
  return plays.length > 0 ? plays : burns;
}

/** Everything `player` may do right now. Empty when it isn't their move. */
export const legalPlays = (game: Game, player: Player): Play[] => options(game, player).map((o) => o.play);

/** Apply a play. Returns the new game, or null if the play isn't legal. `random` shuffles new decks. */
export function applyPlay(game: Game, player: Player, play: Play, random: () => number): Game | null {
  const key = playKey(play);
  const chosen = options(game, player).find((o) => playKey(o.play) === key);
  if (!chosen) return null;

  const g: Game = structuredClone(game);
  g.marbles = [...chosen.marbles];

  if (play.kind === 'pickBurn') {
    const victim = (game.pending as { victim: Player }).victim;
    g.discard.push(...g.hands[victim]!.splice(play.index, 1));
    g.pending = null;
    endTurn(g, victim, random); // the burn was the victim's whole turn
    return g;
  }

  const hand = g.hands[player]!;
  hand.splice(hand.indexOf(play.card), 1);
  g.discard.push(play.card);
  g.pending = null;

  for (const team of [0, 1] as const)
    if (isFinished(g.marbles, team) && isFinished(g.marbles, partnerOf(team))) g.winner = team;
  if (g.winner !== null) return g;

  if (play.kind === 'pickNext') {
    const victim = nextWithCards(g, player)!;
    shuffle(g.hands[victim]!, random); // face down: the pick must be blind
    g.pending = { kind: 'pick', by: player, victim };
    return g;
  }
  endTurn(g, player, random);
  if (play.kind === 'burnNext') g.pending = { kind: 'mustBurn' };
  return g;
}

/** Pass the turn to the next player with cards, dealing (and reshuffling) when everyone is out. */
function endTurn(g: Game, from: Player, random: () => number): void {
  const p = nextWithCards(g, from);
  if (p !== null) {
    g.turn = p;
    return;
  }
  g.dealer = next(g.dealer);
  g.deal = (g.deal + 1) % DEAL_SIZES.length;
  if (g.deal === 0) {
    g.deck = shuffledDeck(random);
    g.discard = [];
  }
  dealCards(g);
  g.turn = next(g.dealer);
}

/** What one player may see: their own hand, and only the size of everyone else's. */
export function viewFor(game: Game, player: Player) {
  return {
    marbles: game.marbles,
    hand: game.hands[player]!,
    handSizes: game.hands.map((h) => h.length),
    dealer: game.dealer,
    turn: game.turn,
    pending: game.pending,
    winner: game.winner,
    lastDiscard: game.discard.at(-1) ?? null,
  };
}
