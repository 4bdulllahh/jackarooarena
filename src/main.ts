import * as THREE from 'three';
import { startLobbyUi } from './lobby/ui';

// shortcut: placeholder scene to prove three.js and the Worker run, replaced in M8 (majlis).
const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const scene = new THREE.Scene();
scene.background = new THREE.Color('#2a170c');
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 4, 6);
camera.lookAt(0, 0, 0);

scene.add(new THREE.HemisphereLight('#ffd9a0', '#3a2010', 1.5));
const board = new THREE.Mesh(
  new THREE.CylinderGeometry(2.5, 2.5, 0.2, 24),
  new THREE.MeshLambertMaterial({ color: '#8a5a2b', flatShading: true }),
);
scene.add(board);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

renderer.setAnimationLoop((t) => {
  board.rotation.y = t / 4000;
  renderer.render(scene, camera);
});

const status = document.querySelector('#status')!;
fetch('/api/health')
  .then((r) => (r.ok ? 'Server: ok' : `Server: error ${r.status}`))
  .catch(() => 'Server: unreachable')
  .then((text) => (status.textContent = text));

startLobbyUi(document.querySelector('#lobby')!);
