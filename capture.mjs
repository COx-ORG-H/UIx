// Before/after frames of the coarse-pointer press experiment (Button + Switch).
// usage: node capture.mjs <recDir>
import { chromium } from 'file:///E:/Development/Projects/uix-styleguide/node_modules/playwright/index.mjs';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { crc32 } from 'node:zlib';

const REC = process.argv[2];
const OUT = join(REC, 'out');
mkdirSync(OUT, { recursive: true });

const page = (css, theme) => `<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${pathToFileURL(join(REC, css)).href}">
<style>html,body{margin:0;background:var(--uix-bg-app);color:var(--uix-text)}
#stage{display:flex;gap:24px;align-items:center;padding:16px 20px;width:max-content}
#cap{font:500 11px/1 system-ui;color:var(--uix-text-muted)} #cap:empty{display:none}</style></head>
<body><div id="stage"><span id="cap"></span><button id="btn" class="uix-btn uix-btn--primary" type="button">Save</button>
<label id="sw" class="uix-switch"><input id="swi" type="checkbox" role="switch"><span class="uix-switch__track"></span>Notifications</label></div></body></html>`;

for (const css of ['before.css', 'after.css']) for (const theme of ['light']) {
  writeFileSync(join(REC, `${css}.${theme}.html`), page(css, theme));
}

// press-in then release timeline (ms from the state change)
const PRESS = [0, 40, 80, 160];
const RELEASE = [0, 40, 80, 120, 180, 280];

async function session(browser, { coarse, css, theme = 'light' }) {
  const ctx = await browser.newContext(coarse
    ? { hasTouch: true, isMobile: true, viewport: { width: 520, height: 200 }, deviceScaleFactor: 3 }
    : { viewport: { width: 520, height: 200 }, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  await p.goto(pathToFileURL(join(REC, `${css}.${theme}.html`)).href);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const nodeOf = async (sel) => (await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel })).nodeId;
  const media = await p.evaluate(() => ({ coarse: matchMedia('(pointer: coarse)').matches, fine: matchMedia('(pointer: fine)').matches }));
  return { ctx, p, cdp, nodeOf, media };
}

// Change state, flush style so the transitions exist, pause every animation and seek to t.
async function frameAt(s, change, t, clip) {
  await change();
  await s.p.evaluate((ms) => {
    for (const el of [document.getElementById('btn'), document.querySelector('.uix-switch__track')]) getComputedStyle(el).transform, getComputedStyle(el, '::after').transform;
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; }
  }, t);
  return s.p.screenshot({ clip, animations: 'allow' });
}

async function sequence(browser, opts, target) {
  const shots = [];
  const sel = target === 'button' ? '#btn' : '#sw';
  const clipSel = target === 'button' ? '#btn' : '#sw .uix-switch__track';
  const clipOf = async (s) => { const b = await s.p.locator(clipSel).boundingBox(); return { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 }; };
  for (const t of PRESS) {
    const s = await session(browser, opts);
    const node = await s.nodeOf(sel); const clip = await clipOf(s);
    shots.push({ label: `press +${t}ms`, png: await frameAt(s, () => s.cdp.send('CSS.forcePseudoState', { nodeId: node, forcedPseudoClasses: ['active'] }), t, clip) });
    await s.ctx.close();
  }
  for (const t of RELEASE) {
    const s = await session(browser, opts);
    const node = await s.nodeOf(sel); const clip = await clipOf(s);
    await s.cdp.send('CSS.forcePseudoState', { nodeId: node, forcedPseudoClasses: ['active'] });
    await s.p.evaluate(() => new Promise((r) => setTimeout(r, 400))); // fully pressed
    shots.push({ label: `release +${t}ms`, png: await frameAt(s, async () => {
      // a real tap: :active ends and the click toggles in the same task
      await s.cdp.send('CSS.forcePseudoState', { nodeId: node, forcedPseudoClasses: [] });
      if (target === 'switch') await s.p.evaluate(() => { document.getElementById('swi').checked = true; });
    }, t, clip) });
    await s.ctx.close();
  }
  const probe = await session(browser, opts);
  const media = probe.media; await probe.ctx.close();
  return { shots, media };
}

// Minimal APNG writer: same-size RGBA/RGB PNG frames from Playwright.
function chunks(buf) { const out = []; let o = 8; while (o < buf.length) { const len = buf.readUInt32BE(o); const type = buf.toString('latin1', o + 4, o + 8); out.push({ type, data: buf.subarray(o + 8, o + 8 + len) }); o += 12 + len; } return out; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td) >>> 0); return Buffer.concat([len, td, c]); }
function apng(frames, delaysMs) {
  const first = chunks(frames[0]); const ihdr = first.find((c) => c.type === 'IHDR').data;
  const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4);
  const parts = [frames[0].subarray(0, 8), chunk('IHDR', ihdr)];
  const actl = Buffer.alloc(8); actl.writeUInt32BE(frames.length, 0); actl.writeUInt32BE(0, 4); parts.push(chunk('acTL', actl));
  let seq = 0;
  frames.forEach((f, i) => {
    const fctl = Buffer.alloc(26); fctl.writeUInt32BE(seq++, 0); fctl.writeUInt32BE(w, 4); fctl.writeUInt32BE(h, 8);
    fctl.writeUInt16BE(delaysMs[i], 20); fctl.writeUInt16BE(1000, 22); parts.push(chunk('fcTL', fctl));
    for (const c of chunks(f).filter((c) => c.type === 'IDAT')) {
      if (i === 0) parts.push(chunk('IDAT', c.data));
      else { const s = Buffer.alloc(4); s.writeUInt32BE(seq++); parts.push(chunk('fdAT', Buffer.concat([s, c.data]))); }
    }
  });
  parts.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

const sheet = (rows) => `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:16px;background:#fff;font:12px/1.3 system-ui;color:#111}
h2{font-size:14px;margin:18px 0 6px} .row{display:flex;gap:6px;align-items:flex-start;margin-bottom:8px}
.tag{width:120px;font-weight:600;padding-top:6px} figure{margin:0} img{display:block;height:90px;border:1px solid #ddd}
figcaption{font-size:10px;color:#555;text-align:center}</style></head><body>${rows}</body></html>`;

const browser = await chromium.launch();
const report = {};
for (const target of ['button', 'switch']) {
  let html = '';
  for (const coarse of [true, false]) {
    for (const css of ['before.css', 'after.css']) {
      const key = `${target}-${coarse ? 'coarse' : 'fine'}-${css.replace('.css', '')}`;
      const { shots, media } = await sequence(browser, { coarse, css }, target);
      report[key] = { media, frames: shots.map((s) => s.label) };
      shots.forEach((s, i) => writeFileSync(join(OUT, `${key}-${String(i).padStart(2, '0')}.png`), s.png));
      // A loop: rest pause, press-in, hold, release to rest. Real time ×4 slower so the spring is visible.
      const delays = shots.map((s, i) => (i === PRESS.length - 1 ? 600 : i === shots.length - 1 ? 900 : 4 * (i < PRESS.length ? PRESS[i + 1] - PRESS[i] : RELEASE[i - PRESS.length + 1] - RELEASE[i - PRESS.length])));
      writeFileSync(join(OUT, `${key}.apng.png`), apng(shots.map((s) => s.png), delays));
      html += `<div class="row"><div class="tag">${coarse ? 'touch' : 'mouse'} · ${css.replace('.css', '')}</div>${shots.map((s) => `<figure><img src="data:image/png;base64,${s.png.toString('base64')}"><figcaption>${s.label}</figcaption></figure>`).join('')}</div>`;
    }
  }
  const p = await browser.newPage({ viewport: { width: 1400, height: 400 } });
  await p.setContent(sheet(`<h2>${target === 'button' ? 'Button (primary)' : 'Switch (off → on)'}: press, hold, release</h2>${html}`));
  await p.screenshot({ path: join(OUT, `sheet-${target}.png`), fullPage: true });
  await p.close();
}

// Fine pointer: are the before and after frames identical, byte for byte?
const fineSame = {};
for (const target of ['button', 'switch']) {
  const n = PRESS.length + RELEASE.length;
  fineSame[target] = Array.from({ length: n }, (_, i) => {
    const a = readFileSync(join(OUT, `${target}-fine-before-${String(i).padStart(2, '0')}.png`));
    const b = readFileSync(join(OUT, `${target}-fine-after-${String(i).padStart(2, '0')}.png`));
    return a.equals(b);
  });
}

// Computed values at rest / pressed (settled), per pointer and reduced-motion setting
const values = {};
for (const coarse of [true, false]) for (const reduce of [false, 'os', 'attr']) {
  const ctx = await browser.newContext({ ...(coarse ? { hasTouch: true, isMobile: true } : {}), reducedMotion: reduce === 'os' ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  await p.goto(pathToFileURL(join(REC, 'after.css.light.html')).href);
  if (reduce === 'attr') await p.evaluate(() => document.documentElement.setAttribute('data-motion', 'reduce'));
  const cdp = await ctx.newCDPSession(p); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  for (const sel of ['#btn', '#sw']) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
    await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] });
  }
  await p.evaluate(() => new Promise((r) => setTimeout(r, 500)));
  values[`${coarse ? 'coarse' : 'fine'}/${reduce || 'motion'}`] = await p.evaluate(() => ({
    btn: getComputedStyle(document.getElementById('btn')).transform,
    btnTransition: getComputedStyle(document.getElementById('btn')).transition.split(', ').at(-1),
    thumb: getComputedStyle(document.querySelector('.uix-switch__track'), '::after').transform,
  }));
  await ctx.close();
}

// A real-time slow-motion video of real taps (CDP touch events, playback ×0.25)
for (const css of ['before.css', 'after.css']) {
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 520, height: 120 }, deviceScaleFactor: 2, recordVideo: { dir: join(OUT, `video-${css}`), size: { width: 520, height: 120 } } });
  const p = await ctx.newPage();
  await p.goto(pathToFileURL(join(REC, `${css}.light.html`)).href);
  await p.evaluate((c) => { document.getElementById('cap').textContent = c === 'before.css' ? 'touch · before (master)' : 'touch · after (experiment)'; }, css);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.25 });
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  // headless Chromium does not set :active from synthetic touches, so the hold is DevTools' forced :active
  for (const [sel, hold] of [['#btn', '#btn'], ['#sw .uix-switch__track', '#sw'], ['#sw .uix-switch__track', '#sw']]) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: hold });
    const b = await p.locator(sel).boundingBox();
    const pt = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    await p.waitForTimeout(700);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
    await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] });
    await p.waitForTimeout(1200);
    await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(1600);
  }
  await ctx.close();
}

await browser.close();
writeFileSync(join(OUT, 'report.json'), JSON.stringify({ report, fineSame, values }, null, 2));
console.log(JSON.stringify({ fineSame, values, media: Object.fromEntries(Object.entries(report).map(([k, v]) => [k, v.media])) }, null, 2));
