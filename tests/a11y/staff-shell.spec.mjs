/* The staff shell and type presets (HAR-1815), measured in Chromium, light and dark:
 *   - AppShell layout="viewport": no border or radius, the viewport's height, no top-bar row (the
 *     sidebar and main both start at the top), main padding space-7 / space-6 / space-6 widening to
 *     space-8 at the sides from 80rem, a topbar (when given) at the top of the main column, and
 *     below 40rem one column with the sidebar hidden and no sideways scroll;
 *   - PageHeader size="display": a 40 px heading-font title at 1.05 / 600 / -0.02em, a bold hushed
 *     eyebrow, a body-size hushed subtitle up to 42rem, the row aligned to the bottom;
 *   - DetailPage variant="staff": the title at h2 / 1.15, an un-underlined hushed back link, eyebrow
 *     metric labels over regular tabular h3 values;
 *   - SectionHead size="compact": 15 px / 1.3 / 600; CellSub tabular: tabular numerals;
 *   - axe is clean.
 * Harness: tests/staff-shell/harness.tsx. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/staff-shell/harness.html';

async function open(page, theme, view = 'shell', viewport = { width: 1280, height: 800 }) {
  await page.setViewportSize(viewport);
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private */ } }, theme);
  await page.goto(`${HARNESS}?view=${view}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#shell')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

const px = (page, token) => page.evaluate((t) => {
  const probe = document.createElement('div');
  probe.style.paddingTop = `var(${t})`;
  document.body.append(probe);
  const v = getComputedStyle(probe).paddingTop;
  probe.remove();
  return v;
}, token);

test('viewport shell: frameless, full height, no top-bar row, staff padding', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name, 'shell', { width: 1024, height: 800 });
  const shell = await page.evaluate(() => {
    const s = document.getElementById('shell');
    const cs = getComputedStyle(s);
    const main = s.querySelector('.uix-shell__main');
    const side = s.querySelector('.uix-shell__sidebar');
    const m = getComputedStyle(main);
    return {
      border: cs.borderTopWidth, radius: cs.borderTopLeftRadius, height: s.getBoundingClientRect().height, vh: innerHeight,
      sideTop: side.getBoundingClientRect().top, mainTop: main.getBoundingClientRect().top, sideHeight: side.getBoundingClientRect().height,
      padding: [m.paddingTop, m.paddingRight, m.paddingBottom, m.paddingLeft],
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(shell.border).toBe('0px');
  expect(shell.radius).toBe('0px');
  expect(shell.height).toBe(shell.vh);
  expect(shell.sideTop).toBe(0);
  expect(shell.mainTop, 'no top-bar row above main').toBe(0);
  expect(shell.sideHeight).toBe(shell.vh);
  const [s7, s6, s8] = [await px(page, '--uix-space-7'), await px(page, '--uix-space-6'), await px(page, '--uix-space-8')];
  expect(shell.padding).toEqual([s7, s6, s6, s6]);
  expect(shell.overflow).toBe(0);

  await page.setViewportSize({ width: 1440, height: 800 });
  const wide = await page.locator('.uix-shell__main').evaluate((m) => [getComputedStyle(m).paddingLeft, getComputedStyle(m).paddingRight]);
  expect(wide).toEqual([s8, s8]);
});

test('viewport shell with a topbar: the topbar sits at the top of the main column, the sidebar runs the full height', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name, 'topbar');
  const r = await page.evaluate(() => {
    const s = document.getElementById('shell');
    const rect = (sel) => s.querySelector(sel).getBoundingClientRect();
    return { top: rect('.uix-shell__topbar'), main: rect('.uix-shell__main'), side: rect('.uix-shell__sidebar'), vh: innerHeight };
  });
  expect(r.top.top).toBe(0);
  expect(r.top.left).toBeCloseTo(r.main.left, 0);
  expect(r.main.top).toBeCloseTo(r.top.bottom, 0);
  expect(r.main.bottom).toBeCloseTo(r.vh, 0);
  expect(r.side.top).toBe(0);
  expect(r.side.height).toBe(r.vh);
});

for (const width of [320, 390]) {
  test(`viewport shell at ${width} px: one column, the sidebar hidden, no sideways scroll`, async ({ page }, testInfo) => {
    await open(page, testInfo.project.name, 'shell', { width, height: 800 });
    const r = await page.evaluate(() => {
      const s = document.getElementById('shell');
      const main = s.querySelector('.uix-shell__main').getBoundingClientRect();
      return { side: getComputedStyle(s.querySelector('.uix-shell__sidebar')).display, mainLeft: main.left, mainWidth: main.width, vw: document.documentElement.clientWidth, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(r.side).toBe('none');
    expect(r.mainLeft).toBe(0);
    expect(r.mainWidth).toBe(r.vw);
    expect(r.overflow).toBe(0);
  });
}

test('PageHeader display: the staff title, eyebrow and subtitle', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name);
  const r = await page.evaluate(() => {
    const h = document.getElementById('header');
    const t = getComputedStyle(h.querySelector('.uix-page-header__title'));
    const e = getComputedStyle(h.querySelector('.uix-page-header__eyebrow'));
    const s = getComputedStyle(h.querySelector('.uix-page-header__subtitle'));
    const probe = (prop, v) => { const d = document.createElement('div'); d.style[prop] = v; document.body.append(d); const out = getComputedStyle(d)[prop]; d.remove(); return out; };
    return {
      size: t.fontSize, lh: t.lineHeight, weight: t.fontWeight, tracking: t.letterSpacing, family: t.fontFamily, heading: probe('fontFamily', 'var(--uix-font-heading)'),
      eyebrowWeight: e.fontWeight, eyebrowColour: e.color, hushed: probe('color', 'var(--uix-text-hushed)'),
      subSize: s.fontSize, body: probe('fontSize', 'var(--uix-text-body)'), subColour: s.color, subMax: s.maxWidth, rem42: probe('width', '42rem'),
      align: getComputedStyle(h).alignItems,
    };
  });
  expect(r.size).toBe('40px');
  expect(r.lh).toBe('42px');
  expect(r.weight).toBe('600');
  expect(r.tracking).toBe('-0.8px');
  expect(r.family).toBe(r.heading);
  expect(r.eyebrowWeight).toBe('700');
  expect(r.eyebrowColour).toBe(r.hushed);
  expect(r.subSize).toBe(r.body);
  expect(r.subColour).toBe(r.hushed);
  expect(r.subMax).toBe(r.rem42);
  expect(r.align).toBe('flex-end');
});

test('DetailPage staff, SectionHead compact and CellSub tabular', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name, 'record');
  const r = await page.evaluate(() => {
    const rec = document.getElementById('record');
    const cs = (sel) => getComputedStyle(rec.querySelector(sel));
    const probe = (prop, v) => { const d = document.createElement('div'); d.style[prop] = v; document.body.append(d); const out = getComputedStyle(d)[prop]; d.remove(); return out; };
    return {
      title: [cs('.uix-page-header__title').fontSize, cs('.uix-page-header__title').lineHeight], h2: probe('fontSize', 'var(--uix-text-h2)'),
      back: [cs('.uix-detail-page__back').display, cs('.uix-detail-page__back').textDecorationLine, cs('.uix-detail-page__back').color], hushed: probe('color', 'var(--uix-text-hushed)'),
      dt: [cs('.uix-detail-page__metrics dt').textTransform, cs('.uix-detail-page__metrics dt').fontSize], eyebrow: probe('fontSize', 'var(--uix-text-eyebrow)'),
      dd: [cs('.uix-detail-page__metrics dd').fontSize, cs('.uix-detail-page__metrics dd').fontWeight, cs('.uix-detail-page__metrics dd').fontVariantNumeric], h3: probe('fontSize', 'var(--uix-text-h3)'),
      section: [cs('.uix-section-title').fontSize, cs('.uix-section-title').lineHeight, cs('.uix-section-title').fontWeight],
      code: cs('#code-1').fontVariantNumeric,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(r.title[0]).toBe(r.h2);
  expect(parseFloat(r.title[1]) / parseFloat(r.title[0])).toBeCloseTo(1.15, 2);
  // inline-flex, blockified to flex by the page's column
  expect(r.back).toEqual(['flex', 'none', r.hushed]);
  expect(r.dt).toEqual(['uppercase', r.eyebrow]);
  expect(r.dd).toEqual([r.h3, '400', 'tabular-nums']);
  expect(r.section).toEqual(['15px', '19.5px', '600']);
  expect(r.code).toBe('tabular-nums');
  expect(r.overflow).toBe(0);
});

for (const view of ['shell', 'record']) {
  test(`axe: no serious or critical violations (${view})`, async ({ page }, testInfo) => {
    await open(page, testInfo.project.name, view);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });
}
