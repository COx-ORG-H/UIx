/* HAR-1576 in Chromium: the icons that replaced text glyphs are centred in their buttons (within
 * 0.5 px), the masked sort arrows, the select chevron and the plain-CSS glyphs take the theme's
 * colour, and all of them stay visible in forced colours. The guard and the markup are tested in
 * packages/react/src/glyph-icons.test.mjs. Harness: tests/glyph-icons/harness.tsx. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/glyph-icons/harness.html';

async function open(page, theme) {
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private */ } }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#glyphs .uix-glyph').first()).toBeVisible();
}

const SLOTS = ['#toast .uix-toast__close', '#pages .uix-pagination__btn[aria-label]', '#cursor .uix-pagination__btn', '#metric .uix-metric-input__step', '#views .uix-saved-views__pin', '#steps [data-state="error"] .uix-step__marker'];

test('each icon is centred in its control, within 0.5 px, and the control holds no text', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name);
  const off = [];
  for (const sel of SLOTS) {
    const controls = await page.locator(sel).evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      const svg = el.querySelector('svg');
      const s = svg.getBoundingClientRect();
      return { label: el.getAttribute('aria-label') ?? el.className, dx: (s.left + s.width / 2) - (r.left + r.width / 2), dy: (s.top + s.height / 2) - (r.top + r.height / 2), text: el.textContent.trim(), w: s.width };
    }));
    expect(controls.length, sel).toBeGreaterThan(0);
    for (const c of controls) {
      if (Math.abs(c.dx) > 0.5 || Math.abs(c.dy) > 0.5) off.push(`${sel} ${c.label}: ${c.dx.toFixed(2)}, ${c.dy.toFixed(2)}`);
      expect(c.text, `${sel} ${c.label}`).toBe('');
      expect(c.w, `${sel} icon width`).toBeGreaterThanOrEqual(12);
    }
  }
  expect(off).toEqual([]);
});

test('sort arrows, the select chevron and .uix-glyph are masks painted in the theme colour', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name);
  const seen = await page.evaluate(() => {
    const after = (el) => getComputedStyle(el, '::after');
    const ths = [...document.querySelectorAll('#table th')];
    const accent = (() => { const p = document.createElement('i'); p.style.color = 'var(--uix-accent)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })();
    const muted = (() => { const p = document.createElement('i'); p.style.color = 'var(--uix-text-muted)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })();
    return {
      accent, muted,
      sort: ths.map((th) => ({ sort: th.getAttribute('aria-sort'), mask: after(th).maskImage.slice(0, 40), bg: after(th).backgroundColor, content: after(th).content })),
      select: { mask: after(document.querySelector('#select button.uix-select')).maskImage.slice(0, 40), bg: after(document.querySelector('#select button.uix-select')).backgroundColor, image: getComputedStyle(document.querySelector('#select button.uix-select')).backgroundImage },
      glyphs: [...document.querySelectorAll('#glyphs .uix-glyph')].map((g) => ({ mask: getComputedStyle(g).maskImage.slice(0, 40), bg: getComputedStyle(g).backgroundColor, color: getComputedStyle(g).color, w: g.getBoundingClientRect().width })),
    };
  });
  for (const s of seen.sort) {
    expect(s.content, 'no text content').toBe('""');
    expect(s.mask).toMatch(/^url\("data:image\/svg\+xml/);
  }
  expect(seen.sort.filter((s) => s.sort === 'ascending' || s.sort === 'descending').map((s) => s.bg)).toEqual([seen.accent, seen.accent]);
  expect(seen.select.mask).toMatch(/^url\("data:image\/svg\+xml/);
  expect(seen.select.bg).toBe(seen.muted);
  expect(seen.select.image, 'the trigger draws no fixed-grey image').toBe('none');
  for (const g of seen.glyphs) {
    expect(g.mask).toMatch(/^url\("data:image\/svg\+xml/);
    expect(g.bg).toBe(g.color);
    expect(g.w).toBeGreaterThan(0);
  }
});

test('forced colours: every masked glyph is drawn in a system colour, icons in the text colour', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ forcedColors: 'active', colorScheme: testInfo.project.name });
  const page = await context.newPage();
  await open(page, testInfo.project.name);
  const seen = await page.evaluate(() => {
    const sys = (name) => { const p = document.createElement('i'); p.style.color = name; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const after = (el) => getComputedStyle(el, '::after');
    return {
      canvasText: sys('CanvasText'), highlight: sys('Highlight'), canvas: sys('Canvas'),
      unsorted: after(document.querySelector('#table th:not([aria-sort])') ?? document.querySelector('#table th[aria-sort="none"]')).backgroundColor,
      sorted: after(document.querySelector('#table th[aria-sort="ascending"]')).backgroundColor,
      select: after(document.querySelector('#select button.uix-select')).backgroundColor,
      glyph: getComputedStyle(document.querySelector('#glyphs .uix-glyph')).backgroundColor,
      toastIcon: getComputedStyle(document.querySelector('#toast .uix-toast__close svg')).stroke,
    };
  });
  expect(seen.unsorted).toBe(seen.canvasText);
  expect(seen.sorted).toBe(seen.highlight);
  expect(seen.select).toBe(seen.canvasText);
  expect(seen.glyph).toBe(seen.canvasText);
  expect(seen.toastIcon).not.toBe(seen.canvas);
  await context.close();
});

test('axe: no serious or critical violations on the harness', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
});
