import * as THREE from 'three';
import type { Player } from './domain/board';
import { botPlay } from './domain/bot';
import { type Game, type Play, applyPlay, legalPlays, newGame } from './domain/game';
import { startLobbyUi } from './lobby/ui';
import { BOARD_TOP, Board } from './scene/board';
import { Controls } from './scene/controls';
import { buildMajlis } from './scene/majlis';
import { Phone } from './scene/phone';
import { Players } from './scene/players';
import { Retro, snapVertices } from './scene/retro';
import { isMuted, setMuted, sounds } from './scene/sound';
import { TAUNTS, type TauntId, killed, tauntLabel } from './domain/taunts';

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
// antialias off: the low-res pixel look is the point, and it's cheaper on weak PCs.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const retro = new Retro(renderer);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a0f08');
scene.fog = new THREE.Fog('#2a170c', 6, 14);

const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 30);
const rig = new THREE.Group(); // turns to face the board from your seat
rig.add(camera);

const majlis = buildMajlis();
const board = new Board();
const players = new Players(camera);
const phone = new Phone(camera, canvas, document.querySelector('#lobby')!);
scene.add(majlis.group, board.group, players.group, rig);
snapVertices(scene);

board.onLand = (_marble, final) => (final ? sounds.drop() : sounds.tick());
board.onKill = () => sounds.clack();

// The sound toggle is both a corner button and a row in the phone's Settings.
const showMute = () => {
  for (const button of document.querySelectorAll<HTMLButtonElement>('#mute, #sound')) {
    button.textContent = isMuted() ? 'Sound: off (M)' : 'Sound: on (M)';
    button.setAttribute('aria-pressed', String(isMuted()));
  }
};
const toggleMute = () => {
  setMuted(!isMuted());
  showMute();
};
document.querySelector<HTMLButtonElement>('#mute')!.onclick = toggleMute;
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.key.toLowerCase() !== 'm') return;
  toggleMute();
});

/** Card flicks when cards leave hands or get dealt, and a chime when it becomes your turn. */
let cardsHeld = -1;
let wasMyTurn = false;
function cardSounds(handSizes: number[], myTurn: boolean) {
  const held = handSizes.reduce((a, b) => a + b, 0);
  if (cardsHeld >= 0 && held < cardsHeld) sounds.flick();
  if (cardsHeld >= 0 && held > cardsHeld) for (let i = 0; i < 6; i++) sounds.flick(i * 0.07);
  cardsHeld = held;
  if (myTurn && !wasMyTurn) sounds.ping();
  wasMyTurn = myTurn;
}

// Camera poses, in your seat's frame. `V` switches between sitting and looking straight down.
// Development only: `?cam=overview` (corner of the room), `?demo` (play seat 0 against bots
// locally), `?demo=auto` (bots play every seat).
const params = new URLSearchParams(location.search);
const POSES = {
  seat: { eye: new THREE.Vector3(0, 0.95, 1.35), target: new THREE.Vector3(0, 0.42, -0.45) },
  top: { eye: new THREE.Vector3(0, BOARD_TOP + 1.45, 0.12), target: new THREE.Vector3(0, BOARD_TOP, 0) },
  overview: { eye: new THREE.Vector3(2.6, 2.3, 2.6), target: new THREE.Vector3(-0.6, 0.9, -0.6) },
};
const startPose = params.get('cam');
let pose: keyof typeof POSES = startPose === 'overview' || startPose === 'top' ? startPose : 'seat';
const eye = POSES[pose].eye.clone();
const target = POSES[pose].target.clone();
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.key.toLowerCase() !== 'v' || phone.shown > 0.5) return;
  pose = pose === 'top' ? 'seat' : 'top';
  sounds.whoosh();
});

function resize() {
  retro.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  phone.fit(camera.aspect);
}
addEventListener('resize', resize);
resize();

const look = new THREE.Vector3();
let turn: number | null = null;
let last = 0;
renderer.setAnimationLoop((t) => {
  const ease = 1 - Math.exp(-(t - last) / 120); // smooth glide between poses
  last = t;
  eye.lerp(POSES[pose].eye, ease);
  target.lerp(POSES[pose].target, ease);
  const sway = pose === 'seat' ? 1 : 0;
  camera.position.set(
    eye.x + Math.sin(t / 2700) * 0.015 * sway,
    eye.y + Math.sin(t / 1900) * 0.008 * sway,
    eye.z,
  );
  camera.lookAt(rig.localToWorld(look.copy(target)));
  majlis.update(t);
  board.update(t);
  phone.update(t);
  players.ownDrop = phone.shown * 0.4;
  players.update(t, turn);
  placeBubbles(t);
  retro.render(scene, camera);
});

const status = document.querySelector('#status')!;
fetch('/api/health')
  .then((r) => (r.ok ? 'Server: ok' : `Server: error ${r.status}`))
  .catch(() => 'Server: unreachable')
  .then((text) => (status.textContent = text));

let seat: Player = 0;

// Taunts: speech bubbles over the speaker's head for 2.5 s (yours shows above your cards).
const bubbles: { el: HTMLElement; seat: number; until: number }[] = [];
const headPos = new THREE.Vector3();
function showTaunt(from: number, id: TauntId) {
  const el = document.createElement('div');
  el.className = 'bubble';
  el.textContent = tauntLabel(id);
  document.body.append(el);
  bubbles.push({ el, seat: from, until: performance.now() + 2500 });
  sounds.taunt(id);
}
function placeBubbles(now: number) {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]!;
    if (now > b.until) {
      b.el.remove();
      bubbles.splice(i, 1);
      continue;
    }
    let x = 0.5;
    let y = 0.62;
    if (b.seat !== seat) {
      players.headOf(b.seat).getWorldPosition(headPos);
      headPos.y += 0.2;
      headPos.project(camera);
      x = (headPos.x + 1) / 2;
      y = (1 - headPos.y) / 2;
    }
    b.el.style.left = `${Math.min(92, Math.max(8, x * 100))}%`;
    b.el.style.top = `${Math.min(90, Math.max(6, y * 100))}%`;
  }
}

let sendTaunt: (id: TauntId) => void = () => {};
const tauntMenu = document.querySelector<HTMLElement>('#taunts')!;
tauntMenu.replaceChildren(
  ...TAUNTS.map((t) => {
    const button = document.createElement('button');
    button.textContent = t.label;
    button.onclick = () => {
      sendTaunt(t.id);
      tauntMenu.hidden = true;
    };
    return button;
  }),
);
document.querySelector<HTMLButtonElement>('#taunt')!.onclick = () => (tauntMenu.hidden = !tauntMenu.hidden);
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key.toLowerCase() === 't') tauntMenu.hidden = !tauntMenu.hidden;
  if (e.key === 'Escape') tauntMenu.hidden = true;
});
let sendPlay: (play: Play) => void = () => {};
const controls = new Controls(camera, canvas, board, players, document.querySelector('#choices')!, (play) =>
  sendPlay(play),
);

const ui = startLobbyUi(document.querySelector('#lobby')!, {
  onSeat: (s) => {
    seat = s as Player;
    rig.rotation.y = (seat * Math.PI) / 2;
    players.setSeat(seat);
  },
  onGame: (view) => {
    phone.setUp(false);
    board.setPositions(view.marbles);
    players.setCards(view);
    controls.setState(view.marbles, seat, view.plays);
    turn = view.winner === null ? view.turn : null;
    cardSounds(view.handSizes, view.plays.length > 0);
  },
  onTaunt: showTaunt,
});
sendPlay = ui.play;
sendTaunt = ui.taunt;
document.querySelector<HTMLButtonElement>('#sound')!.onclick = toggleMute;
showMute();

if (params.has('demo')) {
  const auto = params.get('demo') === 'auto';
  phone.setUp(false);
  let game: Game = newGame(Math.random);
  const show = () => {
    board.setPositions(game.marbles);
    players.setCards({ hand: game.hands[0]!, handSizes: game.hands.map((h) => h.length), turn: game.turn });
    const plays = auto ? [] : legalPlays(game, 0);
    controls.setState(game.marbles, 0, plays);
    turn = game.turn;
    cardSounds(
      game.hands.map((h) => h.length),
      plays.length > 0,
    );
  };
  sendPlay = (play) => {
    game = applyPlay(game, 0, play, Math.random) ?? game;
    show();
  };
  sendTaunt = (id) => showTaunt(0, id);
  show();
  setInterval(() => {
    if (game.winner !== null) game = newGame(Math.random);
    const actor = (game.pending?.kind === 'pick' ? game.pending.by : game.turn) as Player;
    if (actor === 0 && !auto) return; // your move: waiting for a click
    const before = game.marbles;
    game = applyPlay(game, actor, botPlay(game, actor, Math.random), Math.random)!;
    show();
    if (killed(before, game.marbles) && Math.random() < 0.5)
      showTaunt(actor, Math.random() < 0.5 ? 'laugh' : 'fire');
  }, 700);
}
