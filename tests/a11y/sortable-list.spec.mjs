/* SortableList (HAR-1375; MOTUS C-16) in Chromium: a real mouse drag on the grip (the rows reorder
 * live, the row lands under the pointer, one onReorder per drag), the keyboard path with focus
 * kept on the moved row, no animation on a move, 24 px targets, 320 px, a Drawer, and axe.
 * German harness: tests/sortable-list/harness.tsx. Behaviour details: sortable-list-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/sortable-list/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#photos')).toBeVisible();
};
const order = (page, id) => page.locator(`#${id} > .uix-sortable__row`).evaluateAll((rows) => rows.map((r) => r.dataset.id));
const log = (page, key) => page.evaluate((k) => window.__sortable[k] ?? [], key);

test('drag the first photo two rows down: it lands under the pointer, one reorder for the whole drag', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const rows = page.locator('#photos > .uix-sortable__row');
  const grip = rows.first().locator('.uix-sortable__grip');
  const g = await grip.boundingBox();
  const third = await rows.nth(2).boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, third.y + third.height * 0.75, { steps: 8 });
  await expect(rows.nth(2)).toHaveAttribute('data-dragging', 'true');
  expect(await page.evaluate(() => document.getAnimations().length), 'rows reorder without animating').toBe(0);
  await page.mouse.up();
  expect(await order(page, 'photos')).toEqual(['p2', 'p3', 'p1', 'p4', 'p5']);
  expect(await log(page, 'photos')).toEqual([['p2', 'p3', 'p1', 'p4', 'p5']]);
  await expect(page.locator('#photos ~ [role="status"], #photos-card [role="status"]').first()).toHaveText('Lesesaal am Eröffnungsabend ist jetzt an Position 3 von 5');
});

test('keyboard: Tab reaches Move up / Move down; Enter moves and focus stays with the row; Alt+↓ chains', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const down = page.getByRole('button', { name: 'Antrag prüfen nach unten' }).first();
  await down.focus();
  await page.keyboard.press('Enter');
  expect(await order(page, 'steps')).toEqual(['s2', 's1', 's3']);
  await expect(down).toBeFocused();
  await page.keyboard.press('Alt+ArrowDown');
  expect(await order(page, 'steps')).toEqual(['s2', 's3', 's1']);
  await expect(page.getByRole('button', { name: 'Antrag prüfen nach oben' }).first(), 'at the end, Move up takes focus').toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Benachrichtigen nach unten' })).toBeFocused();
});

test('targets are at least 24 px; a single item has both moves disabled', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 900 });
  const sizes = await page.locator('#photos button').evaluateAll((buttons) => buttons.map((b) => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }));
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(24);
  await expect(page.locator('#single button.uix-sortable__move')).toHaveCount(2);
  for (const b of await page.locator('#single button.uix-sortable__move').all()) await expect(b).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  // At 320 px the moves stack, so a caption keeps room for whole words.
  const stacked = await page.locator('#photos .uix-sortable__moves').first().evaluate((el) => getComputedStyle(el).flexDirection);
  expect(stacked).toBe('column');
});

test('in a Drawer: Alt+↑ moves, Escape still closes the drawer', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#open-drawer').click();
  const up = page.locator('#in-drawer').getByRole('button', { name: 'Benachrichtigen nach oben' });
  await up.focus();
  await page.keyboard.press('Alt+ArrowUp');
  expect(await order(page, 'in-drawer')).toEqual(['s1', 's3', 's2']);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog#drawer')).toHaveJSProperty('open', false);
});

test('axe, light and dark', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
