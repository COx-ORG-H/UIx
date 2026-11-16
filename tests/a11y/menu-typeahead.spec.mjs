import { test, expect } from '@playwright/test';
for (const width of [1440, 320]) test(`Menu starts a fresh search on rapid reopening at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Date.now never advances: all reopenings are strictly inside the 600 ms buffer.
  // Timers keep running so normal popover positioning/focus still executes.
  await page.clock.setFixedTime(new Date('2026-11-16T00:00:00Z'));
  await page.goto('/tests/menu-typeahead/harness.html');
  await page.locator('html').evaluate((element, theme) => { element.dataset.theme = theme; }, info.project.name === 'dark' ? 'dark' : 'light');
  await page.screenshot({ path: info.outputPath('before.png') });
  for (const [id, label] of [['uncontrolled', 'Eigenständiges Menü'], ['controlled', 'Gesteuertes Menü']]) {
    const region = page.locator(`[data-example="${id}"]`);
    const trigger = region.getByRole('button', { name: 'Menü öffnen', exact: true });
    const opener = id === 'controlled' ? region.getByRole('button', { name: 'Menü von außen öffnen' }) : trigger;
    const menu = page.getByRole('menu', { name: label });
    for (let cycle = 0; cycle < 3; cycle += 1) {
      await opener.click();
      await expect(menu.getByRole('menuitem', { name: 'Termine', exact: true })).toBeFocused();
      await page.keyboard.press('End');
      await page.keyboard.press('o');
      await page.screenshot({ path: info.outputPath(`${id}-cycle-${cycle}.png`) });
      await expect(menu.getByRole('menuitem', { name: 'Oben anheften', exact: true })).toBeFocused();
      const bounds = await menu.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      if (cycle === 2) await page.screenshot({ path: info.outputPath(`${id}-during.png`) });
      if (id === 'controlled') await region.getByRole('button', { name: 'Menü von außen schließen' }).click();
      else { await page.keyboard.press('Escape'); await expect(trigger).toBeFocused(); }
      await expect(menu).toBeHidden();
    }
    await trigger.click();
    await expect(menu.getByRole('menuitem', { name: 'Termine', exact: true })).toBeFocused();
    await page.keyboard.press('End');
    await page.keyboard.press('t'); await page.keyboard.press('e'); await page.keyboard.press('i');
    await expect(menu.getByRole('menuitem', { name: 'Teilen', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(region.locator('output')).toHaveText('Teilen ausgeführt');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('after.png') });
});
