/* Reflow at 320 px (RX-21 / HAR-364; finding LD-11) — WCAG 1.4.10.
 *
 * The employee portal home scrolled sideways on a phone: `.uix-shortcut-grid` pinned two
 * fixed columns under 620 px, and `1fr` takes an AUTO minimum, so nowrap `.uix-btn` labels
 * pushed the track wider than the viewport (measured live: 382 px of content in 320 px).
 * A fixed column count cannot be safe at an unknown text length, so the grid now fits
 * itself with `auto-fit` + `minmax(min(100%, 12rem), 1fr)` and its labels may wrap.
 *
 * Measured on the rendered page, at the viewport the finding names, in both themes
 * (a theme changes font synthesis and therefore text width).
 */
import { test, expect } from '@playwright/test';

const NARROW = { width: 320, height: 800 };

const open = async (page, testInfo, path) => {
  await page.setViewportSize(NARROW);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(path, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await page.evaluate(() => document.fonts.ready); // web fonts are wider than the fallback
};

test('editorial-home example does not scroll sideways at 320 px', async ({ page }, testInfo) => {
  await open(page, testInfo, 'docs/explorer.html#examples-editorial-home');

  const doc = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(doc.clientWidth).toBe(NARROW.width);
  expect(doc.scrollWidth, `${doc.scrollWidth} px of content in a ${doc.clientWidth} px viewport`)
    .toBe(doc.clientWidth);
});

/* The docs specimen's own labels are short English words, so it fits 320 px even with the
 * broken grid — the live failure was measured on the German portal ("Bestellung aufgeben",
 * "Störung melden"). The grid must survive the label it will actually be given, so the
 * test writes a real one in before measuring. Without that, this spec would have gone
 * green against the very CSS the finding reports. */
const LONG_LABEL = 'Bestellung für neue Hardware aufgeben';

test('shortcut grid fits 320 px even with a long label', async ({ page }, testInfo) => {
  await open(page, testInfo, 'docs/explorer.html#examples-editorial-home');

  const grid = page.locator('.uix-shortcut-grid').first();
  await expect(grid, 'no .uix-shortcut-grid on the editorial-home example').toBeVisible();

  const seen = await grid.evaluate((el, label) => {
    const first = el.firstElementChild;
    const slot = Array.from(first.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim())
      ?? first.querySelector('span:not([class])')
      ?? first;
    slot.textContent = label;
    return {
      label: first.textContent.trim(),
      gridScroll: el.scrollWidth,
      gridClient: el.clientWidth,
      columns: getComputedStyle(el).gridTemplateColumns.split(' ').length,
      itemScroll: first.scrollWidth,
      itemClient: first.clientWidth,
      whiteSpace: getComputedStyle(first).whiteSpace,
      docScroll: document.documentElement.scrollWidth,
      docClient: document.documentElement.clientWidth,
    };
  }, LONG_LABEL);

  console.log(`320 px with a long label: grid ${seen.gridClient} px (${seen.columns} column(s)), item content ${seen.itemScroll} px in a ${seen.itemClient} px box, white-space: ${seen.whiteSpace}, page ${seen.docScroll}/${seen.docClient}`);

  expect(seen.label, 'the long label was not written into the specimen').toContain('Bestellung');
  expect(seen.columns, 'a phone-width grid should collapse to one column').toBe(1);
  expect(seen.whiteSpace, 'a shortcut label must be allowed to wrap').not.toBe('nowrap');
  expect(seen.itemScroll, 'the label still overflows its own button').toBeLessThanOrEqual(seen.itemClient);
  expect(seen.gridScroll, 'the grid overflows its track').toBeLessThanOrEqual(seen.gridClient);
  expect(seen.docScroll, `${seen.docScroll} px of content in a ${seen.docClient} px viewport`).toBe(seen.docClient);
});
