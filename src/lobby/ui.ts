// The menu and lobby as a plain HTML form. It is visually hidden: the phone (scene/phone.ts) draws
// its `data-row` elements on its screen, so keyboard and screen readers still use real controls.
import { cardName } from '../domain/cards';
import type { Play } from '../domain/game';
import { MAX_NAME } from '../domain/lobby';
import { RULES } from './rules';
import { isRoomCode } from '../domain/roomCode';
import { type TauntId, isTaunt } from '../domain/taunts';

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

const TEAM = ['A', 'B', 'A', 'B'];
const COLOR = ['red', 'blue', 'yellow', 'green'];

export interface TableHooks {
  /** Your seat once you have one (0-3). */
  onSeat(seat: number): void;
  /** Every game update from the server. */
  onGame(view: GameView): void;
  /** Someone threw a taunt. */
  onTaunt(seat: number, id: TauntId): void;
}

export function startLobbyUi(
  root: HTMLElement,
  hooks: TableHooks,
): { play(play: Play): void; taunt(id: TauntId): void; menu(): void } {
  const codeFromUrl = location.pathname.slice(1).toUpperCase();
  root.innerHTML = `
    <section id="home">
      <h1 data-row="title">JackarooArena</h1>
      <button type="button" data-row data-go="entry" id="go-play">Play</button>
      <button type="button" data-row disabled id="chaos">Chaos (coming soon)</button>
      <button type="button" data-row id="go-rules">How to play</button>
      <button type="button" data-row data-go="settings">Settings</button>
      <button type="button" data-row id="resume" hidden>Back to the game</button>
    </section>
    <section id="rules" hidden>
      <h2 data-row="title" id="rules-title"></h2>
      <p data-row="para" id="rules-text"></p>
      <button type="button" data-row id="rules-next">Next</button>
      <button type="button" data-row id="rules-back">Back</button>
    </section>
    <form id="entry" hidden>
      <h2 data-row="title">Play</h2>
      <input id="name" data-row maxlength="${MAX_NAME}" aria-label="Your name" placeholder="Your name" autocomplete="nickname" />
      <input id="code" data-row maxlength="4" aria-label="Room code" placeholder="Room code (ABCD)" autocomplete="off" />
      <button type="submit" data-row>Join room</button>
      <button type="button" data-row id="create">Create room</button>
      <button type="button" data-row data-go="home">Back</button>
    </form>
    <section id="settings" hidden>
      <h2 data-row="title">Settings</h2>
      <input type="range" data-row data-label="Master" id="volume-master" min="0" max="100" step="5" aria-label="Master volume" />
      <input type="range" data-row data-label="Effects" id="volume-effects" min="0" max="100" step="5" aria-label="Effects volume" />
      <input type="range" data-row data-label="Taunts" id="volume-taunts" min="0" max="100" step="5" aria-label="Taunts volume" />
      <button type="button" data-row id="graphics">Graphics</button>
      <button type="button" data-row data-go="home">Back</button>
    </section>
    <section id="room" hidden>
      <h2 data-row="title">Room <span id="room-code"></span></h2>
      <button type="button" data-row id="copy">Copy link</button>
      <div id="seats"></div>
      <button type="button" data-row id="start" hidden>Start game</button>
      <p data-row id="wait" hidden>Waiting for the host</p>
    </section>
    <p id="message" data-row role="alert"></p>`;

  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const SCREENS = ['home', 'entry', 'settings', 'rules', 'room'];
  let screen = 'home';
  function show(next: string) {
    screen = next;
    for (const s of SCREENS) $(s).hidden = s !== next;
    say('');
    $(next).querySelector<HTMLElement>('input, button:not(:disabled):not([hidden])')?.focus();
  }
  for (const button of root.querySelectorAll<HTMLElement>('[data-go]'))
    button.onclick = () => show(button.dataset.go!);
  // Esc steps back to the main screen; the page then leaves Esc alone (preventDefault).
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || screen === 'home' || screen === 'room') return;
    e.preventDefault();
    show('home');
  });

  let page = 0;
  function showPage(n: number) {
    page = n;
    $('rules-title').textContent = `How to play ${n + 1}/${RULES.length}`;
    $('rules-text').textContent = RULES[n]!;
    $('rules-next').textContent = n === RULES.length - 1 ? 'Done' : 'Next';
  }
  $('go-rules').onclick = () => {
    showPage(0);
    show('rules');
  };
  $('rules-next').onclick = () => (page === RULES.length - 1 ? show('home') : showPage(page + 1));
  $('rules-back').onclick = () => (page === 0 ? show('home') : showPage(page - 1));
  const nameInput = $<HTMLInputElement>('name');
  const codeInput = $<HTMLInputElement>('code');
  nameInput.value = localStorage.getItem('name') ?? '';
  codeInput.oninput = () => (codeInput.value = codeInput.value.toUpperCase());
  const say = (text: string) => ($('message').textContent = text);
  show('home');
  // A room link opens straight on the Play screen with the code filled in.
  if (isRoomCode(codeFromUrl)) {
    codeInput.value = codeFromUrl;
    show('entry');
  }

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
      say('Connection lost. Reconnecting...');
      setTimeout(() => connect(code), 2000);
    };
    socket.onmessage = (event) => {
      const msg = JSON.parse(String(event.data)) as { t: string; id?: string; message?: string } & LobbyView &
        GameView;
      if (msg.t === 'welcome') {
        localStorage.setItem(`id:${code}`, msg.id!);
        if ($('room').hidden) show('room');
        say('');
      } else if (msg.t === 'error') say(msg.message!);
      else if (msg.t === 'lobby') {
        renderSeats((lobby = msg));
        if (msg.you >= 0) hooks.onSeat(msg.you);
      } else if (msg.t === 'taunt') {
        const t = msg as unknown as { seat: number; id: unknown };
        if (isTaunt(t.id)) hooks.onTaunt(t.seat, t.id);
      } else if (msg.t === 'game') {
        renderGame((game = msg));
        hooks.onGame(msg);
      }
    };
  }

  function renderSeats(view: LobbyView) {
    $('seats').replaceChildren(
      ...view.seats.map((seat, i) => {
        const free = !seat && !view.started;
        const row = document.createElement(free ? 'button' : 'p');
        row.dataset.row = '';
        row.dataset.seat = String(i);
        const who = seat ? seat.name + (seat.you ? ' (you)' : '') : view.started ? 'Bot' : 'Sit here';
        row.textContent = `${TEAM[i]}: ${who}${i === view.hostSeat ? ', host' : ''}`;
        if (free) row.onclick = () => send({ t: 'sit', seat: i });
        return row;
      }),
    );
    const host = view.you === view.hostSeat;
    $('start').hidden = view.started || !host;
    $('wait').hidden = view.started || host;
  }

  function renderGame(view: GameView) {
    $('game').hidden = false;
    // In a game the phone is a pause menu: no Play or Chaos, a way back to the table instead.
    $('go-play').hidden = $('chaos').hidden = true;
    $('resume').hidden = false;
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

  function named(): boolean {
    if (nameInput.value.trim()) return true;
    say('Type your name first.');
    nameInput.focus();
    return false;
  }

  async function roomExists(code: string): Promise<boolean> {
    const res = await fetch(`/api/rooms/${code}`).catch(() => null);
    if (!res?.ok) {
      say('Could not reach the server. Try again.');
      return false;
    }
    const info = (await res.json()) as { exists?: boolean; full?: boolean };
    const rejoining = localStorage.getItem(`id:${code}`) !== null;
    if (!info.exists) say('No room with that code.');
    else if (info.full && !rejoining) say('That room is full.');
    return Boolean(info.exists && (!info.full || rejoining));
  }

  $('entry').onsubmit = async (event) => {
    event.preventDefault();
    if (!named()) return;
    const code = codeInput.value.trim().toUpperCase();
    if (!isRoomCode(code)) return say('Room codes are 4 letters.');
    if (await roomExists(code)) connect(code);
  };
  $('create').onclick = async () => {
    if (!named()) return;
    const res = await fetch('/api/rooms', { method: 'POST' }).catch(() => null);
    const body = ((await res?.json().catch(() => null)) ?? {}) as { code?: string; error?: string };
    if (body.code) connect(body.code);
    else say(body.error ?? 'Could not create a room.');
  };
  $('start').onclick = () => send({ t: 'start' });
  $('rematch').onclick = () => send({ t: 'rematch' });
  // Coming back to a room link you were already in: rejoin your seat straight away.
  if (isRoomCode(codeFromUrl) && nameInput.value && localStorage.getItem(`id:${codeFromUrl}`))
    void roomExists(codeFromUrl).then((ok) => ok && connect(codeFromUrl));
  $('copy').onclick = () => navigator.clipboard.writeText(location.href).then(() => say('Link copied.'));
  return {
    play: (play) => send({ t: 'play', play }),
    taunt: (id) => send({ t: 'taunt', id }),
    menu: () => show('home'),
  };
}
