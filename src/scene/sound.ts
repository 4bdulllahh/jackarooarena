// Every sound is made in code with Web Audio: no files to download or license.
// Browsers only allow audio after a click or key press, so the context starts on the first one.

export type Channel = 'master' | 'effects' | 'taunts';

/** Saved volume 0..1 for a channel (localStorage `volume:<channel>`), 1 when missing or broken. */
function load(channel: Channel): number {
  const v = Number(localStorage.getItem(`volume:${channel}`) ?? '1');
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
}
const volumes: Record<Channel, number> = {
  master: load('master'),
  effects: load('effects'),
  taunts: load('taunts'),
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let buses: Record<'effects' | 'taunts', GainNode> | null = null;
let out: GainNode | null = null; // where the next sound plays: the effects or the taunts bus
let noise: AudioBuffer | null = null;
let muted = localStorage.getItem('muted') === '1';
const level = () => (muted ? 0 : 0.8 * volumes.master);

function start(): void {
  if (ctx) return;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = level();
  master.connect(ctx.destination);
  buses = { effects: ctx.createGain(), taunts: ctx.createGain() };
  for (const name of ['effects', 'taunts'] as const) {
    buses[name].gain.value = volumes[name];
    buses[name].connect(master);
  }
  out = buses.effects;
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}
addEventListener('pointerdown', start, { once: true });
addEventListener('keydown', start, { once: true });

export const isMuted = () => muted;

export function setMuted(value: boolean): void {
  muted = value;
  localStorage.setItem('muted', value ? '1' : '0');
  if (master && ctx) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.02);
}

export const getVolume = (channel: Channel) => volumes[channel];

export function setVolume(channel: Channel, value: number): void {
  volumes[channel] = Math.min(1, Math.max(0, value));
  localStorage.setItem(`volume:${channel}`, String(volumes[channel]));
  if (!ctx || !master || !buses) return;
  const node = channel === 'master' ? master : buses[channel];
  node.gain.setTargetAtTime(channel === 'master' ? level() : volumes[channel], ctx.currentTime, 0.02);
}

/** A pitched blip with a fast decay; `drop` bends the pitch down like a struck object. */
function tone(
  freq: number,
  length: number,
  volume: number,
  type: OscillatorType = 'sine',
  drop = 0.6,
  delay = 0,
) {
  if (!ctx || !out) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * drop, t + length);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

/** A burst of filtered noise: the texture of wood, paper and air. */
function hiss(freq: number, q: number, length: number, volume: number, sweepTo = freq, delay = 0) {
  if (!ctx || !out || !noise) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t);
  filter.frequency.exponentialRampToValueAtTime(sweepTo, t + length);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(filter).connect(gain).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + length + 0.02);
}

const vary = (x: number, amount = 0.08) => x * (1 + (Math.random() * 2 - 1) * amount);

export const sounds = {
  /** A marble tapping through a groove on its way. */
  tick() {
    tone(vary(1500), 0.03, 0.08, 'triangle', 0.7);
    hiss(vary(3000), 3, 0.02, 0.05);
  },
  /** The marble settling into its final groove: a round wooden "tok" with a little body. */
  drop() {
    tone(vary(1100), 0.07, 0.35, 'sine', 0.55);
    tone(vary(240), 0.16, 0.25, 'sine', 0.85);
    hiss(vary(1800), 2, 0.04, 0.15);
    tone(vary(1250), 0.05, 0.12, 'sine', 0.6, 0.075); // tiny settle bounce
  },
  /** Glass on glass: a marble knocked off the board. */
  clack() {
    tone(vary(2600), 0.06, 0.35, 'triangle', 0.8);
    tone(vary(3900), 0.05, 0.2, 'sine', 0.9);
    hiss(5000, 1.5, 0.03, 0.2);
    tone(vary(2900), 0.05, 0.18, 'triangle', 0.8, 0.09);
  },
  /** A card snapped down or dealt. */
  flick(delay = 0) {
    hiss(vary(4200), 1.2, 0.06, 0.3, 1500, delay);
    tone(vary(180), 0.04, 0.08, 'sine', 0.7, delay);
  },
  /** Your turn: a soft two-note chime. */
  ping() {
    tone(880, 0.6, 0.12, 'sine', 1);
    tone(1320, 0.5, 0.08, 'sine', 1, 0.12);
  },
  /** One sound per taunt, on the taunts volume. */
  taunt(id: string) {
    if (!buses) return;
    out = buses.taunts;
    tauntSound(id);
    out = buses.effects;
  },
  /** The camera moving between views. */
  whoosh() {
    hiss(300, 0.8, 0.35, 0.12, 1400);
  },
};

function tauntSound(id: string) {
  if (id === 'laugh')
    for (let i = 0; i < 4; i++) tone(vary(520 - i * 40), 0.09, 0.18, 'triangle', 0.8, i * 0.11);
  else if (id === 'yalla') {
    tone(392, 0.12, 0.2, 'square', 1);
    tone(587, 0.2, 0.2, 'square', 1.05, 0.13);
  } else if (id === 'facepalm') {
    tone(140, 0.2, 0.4, 'sine', 0.5);
    hiss(900, 1, 0.08, 0.25);
  } else if (id === 'khalas') {
    tone(660, 0.12, 0.18, 'square', 1);
    tone(440, 0.3, 0.18, 'square', 0.9, 0.14);
  } else if (id === 'clap') for (let i = 0; i < 3; i++) hiss(vary(1500), 1.5, 0.05, 0.4, 1200, i * 0.16);
  else if (id === 'fire') hiss(400, 1, 0.5, 0.25, 3000);
}
