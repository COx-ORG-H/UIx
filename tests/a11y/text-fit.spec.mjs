import { test, expect } from '@playwright/test';

/* Text that fits, in a real layout (HAR-3094, HAR-3099, HAR-3201): in a 120 px cell a shown time stays
 * on one line with tabular digits and a range breaks only after its dash; a DataWorkspace column
 * keeps a nowrap date on one line and clamps a long note to two lines; the longest German status
 * pill stays on one line in the lg-plus tier. The DOM half is packages/react/src/text-fit-dom.test.mjs. */

const HARNESS = '/tests/text-fit/harness.html';

async function open(page, theme) {
  await page.addInitScript((t) => localStorage.setItem('uix-theme', t), theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
}

/** The distinct line tops of an element's text, in order. */
const linesOf = (el) => {
  const tops = new Set();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const range = document.createRange(); range.selectNodeContents(t);
    for (const r of range.getClientRects()) if (r.width > 0) tops.add(Math.round(r.top));
  }
  return [...tops].sort((a, b) => a - b);
};

const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

test('in a 120 px cell a time stays on one line with tabular digits, and a range breaks only after its dash (HAR-3094)', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const got = await page.evaluate((fn) => {
    const lines = new Function(`return (${fn})`)();
    const at = (s) => document.querySelector(`[data-fit="${s}"]`);
    const range = at('range');
    const [start, end] = range.querySelectorAll('time');
    const sep = range.querySelector('.uix-time-range__sep');
    return {
      cellWidth: document.querySelector('[data-cell="range"]').getBoundingClientRect().width,
      relative: { lines: lines(at('relative')).length, numeric: getComputedStyle(at('relative')).fontVariantNumeric },
      instant: { lines: lines(at('instant')).length, numeric: getComputedStyle(at('instant')).fontVariantNumeric, text: at('instant').textContent },
      range: { start: lines(start), end: lines(end), sep: lines(sep), text: range.textContent },
      nowrapRange: lines(at('range-nowrap')).length,
    };
  }, linesOf.toString());
  expect(got.cellWidth).toBeLessThanOrEqual(121);
  expect(got.relative).toEqual({ lines: 1, numeric: 'tabular-nums' });
  expect(got.instant).toEqual({ lines: 1, numeric: 'tabular-nums', text: '11.11.2026 09:00' });
  // one-day range: the date once
  expect(got.range.text).toBe(`11.11.2026 09:00${String.fromCharCode(0xa0)}– 12:00`);
  // each end on one line; the end moved below whole; the dash stayed with the start
  expect(got.range.start).toHaveLength(1);
  expect(got.range.end).toHaveLength(1);
  expect(got.range.end[0]).toBeGreaterThan(got.range.start[0]);
  expect(got.range.sep[0]).toBe(got.range.start[0]);
  // a range inherits its cell's wrapping: in a nowrap cell it never breaks, not even after the dash
  expect(got.nowrapRange).toBe(1);
  await testInfo.attach('cell', { body: await page.locator('section[aria-label="Schmale Zelle"]').screenshot(), contentType: 'image/png' });
});

test('a DataWorkspace column keeps a nowrap date on one line and clamps a long note to two lines (HAR-3201)', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const cells = await page.evaluate((fn) => {
    const lines = new Function(`return (${fn})`)();
    const table = document.querySelector('section[aria-label="Spalten"] table');
    return [...table.querySelectorAll('tbody tr')].map((tr) => {
      const [when, note, title] = tr.querySelectorAll('td:not(.uix-table__selcell)');
      const clamp = note.querySelector('.uix-cell-clamp');
      return {
        when: lines(when).length,
        clampLines: lines(clamp).length,
        clamped: clamp.scrollHeight > clamp.clientHeight + 1,
        titleLines: lines(title).length,
        titleCut: title.scrollWidth > title.clientWidth,
      };
    });
  }, linesOf.toString());
  const [long, short] = cells;
  expect(long.when).toBe(1);
  // getClientRects reports the hidden third line too, so the box is what the person sees: two lines high, the rest clipped
  expect(long.clamped).toBe(true);
  expect(short).toMatchObject({ when: 1, clampLines: 1, clamped: false, titleLines: 1 });
  expect(long.titleLines).toBe(1);
  expect(long.titleCut).toBe(true);
  const clampBox = await page.locator('section[aria-label="Spalten"] .uix-cell-clamp').first().evaluate((el) => ({ height: el.getBoundingClientRect().height, line: parseFloat(getComputedStyle(el).lineHeight) }));
  expect(Math.round(clampBox.height / clampBox.line)).toBe(2);
  await testInfo.attach('workspace', { body: await page.locator('section[aria-label="Spalten"]').screenshot(), contentType: 'image/png' });
});

test('"Wartet auf Zustimmung" stays on one line in an lg-plus column, which sits between lg and xl (HAR-3099)', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const pill = await page.evaluate((fn) => {
    const lines = new Function(`return (${fn})`)();
    const el = document.querySelector('[data-fit="pill"]');
    const th = document.querySelector('section[aria-label="Statusspalte"] th');
    return { lines: lines(el).length, column: th.getBoundingClientRect().width, pill: el.getBoundingClientRect().width };
  }, linesOf.toString());
  expect(pill.lines).toBe(1);
  expect(pill.column).toBeGreaterThan(176);
  expect(pill.column).toBeLessThan(240);
  await testInfo.attach('pill', { body: await page.locator('section[aria-label="Statusspalte"]').screenshot(), contentType: 'image/png' });
});
