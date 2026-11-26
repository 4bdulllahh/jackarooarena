// Procedural textures drawn on canvases, so there is no art to download or license.
import * as THREE from 'three';

/** Repeatable noise so the room looks the same on every load. */
function seeded(seed: number): () => number {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function make(size: number, draw: (g: CanvasRenderingContext2D, rnd: () => number) => void, seed = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  draw(g, seeded(seed));
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Sprinkle darker and lighter pixels for a hand-made, worn feel. */
function grain(g: CanvasRenderingContext2D, rnd: () => number, size: number, amount: number, alpha = 0.12) {
  for (let i = 0; i < amount; i++) {
    g.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,240,200,${alpha})`;
    g.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), 1, 1);
  }
}

/** Warm lime plaster for the walls. */
export const plaster = () =>
  make(64, (g, rnd) => {
    g.fillStyle = '#d9b98c';
    g.fillRect(0, 0, 64, 64);
    grain(g, rnd, 64, 900, 0.08);
  });

/** Dark wood with grain lines, for the table and ceiling. */
export const wood = (base = '#6b3f1f', seed = 2) =>
  make(
    64,
    (g, rnd) => {
      g.fillStyle = base;
      g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 2 + Math.floor(rnd() * 3)) {
        g.fillStyle = `rgba(0,0,0,${0.08 + rnd() * 0.12})`;
        g.fillRect(0, y, 64, 1);
      }
      grain(g, rnd, 64, 300);
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
    grain(g, rnd, 128, 2500, 0.1);
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
      grain(g, rnd, 64, 400);
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
