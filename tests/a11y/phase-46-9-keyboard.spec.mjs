import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((value) => localStorage.setItem('uix-theme', value), theme);
  await page.goto('phase-46-9.html', { waitUntil: 'networkidle' });
});

test('authoring controls reorder and manage property focus by keyboard', async ({ page }) => {
  const secondRule = page.locator('[data-rule-row]').nth(1);
  await secondRule.getByRole('button', { name: 'Up' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-rule-live]')).toHaveText('Condition order updated.');

  await page.locator('[data-canvas-item]').nth(1).locator('.uix-builder-canvas__item-main').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-properties-heading]')).toBeFocused();
});

test('calendar agenda and date-range selection have complete keyboard paths', async ({ page }) => {
  await page.getByRole('button', { name: 'Agenda' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-calendar-agenda]')).toBeVisible();

  const rangeStart = page.locator('[data-range-date="2026-09-08"]');
  await rangeStart.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-range-live]')).toContainText('2026-09-08 to 2026-09-09 selected');
});

test('graph traversal, bulk review, metrics, and diff resolution announce results', async ({ page }) => {
  const firstNode = page.locator('[data-node-id="alpha"]');
  await firstNode.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-node-id="beta"]')).toBeFocused();

  await page.locator('[data-match-check]').first().check();
  await page.locator('[data-match-bulk]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-match-live]')).toHaveText('1 candidates accepted.');

  await page.locator('[data-metric-step="10"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-metric]')).toHaveValue('260');

  await page.locator('[data-diff-action="accept"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-diff-status]')).toHaveText('accept');
  await expect(page.locator('[data-diff-resolved]')).toHaveText('1');
});

test('ColorPicker hex path validates and Escape restores trigger focus', async ({ page }) => {
  const trigger = page.locator('[data-color-trigger]');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const hex = page.locator('[data-color-hex]');
  await expect(hex).toBeFocused();
  await hex.fill('#16A34A');
  await page.locator('[data-color-set]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-color-value]')).toHaveText('#16A34A');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.locator('[data-color-dialog]')).toBeHidden();
});
