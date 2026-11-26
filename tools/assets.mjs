// Renders the PNG icons and the share image from public/logo.svg and public/favicon.svg with the
// installed Edge (playwright-core). Run after changing either SVG: node tools/assets.mjs
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const dataUrl = (file) => `data:image/svg+xml;base64,${readFileSync(file).toString('base64')}`;
const icon = dataUrl('public/favicon.svg');
const logo = dataUrl('public/logo.svg');

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();

async function render(html, width, height, out) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<body style="margin:0">${html}</body>`);
  await page.waitForLoadState('load');
  await page.screenshot({ path: out, omitBackground: true });
  console.log(out);
}

for (const [size, name] of [
  [32, 'favicon-32.png'],
  [180, 'apple-touch-icon.png'],
  [512, 'icon-512.png'], // app icon for the desktop build later
])
  await render(
    `<img src="${icon}" width="${size}" height="${size}" style="display:block">`,
    size,
    size,
    `public/${name}`,
  );

// Share image for links (Open Graph / Twitter): the logo beside the name and a one-line pitch.
await render(
  `<div style="width:1200px;height:630px;display:flex;align-items:center;gap:56px;padding:0 64px 0 0;box-sizing:border-box;
    background:radial-gradient(circle at 30% 40%,#7a3a16,#3a1a0a 60%,#160903);font-family:'Arial Black',Impact,sans-serif">
    <img src="${logo}" width="630" height="630" style="display:block">
    <div style="color:#f3e2c4">
      <div style="font-size:64px;color:#f2c14e;line-height:1.05">Jackaroo<br>for 4 friends</div>
      <div style="font-family:system-ui,sans-serif;font-size:30px;margin-top:28px;line-height:1.35">
        2 vs 2 in a cosy 3D majlis.<br>Free in your browser, no account.
      </div>
    </div>
  </div>`,
  1200,
  630,
  'public/og.png',
);
await browser.close();
