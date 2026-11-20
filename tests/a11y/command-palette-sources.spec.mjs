/* CommandPalette roadmap #9 in Chromium, on the docs' live demo (tests/command-palette-sources/
 * harness.tsx mounts packages/tokens/docs/live/command-palette-demo.tsx): aliases shown as
 * "Title (alias)", a page stack where Escape and Backspace step back inside the real modal
 * <dialog> (Escape on the top level still closes it and focus returns), server sources with a
 * loading row, rows kept while the next answer loads, aborted searches, an error row with Retry,
 * the screen's boost, 320 px and axe in every state. */
import { test, expect } from '@playwright/test';
import AxeBuilder from './axe.mjs';

const HARNESS = '/tests/command-palette-sources/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, { viewport, query = '' } = {}) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(`${HARNESS}${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#palette-launch')).toBeVisible();
};
const dialog = (page) => page.locator('dialog[data-uix-cmdk-dialog]');
const field = (page) => dialog(page).locator('input[role="combobox"]');
const activeText = (page) => page.evaluate(() => {
  const input = document.querySelector('dialog[data-uix-cmdk-dialog] input[role="combobox"]');
  return document.getElementById(input.getAttribute('aria-activedescendant') ?? '')?.querySelector('.uix-cmdk__label')?.textContent ?? null;
});
const said = (page) => page.locator('[data-demo-said]');
const scan = async (page, selector = 'dialog[data-uix-cmdk-dialog]') => {
  const results = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return results.violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
};

test('an alias finds the command and is shown after its name; Enter runs it and focus returns', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#palette-launch').focus();
  await page.keyboard.press('Control+k');
  await expect(dialog(page)).toHaveJSProperty('open', true);
  await expect(field(page)).toBeFocused();
  await page.keyboard.type('archive');
  await expect.poll(() => activeText(page)).toBe('Mark done (Archive)');
  await expect(dialog(page).getByRole('option', { name: 'Mark done (Archive)' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toHaveJSProperty('open', false);
  await expect(page.locator('#palette-launch')).toBeFocused();
  await expect(said(page)).toHaveText('INC-0413 marked done.');
  // frecency: opened again, the command leads the recent list
  await page.keyboard.press('Control+k');
  await expect(dialog(page).locator('.uix-cmdk__group').first()).toHaveText('Recent');
  await expect.poll(() => activeText(page)).toBe('Mark done');
});

test('pages: Escape and Backspace step back inside the open dialog, the breadcrumb shows the way', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#palette-launch').click();
  await page.keyboard.type('assi');
  await expect.poll(() => activeText(page)).toBe('Assign to…');
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toHaveJSProperty('open', true);
  await expect(field(page)).toHaveAttribute('aria-label', 'Assign to…');
  await expect(field(page)).toHaveValue('');
  await expect(field(page)).toBeFocused();
  const crumbs = dialog(page).getByRole('navigation', { name: 'Breadcrumb' });
  await expect(crumbs).toContainText('Commands');
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Assign to…');
  expect(await scan(page)).toEqual([]);

  // the people source on the page; folded diacritics on the fake server and in the marks
  await page.keyboard.type('emir hadzic');
  await expect(dialog(page).getByRole('option', { name: 'Emir Hadžić' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page), 'Escape on a page steps back, it does not close').toHaveJSProperty('open', true);
  await expect(field(page)).toHaveValue('assi');
  await expect(field(page)).toHaveAttribute('aria-label', 'Commands');
  await expect.poll(() => activeText(page), { message: 'the row that opened the page is active again' }).toBe('Assign to…');
  await expect(crumbs).toHaveCount(0);

  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace');
  await expect(field(page), 'Backspace in an empty field steps back').toHaveValue('assi');
  await page.keyboard.press('Enter');
  await crumbs.getByRole('button', { name: 'Commands' }).click();
  await expect(field(page)).toHaveValue('assi');
  await expect(field(page)).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog(page), 'on the top level Escape closes').toHaveJSProperty('open', false);
  await expect(page.locator('#palette-launch')).toBeFocused();
  await page.locator('#palette-launch').click();
  await expect(field(page)).toHaveAttribute('aria-label', 'Commands');
  await expect(field(page)).toHaveValue('');
});

test('choosing on a page runs the command and closes the palette', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#palette-launch').click();
  await page.keyboard.type('priority');
  await page.keyboard.press('Enter');
  await page.keyboard.type('p2');
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toHaveJSProperty('open', false);
  await expect(said(page)).toHaveText('INC-0413 is now P2 High.');
});

test('sources: a delayed loading row, rows kept while the next answer loads, overtaken searches aborted', async ({ page }, testInfo) => {
  await open(page, testInfo, { query: '?latency=1500' });
  await page.locator('#palette-launch').click();
  await page.keyboard.type('vpn');
  await expect(field(page)).toHaveAttribute('aria-busy', 'true');
  const status = dialog(page).locator('.uix-cmdk__status');
  await expect(status.first()).toHaveText('Searching…');
  expect(await scan(page)).toEqual([]);
  const ticket = dialog(page).getByRole('option', { name: /INC-0413 VPN drops/ });
  await expect(ticket).toBeVisible();
  await expect(field(page)).not.toHaveAttribute('aria-busy', 'true');
  await expect(dialog(page).locator('.uix-visually-hidden[role="status"]')).toHaveText('1 result');

  await page.keyboard.type(' d');
  await expect(ticket, 'kept while the next answer loads').toHaveAttribute('data-stale');
  await expect(ticket).toHaveAttribute('aria-disabled', 'true');
  const asked = (query) => page.evaluate((q) => window.__server.calls.filter((c) => c.query === q).map((c) => c.signal.aborted), query);
  // polled every 50 ms: the search is in flight for 1.5 s, and 'r' must land inside that window
  await expect.poll(() => asked('vpn d'), { message: 'the debounced search starts', intervals: [50] }).toEqual([false, false]);
  await page.keyboard.type('r');
  await expect(ticket).not.toHaveAttribute('data-stale', { timeout: 5000 });
  expect(await asked('vpn d'), 'the searches the next keystroke overtook were aborted').toEqual([true, true]);
  expect(await asked('vpn dr')).toEqual([false, false]);
});

test('sources: a failing server shows a Retry row; Retry searches again and the answer replaces it', async ({ page }, testInfo) => {
  await open(page, testInfo, { query: '?fail=1' });
  await page.locator('#palette-launch').click();
  await page.keyboard.type('lea');
  const retry = dialog(page).locator('.uix-cmdk__item--retry');
  await expect(retry).toHaveCount(2);
  await expect(retry.first()).toContainText('Search failed');
  await expect(retry.first()).toContainText('Retry');
  await expect(dialog(page).locator('.uix-visually-hidden[role="status"]')).toHaveText('0 results. Tickets: Search failed. People: Search failed');
  expect(await scan(page)).toEqual([]);
  await page.evaluate(() => { window.__server.fail = false; });
  await page.keyboard.press('Enter');
  await expect(retry, 'Enter retried the active row only (Tickets, which finds nothing)').toHaveCount(1);
  await retry.click();
  await expect(retry).toHaveCount(0);
  await expect(dialog(page).getByRole('option', { name: /Lea Novak/ })).toBeVisible();
  await expect(field(page)).toBeFocused();
});

test('the screen boosts the commands that fit it, without hiding the others', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const groups = dialog(page).locator('.uix-cmdk__group');
  await page.locator('#palette-launch').click();
  await expect(groups.first()).toHaveText('Ticket');
  await page.keyboard.press('Escape');
  await page.getByRole('radio', { name: 'In the queue' }).click();
  await page.locator('#palette-launch').click();
  await expect(groups).toHaveText(['Go to', 'Ticket', 'Settings']);
  await expect(dialog(page).getByRole('option')).toHaveCount(9);
});

test('at 320 px nothing scrolls sideways on a page with a long trail', async ({ page }, testInfo) => {
  await open(page, testInfo, { viewport: { width: 320, height: 720 } });
  await page.locator('#palette-launch').click();
  await page.keyboard.type('assign');
  await page.keyboard.press('Enter');
  await page.keyboard.type('a');
  await expect(dialog(page).getByRole('option', { name: 'Ana Kovač' })).toBeVisible();
  const box = await dialog(page).locator('.uix-cmdk').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  expect(await scan(page)).toEqual([]);
});
