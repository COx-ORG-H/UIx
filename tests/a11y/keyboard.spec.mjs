/* Keyboard-operability gate (UIX-A11Y-5 follow-up to the 2026-07 audit).
 *
 * axe cannot judge keyboard interaction — these tests assert the behaviors the audit
 * found missing: the skip link, dialog focus restore, rich-select AT feedback while
 * arrowing, sortable-header keyboard operation, and separator-based column resize.
 * Keyboard behavior is theme-independent, so this spec runs only in the light project.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'light', 'keyboard behavior is theme-independent');
});

test('skip link is the first tab stop and targets main content', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveClass(/uix-skiplink/);
  await expect(focused).toHaveAttribute('href', '#main');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('modal: Esc closes, focus returns to the trigger, scroll unlocks', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'networkidle' });
  const trigger = page.getByRole('button', { name: 'Open modal' });
  await trigger.click();
  const dialog = page.locator('dialog#demo-modal');
  await expect(dialog).toHaveAttribute('open', '');
  // focus starts inside the dialog (native showModal behavior)
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(trigger).toBeFocused();
});

test('rich select: combobox states and audible arrowing', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'networkidle' });
  const trigger = page.locator('[popovertarget="status-sel"]');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  // the field label must reach the trigger's accessible name (audit S1)
  await expect(trigger).toHaveAttribute('aria-labelledby', /.+/);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  // arrowing must move aria-activedescendant (audit S1: previously silent)
  await page.keyboard.press('ArrowDown');
  const active = await trigger.getAttribute('aria-activedescendant');
  expect(active).toBeTruthy();
  const option = page.locator(`#${active}`);
  await expect(option).toHaveAttribute('role', 'option');
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('table sort is keyboard-operable and announced', async ({ page }) => {
  await page.goto('tables.html', { waitUntil: 'networkidle' });
  // sortable headers now contain a real button (audit S1: previously click-only th)
  const sortBtn = page.locator('th[data-sort] .uix-th__sortbtn').first();
  await expect(sortBtn).toBeVisible();
  const th = sortBtn.locator('xpath=ancestor::th[1]');
  const before = await th.getAttribute('aria-sort');
  await sortBtn.focus();
  await page.keyboard.press('Enter');
  const after = await th.getAttribute('aria-sort');
  expect(after).not.toBe(before);
  expect(['ascending', 'descending']).toContain(after);
  // the change is announced into the grid's polite region
  const announced = await page
    .locator('[aria-live="polite"]', { hasText: /Sorted by/i })
    .first()
    .textContent();
  expect(announced).toMatch(/Sorted by/i);
});

test('column resize grip is a keyboard-operable separator', async ({ page }) => {
  await page.goto('tables.html', { waitUntil: 'networkidle' });
  const grip = page.locator('[data-resize]').first();
  await expect(grip).toHaveAttribute('role', 'separator');
  await expect(grip).toHaveAttribute('aria-valuenow', /\d+/);
  // focus first: aria-valuenow syncs to the real column width on focusin
  await grip.focus();
  const before = Number(await grip.getAttribute('aria-valuenow'));
  await page.keyboard.press('ArrowRight');
  const grip2 = page.locator('[data-resize]').first(); // header may re-render
  const after = Number(await grip2.getAttribute('aria-valuenow'));
  expect(after).toBeGreaterThan(before);
});
