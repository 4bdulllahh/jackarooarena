// How to play, one short page at a time on the phone (about 9 lines of 20 letters each).
// The house rules in full are in docs/braindump.md.
export const RULES: string[] = [
  "2 against 2, partners sit opposite. Get all 8 of your team's marbles home to win. All yours home? Your cards move your partner's.",
  'Everyone gets 4 cards, then 4, then 5. Play one card a turn; turns pass to your right. No card fits? You burn (throw away) one.',
  'Leave base with an A or a K. A move can jump over 1 marble, never your own. Land on a marble to kill it: it goes back to base.',
  'A marble on its own start tile is safe: nothing can jump, kill or swap it. Tile 17 is your home entrance; a marble there blocks it.',
  'A: out, 1 or 11. 2, 3, 6, 8, 9: move that many. 4: back 4, a shortcut home. Black 10, J, Q: move 10, 11, 12.',
  "5: move any marble 5, even an opponent's. 7: move 7 or split it, like 4 + 3. K: out, or move 13 killing every marble in its path.",
  "Red 10: the next player burns a card. Red J: swap with any marble. Red Q: pick one of the next player's cards to burn.",
  'Reaching tile 17 means you go in. Moves inside home need the exact count. Sabotage wins games. Press T to taunt!',
];
