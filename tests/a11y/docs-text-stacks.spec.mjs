/* A title and its secondary text always stack (HAR-1568).
 *
 * The docs specimens for List, Toast and Pipeline wrote their title and secondary text as <span>/<strong>,
 * and the component CSS never set `display`, so "Identity gateway" and "Updated 8 minutes ago" rendered as
 * one run-on line with a 0 px gap. The React adapters use <div>, so no React test, contract gate or visual
 * golden could see it. Layout is the only place it shows, so this spec measures it in a real browser:
 *   1. on every explorer route, each kit title element (`__title|name|label|subject`) and the secondary element
 *      that follows it (`__meta|msg|desc|description|sub|subtitle|summary|preview|role|hint|body`) are on
 *      separate lines, with a gap >= 0 (intentional inline pairs are allow-listed below, with reasons);
 *   2. on every explorer route, two adjacent inline text elements with no whitespace between them never sit on
 *      the same line closer than 2 px (the generic form of the same bug, whatever the class names);
 *   3. List, Toast and Pipeline built from <span> (and <strong>) still stack, with the Toast and Pipeline gaps
 *      at --uix-space-1 (4 px), in both themes at 1280 and 375;
 *   4. the docs specimens for #list, #toast and #pipeline stack the same way.
 * The packages/tokens/tests/title-secondary-stack.test.mjs contract pins the CSS text of the same fix.
 * Sweeps are layout-only, so they run once (light); the focused checks run in both themes.
 */
import { test, expect } from '@playwright/test';
import { COMPONENT_ITEMS } from '../../packages/tokens/docs/docs.js';
import { SHOWCASE_PAGES } from '../../packages/tokens/docs/showcase-data.js';

const THEME_SEED = (theme) => { try { localStorage.setItem('uix-theme', theme); } catch { /* private mode */ } };

// Intentional inline title/secondary pairs: the secondary text sits on the title's line by design.
// Keyed by the BEM block of the title element; `why` is the written reason.
const INLINE_PAIRS = [
  { block: 'uix-collapsible', why: 'Collapsible header: the meta (count, status) trails the title on the header row' },
  { block: 'uix-nav-item', why: 'NavItem: the badge trails the label on one row' },
  { block: 'uix-chip', why: 'Chip: the count trails the label inside one pill' },
  { block: 'uix-entity-picker', why: 'EntityPicker option: the meta trails the title on the option row' },
];

const open = async (page, route) => {
  await page.goto(`docs/explorer.html#${route}`, { waitUntil: 'networkidle' });
  await expect(page.locator('.uix-docs__page')).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
};

/** Every explorer route: the component and example slugs, plus whatever the docs nav lists (guide pages). */
const routesOf = async (page) => {
  await open(page, 'introduction');
  const nav = await page.evaluate(() => [...document.querySelectorAll('[data-uix-docs-nav] a[href^="#"]')]
    .map((a) => a.getAttribute('href').slice(1)));
  return [...new Set([...nav, ...COMPONENT_ITEMS.map((item) => item.slug), ...SHOWCASE_PAGES.map((p) => p.slug)])];
};

/* In-page detector. Serialised into the browser, so it must stay self-contained. */
const detect = (allow) => {
  const TITLE = /^uix-[a-z0-9-]+__(title|name|label|subject)$/;
  const SECOND = /^uix-[a-z0-9-]+__(meta|msg|desc|description|sub|subtitle|summary|preview|role|hint|body)$/;
  const kitClass = (el, re) => [...el.classList].find((c) => re.test(c));
  const label = (el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`;
  const rectsOf = (el) => [...el.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
  const page = document.querySelector('.uix-docs__page');
  const out = { titles: [], glued: [] };

  // 1. title -> next secondary element
  for (const title of page.querySelectorAll('[class*="__"]')) {
    const tClass = kitClass(title, TITLE);
    if (!tClass || tClass.startsWith('uix-docs')) continue;
    const sec = title.nextElementSibling;
    if (!sec || !kitClass(sec, SECOND)) continue;
    const block = tClass.split('__')[0];
    if (allow.includes(block)) continue;
    const t = rectsOf(title);
    const s = rectsOf(sec);
    if (!t.length || !s.length) continue; // hidden: nothing to see
    const titleBottom = Math.max(...t.map((r) => r.bottom));
    const secTop = Math.min(...s.map((r) => r.top));
    const gap = secTop - titleBottom;
    out.titles.push({ pair: `${label(title)} -> ${label(sec)}`, gap });
    if (gap < -0.5) out.glued.push(`${label(title)} -> ${label(sec)}: gap ${gap.toFixed(1)} px (same line)`);
  }
  return out;
};

const detectAdjacentInline = () => {
  const page = document.querySelector('.uix-docs__page');
  const hasText = (el) => /[\p{L}\p{N}]/u.test(el.textContent || '');
  const rectsOf = (el) => [...el.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
  const label = (el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.') || '(no class)'}`;
  const found = [];
  for (const a of page.querySelectorAll('*')) {
    const b = a.nextSibling; // a text node (whitespace or not) means the pair is not "glued"
    if (!(b instanceof Element) || a.nextElementSibling !== b) continue;
    if (a.closest('.uix-docs__code, pre, code, svg') || b.closest('svg')) continue;
    // A <mark> highlights part of a run of text (the typed letters of "Jonas"): it touches
    // the rest of its word on purpose.
    if (a.tagName === 'MARK' || b.tagName === 'MARK') continue;
    if (getComputedStyle(a).display !== 'inline' || getComputedStyle(b).display !== 'inline') continue;
    if (!hasText(a) || !hasText(b)) continue;
    const ra = rectsOf(a);
    const rb = rectsOf(b);
    if (!ra.length || !rb.length) continue;
    const last = ra[ra.length - 1];
    const first = rb[0];
    const overlap = Math.min(last.bottom, first.bottom) - Math.max(last.top, first.top);
    const sameLine = overlap > Math.min(last.height, first.height) / 2;
    if (sameLine && first.left - last.right < 2) {
      found.push(`${label(a)} + ${label(b)}: ${(first.left - last.right).toFixed(1)} px apart on one line`);
    }
  }
  return found;
};

test.describe('sweep every explorer route', () => {
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== 'light', 'layout only'));

  test('every title and its secondary text are on separate lines (gap >= 0)', async ({ page }) => {
    test.setTimeout(300_000);
    const routes = await routesOf(page);
    expect(routes.length, 'the docs nav lists the explorer routes').toBeGreaterThan(100);
    const glued = [];
    let pairs = 0;
    for (const route of routes) {
      await open(page, route);
      const found = await page.evaluate(detect, INLINE_PAIRS.map((p) => p.block));
      pairs += found.titles.length;
      glued.push(...found.glued.map((line) => `${route}: ${line}`));
    }
    expect(pairs, 'the detector found title/secondary pairs at all').toBeGreaterThan(20);
    expect(glued, 'title and secondary text glued on one line').toEqual([]);
  });

  test('adjacent inline text elements with no whitespace between them are never touching on one line', async ({ page }) => {
    test.setTimeout(300_000);
    const routes = await routesOf(page);
    const glued = [];
    for (const route of routes) {
      await open(page, route);
      const found = await page.evaluate(detectAdjacentInline);
      glued.push(...found.map((line) => `${route}: ${line}`));
    }
    expect(glued, 'inline text runs glued together').toEqual([]);
  });
});

/* Markup a consumer could plausibly write: every element a <span> (or <strong> for a title). */
const SPAN_MARKUP = {
  list: '<div class="uix-list" data-probe="list"><a class="uix-list__item" href="#x"><span><span class="uix-list__title">Identity gateway</span><span class="uix-list__meta">Updated 8 minutes ago</span></span><span class="uix-list__trail">ok</span></a></div>',
  toast: '<div class="uix-toast" data-probe="toast" role="status"><span class="uix-toast__body"><span class="uix-toast__title">Changes saved</span><span class="uix-toast__msg">The service policy is now active.</span></span><button class="uix-toast__close" type="button" aria-label="Dismiss">x</button></div>',
  pipeline: '<ol class="uix-pipeline uix-pipeline--detailed" data-probe="pipeline" style="max-width:260px"><li class="uix-pipeline__stage" data-state="done"><span class="uix-pipeline__marker">1</span><div class="uix-pipeline__content"><span class="uix-pipeline__eyebrow">Build</span><strong class="uix-pipeline__title">A deliberately long stage title that cannot fit in one line of this narrow rail</strong><span class="uix-pipeline__description">Checksums attached.</span></div></li></ol>',
};

/** Top/bottom of a probe's title and secondary element, in CSS px, plus the title's overflow state. */
const measure = (page, probe, titleSel, secSel) => page.evaluate(([p, t, s]) => {
  const root = document.querySelector(`[data-probe="${p}"]`) || document.querySelector(p);
  const title = root.querySelector(t);
  const sec = root.querySelector(s);
  const a = title.getBoundingClientRect();
  const b = sec.getBoundingClientRect();
  const cs = getComputedStyle(title);
  return {
    titleBottom: a.bottom, secTop: b.top, gap: b.top - a.bottom, sameLine: b.top < a.bottom - 0.5,
    titleDisplay: cs.display, secDisplay: getComputedStyle(sec).display,
    titleEllipsis: cs.textOverflow === 'ellipsis' && cs.overflow === 'hidden' && title.scrollWidth > title.clientWidth,
  };
}, [probe, titleSel, secSel]);

const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 375, height: 800 }];

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width} px`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }, testInfo) => {
      await page.addInitScript(THEME_SEED, testInfo.project.name);
    });

    test('<span> markup stacks for List, Toast and Pipeline', async ({ page }) => {
      await open(page, 'introduction');
      await page.evaluate((m) => {
        const host = document.createElement('div');
        host.id = 'probe-host';
        host.style.cssText = 'max-width:340px;padding:8px';
        host.innerHTML = Object.values(m).join('');
        document.querySelector('.uix-docs__page').prepend(host);
      }, SPAN_MARKUP);

      const list = await measure(page, 'list', '.uix-list__title', '.uix-list__meta');
      expect(list.sameLine, `list title/meta on one line: ${JSON.stringify(list)}`).toBe(false);
      expect(list.gap).toBeGreaterThanOrEqual(0);

      const toast = await measure(page, 'toast', '.uix-toast__title', '.uix-toast__msg');
      expect(toast.sameLine, `toast title/msg on one line: ${JSON.stringify(toast)}`).toBe(false);
      expect(toast.gap).toBeCloseTo(4, 0);
      expect(Math.abs(toast.gap - 4)).toBeLessThanOrEqual(0.5);

      const pipeline = await measure(page, 'pipeline', '.uix-pipeline__title', '.uix-pipeline__description');
      expect(pipeline.sameLine, `pipeline title/description on one line: ${JSON.stringify(pipeline)}`).toBe(false);
      expect(Math.abs(pipeline.gap - 4)).toBeLessThanOrEqual(0.5);
      expect(pipeline.titleEllipsis, 'a long pipeline title ends in an ellipsis').toBe(true);
    });

    test('the #list, #toast and #pipeline specimens stack', async ({ page }) => {
      await open(page, 'list');
      const list = await measure(page, '.uix-docs__page .uix-list', '.uix-list__title', '.uix-list__meta');
      expect(list.sameLine, `#list title/meta on one line: ${JSON.stringify(list)}`).toBe(false);
      expect(list.secTop).toBeGreaterThanOrEqual(list.titleBottom);

      await open(page, 'toast');
      const toast = await measure(page, '.uix-docs__page .uix-toast', '.uix-toast__title', '.uix-toast__msg');
      expect(Math.abs(toast.gap - 4), `#toast gap ${toast.gap}`).toBeLessThanOrEqual(0.5);

      await open(page, 'pipeline');
      const pipeline = await measure(page, '.uix-docs__page .uix-pipeline--detailed', '.uix-pipeline__title', '.uix-pipeline__description');
      expect(Math.abs(pipeline.gap - 4), `#pipeline gap ${pipeline.gap}`).toBeLessThanOrEqual(0.5);
    });
  });
}
