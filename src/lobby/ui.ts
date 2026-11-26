// shortcut: plain HTML lobby and 2D table so online play can be tested now; M9-M14 replace them.
import { cardName } from '../domain/cards';
import type { Play } from '../domain/game';
import { MAX_NAME } from '../domain/lobby';
import { isRoomCode } from '../domain/roomCode';
import { describePlay, drawBoard } from '../debug/board2d';

interface LobbyView {
  seats: ({ name: string; you: boolean } | null)[];
  hostSeat: number;
  you: number;
  started: boolean;
}

export interface GameView {
  marbles: number[];
  hand: number[];
  handSizes: number[];
  turn: number;
  pending: { kind: string; by?: number; victim?: number } | null;
  winner: 0 | 1 | null;
  lastDiscard: number | null;
  deadline: number | null;
  plays: Play[];
}

const TEAM = ['Team A', 'Team B', 'Team A', 'Team B'];
const COLOR = ['red', 'blue', 'yellow', 'green'];

export interface TableHooks {
  /** Your seat once you have one (0-3). */
  onSeat(seat: number): void;
  /** Every game update from the server. */
  onGame(view: GameView): void;
}

export function startLobbyUi(root: HTMLElement, hooks: TableHooks): void {
  const codeFromUrl = location.pathname.slice(1).toUpperCase();
  root.innerHTML = `
    <form id="entry">
      <label>Your name <input id="name" maxlength="${MAX_NAME}" required autocomplete="nickname" /></label>
      <label>Room code <input id="code" maxlength="4" placeholder="ABCD" autocomplete="off" /></label>
      <button type="submit" id="join">Join room</button>
      <button type="button" id="create">Create room</button>
    </form>
    <section id="room" hidden>
      <h2>Room <span id="room-code"></span> <button type="button" id="copy">Copy link</button></h2>
      <ol id="seats"></ol>
      <button type="button" id="start" hidden>Start game</button>
    </section>
    <section id="game" hidden>
      <canvas id="board" width="640" height="640" aria-label="Board"></canvas>
      <p id="turn" role="status"></p>
      <p id="hand"></p>
      <div id="plays"></div>
      <button type="button" id="rematch" hidden>Rematch</button>
    </section>
    <p id="message" role="alert"></p>`;

  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const nameInput = $<HTMLInputElement>('name');
  const codeInput = $<HTMLInputElement>('code');
  nameInput.value = localStorage.getItem('name') ?? '';
  if (isRoomCode(codeFromUrl)) codeInput.value = codeFromUrl;
  const say = (text: string) => ($('message').textContent = text);

  let socket: WebSocket | null = null;
  let lobby: LobbyView | null = null;
  let game: GameView | null = null;
  const send = (msg: object) => socket?.send(JSON.stringify(msg));
  const nameOf = (seat: number) => lobby?.seats[seat]?.name ?? `Bot (${COLOR[seat]})`;

  function connect(code: string) {
    const name = nameInput.value.trim();
    localStorage.setItem('name', name);
    history.replaceState(null, '', `/${code}`);
    $('room-code').textContent = code;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${protocol}://${location.host}/api/rooms/${code}/ws`);
    socket.onopen = () =>
      socket!.send(JSON.stringify({ t: 'join', name, id: localStorage.getItem(`id:${code}`) }));
    socket.onclose = () => {
      say('Connection lost. Reconnecting…');
      setTimeout(() => connect(code), 2000);
    };
    socket.onmessage = (event) => {
      const msg = JSON.parse(String(event.data)) as { t: string; id?: string; message?: string } & LobbyView &
        GameView;
      if (msg.t === 'welcome') {
        localStorage.setItem(`id:${code}`, msg.id!);
        $('entry').hidden = true;
        $('room').hidden = false;
        say('');
      } else if (msg.t === 'error') say(msg.message!);
      else if (msg.t === 'lobby') {
        renderSeats((lobby = msg));
        if (msg.you >= 0) hooks.onSeat(msg.you);
      } else if (msg.t === 'game') {
        renderGame((game = msg));
        hooks.onGame(msg);
      }
    };
  }

  function renderSeats(view: LobbyView) {
    $('seats').replaceChildren(
      ...view.seats.map((seat, i) => {
        const li = document.createElement('li');
        const who = seat
          ? seat.name + (seat.you ? ' (you)' : '')
          : view.started
            ? 'Bot'
            : 'Empty (bot if no one sits)';
        li.textContent = `${TEAM[i]}: ${who}${i === view.hostSeat ? ' · host' : ''} `;
        if (!seat && !view.started) {
          const sit = document.createElement('button');
          sit.textContent = 'Sit here';
          sit.onclick = () => send({ t: 'sit', seat: i });
          li.append(sit);
        }
        return li;
      }),
    );
    $('start').hidden = view.started || view.you !== view.hostSeat;
  }

  function renderGame(view: GameView) {
    $('game').hidden = false;
    drawBoard($<HTMLCanvasElement>('board').getContext('2d')!, view.marbles);
    $('hand').textContent = `Your cards: ${view.hand.map(cardName).join('  ') || '(none)'}`;
    $('plays').replaceChildren(
      ...view.plays.map((play) => {
        const button = document.createElement('button');
        button.textContent = describePlay(play);
        button.onclick = () => send({ t: 'play', play });
        return button;
      }),
    );
    $('rematch').hidden = view.winner === null || lobby?.you !== lobby?.hostSeat;
    renderTurn();
  }

  function renderTurn() {
    if (!game) return;
    const last = game.lastDiscard === null ? '' : ` · last card: ${cardName(game.lastDiscard)}`;
    if (game.winner !== null) {
      $('turn').textContent =
        `${game.winner === (lobby?.you ?? 0) % 2 ? 'Your team wins!' : 'The other team wins.'}`;
      return;
    }
    const actor = game.pending?.kind === 'pick' ? game.pending.by! : game.turn;
    const left = game.deadline ? Math.max(0, Math.ceil((game.deadline - Date.now()) / 1000)) : null;
    $('turn').textContent =
      `${actor === lobby?.you ? 'Your turn' : `${nameOf(actor)} is playing`}${left === null ? '' : ` · ${left}s`}${last}`;
  }
  setInterval(renderTurn, 500);

  async function roomExists(code: string): Promise<boolean> {
    const info = (await (await fetch(`/api/rooms/${code}`)).json()) as { exists?: boolean; full?: boolean };
    const rejoining = localStorage.getItem(`id:${code}`) !== null;
    if (!info.exists) say('No room with that code.');
    else if (info.full && !rejoining) say('That room is full.');
    return Boolean(info.exists && (!info.full || rejoining));
  }

  $('entry').onsubmit = async (event) => {
    event.preventDefault();
    const code = codeInput.value.trim().toUpperCase();
    if (!isRoomCode(code)) return say('Room codes are 4 letters.');
    if (await roomExists(code)) connect(code);
  };
  $('create').onclick = async () => {
    if (!nameInput.reportValidity()) return;
    const res = await fetch('/api/rooms', { method: 'POST' });
    const body = (await res.json()) as { code?: string; error?: string };
    if (body.code) connect(body.code);
    else say(body.error ?? 'Could not create a room.');
  };
  $('start').onclick = () => send({ t: 'start' });
  $('rematch').onclick = () => send({ t: 'rematch' });
  // Coming back to a room link you were already in: rejoin your seat straight away.
  if (isRoomCode(codeFromUrl) && nameInput.value && localStorage.getItem(`id:${codeFromUrl}`))
    void roomExists(codeFromUrl).then((ok) => ok && connect(codeFromUrl));
  $('copy').onclick = () => navigator.clipboard.writeText(location.href).then(() => say('Link copied.'));
}
