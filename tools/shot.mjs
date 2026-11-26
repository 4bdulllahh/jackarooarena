// Browser check: drives the installed Edge with playwright-core and saves screenshots.
// Usage: node tools/shot.mjs <url> <out-dir> [steps...]
// Steps: wait:<ms>, click:<x>,<y> (fractions of the window), key:<Key>, shot:<name>
import { chromium } from 'playwright-core';

const [url, out, ...steps] = process.argv.slice(2);
const browser = await chromium.launch({
  channel: 'msedge',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url);
for (const step of steps) {
  const [kind, arg] = step.split(/:(.*)/);
  if (kind === 'wait') await page.waitForTimeout(Number(arg));
  if (kind === 'key') await page.keyboard.press(arg);
  if (kind === 'click') {
    const [x, y] = arg.split(',').map(Number);
    await page.mouse.click(x * 1280, y * 720);
  }
  if (kind === 'shot') await page.screenshot({ path: `${out}/${arg}.png` });
  if (kind === 'text')
    console.log(
      arg,
      '=>',
      await page
        .locator(arg)
        .innerText()
        .catch(() => '(none)'),
    );
}
console.log(errors.length ? `errors: ${errors.join(' | ')}` : 'no page errors');
await browser.close();
