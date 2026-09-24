/* Visual goldens for InfoTip and the `help` slots (UIx HAR-737): PageHeader, Card and SectionHead
 * with the ? after the title, and Field with the ? between the label and the required marker
 * (next to a Field without help), then the page-header panel open. Both themes. Rendered from
 * the React harness (tests/info-tip/harness.tsx, bundled in globalSetup). Goldens are
 * Linux-only — see playwright.config.mjs. */
import { test, expect } from '@playwright/test';

const HARNESS = '/tests/info-tip/harness.html';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
});

test('info-tip-slots', async ({ page }) => {
  await expect(page.locator('#slots')).toHaveScreenshot('info-tip-slots.png');
});

test('info-tip-open', async ({ page }) => {
  const button = page.getByRole('button', { name: 'About: Incidents' });
  await button.click();
  await expect(page.locator(`[id="${await button.getAttribute('aria-describedby')}"]`)).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.locator('#slots')).toHaveScreenshot('info-tip-open.png');
});
