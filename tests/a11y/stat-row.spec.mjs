/* Stat tiles in one stretched row (HAR-1753), measured in a real browser: jsdom has no layout.
 *
 * A grid or flex row stretches its tiles to the tallest one. A <button> that is taller than its
 * content centres that content, so with `display: block` an interactive tile's label sat 3 to
 * 14 px lower than the label of a read-only <div> tile in the same row (TENSOR measured 13, 16
 * and 27 px in one row of four). The interactive tile is a flex column now.
 *
 * How a <button> lays out as a flex container is the engine's own business, so this spec also
 * runs in Firefox and WebKit: UIX_CROSS_BROWSER=1 (see playwright.config.mjs and the
 * cross-browser job in ci.yml). Harness: tests/operator-primitives/harness.tsx. The stylesheet
 * rules are pinned in packages/tokens/tests/stat-tile.test.mjs.
 */
import { test, expect } from '@playwright/test';

const HARNESS = '/tests/operator-primitives/harness.html';
const themeOf = (name) => (name === 'dark' ? 'dark' : 'light');

test.beforeEach(async ({ page }, testInfo) => {
  const theme = themeOf(testInfo.project.name);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#row-compact > .uix-stat').first()).toBeVisible();
});

// The offsets of the label and of the value from the tile's top edge, for a <div>, a <button>
// and an <a> tile: compact tiles in a grid row, hero tiles in a flex row.
for (const row of ['row-compact', 'row-hero']) {
  test(`in a stretched row every tile starts its label and value at the same offset (${row})`, async ({ page }) => {
    const tiles = await page.locator(`#${row} > .uix-stat`).evaluateAll((els) => els.map((tile) => {
      const top = tile.getBoundingClientRect().top;
      const style = getComputedStyle(tile);
      const rows = [...tile.querySelectorAll(':scope > [class^="uix-stat__"]')];
      const last = rows.at(-1).getBoundingClientRect().bottom;
      return {
        tile: tile.dataset.tile,
        tag: tile.tagName,
        height: Math.round(tile.getBoundingClientRect().height),
        // the room left under the last row, inside the padding: 0 for the tallest tile
        slack: Math.round(tile.getBoundingClientRect().bottom - parseFloat(style.paddingBottom) - parseFloat(style.borderBottomWidth) - last),
        label: Math.round((tile.querySelector('.uix-stat__label').getBoundingClientRect().top - top) * 10) / 10,
        // the label text itself, not its row: a chevron taller than the text must not move it
        labelText: Math.round((tile.querySelector('.uix-stat__label > span').getBoundingClientRect().top - top) * 10) / 10,
        value: Math.round((tile.querySelector('.uix-stat__value').getBoundingClientRect().top - top) * 10) / 10,
      };
    }));
    expect(tiles.map((t) => `${t.tile}:${t.tag}`)).toEqual(['read-only:DIV', 'read-only-meta:DIV', 'three-lines:BUTTON', 'no-meta:BUTTON', 'link:A', 'pending:BUTTON']);
    // the fixture must stretch tiles of unequal content, or equal offsets prove nothing
    expect(new Set(tiles.map((t) => t.height)).size, 'one height for the whole row').toBe(1);
    const slack = Object.fromEntries(tiles.map((t) => [t.tile, t.slack]));
    expect(slack['three-lines'], 'the tallest tile has no room to spare').toBeLessThanOrEqual(1);
    for (const name of ['read-only', 'no-meta', 'link', 'pending']) expect(slack[name], `${name} is taller than its content`).toBeGreaterThan(12);

    const [first, ...rest] = tiles;
    for (const t of rest) {
      expect(t.label, `label offset of ${t.tile}`).toBeCloseTo(first.label, 0);
      expect(t.labelText, `label text offset of ${t.tile}`).toBeCloseTo(first.labelText, 0);
      expect(t.value, `value offset of ${t.tile}`).toBeCloseTo(first.value, 0);
    }
  });
}

// A row of tiles reflows on a phone (HAR-1803 review): the kit's StatRow (.uix-stat-row) and a
// wrapping flex row put fewer tiles side by side, never six squeezed ones. At 320 and 390 px no
// tile is narrower than 8.5rem (12rem for hero tiles) or the whole row, every label stays on one line, no word in a value
// is broken, and nothing scrolls sideways. A fixed six-column grid broke "Assignee" into AS/SI/GN/EE.
for (const width of [320, 390]) {
  test(`at ${width} px the stat rows reflow: readable tiles, whole labels, no sideways scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const row of ['row-compact', 'row-hero']) {
      const tiles = await page.locator(`#${row} > .uix-stat`).evaluateAll((els) => els.map((tile) => {
        const rowWidth = tile.parentElement.getBoundingClientRect().width;
        const label = tile.querySelector('.uix-stat__label > span');
        const value = tile.querySelector('.uix-stat__value');
        const lineHeight = parseFloat(getComputedStyle(label).lineHeight) || parseFloat(getComputedStyle(label).fontSize) * 1.3;
        // a word broken across lines shows as a value line box narrower than its longest word
        const range = document.createRange();
        range.selectNodeContents(value);
        const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
        const words = value.textContent.trim().split(/\s+/).length;
        return {
          tile: tile.dataset.tile,
          width: tile.getBoundingClientRect().width,
          rowWidth,
          labelLines: Math.round(label.getBoundingClientRect().height / lineHeight),
          valueLinesWithinWords: lines <= words,
        };
      }));
      const floor = await page.evaluate((rem) => parseFloat(getComputedStyle(document.documentElement).fontSize) * rem, row === 'row-hero' ? 12 : 8.5);
      for (const t of tiles) {
        expect(t.width >= floor - 0.5 || t.width >= t.rowWidth - 0.5, `${row} ${t.tile} is ${t.width.toFixed(0)} px wide`).toBe(true);
        expect(t.labelLines, `${row} ${t.tile} label on one line`).toBe(1);
        expect(t.valueLinesWithinWords, `${row} ${t.tile} value breaks only between words`).toBe(true);
      }
      // the row fits the viewport and its own box (the harness's other sections are not measured)
      const fit = await page.locator(`#${row}`).evaluate((el) => ({ over: el.scrollWidth - el.clientWidth, right: el.getBoundingClientRect().right, vw: document.documentElement.clientWidth }));
      expect(fit.over, `${row} scrolls sideways`).toBe(0);
      expect(fit.right, `${row} ends inside the viewport`).toBeLessThanOrEqual(fit.vw);
    }
  });
}
