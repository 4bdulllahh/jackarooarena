// The main menu: a low-poly phone in your left hand, close to the camera, while your right hand
// sips tea now and then. The real menu is an HTML form kept in the page but visually hidden, so
// the keyboard and screen readers use real buttons and inputs. The phone's screen draws that
// form's visible rows (elements marked `data-row`), and a click on the screen goes to the row
// under it.
import * as THREE from 'three';
import { PLAYER_COLORS } from './board';
import { LOOKS, hand } from './players';

// Screen layout units; the canvas is drawn at RES times that so text stays sharp at full resolution.
export const SCREEN = { w: 104, h: 180 };
const RES = 4;
const SCREEN_W = 0.064;
const SCREEN_H = (SCREEN_W * SCREEN.h) / SCREEN.w;
const TOP = 15; // below the status bar
const GAP = 3;

export type RowKind = 'title' | 'control' | 'text';
const HEIGHT: Record<RowKind, number> = { title: 22, control: 18, text: 13 };

/** Where each row sits on the screen, top to bottom. */
export function layout(kinds: RowKind[]): { y: number; h: number }[] {
  let y = TOP;
  return kinds.map((kind) => {
    const row = { y, h: HEIGHT[kind] };
    y += row.h + GAP;
    return row;
  });
}

const GOLD = '#d9a441';
const CREAM = '#f3e2c4';
const REST = new THREE.Vector3(0.095, -0.06, -0.16);
const SIP = new THREE.Vector3(0.055, -0.03, -0.11);

type Row = { el: HTMLElement; y: number; h: number };

export class Phone {
  readonly group = new THREE.Group();
  /** 1 while the phone is up, 0 once it's lowered out of view (eased). */
  shown = 1;
  private up = true;
  private canvas = document.createElement('canvas');
  private g = this.canvas.getContext('2d')!;
  private texture = new THREE.CanvasTexture(this.canvas);
  private screen: THREE.Mesh;
  private tea = new THREE.Group();
  private glass: THREE.Mesh;
  private rows: Row[] = [];
  private hover: HTMLElement | null = null;
  private dirty = true;
  private tick = '';
  private raycaster = new THREE.Raycaster();
  private last = 0;

  constructor(
    camera: THREE.Camera,
    private view: HTMLCanvasElement,
    private root: HTMLElement,
  ) {
    this.canvas.width = SCREEN.w * RES;
    this.canvas.height = SCREEN.h * RES;
    this.texture.anisotropy = 4;
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const skin = LOOKS[0]!.skin;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(SCREEN_W + 0.008, SCREEN_H + 0.016, 0.007),
      new THREE.MeshLambertMaterial({ color: '#16110e' }),
    );
    this.screen = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN_W, SCREEN_H),
      new THREE.MeshBasicMaterial({ map: this.texture }), // lit by itself, like a real screen
    );
    this.screen.position.z = 0.0036;
    const left = hand(skin, true);
    left.scale.setScalar(0.55);
    left.position.set(-SCREEN_W / 2 - 0.006, -SCREEN_H / 2 + 0.02, -0.006);
    left.rotation.z = -0.35;
    const phone = new THREE.Group();
    phone.add(body, this.screen, left);
    phone.position.set(-0.02, -0.004, -0.125);
    phone.rotation.set(-0.04, 0.08, 0.02);

    // Right hand with an istikana of tea.
    this.glass = new THREE.Mesh(
      new THREE.LatheGeometry(
        [new THREE.Vector2(0.016, 0), new THREE.Vector2(0.012, 0.03), new THREE.Vector2(0.019, 0.06)],
        8,
      ),
      new THREE.MeshBasicMaterial({ color: '#d8752a', transparent: true, opacity: 0.9 }), // glowing tea
    );
    this.glass.scale.setScalar(1.3);
    this.glass.position.set(-0.03, -0.04, 0.02);
    this.tea.add(hand(skin, false), this.glass);
    this.tea.scale.setScalar(0.6);

    this.group.add(phone, this.tea);
    this.group.name = 'phone';
    camera.add(this.group);

    const redraw = () => (this.dirty = true);
    new MutationObserver(redraw).observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    for (const type of ['focusin', 'focusout', 'input', 'selectionchange'])
      document.addEventListener(type, redraw);

    view.addEventListener('click', (e) => {
      const el = this.rowAt(e);
      if (!el) return;
      el.focus();
      if (el instanceof HTMLInputElement) el.setSelectionRange(el.value.length, el.value.length);
      else el.click();
    });
    view.addEventListener('pointermove', (e) => {
      const el = this.rowAt(e);
      if (el === this.hover) return;
      this.hover = el;
      view.style.cursor = el ? 'pointer' : '';
      redraw();
    });
    addEventListener('keydown', (e) => {
      if (!this.up || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      const list = this.rows.map((r) => r.el).filter(usable);
      const at = list.indexOf(document.activeElement as HTMLElement);
      const next = list[(at + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length];
      if (!next) return;
      e.preventDefault();
      next.focus();
    });
  }

  /** Raise the phone (menu) or lower it out of view (game). */
  setUp(up: boolean): void {
    this.up = up;
    this.root.inert = !up;
    if (!up) {
      this.hover = null;
      this.view.style.cursor = '';
    }
  }

  /** Narrow screens: centre the phone and let the tea hand go off the edge. */
  fit(aspect: number): void {
    this.group.position.x = aspect < 0.9 ? 0.02 : 0;
  }

  update(time: number): void {
    const ease = 1 - Math.exp(-(time - this.last) / 160);
    this.last = time;
    this.shown += ((this.up ? 1 : 0) - this.shown) * ease;
    this.group.visible = this.shown > 0.01;
    this.group.position.y = -(1 - this.shown) * 0.22;
    if (!this.group.visible) return;

    // A sip every 8 s: the glass comes up toward you and tips.
    const p = Math.max(0, ((time % 8000) / 8000 - 0.78) / 0.22);
    const s = Math.sin(Math.PI * p) ** 2;
    this.tea.position.lerpVectors(REST, SIP, s);
    this.tea.position.y += Math.sin(time / 1100) * 0.002;
    this.glass.rotation.z = s * 0.7;

    // Redraw on change, and when the caret blinks or the clock's minute changes.
    const tick = `${Math.floor(time / 500) % 2}${new Date().getMinutes()}`;
    if (tick !== this.tick) this.dirty = true;
    this.tick = tick;
    if (this.dirty) this.draw(tick[0] === '0');
  }

  private rowAt(e: MouseEvent): HTMLElement | null {
    if (!this.up) return null;
    const rect = this.view.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.group.parent as THREE.Camera);
    const uv = this.raycaster.intersectObject(this.screen)[0]?.uv;
    if (!uv) return null;
    const x = uv.x * SCREEN.w;
    const y = (1 - uv.y) * SCREEN.h;
    const row = this.rows.find((r) => y >= r.y && y < r.y + r.h && x >= 6 && x <= SCREEN.w - 6);
    return row && usable(row.el) ? row.el : null;
  }

  private draw(caret: boolean): void {
    this.dirty = false;
    const g = this.g;
    g.setTransform(RES, 0, 0, RES, 0, 0);
    const { w, h } = SCREEN;
    g.fillStyle = '#1d130d';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2b1a10';
    g.fillRect(0, h / 2, w, h / 2);

    // Status bar: clock and battery.
    g.fillStyle = CREAM;
    g.font = 'bold 7px system-ui, sans-serif';
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.fillText(new Date().toTimeString().slice(0, 5), 5, 7);
    g.fillRect(w - 15, 4, 9, 5);
    g.fillRect(w - 6, 5, 1, 3);

    const els = [...this.root.querySelectorAll<HTMLElement>('[data-row]')].filter(
      (el) => !el.closest('[hidden]') && (el instanceof HTMLInputElement || el.textContent!.trim()),
    );
    const kinds = els.map((el): RowKind =>
      el.dataset.row === 'title'
        ? 'title'
        : el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el.dataset.seat !== undefined
          ? 'control'
          : 'text',
    );
    const spots = layout(kinds);
    this.rows = els.map((el, i) => ({ el, ...spots[i]! }));

    for (const [i, { el, y, h: rh }] of this.rows.entries()) {
      const kind = kinds[i]!;
      const text = el instanceof HTMLInputElement ? el.value : el.textContent!.trim();
      const focused = document.activeElement === el;
      const x = 6;
      const rw = w - 12;
      if (kind === 'title') {
        g.font = 'bold 13px system-ui, sans-serif';
        g.textAlign = 'center';
        g.fillStyle = GOLD;
        g.fillText(text, w / 2, y + rh / 2, rw);
        continue;
      }
      if (kind === 'text') {
        g.font = '8px system-ui, sans-serif';
        g.textAlign = 'center';
        g.fillStyle = el.getAttribute('role') === 'alert' ? '#ffb38a' : '#c9b597';
        g.fillText(text, w / 2, y + rh / 2, rw);
        continue;
      }
      const disabled = !usable(el);
      const hovered = this.hover === el;
      let left = x + 5;
      if (el instanceof HTMLInputElement) {
        box(g, x, y, rw, rh, focused ? GOLD : '#8a6a3a', '#f4ead6', focused ? 2 : 1);
        g.font = 'bold 9px system-ui, sans-serif';
        g.textAlign = 'left';
        g.fillStyle = text ? '#1b1410' : '#8a7a68';
        g.fillText(text || el.placeholder, left, y + rh / 2, rw - 10);
        if (focused && caret) {
          const before = text.slice(0, el.selectionStart ?? text.length);
          g.fillStyle = '#1b1410';
          g.fillRect(left + Math.min(g.measureText(before).width, rw - 10), y + 4, 1, rh - 8);
        }
        continue;
      }
      const fill = focused ? GOLD : hovered ? '#4e321f' : disabled ? '#251a13' : '#3a2417';
      box(g, x, y, rw, rh, disabled ? '#5a4a3a' : GOLD, fill, 1);
      const seat = el.dataset.seat;
      if (seat !== undefined) {
        g.fillStyle = PLAYER_COLORS[Number(seat)]!;
        g.fillRect(left, y + rh / 2 - 3, 6, 6);
        left += 10;
      }
      g.font = 'bold 9px system-ui, sans-serif';
      g.fillStyle = focused ? '#1a0f08' : disabled && seat === undefined ? '#857360' : CREAM;
      if (seat === undefined) {
        g.textAlign = 'center';
        g.fillText(text, w / 2, y + rh / 2, rw - 8);
      } else {
        g.textAlign = 'left';
        g.fillText(text, left, y + rh / 2, x + rw - 4 - left);
      }
    }
    this.texture.needsUpdate = true;
  }
}

/** A row that can take focus: an input, or a button that isn't disabled. */
function usable(el: HTMLElement): boolean {
  return el instanceof HTMLInputElement || (el instanceof HTMLButtonElement && !el.disabled);
}

/** A filled box with a crisp border made of whole pixels. */
function box(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  border: string,
  fill: string,
  width: number,
): void {
  g.fillStyle = border;
  g.fillRect(x, y, w, h);
  g.fillStyle = fill;
  g.fillRect(x + width, y + width, w - width * 2, h - width * 2);
}
