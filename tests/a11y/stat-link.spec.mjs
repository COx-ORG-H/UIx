/* A Stat that leads somewhere looks it at rest (HAR-1803): on a tablet there is no hover, so a
 * link tile and a plain figure must differ before anything is touched.
 *   - the link tile (`href`) shows a trailing chevron in its label row, on a touch device
 *     (`hover: none`) and in forced colours too; a read-only tile has none;
 *   - an in-place action tile (`onActivate`, `haspopup={false}`, no chevron) underlines its
 *     value; a dialog/menu tile keeps its down chevron;
 *   - the affordance is a shape, not a colour: nothing about it changes on hover.
 * Harness: tests/operator-primitives/harness.tsx (the stretched stat rows). */
import { test, expect, devices } from '@playwright/test';

const HARNESS = '/tests/operator-primitives/harness.html';

async function open(page, theme) {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#row-compact > .uix-stat').first()).toBeVisible();
}

const resting = (page) => page.locator('#row-compact > .uix-stat').evaluateAll((tiles) => tiles.map((tile) => {
  const go = tile.querySelector('.uix-stat__label .uix-stat__go svg');
  const chevron = tile.querySelector('.uix-stat__label .uix-stat__chevron svg');
  const box = (el) => (el ? el.getBoundingClientRect() : null);
  const value = getComputedStyle(tile.querySelector('.uix-stat__value'));
  return {
    tile: tile.dataset.tile,
    go: go ? Math.round(box(go).width) : 0,
    chevron: chevron ? Math.round(box(chevron).width) : 0,
    underline: value.textDecorationLine.includes('underline') ? value.textDecorationStyle : 'none',
  };
}));

const EXPECTED = [
  { tile: 'read-only', go: 0, chevron: 0, underline: 'none' },
  { tile: 'read-only-meta', go: 0, chevron: 0, underline: 'none' },
  { tile: 'three-lines', go: 0, chevron: 1, underline: 'none' },
  { tile: 'no-meta', go: 0, chevron: 1, underline: 'none' },
  { tile: 'link', go: 1, chevron: 0, underline: 'none' },
  { tile: 'pending', go: 0, chevron: 0, underline: 'dotted' },
];

test('at rest, every interactive tile carries a shape a plain figure does not', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name);
  await page.mouse.move(0, 0);
  const tiles = await resting(page);
  // icon sizes are tokens; compare presence, then the size against --uix-icon-sm
  const iconSm = await page.evaluate(() => Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--uix-icon-sm'))));
  expect(iconSm).toBeGreaterThanOrEqual(12);
  expect(tiles).toEqual(EXPECTED.map((t) => ({ ...t, go: t.go && iconSm, chevron: t.chevron && iconSm })));
});

test('the link chevron needs no hover: it is there on a touch screen and does not change on hover', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...devices['iPad Mini'], colorScheme: testInfo.project.name });
  const page = await context.newPage();
  await open(page, testInfo.project.name);
  expect(await page.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true);
  const link = page.locator('#row-compact > [data-tile="link"]');
  const go = link.locator('.uix-stat__go');
  await expect(go).toBeVisible();
  const before = await go.evaluate((el) => ({ color: getComputedStyle(el).color, opacity: getComputedStyle(el).opacity }));
  expect(before.opacity).toBe('1');
  // a tap still navigates, and the cue stays as it was
  await link.tap();
  await expect(page).toHaveURL(/#related$/);
  expect(await go.evaluate((el) => ({ color: getComputedStyle(el).color, opacity: getComputedStyle(el).opacity }))).toEqual(before);
  await context.close();
});

test('forced colours keep the chevron: it is a currentColor stroke', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ forcedColors: 'active', colorScheme: testInfo.project.name });
  const page = await context.newPage();
  await open(page, testInfo.project.name);
  const go = page.locator('#row-compact > [data-tile="link"] .uix-stat__go svg');
  await expect(go).toBeVisible();
  expect(await go.evaluate((el) => getComputedStyle(el).stroke)).not.toBe('none');
  await context.close();
});
