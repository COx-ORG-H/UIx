/* ViewMenu column rows in a real browser (TENSOR HAR-666).
 *
 * The harness (tests/view-menu/harness.tsx) is bundled from source in globalSetup. What only exists
 * when rendered: the panel's own surface inside a shell that adds none, the pinned section titles,
 * the idle grip / ⋯ contrast, the top-layer row menu, focus after a move, and the pointer drag.
 * The markup contract is in packages/react/src/view-menu-dom.test.mjs.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/view-menu/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#bare .uix-view-menu')).toBeVisible();
});

const bare = (page) => page.locator('#bare .uix-view-menu');
const bareRow = (page, name) => bare(page).locator('.uix-view-menu__col', { hasText: name });
const orders = (page) => page.evaluate(() => window.__vm.orders);
const rowNames = (page) => bare(page).locator('.uix-view-menu__col-name').allTextContents();

test('no serious or critical axe violations, with a row menu open', async ({ page }) => {
  await page.getByRole('button', { name: 'Column actions: Title' }).first().click();
  await expect(page.getByRole('menu', { name: 'Column actions: Title' })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).include('#bare').analyze();
  const gated = violations.filter((v) => GATED.has(v.impact));
  expect(gated.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});

test('the panel brings its own opaque surface into a shell that adds none', async ({ page }) => {
  const surface = await bare(page).evaluate((el) => {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, border: cs.borderTopStyle, shadow: cs.boxShadow };
  });
  expect(surface.bg, 'fully opaque background').toMatch(/^rgb\(/);
  expect(surface.border).toBe('solid');
  expect(surface.shadow).not.toBe('none');
});

test('inside the kit Popover the popover is the only border and shadow', async ({ page }) => {
  await page.getByRole('button', { name: 'View' }).click();
  const nested = page.locator('#popover-menu > .uix-view-menu');
  await expect(nested).toBeVisible();
  const style = await nested.evaluate((el) => ({ border: getComputedStyle(el).borderTopStyle, shadow: getComputedStyle(el).boxShadow }));
  expect(style).toEqual({ border: 'none', shadow: 'none' });
});

test('the panel scrolls past ~10 rows and the Columns title stays pinned', async ({ page }) => {
  const menu = bare(page);
  const box = await menu.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
  expect(box.scroll, 'the fixture must overflow, or this proves nothing').toBeGreaterThan(box.client);
  await menu.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  const pinned = await menu.evaluate((el) => {
    const title = [...el.querySelectorAll('.uix-view-menu__label')].find((t) => t.textContent === 'Columns');
    const panel = el.getBoundingClientRect();
    const t = title.getBoundingClientRect();
    const hit = document.elementFromPoint(t.left + 4, t.top + t.height / 2);
    return { offset: Math.round(t.top - panel.top), onTop: title.contains(hit) };
  });
  expect(pinned.offset, 'title at the top edge of the panel').toBeLessThanOrEqual(2);
  expect(pinned.onTop, 'rows scroll under the title, not over it').toBe(true);
});

test('grip and ⋯ keep 3:1 non-text contrast at rest (WCAG 1.4.11)', async ({ page }) => {
  await page.mouse.move(0, 0);
  const ratios = await bare(page).evaluate((panel) => {
    const rgb = (value) => value.match(/[\d.]+/g).map(Number);
    const lum = ([r, g, b]) => {
      const c = [r, g, b].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const bg = rgb(getComputedStyle(panel).backgroundColor);
    const ratio = (el) => {
      const [r, g, b, a = 1] = rgb(getComputedStyle(el).color);
      let alpha = a;
      for (let node = el; node && node !== panel; node = node.parentElement) alpha *= Number(getComputedStyle(node).opacity);
      const mixed = [r, g, b].map((v, i) => v * alpha + bg[i] * (1 - alpha));
      const [l1, l2] = [lum(mixed), lum(bg)].sort((x, y) => y - x);
      return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
    };
    const row = panel.querySelectorAll('.uix-view-menu__col')[3];
    return { grip: ratio(row.querySelector('.uix-view-menu__grip svg')), more: ratio(row.querySelector('.uix-view-menu__actions svg')) };
  });
  expect(ratios.grip).toBeGreaterThanOrEqual(3);
  expect(ratios.more).toBeGreaterThanOrEqual(3);
});

test('the ⋯ menu opens in the top layer, moves a row, and keeps focus on that row', async ({ page }) => {
  const trigger = bareRow(page, 'State').getByRole('button', { name: 'Column actions: State' });
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Column actions: State' });
  await expect(menu).toBeVisible();
  expect(await menu.evaluate((el) => el.matches(':popover-open')), 'native top layer, not clipped by the panel').toBe(true);
  await expect(menu.getByRole('menuitem', { name: 'Move up' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Move down' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  expect(await orders(page)).toEqual([['id', 'title', 'severity', 'state', 'assignee', 'group', 'service', 'opened', 'updated', 'sla', 'priority', 'category']]);
  expect((await rowNames(page)).slice(0, 4)).toEqual(['ID', 'Title', 'Severity', 'State']);
  await expect(page.getByRole('button', { name: 'Column actions: State' }).first()).toBeFocused();
  await expect(page.locator('#bare [role="status"]')).toHaveText('State moved to position 4 of 12');
});

test('Escape closes only the row menu, not the overlay around the panel', async ({ page }) => {
  await page.getByRole('button', { name: 'Column actions: Title' }).first().click();
  await expect(page.getByRole('menu', { name: 'Column actions: Title' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(bare(page)).toBeVisible();
  expect(await page.evaluate(() => window.__vm.bareClosed)).toBe(0);
  await expect(page.getByRole('button', { name: 'Column actions: Title' }).first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(bare(page)).toHaveCount(0);
});

test('a row menu inside the kit Popover leaves the popover open', async ({ page }) => {
  await page.getByRole('button', { name: 'View' }).click();
  const popover = page.locator('#popover-menu');
  await popover.getByRole('button', { name: 'Column actions: Title' }).click();
  await page.getByRole('menuitem', { name: 'Hide' }).click();
  await expect(popover).toBeVisible();
  expect(await page.evaluate(() => window.__vm.toggles)).toEqual([['title', false]]);
});

test('ArrowDown on a clicked grip moves the row and the grip keeps focus', async ({ page }) => {
  const grip = bareRow(page, 'Title').locator('.uix-view-menu__grip');
  await grip.click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  expect((await rowNames(page)).slice(0, 4)).toEqual(['ID', 'State', 'Severity', 'Title']);
  await expect(bareRow(page, 'Title').locator('.uix-view-menu__grip')).toBeFocused();
  expect(await orders(page)).toHaveLength(2);
});

test('dragging a grip reorders and persists once on drop', async ({ page }) => {
  const grip = bareRow(page, 'Title').locator('.uix-view-menu__grip');
  const target = await bareRow(page, 'Assignee').boundingBox();
  const from = await grip.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, target.y + target.height * 0.75, { steps: 8 });
  expect(await orders(page), 'nothing persists mid-drag').toEqual([]);
  await page.mouse.up();
  expect((await rowNames(page)).slice(0, 5)).toEqual(['ID', 'State', 'Severity', 'Assignee', 'Title']);
  expect(await orders(page)).toHaveLength(1);
});

test('SavedViewMenu: dragging a grip down lands where the pointer is, not past it', async ({ page }) => {
  const saved = page.locator('#saved');
  const names = () => saved.locator('.uix-saved-views__name').allTextContents();
  const grip = saved.locator('.uix-saved-views__row', { hasText: 'Mine' }).locator('.uix-saved-views__grip');
  await saved.scrollIntoViewIfNeeded(); // raw mouse coordinates must be inside the viewport
  const target = await saved.locator('.uix-saved-views__row', { hasText: 'P1 only' }).boundingBox();
  const from = await grip.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, target.y + target.height * 0.75, { steps: 8 });
  await page.mouse.up();
  expect(await names()).toEqual(['Team queue', 'P1 only', 'Mine', 'Unassigned', 'Breached']);
  expect(await page.evaluate(() => window.__vm.savedOrders)).toEqual([['team-queue', 'p1-only', 'mine', 'unassigned', 'breached']]);
});
