import { test, expect } from '@playwright/test';
import AxeBuilder from './axe.mjs';

test('interactive Stat names include their visible text and retain keyboard operation', async ({ page }, testInfo) => {
  await page.addInitScript((theme) => localStorage.setItem('uix-theme', theme), testInfo.project.name);
  await page.goto('/tests/operator-primitives/harness.html');
  const section = page.locator('#stat-accessible-names');
  const plain = section.locator('[data-case="plain"]');
  const meta = section.locator('[data-case="meta"]');
  const trend = section.locator('[data-case="trend"]');
  await expect(plain).toHaveAccessibleName(/Priorität\s*:\s*P1\s*,\s*ändern/);
  await expect(meta).toHaveAccessibleName(/SLA\s*:\s*Verletzt.*Incident P1 – resolve within 4 hours.*SLA-Timer/);
  await expect(trend).toHaveAccessibleName(/Incidents\s*:\s*12.*5%.*last week.*view/);
  await expect(plain).toHaveAccessibleDescription('Opens the priority editor.');
  await plain.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => window.__op.activations)).toBe(2);
  const result = await new AxeBuilder({ page }).include('#stat-accessible-names').withRules(['label-content-name-mismatch']).analyze();
  expect(result.violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  for (const tile of [plain, meta, trend]) {
    await expect(tile).toBeVisible();
    expect(await tile.evaluate((el) => el.getBoundingClientRect().right <= document.documentElement.clientWidth)).toBe(true);
  }
  const narrow = await new AxeBuilder({ page }).include('#stat-accessible-names').withRules(['label-content-name-mismatch']).analyze();
  expect(narrow.violations).toEqual([]);
});
