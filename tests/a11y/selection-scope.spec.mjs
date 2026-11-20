/* DataWorkspace selection scope in a browser (enterprise UX study, roadmap #12), on the docs' live
 * demo (tests/selection-scope/harness.tsx: 4,000 incidents behind a fake server, filtered to
 * Status: Open): the header checkbox selects the page and the banner offers "Select all N
 * matching"; taking it makes the scope the query (the JSON the bulk endpoint gets), keeps focus on
 * the banner's button, states the scope, count and filter in the banner and the bulk bar, and
 * turns the rows' own actions off; unticking excludes; a changed search clears the scope (or, with
 * Ask, holds it aside until the person chooses, and turning the search back restores it); X,
 * Shift + X and Ctrl/⌘ + A select by key in the table, are listed in the ? sheet and go with the
 * single-key switch; axe finds nothing serious with each banner showing, in both themes; nothing
 * overflows at 320 px. */
import { test, expect } from '@playwright/test';
import AxeBuilder from './axe.mjs';

const HARNESS = '/tests/selection-scope/harness.html';
const GATED = new Set(['serious', 'critical']);
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

const open = async (page, testInfo, query = '') => {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, themeOf(testInfo));
  await page.goto(`${HARNESS}${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeOf(testInfo));
  await expect(rowBoxes(page)).toHaveCount(25);
};
const headBox = (page) => page.getByRole('checkbox', { name: 'Select all rows on this page' });
const rowBoxes = (page) => page.locator('tbody .uix-table__selcell input');
const banner = (page) => page.locator('.uix-data-workspace__scope');
const bannerText = (page) => banner(page).locator('.uix-data-workspace__scope-text');
const bulkCount = (page) => page.getByRole('toolbar', { name: 'Bulk actions' }).locator('.uix-bulkbar__count');
const scopeJson = async (page) => JSON.parse(await page.locator('#demo-scope').textContent());
/** The matching total from the footer's "1–25 of N". */
const matchingTotal = async (page) => Number((await page.locator('.uix-data-workspace__range').textContent()).split(' of ')[1].replace(/\D/g, ''));
const fmt = (n) => n.toLocaleString('en-US');
/** Waits for the fake server's answer to the current query (the table is not refreshing). */
const settled = async (page) => {
  await expect(page.locator('.uix-data-workspace__table')).not.toHaveAttribute('aria-busy', 'true');
  await expect(rowBoxes(page).first()).toBeVisible();
};
const rangeText = (page) => page.locator('.uix-data-workspace__range').textContent();
/** Types a new search and waits for its own answer: the footer's "x–y of N" changes (every search
 * here has a different total), then the table is not refreshing. Busy alone is not enough: it
 * turns on a render after the keystroke, so a check right after the fill can see the old rows. */
const search = async (page, text) => {
  const before = await rangeText(page);
  await page.locator('.uix-data-workspace__search input').fill(text);
  await expect.poll(async () => (await rangeText(page)) !== before).toBe(true);
  await settled(page);
};

test('the header checkbox selects the page; the banner offers all N matching', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const total = await matchingTotal(page);
  expect(total).toBeGreaterThan(1000);
  await expect(banner(page)).toHaveCount(0);
  await headBox(page).check();
  await expect(bulkCount(page)).toHaveText('25 selected');
  await expect(bannerText(page)).toHaveText('All 25 rows on this page are selected.');
  await expect(banner(page).getByRole('button')).toHaveText([`Select all ${fmt(total)} matching`]);
  expect(await scopeJson(page)).toMatchObject({ kind: 'ids' });
  expect((await scopeJson(page)).ids).toHaveLength(25);
  // the banner is not a live region (it holds a button); its words go to the page's polite region
  await expect(banner(page)).not.toHaveAttribute('role', /.+/);
  await expect.poll(() => page.locator('[data-uix-announcer]').textContent()).toBe('All 25 rows on this page are selected.');
});

test('select all matching: the scope is the query, focus stays, the filter is said, row actions go inert', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const total = await matchingTotal(page);
  await headBox(page).check();
  const action = banner(page).getByRole('button', { name: `Select all ${fmt(total)} matching` });
  await action.click();
  // the same button, now Clear selection, keeps focus
  await expect(banner(page).getByRole('button')).toHaveText(['Clear selection']);
  await expect(banner(page).getByRole('button', { name: 'Clear selection' })).toBeFocused();
  await expect(bannerText(page)).toHaveText(`All ${fmt(total)} rows matching Status: Open are selected.`);
  await expect(bulkCount(page)).toHaveText(`${fmt(total)} selected · all matching Status: Open`);
  expect(await scopeJson(page)).toEqual({
    kind: 'query', query: { search: '', filters: { status: { kind: 'enum', values: ['open'] } } }, excludedIds: [], total,
  });
  // every row's own menu is off while the bulk bar acts on thousands of rows
  const actions = page.locator('tbody td.uix-table__actions');
  await expect(actions.first()).toHaveAttribute('inert', '');
  expect(await actions.evaluateAll((cells) => cells.every((td) => td.hasAttribute('inert')))).toBe(true);
  // the next page is selected too
  await page.getByRole('button', { name: /next/i }).click();
  await settled(page);
  expect(await rowBoxes(page).evaluateAll((boxes) => boxes.every((box) => box.checked))).toBe(true);
  // unticking a row excludes it
  const first = rowBoxes(page).first();
  const firstId = (await first.getAttribute('aria-label')).replace('Select ', '');
  await first.uncheck();
  await expect(bannerText(page)).toHaveText(`${fmt(total - 1)} of ${fmt(total)} rows matching Status: Open are selected.`);
  expect((await scopeJson(page)).excludedIds).toEqual([firstId]);
  // clear: the banner goes and focus lands on the header checkbox, not the page
  await banner(page).getByRole('button', { name: 'Clear selection' }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect(headBox(page)).toBeFocused();
  expect(await scopeJson(page)).toEqual({ kind: 'ids', ids: [] });
  await expect(actions.first()).not.toHaveAttribute('inert', '');
});

test('a bulk action sends the query scope: every matching record changes', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const total = await matchingTotal(page);
  await headBox(page).check();
  await banner(page).getByRole('button', { name: /^Select all/ }).click();
  await page.getByRole('toolbar', { name: 'Bulk actions' }).getByRole('button', { name: 'Resolve' }).click();
  await expect(page.locator('#demo-said')).toHaveText(`Resolved: ${fmt(total)} incidents changed.`);
  await expect(page.locator('.uix-data-workspace__state, .uix-empty, .uix-filtered-empty').first()).toBeVisible();
});

test('a changed search clears an all-matching scope and says so; Dismiss gives focus back', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await headBox(page).check();
  await banner(page).getByRole('button', { name: /^Select all/ }).click();
  await search(page, 'vpn');
  await expect(bannerText(page)).toHaveText('Selection cleared: the filter changed.');
  expect(await scopeJson(page)).toEqual({ kind: 'ids', ids: [] });
  await expect(page.getByRole('toolbar', { name: 'Bulk actions' })).toHaveCount(0);
  expect(await rowBoxes(page).evaluateAll((boxes) => boxes.some((box) => box.checked))).toBe(false);
  await banner(page).getByRole('button', { name: 'Dismiss' }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect(headBox(page)).toBeFocused();
});

test('Ask: a changed search holds the scope aside; choosing selects the new matching set, turning back restores it', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.getByRole('button', { name: 'Ask' }).click();
  const total = await matchingTotal(page);
  await headBox(page).check();
  await banner(page).getByRole('button', { name: /^Select all/ }).click();
  await search(page, 'vpn');
  const narrowed = await matchingTotal(page);
  expect(narrowed).toBeLessThan(total);
  await expect(bannerText(page)).toHaveText(`The filter changed, so the ${fmt(total)} rows selected under the previous filter are not selected here.`);
  await expect(banner(page).getByRole('button')).toHaveText([`Select all ${fmt(narrowed)} matching`, 'Clear selection']);
  await expect(page.getByRole('toolbar', { name: 'Bulk actions' })).toHaveCount(0);
  expect(await rowBoxes(page).evaluateAll((boxes) => boxes.some((box) => box.checked))).toBe(false);
  // held, not dropped: the old query is still the scope
  expect((await scopeJson(page)).query.search).toBe('');
  // the search turned back: the selection is back
  await search(page, '');
  await expect(bannerText(page)).toHaveText(`All ${fmt(total)} rows matching Status: Open are selected.`);
  // and under the new search, the person picks the new set
  await search(page, 'vpn');
  await banner(page).getByRole('button', { name: `Select all ${fmt(narrowed)} matching` }).click();
  await expect(bannerText(page)).toHaveText(`All ${fmt(narrowed)} rows matching Status: Open; the search “vpn” are selected.`);
  expect(await scopeJson(page)).toMatchObject({ kind: 'query', total: narrowed, query: { search: 'vpn' } });
});

test('X, Shift + X and Ctrl/⌘ + A select by key in the table; the ? sheet lists them; the switch turns X off', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const boxes = rowBoxes(page);
  await boxes.nth(1).focus();
  await page.keyboard.press('x');
  await expect(boxes.nth(1)).toBeChecked();
  await boxes.nth(4).focus();
  await page.keyboard.press('Shift+X');
  for (const at of [1, 2, 3, 4]) await expect(boxes.nth(at)).toBeChecked();
  await expect(boxes.nth(0)).not.toBeChecked();
  await expect(boxes.nth(5)).not.toBeChecked();
  await page.keyboard.press('x');
  await expect(boxes.nth(4)).not.toBeChecked();
  // Ctrl/⌘ + A in the table: the page, not the document's text
  await page.keyboard.press('ControlOrMeta+a');
  await expect(bulkCount(page)).toHaveText('25 selected');
  expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
  // outside the table X is nobody's
  await page.getByRole('heading', { name: 'Selection scope', level: 1 }).click();
  await page.keyboard.press('x');
  await expect(bulkCount(page)).toHaveText('25 selected');
  // the sheet, opened from inside the table, lists the three under the workspace's name
  await boxes.nth(6).focus();
  await page.keyboard.press('?');
  const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('h3')).toContainText(['Incidents']);
  const listed = await sheet.locator('.uix-shortcut-sheet__row dt').allTextContents();
  expect(listed).toEqual(expect.arrayContaining(['Select or deselect the row', 'Select from the last row picked to this one', 'Select every row on this page']));
  // WCAG 2.1.4: the single-key switch turns X off
  await sheet.getByRole('switch', { name: 'Single-key shortcuts' }).click();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await boxes.nth(6).focus();
  const before = await boxes.nth(6).isChecked();
  await page.keyboard.press('x');
  expect(await boxes.nth(6).isChecked()).toBe(before);
});

for (const state of ['page', 'all', 'stale']) {
  test(`axe: no serious finding with the ${state} banner showing`, async ({ page }, testInfo) => {
    await open(page, testInfo);
    if (state === 'stale') await page.getByRole('button', { name: 'Ask' }).click();
    await headBox(page).check();
    if (state !== 'page') await banner(page).getByRole('button', { name: /^Select all/ }).click();
    if (state === 'stale') await search(page, 'vpn');
    await expect(banner(page)).toHaveAttribute('data-scope', state);
    const results = await new AxeBuilder({ page }).include('[data-selection-scope-demo]').analyze();
    const gated = results.violations.filter((violation) => GATED.has(violation.impact));
    expect(gated.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('320 px: the banner and the bulk bar wrap inside the page', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await open(page, testInfo);
  await headBox(page).check();
  await banner(page).getByRole('button', { name: /^Select all/ }).click();
  // each part's own box, not only the bar's: a nowrap count can run past a bar that fits
  await page.evaluate(() => {
    // the longest real words: a long filter in words (CI's Linux fonts are wider than Windows')
    for (const el of document.querySelectorAll('.uix-data-workspace__bulk-scope, .uix-data-workspace__scope-text')) el.append(' Assignee: Service Desk, Network, Database and Identity');
  });
  for (const locator of [banner(page), page.getByRole('toolbar', { name: 'Bulk actions' }), bulkCount(page), bannerText(page)]) {
    const box = await locator.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
