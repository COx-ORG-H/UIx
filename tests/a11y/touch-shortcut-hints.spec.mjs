/* Shortcut hints on a touch phone (batch follow-up to #165 and #159/#142), in Chromium, light and
 * dark. A key cap is a hint for a keyboard: on a device with no hover and a coarse pointer
 * (`@media (hover: none) and (pointer: coarse)`, Chromium's phone emulation) the kit draws none.
 *   - the AppShell phone drawer at 320 and 390 px: the Sidebar search row shows no "Ctrl K", and
 *     still says its keys with aria-keyshortcuts;
 *   - a Button with a shortcut: a tap opens no hint bubble; the keys stay its description;
 *   - a Tooltip: its label shows, its keys do not; the description still ends with the keys;
 *   - a Menu row: no key caps; aria-keyshortcuts and the row's name stay (a key a product put in
 *     the slot is clipped, not removed);
 *   - CommandPalette rows and SearchSuggest's trailing key: no caps;
 *   - the same pages with a mouse at 390 px keep every hint (it is the device, not the width).
 * Harnesses: tests/staff-shell, tests/shortcut, tests/command-palette-items, tests/search-suggest. */
import { test, expect } from '@playwright/test';

const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');
const open = async (page, testInfo, url) => {
  await page.addInitScript(([t]) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
  }, [themeOf(testInfo)]);
  await page.goto(url, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeOf(testInfo));
};
/** Rendered (a box with a size), not just in the DOM. */
const drawn = (locator) => locator.evaluateAll((els) => els.filter((el) => {
  const r = el.getBoundingClientRect();
  return r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== 'hidden';
}).length);

test.describe('a touch phone', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('the emulated device is touch-first', async ({ page }, testInfo) => {
    await open(page, testInfo, '/tests/shortcut/harness.html');
    expect(await page.evaluate(() => matchMedia('(hover: none) and (pointer: coarse)').matches)).toBe(true);
  });

  for (const width of [320, 390]) {
    test(`AppShell phone drawer at ${width} px: the Sidebar search row draws no keys and still announces them`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 760 });
      await open(page, testInfo, '/tests/staff-shell/harness.html?view=nav');
      await page.getByRole('button', { name: 'Otvori navigaciju' }).tap();
      const drawer = page.getByRole('dialog', { name: 'Navigacija' });
      await expect(drawer).toBeVisible();
      const search = drawer.getByRole('button', { name: 'Pretraga' });
      await expect(search).toBeVisible();
      await expect(search).toHaveAttribute('aria-keyshortcuts', 'Control+K');
      expect(await drawn(search.locator('kbd')), 'no key cap in the search row').toBe(0);
      // the label takes the row: it is not cut short by room kept for the keys
      const label = await search.locator('.uix-sidebar__search-label').evaluate((el) => el.scrollWidth <= el.clientWidth);
      expect(label).toBe(true);
    });
  }

  test('Button: a tap opens no hint bubble; the keys stay its description', async ({ page }, testInfo) => {
    await open(page, testInfo, '/tests/shortcut/harness.html');
    const assign = page.locator('#assign');
    await expect(assign).toHaveAccessibleDescription('A');
    await assign.tap();
    await page.waitForTimeout(150);
    expect(await drawn(page.locator('.uix-tooltip__bubble--hint')), 'a tap draws no hint').toBe(0);
    await expect(assign).toHaveAccessibleDescription('A');
  });

  test('Tooltip: the label shows, the keys do not; the description keeps the keys', async ({ page }, testInfo) => {
    await open(page, testInfo, '/tests/shortcut/harness.html');
    const trigger = page.locator('#tip-trigger');
    await trigger.focus();
    const bubble = page.getByRole('tooltip', { name: /Keyboard shortcuts/ });
    await expect(bubble).toBeVisible();
    expect(await drawn(bubble.locator('kbd'))).toBe(0);
    await expect(trigger).toHaveAccessibleDescription('Keyboard shortcuts Shift+?');
  });

  test('Menu: rows draw no key caps; aria-keyshortcuts and names stay', async ({ page }, testInfo) => {
    await open(page, testInfo, '/tests/shortcut/harness.html');
    await page.locator('#record-menu').tap();
    const assign = page.getByRole('menuitem', { name: /Assign to me/ });
    await expect(assign).toBeVisible();
    await expect(assign).toHaveAttribute('aria-keyshortcuts', 'A');
    await expect(assign).toHaveAccessibleName(/Assign to me/);
    expect(await drawn(page.locator('[role="menu"] kbd'))).toBe(0);
    // a key a product passed as a node is still part of the row's name
    await expect(page.locator('#menu-legacy')).toHaveAccessibleName(/Delete\s*Del/);
  });

  test('CommandPalette rows and SearchSuggest draw no key caps', async ({ page }, testInfo) => {
    await open(page, testInfo, '/tests/command-palette-items/harness.html');
    await expect(page.locator('#inline [role="option"]').first()).toBeVisible();
    await expect(page.locator('#inline [aria-keyshortcuts]').first()).toHaveAttribute('aria-keyshortcuts', /./);
    expect(await drawn(page.locator('#inline [role="option"] kbd'))).toBe(0);
    await open(page, testInfo, '/tests/search-suggest/harness.html');
    await expect(page.locator('.uix-search-suggest__trail > .uix-kbd').first()).toBeAttached();
    expect(await drawn(page.locator('.uix-search-suggest__trail > .uix-kbd'))).toBe(0);
  });
});

test('with a mouse, a 390 px window keeps every hint (the device decides, not the width)', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 760 });
  expect(await page.evaluate(() => matchMedia('(hover: none) and (pointer: coarse)').matches)).toBe(false);
  await open(page, testInfo, '/tests/staff-shell/harness.html?view=nav');
  await page.getByRole('button', { name: 'Otvori navigaciju' }).click();
  const search = page.getByRole('dialog', { name: 'Navigacija' }).getByRole('button', { name: 'Pretraga' });
  await expect(search).toBeVisible();
  expect(await drawn(search.locator('kbd'))).toBe(2);
  await open(page, testInfo, '/tests/shortcut/harness.html');
  await page.locator('#record-menu').click();
  await expect(page.getByRole('menuitem', { name: /Assign to me/ })).toBeVisible();
  expect(await drawn(page.locator('[role="menu"] kbd'))).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  // (the menu trigger's own hint may be open too: focus came back to it from the keyboard)
  await page.locator('#assign').hover();
  await expect(page.locator('.uix-tooltip__bubble--hint:popover-open', { hasText: /^AA$/ })).toBeVisible();
});
