/** Cards are ids 0..51: rank = id % 13 + 1 (1 = A, 11 = J, 12 = Q, 13 = K), suit = floor(id / 13). */
export type Card = number;

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
export type Suit = (typeof SUITS)[number];

export const rankOf = (card: Card): number => (card % 13) + 1;
export const suitOf = (card: Card): Suit => SUITS[Math.floor(card / 13)]!;
export const isRed = (card: Card): boolean => suitOf(card) === 'hearts' || suitOf(card) === 'diamonds';
export const cardOf = (rank: number, suit: Suit): Card => SUITS.indexOf(suit) * 13 + rank - 1;

const RANK_NAMES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
export const cardName = (card: Card): string => RANK_NAMES[rankOf(card) - 1]! + SUIT_SYMBOLS[suitOf(card)];

/** A fresh 52-card deck, shuffled with Fisher-Yates. `random` returns [0, 1) like Math.random. */
export function shuffledDeck(random: () => number): Card[] {
  return shuffle(
    Array.from({ length: 52 }, (_, i) => i),
    random,
  );
}

export function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}
