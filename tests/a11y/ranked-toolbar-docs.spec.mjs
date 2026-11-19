/* HAR-3090 docs specimen: the static "More" menu of the ranked toolbar behaves like the kit Menu
 * (Qodo on #279): ↓ moves, Esc closes and focus returns, a radio choice moves the check, the
 * checkbox item toggles. */
import { test, expect } from '@playwright/test';

test('the docs ranked toolbar\'s More menu: keyboard and choices', async ({ page }) => {
  await page.goto('docs/explorer.html#examples-data-display', { waitUntil: 'networkidle' });
  const example = page.locator('[data-ranked-toolbar-example]');
  const more = example.getByRole('button', { name: 'More' });
  await more.scrollIntoViewIfNeeded();
  await more.click();
  const menu = page.locator('#demo-toolbar-more');
  await expect(menu).toBeVisible();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  // opens on the checked radio item
  await expect(menu.getByRole('menuitemradio', { name: 'None' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitemradio', { name: 'Status' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(more).toBeFocused();
  await more.click();
  await menu.getByRole('menuitemradio', { name: 'Status' }).click();
  await expect(menu).toBeHidden();
  await expect(menu.getByRole('menuitemradio', { name: 'Status', includeHidden: true })).toHaveAttribute('aria-checked', 'true');
  await expect(menu.getByRole('menuitemradio', { name: 'None', includeHidden: true })).toHaveAttribute('aria-checked', 'false');
  await more.click();
  await menu.getByRole('menuitemcheckbox', { name: 'Maximize' }).click();
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Maximize', includeHidden: true })).toHaveAttribute('aria-checked', 'true');
});
