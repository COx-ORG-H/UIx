/* The grouped agenda of SchedulingCalendar and the counts-only month in a real browser
 * (HAR-1520, U4): what jsdom cannot measure.
 *   AC2  above 200 rows only the rows near the viewport are mounted, and the last row is still
 *        reached with the keyboard
 *   AC3  Enter on a row activates it
 *   AC6  at 375 px the agenda causes no horizontal page scroll; a long title wraps in the row
 *   AC7  the status of a row is visible text
 *   AC8  at 375 px the counts-only month shows every day, its counts and markers, no chips,
 *        and the page does not scroll sideways
 * The harness is tests/scheduling-calendar/; structure is in packages/react/src/scheduling-agenda-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleAnimations } from './settle.mjs';

const HARNESS = '../../tests/scheduling-calendar/harness.html';
const P = '.uix-scheduling-calendar__';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
});

const open = async (page, query, viewport = { width: 1280, height: 800 }) => {
  await page.setViewportSize(viewport);
  await page.goto(`${HARNESS}?${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('.uix-scheduling-calendar')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
};
const calls = (page) => page.evaluate(() => window.__calendar);
const pageScroll = (page) => page.evaluate(() => ({ scroll: document.scrollingElement.scrollWidth, client: document.scrollingElement.clientWidth }));

test('AC2: a 260-row agenda mounts only the rows near the viewport, and Tab still reaches the last row', async ({ page }) => {
  // 259 key presses, each followed by two frames so the next rows are mounted before the next press.
  test.setTimeout(120_000);
  await open(page, 'case=agenda&rows=260');
  const agenda = page.locator(`${P}agenda--virtual`);
  await expect(agenda).toBeVisible();
  const mounted = await agenda.locator(`${P}agenda-vrow`).count();
  expect(mounted).toBeGreaterThan(5);
  expect(mounted, 'far fewer than 260 rows and 20 headings').toBeLessThan(60);
  await expect(agenda.locator('h3').first()).toBeVisible();
  await expect(page.locator('[data-item-id="r259"]')).toHaveCount(0);

  // Tab from the first row to the last: each step may scroll, and the next rows mount as it does.
  await page.locator('[data-item-id="r0"]').focus();
  for (let step = 0; step < 259; step++) {
    await page.keyboard.press('Tab');
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  await expect(page.locator('[data-item-id="r259"]')).toBeFocused();
  expect(await agenda.locator(`${P}agenda-vrow`).count(), 'still a window, not the whole list').toBeLessThan(60);
  await expect(page.locator('[data-item-id="r0"]')).toHaveCount(0);
  await page.keyboard.press('Enter');
  expect((await calls(page)).entries).toEqual(['r259']);
});

test('AC2: at or below 200 rows the agenda is headings with ordered lists, and nothing scrolls inside it', async ({ page }) => {
  await open(page, 'case=agenda&rows=200');
  await expect(page.locator(`${P}agenda--virtual`)).toHaveCount(0);
  await expect(page.locator(`${P}agenda ol > li`)).toHaveCount(200);
  await expect(page.locator(`${P}agenda h3`)).toHaveCount(20);
  const box = await page.locator(`${P}agenda`).evaluate((el) => ({ overflow: getComputedStyle(el).overflowY, scroll: el.scrollHeight, client: el.clientHeight }));
  expect(box.overflow, 'the page scrolls it, not a box of its own').toBe('visible');
  expect(box.scroll).toBeLessThanOrEqual(box.client);
});

test('AC6: at 375 px a long agenda keeps the title readable beside labelled markers, and a heading with two windows keeps its text', async ({ page }) => {
  await open(page, 'case=agenda&rows=260&rich=1', { width: 375, height: 812 });
  const scroll = await pageScroll(page);
  expect(scroll.scroll, 'no page scroll').toBeLessThanOrEqual(scroll.client);
  const agenda = page.locator(`${P}agenda--virtual`);
  // Every mounted row is one fixed height, whatever it holds.
  const heights = await agenda.locator(`${P}agenda-vrow`).evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));
  expect(new Set(heights.map((height) => Math.round(height))), 'one row height').toEqual(new Set([44]));
  // The heading row holds the heading, whole; each window has the next row to itself.
  expect(await agenda.locator(`${P}agenda-vrow`).evaluateAll((rows) => rows.slice(0, 4).map((row) => row.dataset.kind))).toEqual(['heading', 'note', 'note', 'entry']);
  const inside = (inner, outer) => inner.top >= outer.top - 0.5 && inner.bottom <= outer.bottom + 0.5 && inner.left >= outer.left - 0.5 && inner.right <= outer.right + 0.5;
  const rect = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width }; });
  const headRow = agenda.locator(`${P}agenda-vrow[data-kind="heading"]`).first();
  expect(inside(await rect(headRow.locator('h3')), await rect(headRow))).toBe(true);
  await expect(headRow.locator('h3')).toBeVisible();
  for (const id of ['payroll', 'audit']) {
    const note = agenda.locator(`[data-overlay-id="${id}"]`);
    await expect(note.locator(`${P}window-name`)).toBeVisible();
    expect(inside(await rect(note), await rect(note.locator('xpath=..')))).toBe(true);
  }
  // A row with one labelled marker, and one with two: the title has most of the row.
  for (const id of ['r0', 'r1']) {
    const row = agenda.locator(`[data-item-id="${id}"]`);
    const title = await rect(row.locator(`${P}title`));
    expect(title.width, `the title of ${id} is readable`).toBeGreaterThan(250);
    for (const part of [`${P}agenda-time`, `${P}status`, `${P}marker >> nth=0`]) {
      await expect(row.locator(part)).toBeVisible();
      expect(inside(await rect(row.locator(part)), await rect(row)), `${part} of ${id} is inside its row`).toBe(true);
    }
  }
});

test('a row focused under a sticky day heading stops below it', async ({ page }) => {
  await open(page, 'case=agenda&rows=200', { width: 1280, height: 420 });
  // Put the sixth row of the first day right under its stuck heading; the fifth is then behind it.
  const rows = page.locator(`${P}agenda-group`).first().locator(`${P}agenda-row`);
  await rows.nth(5).evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - el.closest('section').firstElementChild.getBoundingClientRect().height));
  await rows.nth(5).evaluate((el) => el.focus({ preventScroll: true }));
  const before = await rows.nth(4).evaluate((el) => ({ row: el.getBoundingClientRect().top, head: el.closest('section').firstElementChild.getBoundingClientRect().bottom }));
  expect(before.row, 'the fifth row starts behind the heading').toBeLessThan(before.head);
  // Shift+Tab to it: the browser scrolls it into view, and it must come out from under the heading.
  await page.keyboard.press('Shift+Tab');
  await expect(rows.nth(4)).toBeFocused();
  const tops = await rows.nth(4).evaluate((el) => ({ row: el.getBoundingClientRect().top, head: el.closest('section').firstElementChild.getBoundingClientRect().bottom }));
  expect(tops.row, 'the row is not behind its heading').toBeGreaterThanOrEqual(tops.head - 0.5);
});

test('AC3 / AC7: Enter on a row activates it; its status is visible text and nothing sits only in a title', async ({ page }) => {
  await open(page, 'case=agenda');
  const row = page.locator('[data-item-id="a2"]');
  await row.focus();
  await page.keyboard.press('Enter');
  expect((await calls(page)).entries).toEqual(['a2']);
  await expect(row.locator(`${P}status`)).toBeVisible();
  await expect(row.locator(`${P}status`)).toHaveText('Tentative');
  await expect(row.locator(`${P}marker-label`)).toBeVisible();
  await expect(row.locator(`${P}agenda-time`)).toHaveText('10:00 – 11:30');
  await expect(page.locator(`${P}agenda [title]`)).toHaveCount(0);
  await expect(row).toHaveAccessibleName(/Firewall rule update.*Tentative.*Needs sign-off/);
});

test('AC4 / AC5: one window note beside the heading; a day with no rows keeps its heading and opens the day', async ({ page }) => {
  await open(page, 'case=agenda');
  const note = page.locator('[data-overlay-id="payroll"]');
  await expect(note).toHaveCount(1);
  await expect(note).toBeVisible();
  await note.focus();
  await page.keyboard.press('Enter');
  expect((await calls(page)).overlays).toEqual(['payroll']);
  const day = page.locator(`${P}agenda-group[data-date="2026-10-08"]`);
  await expect(day.locator('h3')).toBeVisible();
  const more = day.locator(`${P}agenda-more`);
  await expect(more).toHaveText('4 not shown — open day');
  await more.click();
  expect((await calls(page)).more).toEqual(['2026-10-08']);
  await expect(page.locator(`${P}agenda-group[data-date="2026-10-09"] ${P}agenda-continues`)).toHaveText('Continues: 2 listed under an earlier day');
  // The notice comes first in reading order.
  const order = await page.evaluate((prefix) => {
    const notice = document.querySelector(`${prefix}notice`);
    const heading = document.querySelector(`${prefix}agenda h3`);
    return Boolean(notice.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING) && notice.getBoundingClientRect().bottom <= heading.getBoundingClientRect().top;
  }, P);
  expect(order).toBe(true);
});

for (const width of [375, 1280]) {
  test(`AC6: at ${width} px the agenda does not scroll the page sideways and a long title is not cut`, async ({ page }) => {
    await open(page, 'case=agenda', { width, height: 812 });
    const scroll = await pageScroll(page);
    expect(scroll.scroll).toBeLessThanOrEqual(scroll.client);
    const title = page.locator('[data-item-id="a2"] ' + `${P}title`);
    const box = await title.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, right: el.getBoundingClientRect().right, row: el.closest('button').getBoundingClientRect().right }));
    expect(box.scroll, 'the whole title is laid out').toBeLessThanOrEqual(box.client + 1);
    expect(box.right).toBeLessThanOrEqual(box.row + 1);
    for (const part of ['status', 'marker-label', 'agenda-time']) await expect(page.locator(`[data-item-id="a2"] ${P}${part}`)).toBeInViewport();
  });
}

test('AC8: at 375 px the counts-only month shows every day with its count and marker, no chips, and nothing scrolls sideways', async ({ page }) => {
  await open(page, 'case=counts', { width: 375, height: 812 });
  const scroll = await pageScroll(page);
  expect(scroll.scroll, 'no page scroll').toBeLessThanOrEqual(scroll.client);
  const grid = await page.locator(`${P}grid`).evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(grid.scroll, 'all seven columns fit').toBeLessThanOrEqual(grid.client + 1);
  await expect(page.locator(`${P}day`)).toHaveCount(42);
  await expect(page.locator('[data-item-id]')).toHaveCount(0);
  await expect(page.locator(`${P}more`)).toHaveCount(0);
  const cell = page.locator(`${P}day:has([data-calendar-date="2026-10-07"])`);
  await expect(cell.locator(`${P}count > [aria-hidden]`)).toHaveText('12');
  await expect(cell.locator(`${P}count > [aria-hidden]`)).toBeVisible();
  await expect(cell.locator(`${P}marker`)).toBeVisible();
  // A three-digit count fits its cell.
  const wide = page.locator(`${P}day:has([data-calendar-date="2026-10-15"])`);
  const fit = await wide.evaluate((el, prefix) => { const count = el.querySelector(`${prefix}count > [aria-hidden]`).getBoundingClientRect(); const box = el.getBoundingClientRect(); return count.left >= box.left && count.right <= box.right; }, P);
  expect(fit).toBe(true);
  // ... and so does one with two markers: the count and the markers stay in the head of the cell, clear of the window lanes.
  const marked = page.locator(`${P}day:has([data-calendar-date="2026-10-22"])`);
  await expect(marked.locator(`${P}marker`)).toHaveCount(2);
  const headFit = await marked.evaluate((el, prefix) => {
    const head = el.querySelector(`${prefix}dayhead`).getBoundingClientRect();
    return [...el.querySelectorAll(`${prefix}count > [aria-hidden], ${prefix}marker`)].every((part) => { const r = part.getBoundingClientRect(); return r.width > 0 && r.top >= head.top - 0.5 && r.bottom <= head.bottom + 0.5 && r.left >= head.left - 0.5 && r.right <= head.right + 0.5; });
  }, P);
  expect(headFit, 'a three-digit count and two markers fit the head').toBe(true);
  // Every cell has the same height, and the window keeps its name.
  const heights = await page.locator(`${P}day`).evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  await expect(page.locator(`${P}window-name`).first()).toBeVisible();
  await page.locator('[data-calendar-date="2026-10-07"]').click();
  expect((await calls(page)).dates).toEqual(['2026-10-07']);
});

for (const [query, viewport] of [['case=agenda', { width: 1280, height: 800 }], ['case=agenda&rows=260', { width: 1280, height: 800 }], ['case=counts', { width: 375, height: 812 }]]) {
  test(`no serious accessibility violation: ${query}`, async ({ page }) => {
    await open(page, query, viewport);
    await settleAnimations(page);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
}
