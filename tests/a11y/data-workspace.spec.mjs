/* DataWorkspace (HAR-1388; UIx ADR-0005) in Chromium on a German incident list with a fake server
 * (tests/data-workspace/harness.tsx): Ctrl + / to the search, a filter chosen with the keyboard, a
 * refetch that keeps the rows (busy at once, the bar after 300 ms, no skeleton), selection kept
 * across pages and Shift-click ranges, the id cell, maximize and Escape, 320 px and axe. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/data-workspace/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#incidents tbody tr')).toHaveCount(10);
};
const ws = (page) => page.locator('#incidents');

test('Ctrl + / reaches the search; typing refetches with the rows kept: busy at once, the bar only after 300 ms', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('h1').click();
  await page.keyboard.press('Control+/');
  const search = ws(page).getByRole('searchbox', { name: 'Vorfälle durchsuchen' });
  await expect(search).toBeFocused();
  await search.fill('drucker'); // one change: the busy timing is measured from it
  const wrap = ws(page).locator('.uix-table-wrap');
  await expect(wrap).toHaveAttribute('aria-busy', 'true');
  const early = await page.evaluate(() => new Promise((resolve) => setTimeout(() => resolve({
    bar: document.querySelector('#incidents .uix-busy-bar')?.hasAttribute('data-shown') ?? false,
    rows: document.querySelectorAll('#incidents tbody tr').length,
    skeleton: document.querySelectorAll('#incidents .uix-skeleton').length,
  }), 120)));
  expect(early).toEqual({ bar: false, rows: 10, skeleton: 0 });
  await expect(ws(page).locator('.uix-busy-bar')).toHaveAttribute('data-shown', 'true');
  await expect(ws(page).locator('.uix-data-workspace__range')).toHaveText('1–10 von 14');
  await expect(wrap).not.toHaveAttribute('aria-busy', 'true');
  for (const row of await ws(page).locator('tbody tr').all()) await expect(row).toContainText(/drucker/i);
});

test('a filter with the keyboard: "+ Filter" menu, the editor, Enter applies, the chip and Save changes appear', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await ws(page).locator('button.uix-chip--add').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'Status' })).toBeFocused();
  await page.keyboard.press('Enter');
  const editor = page.locator('#incidents [popover]:popover-open .uix-filter-editor');
  await expect(editor).toBeVisible();
  await editor.getByRole('checkbox', { name: 'Gelöst' }).check();
  await editor.getByRole('checkbox', { name: 'Gelöst' }).press('Enter');
  await expect(editor).toHaveCount(0);
  await expect(ws(page).locator('.uix-data-workspace__chip')).toContainText('Status: Gelöst');
  await expect(ws(page).getByRole('button', { name: 'Änderungen speichern' })).toBeVisible();
  await expect(ws(page).locator('tbody tr').first()).toContainText('Gelöst');
  await expect(ws(page).locator('.uix-data-workspace__range')).toHaveText('1–10 von 15');
});

test('selection is kept by id across pages; Shift-click selects a range; the bulk bar counts it', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const boxes = ws(page).locator('tbody input[type="checkbox"]');
  await boxes.nth(1).click();
  await boxes.nth(3).click({ modifiers: ['Shift'] });
  await expect(ws(page).locator('.uix-bulkbar__count')).toHaveText('3 ausgewählt');
  await ws(page).getByRole('button', { name: '2', exact: true }).click();
  await expect(ws(page).locator('tbody tr').first()).toContainText('INC-20410');
  await expect(ws(page).locator('.uix-bulkbar__count')).toHaveText('3 ausgewählt');
  await ws(page).getByRole('button', { name: '1', exact: true }).click();
  await expect(ws(page).locator('tbody tr').first()).toContainText('INC-20400');
  await expect(ws(page).locator('tbody tr[data-selected]')).toHaveCount(3);
  await ws(page).locator('.uix-bulkbar').getByRole('button', { name: 'Mir zuweisen' }).click();
  expect(await page.evaluate(() => window.__ws.bulk)).toEqual(['assign:INC-20401,INC-20402,INC-20403']);
});

test('the id opens a peek; ↗ is a link to the record, named by the id', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await ws(page).getByRole('button', { name: 'INC-20400', exact: true }).click();
  expect(await page.evaluate(() => window.__ws.peeks)).toEqual(['INC-20400']);
  await expect(ws(page).getByRole('link', { name: 'INC-20400 öffnen' })).toHaveAttribute('href', '#/incidents/INC-20400');
});

test('maximize takes the window; Escape restores it', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const toggle = ws(page).getByRole('button', { name: 'Maximieren' });
  await toggle.click();
  const box = await ws(page).boundingBox();
  const vp = page.viewportSize();
  expect(Math.round(box.width)).toBe(vp.width);
  await page.keyboard.press('Escape');
  await expect(ws(page)).not.toHaveClass(/uix-data-workspace--maximized/);
});

test('Escape in the View popover closes it, not the maximized workspace (PR #168 review)', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await ws(page).getByRole('button', { name: 'Maximieren' }).click();
  await ws(page).getByRole('button', { name: 'Ansicht' }).click();
  await expect(ws(page).locator('.uix-view-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(ws(page).locator('.uix-view-menu')).toBeHidden();
  await expect(ws(page)).toHaveClass(/uix-data-workspace--maximized/);
  await page.keyboard.press('Escape');
  await expect(ws(page)).not.toHaveClass(/uix-data-workspace--maximized/);
});

test('with selection the checkbox and the id stay frozen with no gap; dividers only while the table overflows (PR #168 review)', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 390, height: 844 });
  const wrap = ws(page).locator('.uix-table-wrap');
  await expect(wrap).toHaveAttribute('data-overflow', 'true');
  await wrap.evaluate((el) => { el.scrollLeft = 200; });
  const cells = await ws(page).locator('tbody tr').first().evaluate((tr) => [...tr.children].slice(0, 2).map((td) => { const r = td.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
  expect(Math.abs(cells[0].right - cells[1].left), 'the id starts where the checkbox column ends').toBeLessThan(1);
  await page.setViewportSize({ width: 1600, height: 900 });
  await expect(wrap).toHaveAttribute('data-overflow', 'false');
  expect(await ws(page).locator('tbody td.uix-id-cell').first().evaluate((td) => getComputedStyle(td).boxShadow)).toBe('none');
});

test('at 320 px the page never scrolls sideways (the table scrolls in its wrap); axe', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && !a.effect?.target?.closest?.('.uix-skeleton')).length)).toBe(0);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
