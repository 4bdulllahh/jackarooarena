// The pre-game room: 4 seats (0 and 2 are a team, 1 and 3 the other), a host, and a start.
// Pure functions so the Durable Object and tests share them.

export const MAX_NAME = 14;

export interface Seat {
  id: string; // private player id, kept by the client to reconnect
  name: string;
}

export interface Lobby {
  seats: (Seat | null)[];
  host: string | null;
  started: boolean;
}

export const newLobby = (): Lobby => ({ seats: [null, null, null, null], host: null, started: false });

/** Trim and validate a player name. Returns null if it's empty or too long. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const name = raw
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  return name.length >= 1 && [...name].length <= MAX_NAME ? name : null;
}

export type LobbyResult = Lobby | { error: string };

const seatOf = (lobby: Lobby, id: string) => lobby.seats.findIndex((s) => s?.id === id);

/** Join (or rejoin with a new name). Takes the first free seat. */
export function join(lobby: Lobby, id: string, rawName: unknown): LobbyResult {
  const name = cleanName(rawName);
  if (!name) return { error: `Pick a name of 1 to ${MAX_NAME} letters.` };
  const seats = [...lobby.seats];
  const mine = seatOf(lobby, id);
  if (mine >= 0) {
    seats[mine] = { id, name };
  } else {
    if (lobby.started) return { error: 'This game has already started.' };
    const free = seats.indexOf(null);
    if (free < 0) return { error: 'This room is full.' };
    seats[free] = { id, name };
  }
  return { ...lobby, seats, host: lobby.host ?? id };
}

/** Move to another empty seat (which also picks your team). */
export function sit(lobby: Lobby, id: string, seat: unknown): LobbyResult {
  const from = seatOf(lobby, id);
  if (lobby.started) return { error: 'The game has already started.' };
  if (from < 0) return { error: 'Join the room first.' };
  if (typeof seat !== 'number' || !Number.isInteger(seat) || seat < 0 || seat > 3)
    return { error: 'No such seat.' };
  if (lobby.seats[seat]) return { error: 'That seat is taken.' };
  const seats = [...lobby.seats];
  seats[seat] = seats[from]!;
  seats[from] = null;
  return { ...lobby, seats };
}

/** Leave before the game starts. The host role passes to the next seated player. */
export function leave(lobby: Lobby, id: string): Lobby {
  if (lobby.started) return lobby;
  const seats = lobby.seats.map((s) => (s?.id === id ? null : s));
  const host = lobby.host === id ? (seats.find((s) => s)?.id ?? null) : lobby.host;
  return { ...lobby, seats, host };
}

/** Only the host can start. Empty seats are played by bots. */
export function start(lobby: Lobby, id: string): LobbyResult {
  if (lobby.host !== id) return { error: 'Only the host can start the game.' };
  if (lobby.started) return { error: 'The game has already started.' };
  return { ...lobby, started: true };
}

/** What every client sees: names and who is a bot, never anyone's private id. */
export function lobbyView(lobby: Lobby, id: string) {
  return {
    seats: lobby.seats.map((s) => (s ? { name: s.name, you: s.id === id } : null)),
    hostSeat: lobby.seats.findIndex((s) => s !== null && s.id === lobby.host),
    you: seatOf(lobby, id),
    started: lobby.started,
  };
}
