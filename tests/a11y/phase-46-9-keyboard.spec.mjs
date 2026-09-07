import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((value) => localStorage.setItem('uix-theme', value), theme);
});

const openExample = (page, route) => page.goto(`docs/explorer.html#examples-${route}`, { waitUntil: 'networkidle' });

test('rule authoring controls reorder by keyboard', async ({ page }) => {
  await openExample(page, 'rule-builder');
  const secondRule = page.locator('[data-rule-row]').nth(1);
  await secondRule.getByRole('button', { name: 'Up' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-rule-live]')).toHaveText('Condition order updated.');
});

test('builder canvas manages property focus by keyboard', async ({ page }) => {
  await openExample(page, 'builder-canvas');
  await page.locator('[data-canvas-item]').nth(1).locator('.uix-builder-canvas__item-main').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-properties-heading]')).toBeFocused();
});

test('calendar agenda has a complete keyboard path', async ({ page }) => {
  await openExample(page, 'scheduling-calendar');
  await page.getByRole('button', { name: 'Agenda' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-calendar-agenda]')).toBeVisible();
});

test('date-range selection has a complete keyboard path', async ({ page }) => {
  await openExample(page, 'date-range-picker');
  const rangeStart = page.locator('[data-range-date="2026-09-08"]');
  await rangeStart.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-range-live]')).toContainText('2026-09-08 to 2026-09-09 selected');
});

test('graph traversal follows the roving keyboard path', async ({ page }) => {
  await openExample(page, 'relationship-graph');
  const firstNode = page.locator('[data-node-id="alpha"]');
  await firstNode.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-node-id="beta"]')).toBeFocused();
});

test('bulk review announces results', async ({ page }) => {
  await openExample(page, 'match-review');
  await page.locator('[data-match-check]').first().check();
  await page.locator('[data-match-bulk]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-match-live]')).toHaveText('1 candidates accepted.');
});

test('metric stepping announces the value', async ({ page }) => {
  await openExample(page, 'metric-input');
  await page.locator('[data-metric-step="10"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-metric]')).toHaveValue('260');
});

test('diff resolution announces results', async ({ page }) => {
  await openExample(page, 'diff-viewer');
  await page.locator('[data-diff-action="accept"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-diff-status]')).toHaveText('accept');
  await expect(page.locator('[data-diff-resolved]')).toHaveText('1');
});

test('ColorPicker hex path validates and Escape restores trigger focus', async ({ page }) => {
  await openExample(page, 'color-picker');
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
