/* SchedulingCalendar resource day (HAR-983; MEDx S10 truthful day view, S13 popover actions,
 * S48 360 px day list). Chromium, light and dark, Bosnian words, Europe/Sarajevo:
 *   - one column per practitioner (1, 5, 15), time-aligned: a span starts at its time's row;
 *   - truthful: no free slot where no span exists (a practitioner who starts at 10:00 has none
 *     before), time off and bookings are text, never inferred;
 *   - the gutter and the heads stay in view while the grid scrolls;
 *   - keyboard: one tab stop, arrows between slots and columns, Enter selects with real instants;
 *   - first load shows skeletons, a refetch keeps the old spans dimmed and busy, empty says so;
 *   - at 360 px the day is a list, one practitioner after another, gaps said as "Nema rasporeda";
 *   - axe passes in every state.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/resource-day/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, query = '', viewport = { width: 1280, height: 900 }) => {
  await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(`${HARNESS}${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('.uix-scheduling-calendar__resources')).toBeVisible();
};

for (const columns of [1, 5, 15]) {
  test(`${columns} column(s): one per practitioner, time-aligned, inside the screen`, async ({ page }, testInfo) => {
    await open(page, testInfo, `?columns=${columns}&layout=columns`);
    const read = await page.evaluate(() => {
      const heads = [...document.querySelectorAll('.uix-scheduling-calendar__rs-head')];
      const cols = [...document.querySelectorAll('.uix-scheduling-calendar__rs-column')];
      const scroller = document.querySelector('.uix-scheduling-calendar__rs-scroll');
      const tick = (label) => [...document.querySelectorAll('.uix-scheduling-calendar__rs-tick')].find((t) => t.textContent === label).getBoundingClientRect().top;
      const booking = cols[0].querySelector('[data-kind="booked"]').getBoundingClientRect();
      return {
        heads: heads.length, columns: cols.length,
        // the 09:00 booking starts on the 09:00 line (the tick sits just below its line)
        aligned: Math.abs(booking.top - tick('09:00')) < 6,
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        scrollsInside: scroller.scrollWidth > scroller.clientWidth,
        minColumn: Math.min(...cols.map((c) => c.getBoundingClientRect().width)),
      };
    });
    expect(read.heads).toBe(columns);
    expect(read.columns).toBe(columns);
    expect(read.aligned).toBe(true);
    expect(read.page, 'the page never scrolls sideways').toBe(0);
    expect(read.minColumn).toBeGreaterThanOrEqual(140);
    if (columns === 15) expect(read.scrollsInside).toBe(true);
  });
}

test('truthful: no free slot where no schedule exists; off and booked are words', async ({ page }, testInfo) => {
  await open(page, testInfo, '?columns=5&layout=columns');
  const third = page.locator('.uix-scheduling-calendar__rs-column').nth(2);
  const firstFree = await third.locator('[data-kind="free"]').first().getAttribute('aria-label');
  expect(firstFree).toMatch(/, 10:00 – 10:15, Slobodno$/);
  await expect(third.locator('[data-kind="off"]')).toContainText('Pauza');
  const booked = page.locator('.uix-scheduling-calendar__rs-column').first().locator('[data-kind="booked"]').first();
  await expect(booked).toHaveAttribute('aria-label', 'dr. Amra Hadžić, 09:00 – 09:30, Zauzeto, Lejla M.');
});

test('the gutter and the heads stay in view while the grid scrolls', async ({ page }, testInfo) => {
  await open(page, testInfo, '?columns=15&layout=columns');
  const before = await page.evaluate(() => ({
    gutter: document.querySelector('.uix-scheduling-calendar__rs-gutter').getBoundingClientRect().left,
    head: document.querySelector('.uix-scheduling-calendar__rs-head').getBoundingClientRect().top,
  }));
  await page.locator('.uix-scheduling-calendar__rs-scroll').evaluate((el) => { el.scrollLeft = 600; el.scrollTop = 400; });
  const after = await page.evaluate(() => ({
    gutter: document.querySelector('.uix-scheduling-calendar__rs-gutter').getBoundingClientRect().left,
    head: document.querySelector('.uix-scheduling-calendar__rs-head').getBoundingClientRect().top,
  }));
  expect(Math.abs(after.gutter - before.gutter)).toBeLessThan(1);
  expect(Math.abs(after.head - before.head)).toBeLessThan(1);
});

test('keyboard: one tab stop, arrows between slots and practitioners, Enter selects', async ({ page }, testInfo) => {
  await open(page, testInfo, '?columns=5&layout=columns');
  const stops = await page.locator('.uix-scheduling-calendar__resources [tabindex="0"]').count();
  expect(stops).toBe(1);
  await page.locator('.uix-scheduling-calendar__resources [tabindex="0"]').focus();
  const name = () => page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  expect(await name()).toMatch(/^dr\. Amra Hadžić, 07:30|^dr\. Amra Hadžić, 08:00/);
  await page.keyboard.press('ArrowDown');
  expect(await name()).toMatch(/^dr\. Amra Hadžić, 08:15/);
  await page.keyboard.press('ArrowRight');
  expect(await name()).toMatch(/^dr\. Edin Kovačević, 08:15/);
  await page.keyboard.press('ArrowRight');
  // the third starts at 10:00: the nearest bookable time in that column
  expect(await name()).toMatch(/^dr\. Selma Đurđević, 10:00/);
  await page.keyboard.press('End');
  expect(await name()).toMatch(/^dr\. Selma Đurđević, 15:45/);
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  expect(ring).not.toBe('none');
  await page.keyboard.press('Enter');
  const slot = await page.evaluate(() => window.__slots.at(-1));
  expect(slot).toMatchObject({ resourceId: 'p2', start: '2026-10-22T13:45:00.000Z', end: '2026-10-22T14:00:00.000Z', kind: 'free' });
  await expect(page.locator('[data-selected]')).toHaveCount(1);
});

test('first load shows skeletons; a refetch keeps the spans, dimmed and busy; empty says so', async ({ page }, testInfo) => {
  await open(page, testInfo, '?columns=3&layout=columns&state=loading');
  await expect(page.locator('.uix-scheduling-calendar__rs-skeleton').first()).toBeVisible();
  await expect(page.locator('.uix-scheduling-calendar__resources [role="status"]')).toHaveText('Učitavanje rasporeda…');
  await open(page, testInfo, '?columns=3&layout=columns&state=refetch');
  await expect(page.locator('.uix-scheduling-calendar__resources')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.uix-scheduling-calendar__rs-skeleton')).toHaveCount(0);
  expect(await page.locator('[data-kind="booked"]').count()).toBeGreaterThan(0);
  await open(page, testInfo, '?columns=3&layout=columns&state=empty');
  await expect(page.locator('.uix-scheduling-calendar__empty')).toHaveText('Za ovaj dan nema rasporeda.');
  await expect(page.locator('[data-kind="free"]')).toHaveCount(0);
});

test('at 360 px the day is a list; gaps say "Nema rasporeda"; nothing scrolls sideways', async ({ page }, testInfo) => {
  await open(page, testInfo, '?columns=3', { width: 360, height: 800 });
  await expect(page.locator('.uix-scheduling-calendar__resources')).toHaveAttribute('data-layout', 'list');
  await expect(page.getByRole('heading', { name: /dr\. Selma Đurđević/ })).toBeVisible();
  const third = page.locator('.uix-scheduling-calendar__rs-section').nth(2);
  await expect(third.locator('[data-kind="none"]').first()).toContainText('07:30 – 10:00');
  await expect(third.locator('[data-kind="none"]').first()).toContainText('Nema rasporeda');
  const doc = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(doc).toBe(0);
  const short = await page.evaluate(() => Math.min(...[...document.querySelectorAll('button.uix-scheduling-calendar__rs-row')].map((b) => b.getBoundingClientRect().height)));
  expect(short).toBeGreaterThanOrEqual(44);
});

for (const query of ['?columns=5&layout=columns', '?columns=3&layout=list', '?columns=3&layout=columns&state=loading']) {
  test(`axe ${query}`, async ({ page }, testInfo) => {
    await open(page, testInfo, query);
    const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const gated = results.violations.filter((v) => GATED.has(v.impact));
    expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
  });
}
