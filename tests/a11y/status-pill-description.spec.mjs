import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/* A StatusPill that explains itself (HAR-3109): Tab reaches the pill and its description opens in
 * the kit tooltip, hover opens it too, Escape closes it; the pill has the kit focus ring and is no
 * button; axe finds nothing on the row, in both themes. The DOM half is
 * packages/react/src/status-pill-description-dom.test.mjs. */

const HARNESS = '/tests/status-pill-description/harness.html';
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

async function open(page, theme) {
  await page.addInitScript((t) => localStorage.setItem('uix-theme', t), theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
}

test('Tab reaches the pill and opens its description; Escape closes it; hover opens it (HAR-3109)', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const pill = page.locator('[data-described-pill]');
  const bubble = page.getByRole('tooltip');
  await page.locator('[data-before]').focus();
  await page.keyboard.press('Tab');
  await expect(pill).toBeFocused();
  await expect(bubble).toBeVisible();
  await expect(bubble).toContainText('Aus den letzten drei Antworten');
  const a11y = await pill.evaluate((el) => ({
    role: el.getAttribute('role'), describedBy: el.getAttribute('aria-describedby'),
    outline: getComputedStyle(el).outlineStyle, cursor: getComputedStyle(el).cursor,
  }));
  expect(a11y.role).toBeNull();
  expect(a11y.describedBy).toBeTruthy();
  expect(a11y.outline).toBe('solid');
  expect(a11y.cursor).toBe('help');
  await testInfo.attach('focused', { body: await page.locator('section').screenshot(), contentType: 'image/png' });
  await page.keyboard.press('Escape');
  await expect(bubble).toBeHidden();
  // pressing the pill does nothing: no navigation, focus stays
  await page.keyboard.press('Enter');
  await expect(pill).toBeFocused();
  // hover opens it too
  await page.locator('[data-before]').focus();
  await expect(bubble).toBeHidden();
  await pill.hover();
  await expect(bubble).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).include('section').analyze();
  expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
});
