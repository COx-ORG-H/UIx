/* Menu in a real browser (HAR-1629): radio and checkbox items, attributes on the item element,
 * Escape on the trigger of a menu with no enabled item, and a menu longer than a phone screen.
 * jsdom covers the roles and state (packages/react/src/menu-dom.test.mjs); this covers real
 * focus, the real Popover API, layout at 320 × 640 and an axe scan of each open menu.
 * Harness: tests/overlay/harness.tsx, bundled from source in globalSetup. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleAnimations } from './settle.mjs';

const HARNESS = '/tests/overlay/harness.html';
const GATED = new Set(['serious', 'critical']);

test.use({ viewport: { width: 320, height: 640 } });

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ } }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('#preset')).toBeVisible();
  await page.evaluate(() => { window.scrollBy(0, document.getElementById('preset').getBoundingClientRect().top - 300); });
});

const focused = (page) => page.evaluate(() => document.activeElement?.textContent ?? '');
const axe = async (page, scope) => {
  await settleAnimations(page);
  const { violations } = await new AxeBuilder({ page }).include(scope).analyze();
  return violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
};

test('radio items: the menu opens on the current choice, arrows move, Enter chooses and closes', async ({ page }) => {
  const trigger = page.locator('#preset');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu', { name: 'Preset' });
  await expect(menu).toBeVisible();
  const radios = menu.getByRole('menuitemradio');
  await expect(radios).toHaveCount(3);
  await expect(menu.getByRole('menuitemradio', { name: 'Team' })).toHaveAttribute('aria-checked', 'true');
  await expect(menu.getByRole('menuitemradio', { name: 'My queue' })).toHaveAttribute('aria-checked', 'false');
  await expect(menu.getByRole('group', { name: 'Dashboard preset' })).toBeVisible();
  await expect.poll(() => focused(page)).toBe('Team');
  expect(await axe(page, '[role="menu"]:popover-open')).toEqual([]);

  // the hook TENSOR keeps for journeys and analytics is on the item itself
  await expect(menu.locator('[data-action-id="preset.team"]')).toHaveAttribute('role', 'menuitemradio');
  await expect(menu.locator('#manage-presets')).toHaveAttribute('data-action-id', 'preset.manage');

  // every row's text starts at the same x, checked or not
  const lefts = await menu.locator('[role="menuitemradio"] .uix-menu__text').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
  expect(new Set(lefts).size).toBe(1);

  await page.keyboard.press('ArrowDown');
  await expect.poll(() => focused(page)).toBe('Everything');
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => window.__overlay.preset)).toBe('all');

  await page.keyboard.press('ArrowDown');
  await expect.poll(() => focused(page)).toBe('Everything');
  await expect(page.getByRole('menuitemradio', { name: 'Everything' })).toHaveAttribute('aria-checked', 'true');

  // Space chooses and leaves the menu open
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(page.getByRole('menuitemradio', { name: 'Team' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('menu', { name: 'Preset' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('checkbox items toggle and leave the menu open', async ({ page }) => {
  const trigger = page.locator('#view-columns');
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Columns shown' });
  await expect(menu).toBeVisible();
  const owner = menu.getByRole('menuitemcheckbox', { name: 'Owner' });
  await expect(menu.getByRole('menuitemcheckbox', { name: 'State' })).toHaveAttribute('aria-checked', 'true');
  await expect(owner).toHaveAttribute('aria-checked', 'false');
  expect(await axe(page, '[role="menu"]:popover-open')).toEqual([]);
  await owner.click();
  await expect(owner).toHaveAttribute('aria-checked', 'true');
  await expect(menu).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Priority' })).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => window.__overlay.columns)).toEqual(['state', 'owner', 'priority']);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('every item disabled: focus stays on the trigger and Escape closes the menu', async ({ page }) => {
  const trigger = page.locator('#bulk');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu', { name: 'Bulk actions' });
  await expect(menu).toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(await axe(page, '[role="menu"]:popover-open')).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

test('a menu longer than the screen stays inside it, scrolls, and keeps the focused item in view', async ({ page }) => {
  const trigger = page.locator('#long');
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Long' });
  await expect(menu).toBeVisible();
  await expect.poll(() => menu.evaluate((el) => el.getAnimations().length)).toBe(0);
  const inside = async (label) => {
    const b = await menu.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; });
    expect(b.top, `${label}: top`).toBeGreaterThanOrEqual(7.5);
    expect(b.bottom, `${label}: bottom`).toBeLessThanOrEqual(640 - 7.5);
    expect(b.left, `${label}: left`).toBeGreaterThanOrEqual(7.5);
    expect(b.right, `${label}: right`).toBeLessThanOrEqual(320 - 7.5);
  };
  await inside('open');
  expect(await menu.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await expect.poll(() => focused(page)).toBe('Action 1');
  await page.keyboard.press('End');
  await expect.poll(() => focused(page)).toBe('Action 60');
  const last = await page.evaluate(() => {
    const item = document.activeElement.getBoundingClientRect();
    const box = document.activeElement.closest('[role="menu"]').getBoundingClientRect();
    return item.top >= box.top && item.bottom <= box.bottom;
  });
  expect(last, 'the focused last item is scrolled into view inside the menu').toBe(true);
  await inside('after End');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
