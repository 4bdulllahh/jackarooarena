import * as THREE from 'three';
import type { Player } from './domain/board';
import { botPlay } from './domain/bot';
import { type Game, type Play, applyPlay, legalPlays, newGame } from './domain/game';
import { startLobbyUi } from './lobby/ui';
import { BOARD_TOP, Board } from './scene/board';
import { Controls } from './scene/controls';
import { buildMajlis } from './scene/majlis';
import { Players } from './scene/players';
import { Retro, snapVertices } from './scene/retro';
import { isMuted, setMuted, sounds } from './scene/sound';

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
scene.add(majlis.group, board.group, players.group, rig);
snapVertices(scene);

board.onLand = (_marble, final) => (final ? sounds.drop() : sounds.tick());
board.onKill = () => sounds.clack();

const muteButton = document.querySelector<HTMLButtonElement>('#mute')!;
const showMute = () => {
  muteButton.textContent = isMuted() ? 'Sound: off (M)' : 'Sound: on (M)';
  muteButton.setAttribute('aria-pressed', String(isMuted()));
};
muteButton.onclick = () => {
  setMuted(!isMuted());
  showMute();
};
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.key.toLowerCase() !== 'm') return;
  setMuted(!isMuted());
  showMute();
});
showMute();

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
  if (e.target instanceof HTMLInputElement || e.key.toLowerCase() !== 'v') return;
  pose = pose === 'top' ? 'seat' : 'top';
  sounds.whoosh();
});

function resize() {
  retro.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
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
  players.update(t, turn);
  retro.render(scene, camera);
});

const status = document.querySelector('#status')!;
fetch('/api/health')
  .then((r) => (r.ok ? 'Server: ok' : `Server: error ${r.status}`))
  .catch(() => 'Server: unreachable')
  .then((text) => (status.textContent = text));

let seat: Player = 0;
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
    board.setPositions(view.marbles);
    players.setCards(view);
    controls.setState(view.marbles, seat, view.plays);
    turn = view.winner === null ? view.turn : null;
    cardSounds(view.handSizes, view.plays.length > 0);
  },
});
sendPlay = ui.play;

if (params.has('demo')) {
  const auto = params.get('demo') === 'auto';
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
  show();
  setInterval(() => {
    if (game.winner !== null) game = newGame(Math.random);
    const actor = (game.pending?.kind === 'pick' ? game.pending.by : game.turn) as Player;
    if (actor === 0 && !auto) return; // your move: waiting for a click
    game = applyPlay(game, actor, botPlay(game, actor, Math.random), Math.random)!;
    show();
  }, 700);
}
