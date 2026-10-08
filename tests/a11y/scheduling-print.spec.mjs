/* SchedulingCalendar on paper (HAR-1541, U7): the same markup under `@media print`, in a real
 * browser. Each test runs in the light and the dark project; paper is light in both.
 *   AC1  every item and window name is shown, no scroller clips, and a window's kind and the
 *        high band can be told without background graphics (an edge, never a fill or pattern alone)
 *   AC2  the colours are the print tokens, whatever theme the screen has
 * The page is A4 at 96 dpi (794 px wide). Snapshots are in tests/visual/scheduling-print.spec.mjs. */
import { test, expect } from '@playwright/test';

const HARNESS = '../../tests/scheduling-calendar/harness.html';
const P = '.uix-scheduling-calendar__';
const INK = 'rgb(10, 10, 10)';
const PAPER = 'rgb(255, 255, 255)';
const SIGNAL = 'rgb(196, 0, 18)';
const CLEAR = 'rgba(0, 0, 0, 0)';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
});

const openPrinted = async (page, query) => {
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.goto(`${HARNESS}?${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('.uix-scheduling-calendar')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
};
const style = (locator, props, pseudo) => locator.evaluate((el, [names, which]) => {
  const computed = getComputedStyle(el, which ?? undefined);
  return Object.fromEntries(names.map((name) => [name, computed.getPropertyValue(name)]));
}, [props, pseudo]);
/** True when nothing of the element's content is cut by its own box. */
const whole = (locator) => locator.evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1).map((el) => el.textContent.trim().slice(0, 40)));

for (const query of ['case=encodings', 'case=controlled&windows=3']) {
  test(`AC1 (month, ${query}): the grid fits the page, nothing scrolls, and every chip shows its whole title`, async ({ page }) => {
    await openPrinted(page, query);
    const grid = page.locator(`${P}grid`);
    expect(await style(grid, ['overflow-x', 'overflow-y'])).toEqual({ 'overflow-x': 'visible', 'overflow-y': 'visible' });
    const box = await grid.evaluate((el) => ({ right: el.getBoundingClientRect().right, scroll: el.scrollWidth, client: el.clientWidth, page: document.scrollingElement.scrollWidth, view: document.scrollingElement.clientWidth }));
    expect(box.right, 'seven columns inside the page').toBeLessThanOrEqual(794);
    expect(box.scroll).toBeLessThanOrEqual(box.client + 1);
    expect(box.page, 'the page is not wider than the paper').toBeLessThanOrEqual(box.view);
    // A chip is as tall as its title needs, and the day cell grows with it.
    const chips = page.locator(`${P}entries > ${P}entry`);
    expect(await chips.count()).toBeGreaterThan(0);
    expect(await whole(chips), 'chips cut').toEqual([]);
    expect(await whole(page.locator(`${P}entries > ${P}entry > ${P}entry-text`)), 'titles cut').toEqual([]);
    const cut = await page.locator(`${P}day`).evaluateAll((cells) => cells.filter((cell) => [...cell.querySelectorAll('[data-item-id]')].some((chip) => chip.getBoundingClientRect().bottom > cell.getBoundingClientRect().bottom + 1)).length);
    expect(cut, 'no chip runs out of its day cell').toBe(0);
    // Every window is drawn with its name.
    for (const name of await page.locator(`${P}window ${P}window-name`).all()) await expect(name).toBeVisible();
  });
}

test('AC2: on paper the calendar is ink on paper in either theme, and its controls are gone', async ({ page }) => {
  await openPrinted(page, 'case=encodings&header=1');
  expect((await style(page.locator('.uix-scheduling-calendar'), ['color'])).color).toBe(INK);
  expect((await style(page.locator(`${P}day:not([data-outside])`).first(), ['background-color']))['background-color']).toBe(PAPER);
  const plain = page.locator(`${P}entries > ${P}entry[data-band="none"][data-status="committed"]`).first();
  expect(await style(plain, ['color', 'background-color'])).toEqual({ color: INK, 'background-color': PAPER });
  // The buttons of the header are not printed; its title is.
  const header = page.locator(`${P}header`);
  if (await header.count()) {
    await expect(header.locator('button').first()).toBeHidden();
    await expect(header.locator('strong')).toBeVisible();
  }
});

test('AC1: the high band is a heavy edge in the signal colour, not a fill, in every state', async ({ page }) => {
  await openPrinted(page, 'case=encodings');
  const high = page.locator(`${P}entry[data-band="high"]`);
  expect(await high.count()).toBeGreaterThan(0);
  for (const chip of await high.all()) {
    const look = await style(chip, ['background-color', 'background-image', 'color', 'border-bottom-color', 'border-bottom-width']);
    expect(look['background-color'], 'no fill').toBe(CLEAR);
    expect(look['background-image']).toBe('none');
    expect(look.color === INK || look.color === 'rgb(82, 82, 82)', `ink text, got ${look.color}`).toBe(true);
    expect(look['border-bottom-color']).toBe(SIGNAL);
    expect(look['border-bottom-width']).toBe('2px');
  }
  // No other band has that edge.
  const others = await page.locator(`${P}entry:not([data-band="high"])`).evaluateAll((els) => els.filter((el) => getComputedStyle(el).borderBottomColor === 'rgb(196, 0, 18)').length);
  expect(others).toBe(0);
});

test('AC1: each window pattern has an edge of its own, so its kind reads without background graphics', async ({ page }) => {
  await openPrinted(page, 'case=encodings');
  const edges = await page.locator(`${P}window[data-pattern]`).evaluateAll((els) => els.map((el) => [el.dataset.pattern, getComputedStyle(el).borderTopStyle]));
  const byPattern = new Map(edges);
  expect([...byPattern.keys()].sort(), 'the specimen has every pattern').toEqual(['cross', 'diagonal', 'dotted', 'solid']);
  expect(Object.fromEntries(byPattern)).toEqual({ solid: 'solid', diagonal: 'dashed', cross: 'double', dotted: 'dotted' });
  // Every window of one pattern has the same edge.
  for (const [pattern, edge] of edges) expect(edge).toBe(byPattern.get(pattern));
  // A marker's glyph is painted as a background: it asks to be printed even without background graphics.
  const glyph = page.locator(`${P}marker[data-glyph]`).first();
  if (await glyph.count()) expect((await style(glyph, ['print-color-adjust'], '::before'))['print-color-adjust']).toBe('exact');
});

test('AC1 (week time grid): no scroller, seven days on the page, the zone label printed, hour lines that are not a background', async ({ page }) => {
  await openPrinted(page, 'case=timegrid');
  const grid = page.locator(`${P}timegrid`);
  expect((await style(grid, ['overflow-x']))['overflow-x']).toBe('visible');
  const box = await grid.evaluate((el) => ({ right: el.getBoundingClientRect().right, page: document.scrollingElement.scrollWidth, view: document.scrollingElement.clientWidth }));
  expect(box.right).toBeLessThanOrEqual(794);
  expect(box.page).toBeLessThanOrEqual(box.view);
  await expect(page.locator(`${P}tg-zone`)).toBeVisible();
  expect((await page.locator(`${P}tg-zone`).textContent()).trim().length).toBeGreaterThan(0);
  await expect(page.locator(`${P}tg-now`)).toBeHidden();
  const line = await style(page.locator(`${P}tg-gutter > ${P}tg-hour`).nth(3), ['border-top-width', 'border-top-style', 'content'], '::after');
  expect([line['border-top-width'], line['border-top-style']]).toEqual(['1px', 'solid']);
  // Every item and every window bar is drawn with its name.
  for (const name of await page.locator(`${P}tg-strip ${P}window-name`).all()) await expect(name).toBeVisible();
  expect(await page.locator(`${P}tg-item`).count()).toBeGreaterThan(0);
  for (const item of await page.locator(`${P}tg-item`).all()) await expect(item).toBeVisible();
});

test('AC1 (agenda): day headings do not stick, and the long form prints its rows without a scroller', async ({ page }) => {
  await openPrinted(page, 'case=agenda');
  expect((await style(page.locator(`${P}agenda-head`).first(), ['position'])).position).toBe('static');
  await openPrinted(page, 'case=agenda&rows=260');
  const long = page.locator(`${P}agenda--virtual`);
  expect(await style(long, ['overflow-y', 'max-height'])).toEqual({ 'overflow-y': 'visible', 'max-height': 'none' });
  const box = await long.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
  expect(box.scroll).toBeLessThanOrEqual(box.client + 1);
});
