/* WCAG 2.5.7 Dragging Movements (enterprise UX study, roadmap #19): everything the kit lets a person
 * drag can also be done with single clicks. Each test below does the operation with
 * `locator.click()` only: no `mouse.down` + `mouse.move`, no keyboard. It checks the result, that
 * focus is somewhere sensible after the move, and that the move was announced. axe runs with each
 * click path open. German labels throughout (UixLabelsProvider), so the words are translatable.
 * Harness: tests/single-pointer/harness.tsx. The drag and keyboard paths have their own specs
 * (sortable-list, view-menu, dashboard-canvas, feedback-kit). */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/single-pointer/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name === 'dark' ? 'dark' : 'light';
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#canvas [data-canvas-id="sla"]')).toBeVisible();
});

const last = (page, key) => page.evaluate((k) => (window.__orders[k] ?? []).at(-1), key);
const axe = async (page) => {
  // A menu or popover that is still fading in is part-transparent, and axe reads its text colour
  // at that moment as low contrast: wait until every finite animation has settled first.
  await expect.poll(() => page.evaluate(() => document.getAnimations()
    .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming?.().iterations !== Infinity).length)).toBe(0);
  const violations = (await new AxeBuilder({ page }).include('#root').analyze()).violations.filter((v) => GATED.has(v.impact));
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
};

test('SortableList: Move down by click moves the row; focus stays on the button; announced', async ({ page }) => {
  const down = page.getByRole('button', { name: 'Antrag prüfen nach unten' });
  await down.click();
  expect(await last(page, 'sortable')).toEqual(['s2', 's1', 's3']);
  await expect(down).toBeFocused();
  await expect(page.locator('#sortable ~ [role="status"]')).toHaveText('Antrag prüfen ist jetzt an Position 2 von 3');
  // at the end, the button for that way is disabled and the other one takes focus
  await down.click();
  expect(await last(page, 'sortable')).toEqual(['s2', 's3', 's1']);
  await expect(page.getByRole('button', { name: 'Antrag prüfen nach oben' })).toBeFocused();
});

test('ViewMenu: the ⋯ menu moves a column by clicks; focus returns to the moved row\'s ⋯; announced', async ({ page }) => {
  const menu = page.getByRole('button', { name: 'Spaltenaktionen: Titel' });
  await menu.click();
  await expect(page.getByRole('menu', { name: 'Spaltenaktionen: Titel' })).toBeVisible();
  await axe(page);
  await page.getByRole('menuitem', { name: 'Nach unten' }).click();
  expect(await last(page, 'view-menu')).toEqual(['id', 'state', 'title', 'owner']);
  await expect(menu).toBeFocused();
  await expect(page.locator('#view-menu [role="status"]')).toHaveText('Titel ist jetzt an Position 3 von 4');
  // the first row has Move up disabled
  await page.getByRole('button', { name: 'Spaltenaktionen: Nummer' }).click();
  await expect(page.getByRole('menuitem', { name: 'Nach oben' })).toBeDisabled();
});

test('Kanban: the Move menu moves a card down and to another column by clicks, without the card\'s own drag or open', async ({ page }) => {
  const trigger = (name) => page.getByRole('button', { name: `${name} verschieben` });
  const status = page.locator('#kanban > [role="status"]');

  await trigger('Drucker im 2. Stock').click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  // the first card cannot go up, nor left of the first column; the column it is in is checked
  await expect(menu.getByRole('menuitem', { name: 'Nach oben' })).toHaveAttribute('aria-disabled', 'true');
  await expect(menu.getByRole('menuitemradio', { name: 'Offen' })).toHaveAttribute('aria-checked', 'true');
  await axe(page);
  await menu.getByRole('menuitem', { name: 'Nach unten' }).click();
  expect(await last(page, 'kanban')).toEqual({ todo: ['c2', 'c1'], doing: ['c3'], done: [] });
  await expect(status).toHaveText('Drucker im 2. Stock ist jetzt in Offen, Position 2 von 2');
  await expect(trigger('Drucker im 2. Stock')).toBeFocused();

  // to another column: the card is a new element there, and focus follows it (itemId)
  await trigger('Drucker im 2. Stock').click();
  await page.getByRole('menuitemradio', { name: 'Erledigt' }).click();
  expect(await last(page, 'kanban')).toEqual({ todo: ['c2'], doing: ['c3'], done: ['c1'] });
  await expect(status).toHaveText('Drucker im 2. Stock ist jetzt in Erledigt, Position 1 von 1');
  const moved = page.locator('[data-col="done"] [data-card="c1"]');
  await expect(moved.getByRole('button', { name: 'Drucker im 2. Stock verschieben' })).toBeFocused();

  // a press in the Move menu is never a press on the card (no drag start, no open)
  expect(await page.evaluate(() => window.__kanban)).toEqual({ drags: 0, opened: [] });
  // the card itself still opens on a click
  await moved.locator('.uix-kanban__card-title').click();
  expect(await page.evaluate(() => window.__kanban.opened)).toEqual(['c1']);
});

test('Kanban: the Move button is a 24 px target, and the card title keeps clear of it', async ({ page }) => {
  const card = page.locator('[data-card="c3"]');
  const button = await card.locator('.uix-kanban__card-move .uix-btn').boundingBox();
  expect(Math.min(button.width, button.height)).toBeGreaterThanOrEqual(24);
  const title = await card.locator('.uix-kanban__card-title').evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return Math.max(...[...range.getClientRects()].map((r) => r.right));
  });
  expect(title, 'the long German title wraps before the Move button').toBeLessThanOrEqual(button.x);
});

test('DashboardCanvas: a click on the move handle shows step buttons that move one cell per click; focus stays; announced', async ({ page }) => {
  const layout = async () => Object.fromEntries(JSON.parse(await page.locator('[data-testid="layout"]').textContent()).map(({ id, ...rest }) => [id, rest]));
  const handle = page.getByRole('button', { name: 'SLA-Risiko verschieben', exact: true });
  await expect(handle).toHaveAttribute('aria-expanded', 'false');
  await handle.click();
  await expect(handle).toHaveAttribute('aria-expanded', 'true');
  const steps = page.getByRole('group', { name: 'SLA-Risiko verschieben' });
  await expect(steps).toBeVisible();
  // column 1: it cannot go left
  await expect(steps.getByRole('button', { name: 'Nach links' })).toBeDisabled();
  await axe(page);

  const right = steps.getByRole('button', { name: 'Nach rechts' });
  await right.click();
  await right.click();
  expect((await layout()).sla).toEqual({ col: 2, row: 3, w: 4, h: 2 });
  // what it now overlaps is pushed down, as a drag would
  expect((await layout()).trend.row).toBe(5);
  await expect(right).toBeFocused();
  await expect(page.locator('#canvas [role="status"]')).toHaveText('SLA-Risiko: Spalte 3, Zeile 4');
  expect(await page.evaluate(() => window.__orders.canvas.at(-1))).toEqual({ id: 'sla', kind: 'move', source: 'buttons' });

  // Done puts them away and focus goes back to the handle
  await steps.getByRole('button', { name: 'Fertig' }).click();
  await expect(steps).toHaveCount(0);
  await expect(handle).toBeFocused();
  await expect(handle).toHaveAttribute('aria-expanded', 'false');
});

test('DashboardCanvas: the resize handle\'s step buttons resize inside the limits; a click elsewhere puts them away', async ({ page }) => {
  const layout = async () => Object.fromEntries(JSON.parse(await page.locator('[data-testid="layout"]').textContent()).map(({ id, ...rest }) => [id, rest]));
  await page.getByRole('button', { name: 'Größe von Zugang und Abgang ändern', exact: true }).click();
  const steps = page.getByRole('group', { name: 'Größe von Zugang und Abgang ändern' });
  await steps.getByRole('button', { name: 'Schmaler' }).click();
  await steps.getByRole('button', { name: 'Höher' }).click();
  expect((await layout()).trend).toEqual({ col: 4, row: 3, w: 7, h: 3 });
  await expect(page.locator('#canvas [role="status"]')).toHaveText('Zugang und Abgang: 7 Spalten breit, 3 Zeilen hoch');
  // maxH 3: taller is now disabled, and focus went to Shorter, the way it can still go
  await expect(steps.getByRole('button', { name: 'Höher' })).toBeDisabled();
  await expect(steps.getByRole('button', { name: 'Niedriger' })).toBeFocused();
  await page.locator('h1').click();
  await expect(steps).toHaveCount(0);
});

test('DashboardCanvas: a drag on a handle does not also show the step buttons', async ({ page }) => {
  // the one pointer drag in this file: proves the click that ends a drag is not taken as a press
  const box = await page.getByRole('button', { name: 'SLA-Risiko verschieben', exact: true }).boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y, { steps: 4 });
  await page.mouse.move(x, y, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('.uix-dashboard-canvas__steps')).toHaveCount(0);
});
