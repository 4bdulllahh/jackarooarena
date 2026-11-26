import * as THREE from 'three';
import { startLobbyUi } from './lobby/ui';
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
scene.add(majlis.group);
snapVertices(scene);

// shortcut: fixed view from seat 0 with a gentle idle sway; M11 adds the seat and top-down cameras.
const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 30);
// `?cam=overview` shows the whole room from a corner, for checking the scene during development.
const overview = new URLSearchParams(location.search).get('cam') === 'overview';
const eye = overview ? new THREE.Vector3(2.6, 2.3, 2.6) : new THREE.Vector3(0, 0.95, 1.35);
const target = overview ? new THREE.Vector3(-0.6, 0.9, -0.6) : new THREE.Vector3(0, 0.45, -0.6);

function resize() {
  retro.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

renderer.setAnimationLoop((t) => {
  camera.position.set(eye.x + Math.sin(t / 2700) * 0.015, eye.y + Math.sin(t / 1900) * 0.008, eye.z);
  camera.lookAt(target);
  majlis.update(t);
  retro.render(scene, camera);
});

const status = document.querySelector('#status')!;
fetch('/api/health')
  .then((r) => (r.ok ? 'Server: ok' : `Server: error ${r.status}`))
  .catch(() => 'Server: unreachable')
  .then((text) => (status.textContent = text));

startLobbyUi(document.querySelector('#lobby')!);
