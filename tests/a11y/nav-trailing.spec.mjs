/* NavItem's trailing slot (HAR-3093): the badge sits where a hidden star would be, steps aside when
 * the star shows (hover, keyboard focus), and sits beside a pinned star. The label keeps the rest of
 * the row: "Benachrichtigungen" with a count reads in full at the kit's 248 px sidebar. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name === 'dark' ? 'dark' : 'light';
  await page.addInitScript((value) => localStorage.setItem('uix-theme', value), theme);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tests/nav-trailing/harness.html', { waitUntil: 'networkidle' });
  await expect(page.locator('#row-count')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
});

/** Geometry and visibility of one row's label, badge and star. */
const read = (page, id) => page.locator(`#${id}`).evaluate((link) => {
  const row = link.closest('.uix-navrow');
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; };
  const label = link.querySelector('.uix-navitem__label');
  const badge = link.querySelector('.uix-navitem__badge');
  const star = row?.querySelector('.uix-navitem__star');
  const shown = (el) => (el ? Number(getComputedStyle(el).opacity) > 0.5 : false);
  return {
    label: box(label), labelClipped: label.scrollWidth > label.clientWidth + 1,
    badge: box(badge), badgeShown: shown(badge),
    star: box(star), starShown: shown(star),
    link: box(link), row: box(row),
  };
});

const settle = (page) => page.evaluate(() => Promise.allSettled(document.getAnimations().map((a) => a.finished)));

test('at rest: the full German label, the count in the star\'s place, the star hidden', async ({ page }) => {
  const g = await read(page, 'row-count');
  expect(g.labelClipped, '"Benachrichtigungen" reads in full').toBe(false);
  expect(g.badgeShown).toBe(true);
  expect(g.starShown).toBe(false);
  expect(Math.abs(g.badge.right - g.star.right), 'the count ends where the star ends').toBeLessThanOrEqual(1);
  expect(g.label.right, 'the label ends before the count').toBeLessThanOrEqual(g.badge.left);
});

test('hover and keyboard focus show the star; the count steps aside, never under it', async ({ page }) => {
  const rest = await read(page, 'row-count');
  await page.locator('#row-count').hover();
  await settle(page);
  const hovered = await read(page, 'row-count');
  expect(hovered.starShown).toBe(true);
  expect(hovered.badgeShown, 'the count gives the star its place').toBe(false);
  expect(hovered.label.width, 'the label does not move').toBeCloseTo(rest.label.width, 0);
  expect(hovered.label.right).toBeLessThanOrEqual(hovered.star.left);

  await page.mouse.move(1400, 880);
  await page.locator('#row-count').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await settle(page);
  const focused = await read(page, 'row-count');
  expect(focused.starShown, 'focus reveals the star like hover').toBe(true);
  expect(focused.badgeShown).toBe(false);
});

test('a pinned row shows star and count side by side', async ({ page }) => {
  const g = await read(page, 'row-pinned');
  expect(g.starShown).toBe(true);
  expect(g.badgeShown).toBe(true);
  expect(g.badge.right, 'the count sits left of the star').toBeLessThanOrEqual(g.star.left);
  // a pinned row gives up the star's room too, so a long label may end in an ellipsis (CI's fonts
  // cut "Benachrichtigungen" here); it never runs under the count
  expect(g.label.right, 'the label ends before the count').toBeLessThanOrEqual(g.badge.left);
});

test('a row with only a star keeps the star\'s room; a long label ends in an ellipsis before the count', async ({ page }) => {
  await page.locator('#row-star').hover();
  await settle(page);
  const star = await read(page, 'row-star');
  expect(star.label.right).toBeLessThanOrEqual(star.star.left);
  const long = await read(page, 'row-long');
  expect(long.labelClipped).toBe(true);
  expect(long.label.right).toBeLessThanOrEqual(long.badge.left);
  const sub = await read(page, 'row-sub');
  expect(sub.badgeShown).toBe(true);
  expect(Math.abs(sub.badge.right - sub.star.right)).toBeLessThanOrEqual(1);
});

test('a row without trailing renders as before: no row wrapper, no end slot', async ({ page }) => {
  const plain = page.locator('#row-plain');
  await expect(plain.locator('xpath=..')).not.toHaveClass(/uix-navrow/);
  await expect(plain.locator('.uix-navitem__end')).toHaveCount(0);
  await expect(plain.locator('> .uix-navitem__badge')).toHaveText('5');
});

test('no axe violations in the sidebar, star shown', async ({ page }) => {
  await page.locator('#row-count').hover();
  const results = await new AxeBuilder({ page }).include('.uix-sidebar').analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
