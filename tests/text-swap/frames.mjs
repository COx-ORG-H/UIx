/* Frame strips of every in-place text swap, for an operator's review of the text-swap rule (text
 * goes fully out before the new text comes in). Each frame is stepped on a frozen clock
 * (stepper.mjs), so the strip shows the same instants the test measures, on any machine.
 *   node tests/text-swap/frames.mjs <out-dir> [label]
 * Writes <out-dir>/<label>-<theme>.png (one sheet: a strip per swap, the old and new text's
 * visibility under every frame) and <out-dir>/<label>.json. Without a running server it serves the
 * repo root itself; build the CSS and the harness first (node tests/text-swap/build.mjs).
 * Not a test: the assertions live in tests/a11y/text-swap.spec.mjs. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from 'serve-handler';
import { SWAPS, freezeClock, overlap, runSwap, startStepper } from './stepper.mjs';

const [out, label = 'frames'] = process.argv.slice(2);
if (!out) throw new Error('usage: node tests/text-swap/frames.mjs <out-dir> [label]');
mkdirSync(out, { recursive: true });
const root = fileURLToPath(new URL('../..', import.meta.url));
const server = createServer((req, res) => handler(req, res, { public: root }));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const only = process.env.FRAMES_ONLY?.split(',');
const EVERY = Number(process.env.FRAMES_EVERY ?? 20);

const browser = await chromium.launch();
const report = {};
for (const theme of (process.env.FRAMES_THEMES ?? 'light,dark').split(',')) {
  const strips = [];
  for (const [id, swap] of Object.entries(SWAPS)) {
    if (only && !only.includes(id)) continue;
    const page = await browser.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 2, colorScheme: theme });
    await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ } }, theme);
    await freezeClock(page);
    await page.goto(`${base}/tests/text-swap/harness.html`);
    await page.locator('#btn').waitFor();
    await startStepper(page);
    const shots = [];
    const box = async () => {
      const b = await page.locator(swap.root).first().boundingBox();
      const c = swap.clip ?? { top: -6, left: -6, width: b.width + 12, height: b.height + 12 };
      return { x: b.x + c.left, y: b.y + c.top, width: c.width, height: c.height };
    };
    const frames = await runSwap(page, swap, {
      onFrame: async (t) => { if (t % EVERY === 0) shots.push({ t, png: (await page.screenshot({ clip: await box(), animations: 'allow' })).toString('base64') }); },
    });
    const byT = new Map(frames.map((f) => [f.t, f]));
    strips.push({ id, title: swap.title, thumb: swap.thumb ?? 150, shots: shots.map((s) => ({ ...s, ...byT.get(s.t) })), overlap: overlap(frames) });
    if (theme === 'light') report[id] = { title: swap.title, overlap: Number(overlap(frames).toFixed(3)), frames };
    await page.close();
  }
  const dark = theme === 'dark';
  const pct = (v) => (v == null ? '–' : `${Math.round(v * 100)}`);
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{font:13px system-ui;margin:16px;background:${dark ? '#111' : '#fff'};color:${dark ? '#eee' : '#111'}}
    h1{font-size:17px;margin:0 0 4px} h2{font-size:14px;margin:18px 0 6px} p{margin:0 0 8px;opacity:.75}
    .strip{display:flex;gap:6px;flex-wrap:wrap} figure{margin:0;text-align:center} img{display:block;border:1px solid ${dark ? '#333' : '#ddd'};height:auto}
    figcaption{font:11px ui-monospace,monospace;margin-top:2px;white-space:nowrap} .both{color:#c62828;font-weight:700}</style>
    <h1>Text swaps — ${label} (${theme})</h1><p>Frames every ${EVERY} ms on a frozen clock. Under each: ms · old text visible % / new text visible %. Red = both texts visible at once.</p>
    ${strips.map((s) => `<h2>${s.title} — worst overlap ${pct(s.overlap)} %</h2><div class="strip">${s.shots.map((f) => {
      const both = Math.min(f.old, f.new) > 0.02;
      return `<figure><img src="data:image/png;base64,${f.png}" width="${s.thumb}"><figcaption class="${both ? 'both' : ''}">${f.t} · ${pct(f.old)}/${pct(f.new)}</figcaption></figure>`;
    }).join('')}</div>`).join('')}`;
  const sheet = await browser.newPage({ viewport: { width: 1500, height: 600 } });
  await sheet.setContent(html, { waitUntil: 'load' });
  const file = join(out, `${label}-${theme}.png`);
  await sheet.screenshot({ path: file, fullPage: true });
  writeFileSync(join(out, `${label}-${theme}.html`), html);
  await sheet.close();
  console.log(file);
}
writeFileSync(join(out, `${label}.json`), JSON.stringify(report, null, 1));
for (const [id, r] of Object.entries(report)) console.log(`${id.padEnd(15)} worst overlap ${r.overlap}`);
await browser.close();
server.close();
