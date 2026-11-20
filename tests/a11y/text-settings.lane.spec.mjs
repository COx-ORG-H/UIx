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
 *   - clipped: text cut by a box with overflow hidden or clip, with no ellipsis or line clamp to
 *     say so (a chosen truncation shows "…" and keeps the full value elsewhere);
 *   - escaped: text drawn outside the bordered or filled box it sits in (a fixed-height button);
 *   - overlapping: two pieces of text drawn over each other (text that scrolls under a pinned,
 *     opaque column of its own scroller is covered, not overlapped, and stays reachable).
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
      const raw = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
      if (!raw.length) continue;
      // What a reader sees of the text: each line box cut to every scroller or clipping box around it
      // (a range reports the whole line, even the part a truncating cell hides).
      const rects = raw.map((r) => {
        let v = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        for (let a = el; a && a !== stage.parentElement; a = a.parentElement) {
          const c = getComputedStyle(a);
          const b = a.getBoundingClientRect();
          if (c.overflowX !== 'visible') v = { ...v, left: Math.max(v.left, b.left), right: Math.min(v.right, b.right) };
          if (c.overflowY !== 'visible') v = { ...v, top: Math.max(v.top, b.top), bottom: Math.min(v.bottom, b.bottom) };
          if (a === stage) break;
        }
        return v;
      }).filter((v) => v.right - v.left > 1 && v.bottom - v.top > 1);
      if (!rects.length) continue;
      const box = raw.reduce((u, r) => ({ left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) }),
        { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
      const seen = rects.reduce((u, r) => ({ left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) }),
        { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
      // a truncation the component chose ("…") between the text and a cutting box: its own doing
      let chosen = false;
      for (let a = el; a && a !== stage; a = a.parentElement) { const c = getComputedStyle(a); if (c.textOverflow === 'ellipsis' || c.webkitLineClamp !== 'none') { chosen = true; break; } }
      let clipped = '';
      let escaped = '';
      for (let a = el; a && a !== stage.parentElement; a = a.parentElement) {
        const s = getComputedStyle(a);
        const r = a.getBoundingClientRect();
        const cutX = /hidden|clip/.test(s.overflowX) && (box.left < r.left - TOL || box.right > r.right + TOL);
        const cutY = /hidden|clip/.test(s.overflowY) && (box.top < r.top - TOL || box.bottom > r.bottom + TOL);
        // An ellipsis or a line clamp is a truncation the component chose and shows ("…"), with the
        // full value elsewhere (a title, the record); a cut with no sign of it is lost text.
        if (!clipped && !chosen && (cutX || cutY)) clipped = a.className || a.tagName;
        if (!escaped && a !== el && boxed(s) && /visible/.test(s.overflowY)
          && (seen.top < r.top - TOL || seen.bottom > r.bottom + TOL || seen.left < r.left - TOL || seen.right > r.right + TOL)) escaped = a.className || a.tagName;
        if (a === stage) break;
      }
      // A pinned (sticky, opaque) cell covers what scrolls under it, and its scroller reaches that
      // text by scrolling: a pinned actions column over the Assignee column is not text over text.
      let pinned = null;
      let scroller = null;
      for (let a = el; a && a !== stage.parentElement; a = a.parentElement) {
        const c = getComputedStyle(a);
        if (!pinned && c.position === 'sticky' && c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.backgroundColor !== 'transparent') pinned = a;
        if (!scroller && /auto|scroll/.test(c.overflowX) && a.scrollWidth > a.clientWidth + 1) scroller = a;
        if (a === stage) break;
      }
      const id = `${si}:${pieces.length}`;
      pieces.push({ id, el, rects, pinned, scroller });
      out.texts.push({ id, text: node.textContent.trim().slice(0, 40), clipped, escaped, fontSize: parseFloat(getComputedStyle(el).fontSize) });
    }
    // two pieces of text drawn over each other (not one inside the other's element)
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i]; const b = pieces[j];
        if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
        if (a.pinned !== b.pinned && a.scroller && a.scroller === b.scroller) continue; // scrolled under a pinned cell
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

test('key components keep every word readable with the setting', async ({ page, browser }, testInfo) => {
  test.setTimeout(300_000);
  const { textSpacing, defaultFontSize } = testInfo.project.metadata ?? {};
  test.skip(!textSpacing && !defaultFontSize, 'a text-settings lane only');

  await openExplorer(page);
  let scaled = null;
  let scaledContext = null;
  let setFontSize = async () => {};
  const rootSize = (p) => p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  if (defaultFontSize) {
    // Its own context: with the baseline page in the same one, Chromium dropped the setting
    // after a few routes (the two pages share a renderer).
    scaledContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: testInfo.project.use.viewport, colorScheme: 'light' });
    scaled = await scaledContext.newPage();
    const cdp = await scaledContext.newCDPSession(scaled);
    // Re-applied on every route: after a screenshot on one route, the next hash route came back at 16 px.
    setFontSize = () => cdp.send('Page.setFontSizes', { fontSizes: { standard: defaultFontSize, fixed: Math.round(defaultFontSize * 13 / 16) } });
    await setFontSize();
    await openExplorer(scaled);
    expect(await rootSize(scaled), `the root follows a ${defaultFontSize} px default font size (a px root size would pin it)`).toBe(defaultFontSize);
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
      await setFontSize();
      await scaled.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      expect(await rootSize(scaled), `#${slug}: the setting still holds`).toBe(defaultFontSize);
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
  await scaledContext?.close();
  expect(measured, 'the lane measured the specimens').toBeGreaterThan(500);
  const lane = textSpacing ? 'WCAG 1.4.12 text spacing' : `a ${defaultFontSize} px default font size`;
  expect(problems, `${problems.length} piece(s) of text lost with ${lane}:\n${problems.join('\n')}`).toEqual([]);
  if (defaultFontSize) expect([...unscaled], `text that ignores ${lane}:\n${[...unscaled].join('\n')}`).toEqual([]);
});
