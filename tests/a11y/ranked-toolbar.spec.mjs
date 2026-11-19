/* The ranked toolbar (HAR-3090, UIx ADR-0005 addendum): search and the filters lead, then the saved
 * view; the end zone holds View, one "More" menu (Save as, the product's group by and export, Maximize)
 * and the product's action. Eight controls fit one row at 1440 px; at 320 px the row folds without a
 * sideways scroll; More is the kit Menu with its keyboard, and the toolbar passes axe in both themes. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ws = (page) => page.locator('#incidents');
async function open(page, testInfo, viewport = { width: 1440, height: 900 }) {
  const theme = testInfo.project.name === 'dark' ? 'dark' : 'light';
  await page.addInitScript((value) => localStorage.setItem('uix-theme', value), theme);
  await page.setViewportSize(viewport);
  await page.goto('/tests/data-workspace/harness.html', { waitUntil: 'networkidle' });
  await expect(ws(page).locator('tbody tr').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** The toolbar's controls in the order a person meets them, with their row. */
const controls = (page) => ws(page).getByRole('toolbar', { name: 'Vorfälle' }).evaluate((bar) => {
  const items = [...bar.querySelectorAll('input[type="search"], .uix-searchbar input, button, a[href]')]
    .filter((el) => el.getClientRects().length > 0 && !el.closest('[popover]'));
  return items.map((el) => {
    const r = el.getBoundingClientRect();
    return { name: el.getAttribute('aria-label') ?? el.textContent.trim(), top: Math.round(r.top), bottom: Math.round(r.bottom) };
  });
});

test('search and the filter lead; View, More and the product action end the row', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const items = await controls(page);
  const names = items.map((c) => c.name);
  expect(names[0]).toMatch(/Vorfälle durchsuchen|Suchen/);
  expect(names[1]).toMatch(/^Filter/);
  const tail = names.slice(-3);
  expect(tail[0]).toMatch(/Ansicht/);
  expect(tail[1]).toMatch(/Mehr/);
  expect(tail[2]).toBe('Neuer Vorfall');
  expect(names.some((n) => /Speichern als/.test(n)), 'Save as is in the menu, not the row').toBe(false);
  expect(names.some((n) => /Maximieren/.test(n)), 'Maximize is in the menu, not the row').toBe(false);
});

test('at 1440 px the controls share one row', async ({ page }, testInfo) => {
  await open(page, testInfo);
  // with a filter set and the view changed: chip, Save changes and the add chip all show
  await ws(page).getByRole('searchbox').fill('Drucker');
  await expect(ws(page).getByRole('button', { name: 'Änderungen speichern' })).toBeVisible();
  const items = await controls(page);
  expect(items.length).toBeGreaterThanOrEqual(6);
  const tops = new Set(items.map((c) => c.top));
  expect(tops.size, `one row: ${JSON.stringify(items)}`).toBe(1);
});

test('at 320 px the row folds without a sideways scroll', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 800 });
  const widths = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  const bar = ws(page).getByRole('toolbar', { name: 'Vorfälle' });
  expect(await bar.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
});

test('More is the kit menu: keyboard, Save as, group by, export, Maximize; focus returns', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const more = ws(page).getByRole('button', { name: 'Mehr' });
  await more.focus();
  await page.keyboard.press('ArrowDown');
  const menu = page.getByRole('menu', { name: 'Mehr' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Speichern als…' })).toBeFocused();
  await expect(menu.getByRole('menuitemradio', { name: 'Keine Gruppierung' })).toHaveAttribute('aria-checked', 'true');
  await expect(menu.getByRole('menuitem', { name: 'Als CSV exportieren' })).toBeVisible();
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Maximieren' })).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(more).toBeFocused();
  await more.click();
  await page.getByRole('menuitemradio', { name: 'Status' }).click();
  expect(await page.evaluate(() => window.__ws.bulk)).toContain('group:state');
  await more.click();
  await page.getByRole('menuitem', { name: 'Speichern als…' }).click();
  expect(await page.evaluate(() => window.__ws.bulk)).toContain('save-as');
});

test('the toolbar and its open menu pass axe', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await ws(page).getByRole('button', { name: 'Mehr' }).click();
  await expect(page.getByRole('menu', { name: 'Mehr' })).toBeVisible();
  const results = await new AxeBuilder({ page }).include('#incidents .uix-toolbar').include('[role="menu"]').analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
