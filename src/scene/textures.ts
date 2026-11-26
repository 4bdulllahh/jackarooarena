// Procedural textures drawn on canvases, so there is no art to download or license.
import * as THREE from 'three';

/** Repeatable noise so the room looks the same on every load. */
function seeded(seed: number): () => number {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

// Patterns are drawn in small logical units on a canvas RES times larger, so they stay sharp up close.
const RES = 4;

function make(size: number, draw: (g: CanvasRenderingContext2D, rnd: () => number) => void, seed = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size * RES;
  const g = canvas.getContext('2d')!;
  g.scale(RES, RES);
  draw(g, seeded(seed));
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Sprinkle fine darker and lighter specks for a hand-made, worn feel. */
function grain(g: CanvasRenderingContext2D, rnd: () => number, size: number, amount: number, alpha = 0.12) {
  for (let i = 0; i < amount * RES * RES; i++) {
    g.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,240,200,${alpha})`;
    g.fillRect(rnd() * size, rnd() * size, (1 + rnd()) / RES, (1 + rnd()) / RES);
  }
}

/** Large soft blotches, so a flat colour looks like real plaster or worn wool. */
function mottle(g: CanvasRenderingContext2D, rnd: () => number, size: number, count: number, alpha: number) {
  for (let i = 0; i < count; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = size * (0.05 + rnd() * 0.15);
    const spot = g.createRadialGradient(x, y, 0, x, y, r);
    const tone = rnd() < 0.5 ? '0,0,0' : '255,240,210';
    spot.addColorStop(0, `rgba(${tone},${alpha})`);
    spot.addColorStop(1, `rgba(${tone},0)`);
    g.fillStyle = spot;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/** Fine threads across a woven surface. */
function weave(g: CanvasRenderingContext2D, size: number) {
  g.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < size; y += 0.75) g.fillRect(0, y, size, 0.25);
  g.fillStyle = 'rgba(255,240,210,0.04)';
  for (let x = 0; x < size; x += 0.75) g.fillRect(x, 0, 0.25, size);
}

/** Warm lime plaster for the walls. */
export const plaster = () =>
  make(64, (g, rnd) => {
    g.fillStyle = '#d9b98c';
    g.fillRect(0, 0, 64, 64);
    mottle(g, rnd, 64, 40, 0.06);
    grain(g, rnd, 64, 900, 0.08);
  });

/** Dark wood with grain lines, for the table and ceiling. */
export const wood = (base = '#6b3f1f', seed = 2) =>
  make(
    64,
    (g, rnd) => {
      g.fillStyle = base;
      g.fillRect(0, 0, 64, 64);
      // Wavy grain lines of varying weight.
      for (let y = 0; y < 64; y += 0.8 + rnd() * 2) {
        g.strokeStyle = `rgba(0,0,0,${0.05 + rnd() * 0.12})`;
        g.lineWidth = 0.2 + rnd() * 0.6;
        const wave = rnd() * 1.2;
        const phase = rnd() * 6;
        g.beginPath();
        for (let x = 0; x <= 64; x += 2) g.lineTo(x, y + Math.sin(x / 9 + phase) * wave);
        g.stroke();
      }
      mottle(g, rnd, 64, 12, 0.05);
      grain(g, rnd, 64, 200);
    },
    seed,
  );

/** A red Persian-style carpet: border bands, a field of small motifs and a central medallion. */
export const carpet = () =>
  make(128, (g, rnd) => {
    g.fillStyle = '#8e1f1f';
    g.fillRect(0, 0, 128, 128);
    const band = (inset: number, width: number, color: string) => {
      g.fillStyle = color;
      g.fillRect(inset, inset, 128 - inset * 2, width);
      g.fillRect(inset, 128 - inset - width, 128 - inset * 2, width);
      g.fillRect(inset, inset, width, 128 - inset * 2);
      g.fillRect(128 - inset - width, inset, width, 128 - inset * 2);
    };
    band(0, 12, '#1f2c5c');
    band(3, 1, '#d9a441');
    band(10, 2, '#d9a441');
    for (let i = 16; i < 112; i += 8) {
      g.fillStyle = '#e8d3a0';
      g.fillRect(i + 2, 5, 3, 3);
      g.fillRect(i + 2, 120, 3, 3);
      g.fillRect(5, i + 2, 3, 3);
      g.fillRect(120, i + 2, 3, 3);
    }
    for (let y = 20; y < 108; y += 10)
      for (let x = 20; x < 108; x += 10) {
        g.fillStyle = (x + y) % 20 === 0 ? '#b8862f' : '#5e1414';
        g.fillRect(x, y, 3, 3);
      }
    const diamond = (r: number, color: string) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(64, 64 - r);
      g.lineTo(64 + r, 64);
      g.lineTo(64, 64 + r);
      g.lineTo(64 - r, 64);
      g.fill();
    };
    diamond(34, '#1f2c5c');
    diamond(28, '#d9a441');
    diamond(24, '#8e1f1f');
    diamond(14, '#e8d3a0');
    diamond(8, '#1f2c5c');
    weave(g, 128);
    mottle(g, rnd, 128, 30, 0.05);
    grain(g, rnd, 128, 1500, 0.08);
  });

/** Al Sadu weave: bold stripes and rows of triangles in red, black and cream, for cushions. */
export const sadu = (seed = 3) =>
  make(
    64,
    (g, rnd) => {
      const rows = ['#a01d1d', '#1b1410', '#e9dcc0', '#a01d1d', '#d18a2c', '#1b1410', '#a01d1d', '#e9dcc0'];
      rows.forEach((color, i) => {
        g.fillStyle = color;
        g.fillRect(0, i * 8, 64, 8);
      });
      g.fillStyle = '#e9dcc0';
      for (let x = 0; x < 64; x += 8) for (let s = 0; s < 4; s++) g.fillRect(x + s, 12 + s, 8 - s * 2, 1); // triangle row
      g.fillStyle = '#1b1410';
      for (let x = 4; x < 64; x += 8) for (let s = 0; s < 4; s++) g.fillRect(x + s, 44 + s, 8 - s * 2, 1);
      weave(g, 64);
      grain(g, rnd, 64, 250);
    },
    seed,
  );

/** A geometric eight-point-star frieze for the band around the top of the walls. */
export const frieze = () =>
  make(64, (g, rnd) => {
    g.fillStyle = '#1e4a52';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#d9a441';
    g.fillRect(0, 0, 64, 4);
    g.fillRect(0, 60, 64, 4);
    const star = (cx: number, cy: number, r: number, color: string) => {
      g.fillStyle = color;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
      g.save();
      g.translate(cx, cy);
      g.rotate(Math.PI / 4);
      g.fillRect(-r, -r, r * 2, r * 2);
      g.restore();
    };
    star(32, 32, 16, '#d9a441');
    star(32, 32, 11, '#e9dcc0');
    star(32, 32, 5, '#a01d1d');
    grain(g, rnd, 64, 300);
  });

/** Old brass, slightly uneven, for the chandelier. */
export const brass = () =>
  make(32, (g, rnd) => {
    g.fillStyle = '#b8862f';
    g.fillRect(0, 0, 32, 32);
    grain(g, rnd, 32, 200, 0.2);
  });

/** A soft dark spot, for fake contact shadows. */
export const blobTexture = () =>
  make(64, (g) => {
    const shade = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    shade.addColorStop(0, 'rgba(0,0,0,0.55)');
    shade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = shade;
    g.fillRect(0, 0, 64, 64);
  });
