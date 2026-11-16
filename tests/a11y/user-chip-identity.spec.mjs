import { test, expect } from '@playwright/test';
for (const width of [1440, 320]) test(`UserChip contains a long identity at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tests/user-chip-identity/harness.html');
  await page.locator('html').evaluate((element, theme) => { element.dataset.theme = theme; }, info.project.name === 'dark' ? 'dark' : 'light');
  const chip = page.locator('[data-constrained] .uix-user-chip');
  await expect(chip.getByText('Mitarbeiterin'.repeat(7), { exact: true })).toBeVisible();
  await expect(chip).toHaveAttribute('title', 'Mitarbeiterin'.repeat(7));
  await page.screenshot({ path: info.outputPath('before.png') });
  const avatar = await chip.locator('.uix-avatar').boundingBox();
  expect(avatar.width).toBe(28); expect(avatar.height).toBe(28);
  expect(await chip.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  for (const label of ['.uix-user-chip__name', '.uix-user-chip__sub']) {
    const geometry = await chip.locator(label).evaluate(element => ({
      scroll: element.scrollWidth, client: element.clientWidth,
      overflow: getComputedStyle(element).textOverflow, whitespace: getComputedStyle(element).whiteSpace,
      line: getComputedStyle(element).lineHeight, height: element.getBoundingClientRect().height,
    }));
    expect(geometry.scroll).toBeGreaterThan(geometry.client);
    expect(geometry.overflow).toBe('ellipsis'); expect(geometry.whitespace).toBe('nowrap');
    expect(geometry.height).toBeLessThan(40);
  }
  await chip.getByRole('button', { name: 'Profildetails öffnen' }).focus();
  await page.screenshot({ path: info.outputPath('during.png') });
  await page.keyboard.press('Enter');
  await expect(page.locator('output')).toHaveText('Profil geöffnet');
  await expect(page.locator('[data-short]')).toContainText('Anne Müller');
  await expect(page.locator('[data-short]')).toContainText('Service-Desk');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('after.png') });
});
