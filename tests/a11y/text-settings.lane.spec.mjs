/* Text settings lanes (roadmap #18): WCAG 1.4.12 text spacing, and the browser's default font size
 * at 20 px and 24 px (EN 301 549 user preferences; Windows text scaling arrives in the browser as
 * a larger default font size).
 *
 * Three projects run this file (playwright.config.mjs), each in Chromium, light theme:
 *   - `text-spacing` injects the WCAG 1.4.12 bookmarklet values on every element: line height
 *     1.5, letter spacing .12em, word spacing .16em, and 2em after every paragraph;
 *   - `font-20` and `font-24` set the browser's default font size (the setting a user changes,
 *     through CDP Page.setFontSizes) and reload. The kit sets type in rem and never sets a root
 *     size in px, so the root follows the setting.
 *
 * Each key component's specimens are measured twice, at the browser defaults and with the
 * setting, and the lane fails on what the setting broke:
 *   - clipped: text cut by a box with overflow hidden or clip (truncation included);
 *   - escaped: text drawn outside the bordered or filled box it sits in (a fixed-height button);
 *   - overlapping: two pieces of text drawn over each other.
 * Text that was already cut at the defaults (a deliberate one-line truncation with its full
 * value elsewhere) is not the setting's doing and is not counted.
 */
import { test, expect } from '@playwright/test';
import { showRoute } from './explorer-walk.mjs';

const KEY_COMPONENTS = [
  'button', 'input', 'textarea', 'select', 'checkbox', 'radio', 'switch', 'form', 'status-pill', 'labels', 'alert', 'toast',
  'tabs', 'segmented', 'table', 'pagination', 'page-header', 'sidebar', 'card', 'stat-tile', 'description-list', 'menu',
  'search-bar', 'tag-input', 'states', 'toggle-row', 'steps', 'pipeline', 'save-status', 'inbox', 'timeline', 'task-tray',
];

const TEXT_SPACING = `*, *::before, *::after { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
p { margin-bottom: 2em !important; }`;

/** In the page: every visible piece of text in the route's specimens, with what cuts or covers it. */
function measureText() {
  const stages = [...document.querySelectorAll('[data-docs-page] .uix-docs__demo-stage')];
  const TOL = 1.5;
  const hiddenClip = (el) => {
    const s = getComputedStyle(el);
    if (s.position !== 'absolute' && s.position !== 'fixed') return false;
    const r = el.getBoundingClientRect();
    return (r.width <= 1 && r.height <= 1) || /rect\(0(px)?,? ?0(px)?,? ?0(px)?,? ?0(px)?\)/.test(s.clip) || s.clipPath === 'inset(50%)';
  };
  const boxed = (s) => s.borderTopStyle !== 'none' && parseFloat(s.borderTopWidth) > 0
    || (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent');
  const out = { texts: [], overlaps: [] };
  stages.forEach((stage, si) => {
    const pieces = [];
    const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim()) continue;
      const el = node.parentElement;
      if (!el || el.closest('svg, script, style, template, [hidden], .uix-visually-hidden')) continue;
      if (getComputedStyle(el).visibility !== 'visible') continue;
      let skip = false;
      for (let a = el; a && a !== stage; a = a.parentElement) if (hiddenClip(a) || getComputedStyle(a).display === 'none' || getComputedStyle(a).opacity === '0') { skip = true; break; }
      if (skip) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
      if (!rects.length) continue;
      const box = rects.reduce((u, r) => ({ left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) }),
        { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
      let clipped = '';
      let escaped = '';
      for (let a = el; a && a !== stage.parentElement; a = a.parentElement) {
        const s = getComputedStyle(a);
        const r = a.getBoundingClientRect();
        const cutX = /hidden|clip/.test(s.overflowX) && (box.left < r.left - TOL || box.right > r.right + TOL);
        const cutY = /hidden|clip/.test(s.overflowY) && (box.top < r.top - TOL || box.bottom > r.bottom + TOL);
        const ellipsis = a === el && s.textOverflow === 'ellipsis' && a.scrollWidth > a.clientWidth + 1;
        const clamp = a === el && s.webkitLineClamp !== 'none' && a.scrollHeight > a.clientHeight + 1;
        if (!clipped && (cutX || cutY || ellipsis || clamp)) clipped = a.className || a.tagName;
        if (!escaped && a !== el && boxed(s) && /visible/.test(s.overflowY)
          && (box.top < r.top - TOL || box.bottom > r.bottom + TOL || box.left < r.left - TOL || box.right > r.right + TOL)) escaped = a.className || a.tagName;
        if (a === stage) break;
      }
      const id = `${si}:${pieces.length}`;
      pieces.push({ id, el, rects });
      out.texts.push({ id, text: node.textContent.trim().slice(0, 40), clipped, escaped, fontSize: parseFloat(getComputedStyle(el).fontSize) });
    }
    // two pieces of text drawn over each other (not one inside the other's element)
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i]; const b = pieces[j];
        if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const hit = a.rects.some((p) => b.rects.some((q) => Math.min(p.right, q.right) - Math.max(p.left, q.left) > 2 && Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top) > 2));
        if (hit) out.overlaps.push(`${a.id}|${b.id}`);
      }
    }
  });
  return out;
}

/** What the setting broke: problems with it that the same text did not have at the defaults. */
const broken = (base, now) => {
  const before = new Map(base.texts.map((t) => [t.id, t]));
  const found = [];
  for (const t of now.texts) {
    const was = before.get(t.id);
    if (!was || was.text !== t.text) continue; // the DOM differs between the runs: not comparable
    if (t.clipped && !was.clipped) found.push(`clipped by .${t.clipped}: "${t.text}"`);
    if (t.escaped && !was.escaped) found.push(`drawn outside .${t.escaped}: "${t.text}"`);
  }
  const overlappedBefore = new Set(base.overlaps);
  const text = new Map(now.texts.map((t) => [t.id, t.text]));
  for (const pair of now.overlaps) {
    if (overlappedBefore.has(pair)) continue;
    const [a, b] = pair.split('|');
    found.push(`overlapping: "${text.get(a)}" and "${text.get(b)}"`);
  }
  return found;
};

/** The route's first specimen, with the setting on, for the report. */
async function attachShot(testInfo, page, slug) {
  const stage = page.locator('[data-docs-page] .uix-docs__demo-stage').first();
  const body = await stage.screenshot({ animations: 'disabled' }).catch(() => null);
  if (body) await testInfo.attach(`${slug}.png`, { body, contentType: 'image/png' });
}

async function openExplorer(page) {
  await page.addInitScript(() => { try { localStorage.setItem('uix-theme', 'light'); } catch { /* private mode */ } });
  await page.goto('docs/explorer.html#introduction', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
}

test('key components keep every word readable with the setting', async ({ page, context }, testInfo) => {
  test.setTimeout(300_000);
  const { textSpacing, defaultFontSize } = testInfo.project.metadata ?? {};
  test.skip(!textSpacing && !defaultFontSize, 'a text-settings lane only');

  await openExplorer(page);
  let scaled = null;
  if (defaultFontSize) {
    scaled = await context.newPage();
    const cdp = await context.newCDPSession(scaled);
    await cdp.send('Page.setFontSizes', { fontSizes: { standard: defaultFontSize, fixed: Math.round(defaultFontSize * 13 / 16) } });
    await openExplorer(scaled);
    const root = await scaled.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    expect(root, `the root follows a ${defaultFontSize} px default font size (a px root size would pin it)`).toBe(defaultFontSize);
  }

  const problems = [];
  const unscaled = new Set();
  let measured = 0;
  for (const slug of KEY_COMPONENTS) {
    await showRoute(page, slug);
    const base = await page.evaluate(measureText);
    let now;
    if (textSpacing) {
      const style = await page.addStyleTag({ content: TEXT_SPACING });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      now = await page.evaluate(measureText);
      await attachShot(testInfo, page, slug);
      await style.evaluate((el) => el.remove());
    } else {
      await showRoute(scaled, slug);
      now = await scaled.evaluate(measureText);
      await attachShot(testInfo, scaled, slug);
      // type the kit sizes in px would not follow the setting
      const ratio = defaultFontSize / 16;
      const sizes = new Map(base.texts.map((t) => [t.id, t]));
      for (const t of now.texts) {
        const was = sizes.get(t.id);
        if (was && was.text === t.text && t.fontSize < was.fontSize * ratio * 0.9) unscaled.add(`#${slug}: "${t.text}" stays ${t.fontSize}px`);
      }
    }
    measured += now.texts.length;
    for (const p of broken(base, now)) problems.push(`#${slug}: ${p}`);
  }
  expect(measured, 'the lane measured the specimens').toBeGreaterThan(500);
  const lane = textSpacing ? 'WCAG 1.4.12 text spacing' : `a ${defaultFontSize} px default font size`;
  expect(problems, `${problems.length} piece(s) of text lost with ${lane}:\n${problems.join('\n')}`).toEqual([]);
  if (defaultFontSize) expect([...unscaled], `text that ignores ${lane}:\n${[...unscaled].join('\n')}`).toEqual([]);
});
