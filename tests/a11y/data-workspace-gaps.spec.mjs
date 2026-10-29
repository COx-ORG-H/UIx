/* DataWorkspace's adoption gaps (HAR-2622..2626) in Chromium, on a library catalogue with a fake
 * server (tests/data-workspace-gaps/harness.tsx): the keyboard row model across a refetch and a
 * page, multi-column sort by pointer and keyboard, row groups (collapse in place, tri-state,
 * ranges across groups), the responsive ladder as the window narrows, a windowed long list
 * (bounded rows, the true size, scroll-into-view, a zebra that does not flip), 320 px and axe. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/data-workspace-gaps/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#sorting tbody tr')).toHaveCount(10);
  await expect(page.locator('#cards tbody tr')).toHaveCount(8);
};
const focusedRowId = (page) => page.evaluate(() => document.activeElement?.getAttribute('data-uix-row-id') ?? document.activeElement?.tagName);

test('keyboard rows: Tab lands on one row, ↓ moves, Enter activates; focus stays across a refetch and moves to the first row of a new page', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const ws = page.locator('#sorting');
  await ws.getByRole('button', { name: 'Copies' }).focus();
  await page.keyboard.press('Tab');
  const first = await ws.locator('tbody tr').first().getAttribute('data-uix-row-id');
  expect(await focusedRowId(page)).toBe(first);
  expect(await ws.locator('tbody tr[tabindex="0"]').count(), 'one row in the tab order').toBe(1);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const third = await ws.locator('tbody tr').nth(2).getAttribute('data-uix-row-id');
  expect(await focusedRowId(page)).toBe(third);
  // the ring: inside the row (no layout shift), on every cell including the frozen ones
  const ring = await ws.locator('tbody tr').nth(2).evaluate((tr) => ({
    outline: getComputedStyle(tr).outlineWidth, offset: getComputedStyle(tr).outlineOffset,
    frozen: getComputedStyle(tr.children[1]).boxShadow,
  }));
  expect(ring).toMatchObject({ outline: '2px', offset: '-2px' });
  expect(ring.frozen).toContain('inset');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.__dw.activated)).toEqual([third]);
  // a refetch (the product's Refresh, pressed without taking focus): the same row keeps focus
  const requests = await page.evaluate(() => window.__dw.requests);
  await ws.getByRole('button', { name: 'Refresh' }).evaluate((b) => b.click());
  await expect.poll(() => page.evaluate(() => window.__dw.requests)).toBeGreaterThan(requests);
  await expect(ws.locator('.uix-table-wrap')).not.toHaveAttribute('aria-busy', 'true');
  expect(await focusedRowId(page)).toBe(third);
  // the next page: none of these rows are left, focus goes to its first row
  await ws.getByRole('button', { name: '2', exact: true }).evaluate((b) => b.click());
  // the range follows the page at once; the rows (kept while the page loads) arrive after
  await expect(ws.locator('.uix-data-workspace__range')).toHaveText('11–20 of 36');
  await expect.poll(() => ws.locator('tbody tr').first().getAttribute('data-uix-row-id')).not.toBe(first);
  const firstOfPage2 = await ws.locator('tbody tr').first().getAttribute('data-uix-row-id');
  await expect.poll(() => focusedRowId(page)).toBe(firstOfPage2);
});

test('multi-sort: Shift + click and Shift + Enter add keys with a numbered badge; a plain Enter sorts by one column', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const ws = page.locator('#sorting');
  const badges = () => ws.locator('th[data-sort-order]');
  await expect(badges()).toHaveCount(2);
  await ws.getByRole('button', { name: /^Title/ }).click({ modifiers: ['Shift'] });
  await expect(badges()).toHaveCount(3);
  // the drawn ordinal is CSS (empty alt text); its words are in the header button's name
  await expect(ws.getByRole('button', { name: /^Title\W+Sort priority 3$/ })).toBeVisible();
  expect(await ws.locator('th[data-sort-order="3"]').evaluate((th) => getComputedStyle(th, '::before').content)).toMatch(/3/);
  await expect(ws.locator('th[aria-sort]')).toHaveCount(3);
  await ws.getByRole('button', { name: /^Author/ }).focus();
  await page.keyboard.press('Shift+Enter');
  await expect(badges()).toHaveCount(4);
  await expect(ws.locator('th', { has: page.getByRole('button', { name: /^Author/ }) })).toHaveAttribute('aria-sort', 'ascending');
  await page.keyboard.press('Enter');
  await expect(badges()).toHaveCount(0);
  await expect(ws.locator('th[aria-sort]')).toHaveCount(1);
});

test('groups: a toggle collapses its rows in place (the header does not move), tri-state, Shift range across groups', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const ws = page.locator('#groups');
  const head = ws.locator('tr[data-group-id="loaned"]');
  await head.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -200));
  const before = await head.evaluate((tr) => tr.getBoundingClientRect().top);
  const toggle = head.getByRole('button', { name: 'Collapse group On loan' });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(head.getByRole('button', { name: 'Expand group On loan' })).toHaveAttribute('aria-expanded', 'false');
  await expect(head.getByRole('button', { name: 'Expand group On loan' })).toBeFocused();
  expect(Math.abs((await head.evaluate((tr) => tr.getBoundingClientRect().top)) - before), 'the header stays where it was').toBeLessThan(1);
  await expect(ws.locator('tbody tr:not(.uix-data-workspace__group-head)')).toHaveCount(18 - 5);
  // tri-state and a range across a collapsed group, in visual order
  const groupBox = ws.getByRole('checkbox', { name: 'Select group Available' });
  await ws.getByRole('checkbox', { name: 'Select BK-1016' }).check();
  await expect(groupBox).toHaveJSProperty('indeterminate', true);
  await ws.getByRole('checkbox', { name: 'Select BK-1003' }).click({ modifiers: ['Shift'] });
  await expect(ws.locator('.uix-bulkbar__count')).toHaveText('2 selected');
  await head.getByRole('button', { name: 'Expand group On loan' }).click();
  await expect(ws.locator('tbody tr[data-selected]')).toHaveCount(2);
});

test('responsive ladder: cards at 390 px (labelled values, the checkbox and actions on the card), low and mid columns go as the window narrows', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 390, height: 900 });
  const cards = page.locator('#cards table');
  await expect(cards).toHaveClass(/uix-table--cards/);
  const author = page.locator('#cards tbody tr').first().locator('td[data-col="author"]');
  expect(await author.evaluate((td) => getComputedStyle(td, '::before').content)).toBe('"Author"');
  const box = page.locator('#cards tbody tr').first().getByRole('checkbox');
  await expect(box).toBeVisible();
  await box.check();
  await expect(page.locator('#cards .uix-bulkbar__count')).toHaveText('1 selected');
  await expect(page.locator('#cards tbody tr').first().getByRole('button', { name: 'Renew' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  const visible = (sel) => page.locator(sel).evaluateAll((ths) => ths.filter((th) => getComputedStyle(th).display !== 'none').map((th) => th.textContent.trim()));
  // the catalogue (mobile="priority"): 390 drops mid and low, 760 drops low, 1280 shows all
  expect(await visible('#sorting thead th[data-col]')).not.toContain('Genre');
  await page.setViewportSize({ width: 760, height: 900 });
  await expect(page.locator('#sorting table')).toHaveClass(/uix-table--priority(?!-mid)/);
  await expect(cards).toHaveClass(/uix-table--cards/);
  expect((await visible('#sorting thead th[data-col]')).join(' ')).toMatch(/Genre/);
  expect((await visible('#sorting thead th[data-col]')).join(' ')).not.toMatch(/Year/);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('#sorting table')).not.toHaveClass(/uix-table--priority/);
  await expect(cards).not.toHaveClass(/uix-table--cards/);
  expect((await visible('#sorting thead th[data-col]')).join(' ')).toMatch(/Year.*Status/);
});

test('virtualize: 2,000 rows mount a bounded window with the true size; End scrolls the last row into view clear of the header; j / k drive it; the zebra holds', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const ws = page.locator('#long');
  const wrap = ws.locator('.uix-table-wrap');
  const mounted = () => ws.locator('tbody tr[data-uix-row-id]').count();
  expect(await mounted()).toBeLessThan(60);
  await expect(ws.locator('table')).toHaveAttribute('aria-rowcount', '2001');
  expect(await ws.locator('tbody tr[aria-hidden="true"]').count()).toBeGreaterThan(0);
  // One synchronous read in the page: evaluateAll resolves the rows first, and a window that moves
  // in between hands it detached rows with no computed colour.
  const paint = () => page.evaluate(() => [...document.querySelectorAll('#long tbody tr[data-uix-row-id]')].map((tr) => [Number(tr.getAttribute('aria-rowindex')), getComputedStyle(tr).backgroundColor]));
  const parity = (rows) => { const by = new Map(); for (const [i, bg] of rows) { const k = i % 2; if (by.has(k) && by.get(k) !== bg) return null; by.set(k, bg); } return Object.fromEntries(by); };
  await page.mouse.move(0, 0);
  // settled: no row colour still easing in
  const settle = () => expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('#long')).length)).toBe(0);
  await settle();
  const top = parity(await paint());
  expect(top, 'one colour per parity').not.toBeNull();
  await wrap.evaluate((el) => { el.scrollTop = 30_123; });
  await expect.poll(async () => (await paint())[0][0]).toBeGreaterThan(400);
  await settle();
  expect(parity(await paint()), 'the same colours for the same rows after an odd jump').toEqual(top);
  await wrap.evaluate((el) => { el.scrollTop = 0; });
  // the window follows the scroll a frame later: wait for it before taking a row
  await expect.poll(() => ws.locator('tbody tr[data-uix-row-id]').first().getAttribute('data-uix-row-id')).toBe('BK-1000');
  await ws.locator('tbody tr[data-uix-row-id]').first().focus();
  await page.keyboard.press('End');
  await expect.poll(() => focusedRowId(page)).toBe('BK-2999');
  const geo = await page.evaluate(() => {
    const row = document.activeElement.getBoundingClientRect();
    const w = document.querySelector('#long .uix-table-wrap').getBoundingClientRect();
    const head = document.querySelector('#long thead').getBoundingClientRect();
    return { row: [row.top, row.bottom], wrap: [w.top, w.bottom], head: head.bottom, index: document.activeElement.getAttribute('aria-rowindex') };
  });
  expect(geo.index).toBe('2001');
  expect(geo.row[0]).toBeGreaterThanOrEqual(geo.head - 1);
  expect(geo.row[1]).toBeLessThanOrEqual(geo.wrap[1] + 1);
  await page.keyboard.press('k');
  await expect.poll(() => focusedRowId(page)).toBe('BK-2998');
  await page.keyboard.press('Home');
  await expect.poll(() => focusedRowId(page)).toBe('BK-1000');
  const headCover = await page.evaluate(() => document.activeElement.getBoundingClientRect().top - document.querySelector('#long thead').getBoundingClientRect().bottom);
  expect(headCover, 'the first row is not under the sticky header').toBeGreaterThanOrEqual(-1);
});

test('at 320 px the page never scrolls sideways; axe over every section', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.locator('#groups tr[data-group-id="loaned"] .uix-data-workspace__group-toggle').click();
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});

/* ── PR #176 review ───────────────────────────────────────────────────────────────────────── */

test('review 1: a truncating column clips in a fixed layout; the table stays inside its wrap at 1280 px and scrolls at its floors', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const geo = await page.evaluate(() => {
    const wrap = document.querySelector('#sorting .uix-table-wrap');
    const table = wrap.querySelector('table');
    const cell = wrap.querySelector('tbody td.uix-col--truncate');
    cell.textContent = 'An extremely long title that goes on and on to see whether the truncation class ever truncates anything at all';
    return { layout: getComputedStyle(table).tableLayout, wrap: wrap.clientWidth, table: table.scrollWidth, cell: cell.clientWidth, text: cell.scrollWidth };
  });
  expect(geo.layout).toBe('fixed');
  expect(geo.table, 'the table fits its wrap').toBeLessThanOrEqual(geo.wrap + 1);
  expect(geo.text, 'the title is clipped, not the column grown').toBeGreaterThan(geo.cell);
  // narrower than the columns' floors, the wrap scrolls and the title keeps its 14rem
  await page.setViewportSize({ width: 760, height: 900 });
  await expect(page.locator('#sorting table')).toHaveClass(/uix-table--priority/);
  const narrow = await page.evaluate(() => {
    const wrap = document.querySelector('#sorting .uix-table-wrap');
    const title = wrap.querySelector('tbody td.uix-col--truncate');
    return { overflow: wrap.scrollWidth - wrap.clientWidth, title: title.getBoundingClientRect().width, rem: parseFloat(getComputedStyle(document.documentElement).fontSize) };
  });
  expect(narrow.title).toBeGreaterThanOrEqual(14 * narrow.rem - 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test('review 2: word actions on a card stay in flow beside a long title at 320 px, nothing overlaps', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 900 });
  await expect(page.locator('#cards table')).toHaveClass(/uix-table--cards/);
  const overlaps = await page.evaluate(() => [...document.querySelectorAll('#cards tbody tr')].map((tr) => {
    const id = tr.querySelector('td[data-col="id"] .uix-data-workspace__id').getBoundingClientRect();
    const box = tr.querySelector('td[data-col="select"] input').closest('label').getBoundingClientRect();
    const card = tr.getBoundingClientRect();
    const actions = [...tr.querySelectorAll('td[data-col="actions"] button')].map((b) => b.getBoundingClientRect());
    const area = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return {
      text: tr.querySelector('td[data-col="id"]').textContent,
      idActions: actions.reduce((n, a) => n + area(id, a), 0), idBox: area(id, box),
      outside: actions.filter((a) => a.right > card.right + 0.5 || a.left < card.left - 0.5).length, shown: actions.length,
    };
  }));
  for (const card of overlaps) {
    expect(card.shown, card.text).toBe(3);
    expect(card.idActions, `the title runs under the actions: ${card.text}`).toBe(0);
    expect(card.idBox, card.text).toBe(0);
    expect(card.outside, card.text).toBe(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test('review 3: rowNavigation without onRowActivate: a click on the card does nothing, Enter opens the record link', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const row = page.locator('#cards tbody tr').first();
  await row.locator('td[data-col="copies"]').click();
  expect(await page.evaluate(() => location.hash)).toBe('');
  await row.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/books/BK-1000');
});

test('nit: a mouse scroll that moves the focused row out of the window parks focus on the body and brings it back', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const ws = page.locator('#long');
  await ws.locator('tbody tr[data-uix-row-id]').nth(2).focus();
  expect(await focusedRowId(page)).toBe('BK-1002');
  const wrap = ws.locator('.uix-table-wrap');
  await wrap.evaluate((el) => { el.scrollTop = 20_000; });
  await expect.poll(() => page.evaluate(() => document.activeElement?.classList.contains('uix-table-wrap'))).toBe(true);
  expect(await ws.locator('tbody tr[tabindex="0"]').count(), 'one tab stop on screen').toBe(1);
  await wrap.evaluate((el) => { el.scrollTop = 0; });
  await expect.poll(() => focusedRowId(page)).toBe('BK-1002');
});

/* ── 2.51 (HAR-2631, HAR-2632) ─────────────────────────────────────────────────────────────── */

test('HAR-2631: a table that asks for standard keeps 56 px rows under a page-wide comfortable density; one that names none follows it', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.evaluate(() => { document.documentElement.dataset.density = 'comfortable'; });
  const height = (sel) => page.locator(sel).first().evaluate((td) => td.getBoundingClientRect().height);
  expect(await height('#groups tbody tr:not(.uix-data-workspace__group-head) td')).toBe(56);
  expect(await height('#sorting tbody td')).toBe(68);
});

test('HAR-2631: the id header sorts with the mouse and Shift + Enter, and keeps its ordinal and aria-sort', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const ws = page.locator('#cards');
  const idTh = ws.locator('thead th[data-col="id"]');
  await idTh.getByRole('button', { name: /^Book/ }).click();
  await expect(idTh).toHaveAttribute('aria-sort', 'ascending');
  await expect.poll(() => page.evaluate(() => window.__dw.log.filter((l) => l.startsWith('sort:')).at(-1))).toBe('sort:title:ascending');
  await ws.locator('thead th[data-col="author"]').getByRole('button').focus();
  await page.keyboard.press('Shift+Enter');
  await expect(ws.locator('thead th[data-sort-order]')).toHaveCount(2);
  await expect(idTh).toHaveAttribute('data-sort-order', '1');
  await expect(idTh.getByRole('button', { name: /^Book\W+Sort priority 1$/ })).toBeVisible();
});

test('HAR-2632: a workspace with nothing for its toolbar starts with its table; a row is named by rowLabel', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const plain = page.locator('#plain');
  await expect(plain.locator('[role="toolbar"]')).toHaveCount(0);
  const gap = await plain.evaluate((section) => section.firstElementChild.getBoundingClientRect().top - section.getBoundingClientRect().top);
  expect(gap, 'no band and no gap above the table').toBe(0);
  await expect(plain.getByRole('checkbox', { name: 'Select The Hobbit' })).toBeVisible();
});
