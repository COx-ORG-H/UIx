/* Side-by-side recording of the from-trigger Modal EXPERIMENT for the operator: today's centred rise
 * (left / top row) against Modal origin="trigger" (right / bottom row), at desktop and phone widths,
 * light and dark. Each frame is a real screenshot of the harness with the dialog's transitions held
 * at a set time (Web Animations currentTime), so the frames do not depend on machine load.
 *
 *   node tests/modal-origin/build.mjs
 *   node tests/modal-origin/record.mjs <base-url-of-a-static-server-at-the-repo-root> <out-dir>
 *   e.g. node tests/modal-origin/record.mjs http://localhost:4178 ./modal-origin-media
 *
 * Writes, per width and theme, filmstrip-<width>-<theme>.png (enter and exit, every 40 ms) and
 * side-by-side-<width>-<theme>.webm (real time twice, then 4x slower). Not run in CI. */
import { chromium } from '@playwright/test';
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const [base = 'http://localhost:4178', outArg = 'modal-origin-media'] = process.argv.slice(2);
const OUT = resolve(outArg);
const WIDTHS = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 844 } };
const THEMES = ['light', 'dark'];
const VARIANTS = [['center', 'Today: centred rise'], ['trigger', 'Experiment: origin="trigger"']];
const STEP = 20; // ms between frames
const ENTER = 240; // --uix-dur-slow
const EXIT = 200; // --uix-dur-exit-slow is 160; the scrim's --uix-dur-overlay runs a little longer
const TRIGGER = { desktop: '#new', phone: '#edit' };

const times = (end) => Array.from({ length: Math.floor(end / STEP) + 1 }, (_, i) => i * STEP);

/** Hold every animation on the page at `t` ms. */
const seek = (page, t) => page.evaluate((at) => {
  for (const a of document.getAnimations()) { a.pause(); a.currentTime = at; }
}, t);

async function frames(browser, size, theme, origin, trigger) {
  const context = await browser.newContext({ viewport: size, colorScheme: theme, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${base}/tests/modal-origin/harness.html${origin === 'trigger' ? '?origin=trigger' : ''}`, { waitUntil: 'networkidle' });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Animation.enable');
  const shoot = async () => `data:image/png;base64,${(await page.screenshot()).toString('base64')}`;
  const out = { rest: await shoot(), enter: [], exit: [] };
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
  await page.locator(trigger).click();
  await page.waitForFunction(() => document.getElementById('dialog')?.open);
  for (const t of times(ENTER)) { await seek(page, t); out.enter.push(await shoot()); }
  await page.evaluate(() => { for (const a of document.getAnimations()) a.finish(); });
  await page.locator('#cancel').click();
  await page.waitForFunction(() => !document.getElementById('dialog')?.open);
  for (const t of times(EXIT)) { await seek(page, t); out.exit.push(await shoot()); }
  await context.close();
  return out;
}

const filmstripHtml = (sets, size, theme) => {
  const thumb = size.width > 600 ? 0.3 : 0.5;
  const w = Math.round(size.width * thumb);
  const pick = (list, every) => list.filter((_, i) => (i * STEP) % every === 0);
  const row = (label, list, phase) => `<div class="row"><div class="label">${label}<small>${phase}</small></div>${
    list.map((src, i) => `<figure><img src="${src}" width="${w}"><figcaption>${i * 40} ms</figcaption></figure>`).join('')}</div>`;
  return `<!doctype html><html data-theme="${theme}"><style>
    body { margin: 0; padding: 16px; font: 13px system-ui, sans-serif; background: ${theme === 'dark' ? '#111' : '#fff'}; color: ${theme === 'dark' ? '#eee' : '#111'}; display: inline-block; }
    .row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 12px; }
    .label { width: 150px; flex: none; font-weight: 600; } .label small { display: block; font-weight: 400; opacity: .7; }
    figure { margin: 0; } img { display: block; border: 1px solid #8884; } figcaption { text-align: center; opacity: .7; padding-top: 2px; }
  </style><body>${sets.map(([label, f]) => row(label, pick(f.enter, 40), 'enter')).join('')}${
    sets.map(([label, f]) => row(label, pick(f.exit, 40), 'exit')).join('')}</body></html>`;
};

const playerHtml = (sets, size, scale, theme) => `<!doctype html><html><style>
  body { margin: 0; background: ${theme === 'dark' ? '#111' : '#fff'}; color: ${theme === 'dark' ? '#eee' : '#111'}; font: 600 14px system-ui, sans-serif; display: flex; }
  .pane { width: ${Math.round(size.width * scale)}px; } .pane + .pane { border-left: 2px solid #8886; }
  .cap { height: 28px; display: flex; align-items: center; justify-content: center; gap: 8px; } .cap span { font-weight: 400; opacity: .7; }
  img { display: block; width: 100%; }
</style><body>${sets.map(([label]) => `<div class="pane"><div class="cap">${label}<span class="speed"></span></div><img></div>`).join('')}
<script>
  const sets = ${JSON.stringify(sets.map(([, f]) => f))};
  const imgs = [...document.querySelectorAll('img')];
  const speeds = [...document.querySelectorAll('.speed')];
  const show = (key, i) => sets.forEach((f, n) => { imgs[n].src = key === 'rest' ? f.rest : f[key][Math.min(i, f[key].length - 1)]; });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function play(slow) {
    speeds.forEach((s) => { s.textContent = slow > 1 ? '(' + slow + 'x slower)' : '(real time)'; });
    show('rest'); await wait(700);
    for (let i = 0; i < sets[0].enter.length; i++) { show('enter', i); await wait(${STEP} * slow); }
    await wait(900);
    for (let i = 0; i < sets[0].exit.length; i++) { show('exit', i); await wait(${STEP} * slow); }
    show('rest'); await wait(500);
  }
  window.done = (async () => { await play(1); await play(1); await play(4); })();
</script></body></html>`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const [name, size] of Object.entries(WIDTHS)) {
  for (const theme of THEMES) {
    const sets = [];
    for (const [origin, label] of VARIANTS) sets.push([label, await frames(browser, size, theme, origin, TRIGGER[name])]);

    const sheet = await browser.newPage({ deviceScaleFactor: 1 });
    await sheet.setContent(filmstripHtml(sets, size, theme), { waitUntil: 'load' });
    await sheet.locator('body').screenshot({ path: join(OUT, `filmstrip-${name}-${theme}.png`) });
    await sheet.close();

    const scale = size.width > 600 ? 0.5 : 1;
    const video = { width: Math.round(size.width * scale) * 2 + 2, height: Math.round(size.height * scale) + 28 };
    const tmp = join(OUT, `tmp-${name}-${theme}`);
    const context = await browser.newContext({ viewport: video, recordVideo: { dir: tmp, size: video } });
    const player = await context.newPage();
    await player.setContent(playerHtml(sets, size, scale, theme), { waitUntil: 'load' });
    await player.evaluate(() => window.done);
    await context.close();
    const [file] = await readdir(tmp);
    await rename(join(tmp, file), join(OUT, `side-by-side-${name}-${theme}.webm`));
    await rm(tmp, { recursive: true, force: true });
    console.log(`✓ ${name} ${theme}`);
  }
}
await browser.close();
