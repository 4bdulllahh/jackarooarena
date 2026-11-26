// No I, L or O: they get misread when people share codes out loud.
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';

export function newRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (b) => LETTERS[b % LETTERS.length]).join('');
}

export function isRoomCode(value: string): boolean {
  return /^[A-HJKMNP-Z]{4}$/.test(value);
}
