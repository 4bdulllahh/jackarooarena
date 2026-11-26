import * as THREE from 'three';
import type { Player } from './domain/board';
import { botPlay } from './domain/bot';
import { applyPlay, newGame } from './domain/game';
import { startLobbyUi } from './lobby/ui';
import { BOARD_TOP, Board } from './scene/board';
import { buildMajlis } from './scene/majlis';
import { Retro, snapVertices } from './scene/retro';

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
// antialias off: the low-res pixel look is the point, and it's cheaper on weak PCs.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const retro = new Retro(renderer);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a0f08');
scene.fog = new THREE.Fog('#2a170c', 6, 14);
const majlis = buildMajlis();
const board = new Board();
scene.add(majlis.group, board.group);
snapVertices(scene);

// Development views: `?cam=overview` (corner of the room), `?cam=top` (straight down on the board).
// `?demo` plays a local bot game on the board.
const params = new URLSearchParams(location.search);
const cam = params.get('cam');

// shortcut: fixed view from your seat with a gentle idle sway; M11 adds the top-down toggle.
const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 30);
const rig = new THREE.Group(); // turns to face the board from your seat
rig.add(camera);
scene.add(rig);
const eye =
  cam === 'overview'
    ? new THREE.Vector3(2.6, 2.3, 2.6)
    : cam === 'top'
      ? new THREE.Vector3(0, BOARD_TOP + 1.5, 0.35)
      : new THREE.Vector3(0, 0.95, 1.35);
const target =
  cam === 'overview'
    ? new THREE.Vector3(-0.6, 0.9, -0.6)
    : new THREE.Vector3(0, cam === 'top' ? 0 : 0.42, cam === 'top' ? 0 : -0.45);

function resize() {
  retro.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const look = new THREE.Vector3();
renderer.setAnimationLoop((t) => {
  camera.position.set(eye.x + Math.sin(t / 2700) * 0.015, eye.y + Math.sin(t / 1900) * 0.008, eye.z);
  camera.lookAt(rig.localToWorld(look.copy(target)));
  majlis.update(t);
  board.update(t);
  retro.render(scene, camera);
});

const status = document.querySelector('#status')!;
fetch('/api/health')
  .then((r) => (r.ok ? 'Server: ok' : `Server: error ${r.status}`))
  .catch(() => 'Server: unreachable')
  .then((text) => (status.textContent = text));

startLobbyUi(document.querySelector('#lobby')!, {
  onSeat: (seat) => (rig.rotation.y = (seat * Math.PI) / 2),
  onGame: (view) => board.setPositions(view.marbles),
});

if (params.has('demo')) {
  let game = newGame(Math.random);
  setInterval(() => {
    if (game.winner !== null) game = newGame(Math.random);
    const actor = (game.pending?.kind === 'pick' ? game.pending.by : game.turn) as Player;
    game = applyPlay(game, actor, botPlay(game, actor, Math.random), Math.random)!;
    board.setPositions(game.marbles);
  }, 700);
}
