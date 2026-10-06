/* TextDiff in a real browser (HAR-1368). The harness (tests/text-diff/harness.tsx) is bundled
 * from source in globalSetup. What only exists when rendered: axe colour contrast of the change
 * tints and marks in both themes, focus after a fold opens, and the split view stacking in a
 * narrow container. The model and markup are in packages/react/src/text-diff-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/text-diff/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#words .uix-text-diff')).toBeVisible();
});

test('no serious or critical axe violations, folds closed and open', async ({ page }) => {
  const scan = async () => (await new AxeBuilder({ page }).include('#root').analyze()).violations
    .filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.length} node(s)`);
  expect(await scan()).toEqual([]);
  const folds = page.locator('.uix-text-diff__fold');
  // Each click replaces its fold with the lines, so always open the first one left.
  while (await folds.count()) await folds.first().click();
  expect(await scan()).toEqual([]);
});

test('opening a fold puts focus on the first revealed line, not on <body>', async ({ page }) => {
  const split = page.locator('#split');
  const fold = split.getByRole('button', { name: 'Show 3 unchanged lines' });
  await fold.focus();
  await page.keyboard.press('Enter');
  await expect(fold).toHaveCount(0);
  const focused = page.locator(':focus');
  await expect(focused).toHaveClass(/uix-text-diff__row/);
  await expect(focused).toContainText('# Restart the payment gateway');
});

test('at 320 px the split view stacks: one column, no sideways scroll, signs still say which side', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const diff = page.locator('#split .uix-text-diff');
  const change = diff.locator('.uix-text-diff__row[data-kind="change"]').first();
  const [before, after] = await change.locator('.uix-text-diff__cell').all();
  const a = await before.boundingBox();
  const b = await after.boundingBox();
  expect(Math.abs(a.x - b.x)).toBeLessThan(1);
  expect(b.y).toBeGreaterThan(a.y);
  await expect(before.locator('.uix-text-diff__sign')).toHaveText('−');
  await expect(after.locator('.uix-text-diff__sign')).toHaveText('+');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
  const body = diff.locator('.uix-text-diff__body');
  expect(await body.evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0);
  // Unchanged lines show once when stacked, not twice.
  await expect(diff.locator('.uix-text-diff__row[data-kind="equal"]').first().locator('.uix-text-diff__cell:visible')).toHaveCount(1);
});
