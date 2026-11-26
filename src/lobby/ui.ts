// shortcut: plain HTML lobby so rooms can be tested now; M14 moves this onto the in-hand phone menu.
import { MAX_NAME } from '../domain/lobby';
import { isRoomCode } from '../domain/roomCode';

interface LobbyView {
  seats: ({ name: string; you: boolean } | null)[];
  hostSeat: number;
  you: number;
  started: boolean;
}

const TEAM = ['Team A', 'Team B', 'Team A', 'Team B'];

export function startLobbyUi(root: HTMLElement): void {
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
      <p id="started" hidden>Game started. The table comes in the next milestones.</p>
    </section>
    <p id="message" role="alert"></p>`;

  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const nameInput = $<HTMLInputElement>('name');
  const codeInput = $<HTMLInputElement>('code');
  nameInput.value = localStorage.getItem('name') ?? '';
  if (isRoomCode(codeFromUrl)) codeInput.value = codeFromUrl;
  const say = (text: string) => ($('message').textContent = text);

  let socket: WebSocket | null = null;

  function connect(code: string) {
    const name = nameInput.value.trim();
    localStorage.setItem('name', name);
    history.replaceState(null, '', `/${code}`);
    $('room-code').textContent = code;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${protocol}://${location.host}/api/rooms/${code}/ws`);
    socket.onopen = () =>
      socket!.send(JSON.stringify({ t: 'join', name, id: localStorage.getItem(`id:${code}`) }));
    socket.onclose = () => say('Disconnected from the room. Refresh to rejoin.');
    socket.onmessage = (event) => {
      const msg = JSON.parse(String(event.data)) as { t: string; id?: string; message?: string } & LobbyView;
      if (msg.t === 'welcome') {
        localStorage.setItem(`id:${code}`, msg.id!);
        $('entry').hidden = true;
        $('room').hidden = false;
        say('');
      } else if (msg.t === 'error') say(msg.message!);
      else if (msg.t === 'lobby') renderSeats(msg);
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
          sit.onclick = () => socket?.send(JSON.stringify({ t: 'sit', seat: i }));
          li.append(sit);
        }
        return li;
      }),
    );
    $('start').hidden = view.started || view.you !== view.hostSeat;
    $('started').hidden = !view.started;
  }

  async function roomExists(code: string): Promise<boolean> {
    const info = (await (await fetch(`/api/rooms/${code}`)).json()) as { exists?: boolean; full?: boolean };
    if (!info.exists) say('No room with that code.');
    else if (info.full) say('That room is full.');
    return Boolean(info.exists && !info.full);
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
  $('start').onclick = () => socket?.send(JSON.stringify({ t: 'start' }));
  $('copy').onclick = () => navigator.clipboard.writeText(location.href).then(() => say('Link copied.'));
}
