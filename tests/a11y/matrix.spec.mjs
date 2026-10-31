/* MatrixInput, MatrixHeatmap (HAR-2752, HAR-2753) and SaveStatus's long refusal (HAR-2749) in
 * Chromium, on tests/matrix/harness.tsx: a row filled from the keyboard alone, every heatmap cell
 * reached and opened, focus kept clear of the sticky headers, 320 px without page overflow, a
 * level and a band told apart without colour, and axe in both themes. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/matrix/harness.html';

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#risk [data-uix-matrix-cell]')).toHaveCount(12);
};
const position = (page) => page.evaluate(() => {
  const { row, column } = document.activeElement.dataset;
  return `${row},${column}`;
});

test('MatrixInput: one whole row is filled from the keyboard alone', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const bia = page.locator('#bia');
  await bia.getByRole('combobox').first().focus();
  // the second row has no locked cell: walk there, then fill it
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Home');
  expect(await position(page)).toBe('1,0');
  for (const column of [0, 1, 2, 3]) {
    expect(await position(page)).toBe(`1,${column}`);
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-uix-select-popup]:popover-open')).toHaveCount(1);
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-uix-select-popup]:popover-open')).toHaveCount(0);
    await expect(page.locator(':focus')).toContainText('Gering');
    await page.keyboard.press('ArrowRight');
  }
  expect(await page.evaluate(() => window.__matrix.changes)).toEqual([
    'reputation/h4=low', 'reputation/d1=low', 'reputation/d3=low', 'reputation/w1=low',
  ]);
});

test('MatrixInput: the grid is one tab stop, and Escape keeps the value and the focus', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.getByRole('heading', { name: 'Business impact' }).click();
  await page.keyboard.press('Tab');
  expect(await position(page)).toBe('0,0');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(page.locator(':focus')).toContainText('Mittel');
  expect(await position(page)).toBe('0,1');
  await page.keyboard.press('Tab');
  await expect(page.locator('#bia :focus')).toHaveCount(0);
  await page.keyboard.press('Shift+Tab');
  expect(await position(page)).toBe('0,1');
});

test('MatrixInput: a cell\'s help shows for the keyboard and the pointer', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const bia = page.locator('#bia');
  const help = bia.locator('.uix-matrix__help');
  await expect(help).toBeEmpty();
  await bia.getByRole('combobox', { name: 'Reputation, 1 Tag' }).focus();
  await expect(help).toHaveText('Bewerten Sie die Wirkung auf Kunden und Presse.');
  await bia.getByRole('combobox', { name: 'Reputation, 4 Stunden' }).focus();
  await expect(help).toBeEmpty();
  await bia.getByRole('combobox', { name: 'Reputation, 1 Tag' }).hover();
  await expect(help).toHaveText('Bewerten Sie die Wirkung auf Kunden und Presse.');
});

test('a wide grid: the page does not scroll, and the focused cell stays clear of both headers', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const wide = page.locator('#wide');
  await wide.getByRole('combobox').first().focus();
  const check = () => page.evaluate(() => {
    const cell = document.activeElement.getBoundingClientRect();
    const head = document.querySelector('#wide tbody th').getBoundingClientRect();
    const box = document.querySelector('#wide .uix-matrix__scroll').getBoundingClientRect();
    return { clearOfHead: cell.left >= head.right - 1, inside: cell.right <= box.right + 1, pageX: scrollX };
  });
  for (let i = 0; i < 11; i += 1) {
    await page.keyboard.press('ArrowRight');
    expect(await check()).toEqual({ clearOfHead: true, inside: true, pageX: 0 });
  }
  for (let i = 0; i < 11; i += 1) {
    await page.keyboard.press('ArrowLeft');
    expect(await check()).toEqual({ clearOfHead: true, inside: true, pageX: 0 });
  }
  await wide.locator('.uix-matrix__scroll').evaluate((el) => { el.scrollLeft = 300; });
  const [corner, row] = await Promise.all(['thead th', 'tbody th'].map((s) => wide.locator(s).first().boundingBox()));
  const box = await wide.locator('.uix-matrix__scroll').boundingBox();
  expect(Math.abs(corner.x - box.x)).toBeLessThan(2);
  expect(Math.abs(row.x - box.x)).toBeLessThan(2);
});

test('--uix-matrix-max-height: the column headers stick, and the focused cell clears them going up', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const wide = page.locator('#wide');
  const scroller = wide.locator('.uix-matrix__scroll');
  await wide.getByRole('combobox').first().focus();
  for (let i = 0; i < 7; i += 1) await page.keyboard.press('ArrowDown');
  expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(50);
  const measure = () => page.evaluate(() => {
    const head = document.querySelector('#wide thead th').getBoundingClientRect();
    const box = document.querySelector('#wide .uix-matrix__scroll').getBoundingClientRect();
    return { stuck: Math.abs(head.top - box.top) < 2, clear: document.activeElement.getBoundingClientRect().top >= head.bottom - 1 };
  });
  expect(await measure()).toEqual({ stuck: true, clear: true });
  for (let i = 0; i < 7; i += 1) {
    await page.keyboard.press('ArrowUp');
    expect(await measure()).toEqual({ stuck: true, clear: true });
  }
});

test('modified keys stay the browser\'s and the Select\'s', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#bia [data-uix-matrix-cell]').first().focus();
  for (const key of ['Alt+ArrowRight', 'Shift+ArrowRight', 'Control+ArrowRight', 'Meta+ArrowRight']) {
    await page.keyboard.press(key);
    expect(await position(page), key).toBe('0,0');
  }
  await page.keyboard.press('Alt+ArrowDown');
  await expect(page.locator(':focus')).toHaveAttribute('aria-expanded', 'true');
});

test('the help line clears when focus leaves the grid, and follows a changed value', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const follow = page.locator('#follow');
  const help = follow.locator('.uix-matrix__help');
  await follow.locator('[data-uix-matrix-cell]').first().focus();
  await expect(help).toHaveText('Hilfe zu low');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-uix-select-popup]:popover-open')).toHaveCount(0);
  await expect(help).toHaveText('Hilfe zu mid');
  await page.keyboard.press('Tab');
  await expect(help).toBeEmpty();
});

test('a shrink-to-fit parent: the grid keeps its width', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const [row, grid] = await Promise.all(['#shrink-row', '#shrink'].map((s) => page.locator(s).boundingBox()));
  expect(grid.width).toBeGreaterThan(200);
  expect(grid.x + grid.width).toBeLessThanOrEqual(row.x + row.width + 1);
});

test('a read-only and a disabled grid: reachable, and nothing opens', async ({ page }, testInfo) => {
  await open(page, testInfo);
  for (const id of ['#locked', '#off']) {
    await page.locator(`${id} [data-uix-matrix-cell]`).first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-uix-select-popup]:popover-open')).toHaveCount(0);
    await page.keyboard.press('ArrowRight');
    expect(await position(page)).toBe('0,1');
  }
});

test('MatrixHeatmap: the keyboard reaches and opens every cell', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#risk [data-uix-matrix-cell]').first().focus();
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      expect(await position(page)).toBe(`${row},${column}`);
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowRight');
    }
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Home');
  }
  const opened = await page.evaluate(() => window.__matrix.opened);
  expect(opened).toHaveLength(12);
  expect(new Set(opened).size).toBe(12);
});

test('MatrixHeatmap: a link cell walks the same grid and opens with Enter', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#links a').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(':focus')).toHaveAttribute('href', '#possible');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#possible$/);
});

test('a level and a band read without colour', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.emulateMedia({ forcedColors: 'active' });
  const levels = await page.locator('#bia [data-uix-matrix-cell][data-row="0"]').allInnerTexts();
  expect(new Set(levels).size).toBe(4);
  // every tone has its own words, and forced colours keep the dashed edges of the two non-levels
  const bands = await page.locator('#risk [data-uix-matrix-cell][data-tone]').evaluateAll((els) => {
    const byTone = new Map();
    for (const e of els) byTone.set(e.dataset.tone, e.querySelector('.uix-matrix__band').textContent);
    return [...byTone.values()];
  });
  expect(bands.length).toBeGreaterThanOrEqual(5);
  expect(new Set(bands).size).toBe(bands.length);
  const dashed = (selector) => page.locator(selector).first().evaluate((e) => getComputedStyle(e).borderTopStyle);
  expect(await dashed('#risk [data-empty]')).toBe('dashed');
  expect(await dashed('#bia [data-unrated]')).toBe('dashed');
  // the hidden zero has its band, the empty cell has its words and a dashed edge
  await page.emulateMedia({ forcedColors: 'none' });
  await expect(page.locator('#risk').getByRole('button', { name: 'Gering, Selten: Keine' })).toHaveText('Keine');
  const empty = page.locator('#risk [data-empty]').first();
  await expect(empty).toHaveText('Keine Daten');
  expect(await empty.evaluate((e) => getComputedStyle(e).borderTopStyle)).toBe('dashed');
});

test('320 px: no page overflow, and no level, header or refusal is cut off', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 700 });
  const widths = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(widths[0]).toBe(widths[1]);
  const clipped = await page.evaluate(() => [...document.querySelectorAll('.uix-select__text, .uix-matrix__band, .uix-matrix__row, .uix-matrix__column')]
    .filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
  expect(clipped).toEqual([]);
});

test('SaveStatus: a long refusal wraps inside its container with the retry in reach, down to 320 px', async ({ page }, testInfo) => {
  for (const width of [1024, 480, 320]) {
    await open(page, testInfo, { width, height: 700 });
    const fit = await page.locator('#refusal').evaluate((box) => {
      const outer = box.getBoundingClientRect();
      const inner = box.querySelector('.uix-save-status').getBoundingClientRect();
      const text = box.querySelector('.uix-save-status__text').getBoundingClientRect();
      const retry = box.querySelector('.uix-save-status__retry').getBoundingClientRect();
      return {
        status: inner.left >= outer.left && inner.right <= outer.right,
        text: text.left >= outer.left && text.right <= outer.right,
        retry: retry.left >= outer.left && retry.right <= outer.right,
        beside: text.left - inner.left < 24,
      };
    });
    expect(fit).toEqual({ status: true, text: true, retry: true, beside: true });
    await page.getByRole('button', { name: 'Erneut versuchen' }).focus();
    await expect(page.getByRole('button', { name: 'Erneut versuchen' })).toBeFocused();
  }
});

test('SaveStatus: a short refusal keeps its line, and Saved does not paint over its neighbour', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const short = await page.locator('#short').evaluate((box) => {
    const text = box.querySelector('.uix-save-status__text').getBoundingClientRect();
    const retry = box.querySelector('.uix-save-status__retry').getBoundingClientRect();
    return { sameLine: retry.left >= text.right && Math.abs(retry.top + retry.height / 2 - (text.top + text.height / 2)) < retry.height / 2 };
  });
  expect(short).toEqual({ sameLine: true });
  const saved = await page.locator('#saved').evaluate((box) => {
    const text = box.querySelector('.uix-save-status__text').getBoundingClientRect();
    const button = box.querySelector('button').getBoundingClientRect();
    return text.right <= button.left + 1;
  });
  expect(saved).toBe(true);
});

test('axe: no violation in this theme, with the lists closed and open', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#bia [data-uix-matrix-cell]').first().focus();
  const violations = async () => (await new AxeBuilder({ page }).include('#root').analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`);
  expect(await violations()).toEqual([]);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-uix-select-popup]:popover-open')).toHaveCount(1);
  expect(await violations()).toEqual([]);
});
