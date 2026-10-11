/* SchedulingCalendar on paper (HAR-1541, U7): the same markup under `@media print`, in a real
 * browser. Each test runs in the light and the dark project; paper is light in both.
 *   AC1  every item and window name is shown, no scroller clips, and a window's kind and the
 *        high band can be told without background graphics (an edge, never a fill or pattern alone)
 *   AC2  the colours are the print tokens, whatever theme the screen has
 *   and every row of a long agenda or timeline is mounted while the page is laid out for paper
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

test('AC1: the high band is the heaviest edge, in the signal colour, on the surface of the paper, in every state', async ({ page }) => {
  await openPrinted(page, 'case=encodings');
  const high = page.locator(`${P}entry[data-band="high"]`);
  expect(await high.count()).toBeGreaterThan(0);
  for (const chip of await high.all()) {
    const look = await style(chip, ['background-color', 'background-image', 'color', 'border-bottom-color', 'border-bottom-width']);
    // Not the signal colour as a fill: the surface of the paper, so the chip covers what is behind it.
    expect(look['background-color'], 'no fill in the signal colour').toBe(PAPER);
    expect(look['background-image']).toBe('none');
    expect(look.color === INK || look.color === 'rgb(82, 82, 82)', `ink text, got ${look.color}`).toBe(true);
    expect(look['border-bottom-color']).toBe(SIGNAL);
    expect(look['border-bottom-width']).toBe('3px');
  }
  // No other chip has an edge that heavy.
  const heavy = await page.locator(`${P}entries > ${P}entry:not([data-band="high"])`).evaluateAll((els) => els.filter((el) => parseFloat(getComputedStyle(el).borderBottomWidth) >= 3).length);
  expect(heavy).toBe(0);
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
  expect([line['border-top-width'], line['border-top-style']]).toEqual(['1px', 'dotted']);
  // The hours of a window for everything are a tint under those lines, not over them: a strip of the
  // page along an hour line inside the tint is not the same picture as a strip of plain tint beside it.
  const shade = page.locator(`${P}tg-shade[data-pattern]`).first();
  await expect(shade).toBeVisible();
  const strips = await shade.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const lines = [...document.querySelectorAll('.uix-scheduling-calendar__tg-gutter > .uix-scheduling-calendar__tg-hour')].map((hour) => hour.getBoundingClientRect().top + window.scrollY);
    const top = box.top + window.scrollY;
    const y = lines.find((at) => at > top + 8 && at < top + box.height - 12);
    return y === undefined ? null : { x: Math.round(box.left + box.width / 2 - 12), line: Math.round(y) };
  });
  expect(strips, 'an hour line crosses the tint').not.toBeNull();
  const strip = (y) => page.screenshot({ fullPage: true, clip: { x: strips.x, y, width: 24, height: 3 } });
  expect((await strip(strips.line - 1)).equals(await strip(strips.line + 6)), 'the hour line is drawn over the tint').toBe(false);
  expect((await strip(strips.line + 6)).equals(await strip(strips.line + 10)), 'two strips of plain tint are the same picture (calibration)').toBe(true);
  // Every item and every window bar is drawn with its name.
  for (const name of await page.locator(`${P}tg-strip ${P}window-name`).all()) await expect(name).toBeVisible();
  expect(await page.locator(`${P}tg-item`).count()).toBeGreaterThan(0);
  for (const item of await page.locator(`${P}tg-item`).all()) await expect(item).toBeVisible();
});

test('AC1 (week time grid): an item too short for a line on a screen prints its words, and no item cuts its text', async ({ page }) => {
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.goto(`${HARNESS}?case=timegrid`, { waitUntil: 'networkidle' });
  const quarter = page.locator('[data-item-id="quarter"]');
  // On a screen the quarter of an hour shows its marker only.
  await expect(quarter.locator(`${P}entry-text`)).toBeHidden();
  await page.emulateMedia({ media: 'print' });
  await expect(quarter.locator(`${P}entry-text`)).toBeVisible();
  expect((await quarter.locator(`${P}entry-text`).textContent()).trim()).toMatch(/^\d\d:\d\d \S/);
  // On paper an item is as tall as its words need, so nothing is cut by its own box.
  expect(await whole(page.locator(`${P}tg-item`)), 'items cut').toEqual([]);
  expect(await whole(page.locator(`${P}tg-item > ${P}entry-text`)), 'item text cut').toEqual([]);
});

test('AC1 (agenda): day headings do not stick, and the long form prints every row without a scroller', async ({ page }) => {
  await openPrinted(page, 'case=agenda');
  expect((await style(page.locator(`${P}agenda-head`).first(), ['position'])).position).toBe('static');
  // The long form is a window of rows on a screen.
  await page.emulateMedia({ media: 'screen' });
  await page.goto(`${HARNESS}?case=agenda&rows=260`, { waitUntil: 'networkidle' });
  const rows = page.locator(`${P}agenda-vrow:not([data-kind="heading"])`);
  const windowed = await rows.count();
  expect(windowed).toBeGreaterThan(0);
  expect(windowed, 'a window of rows on the screen').toBeLessThan(260);
  // Laid out for paper, every row is mounted, each as tall as its text, and nothing scrolls.
  await page.emulateMedia({ media: 'print' });
  await expect(rows).toHaveCount(260);
  const long = page.locator(`${P}agenda--virtual`);
  expect(await style(long, ['overflow-y', 'max-height'])).toEqual({ 'overflow-y': 'visible', 'max-height': 'none' });
  const box = await long.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
  expect(box.scroll).toBeLessThanOrEqual(box.client + 1);
  expect(await whole(page.locator(`${P}agenda-vrow`)), 'rows cut').toEqual([]);
  // Back on the screen it is a window again.
  await page.emulateMedia({ media: 'screen' });
  await expect(rows).toHaveCount(windowed);
});

/* ── SchedulingTimeline on paper ─────────────────────────────────────────────────────────────── */
const TIMELINE = '../../tests/scheduling-timeline/harness.html';
const T = '.uix-scheduling-timeline__';
const openTimelinePrinted = async (page, query) => {
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.goto(`${TIMELINE}?${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('.uix-scheduling-timeline')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
};

test('AC1 (timeline): no scroller, the axis fits the page, nothing sticks, and every lane and bar is drawn', async ({ page }) => {
  await openTimelinePrinted(page, 'case=lanes');
  const scroller = page.locator(`${T}scroller`);
  expect(await style(scroller, ['overflow-x', 'overflow-y'])).toEqual({ 'overflow-x': 'visible', 'overflow-y': 'visible' });
  const box = await page.locator(`${T}grid`).evaluate((el) => ({ right: el.getBoundingClientRect().right, page: document.scrollingElement.scrollWidth, view: document.scrollingElement.clientWidth }));
  expect(box.right, 'the whole axis is inside the page').toBeLessThanOrEqual(794);
  expect(box.page, 'the page is not wider than the paper').toBeLessThanOrEqual(box.view);
  for (const part of [`${T}row--axis`, `${T}lane-label`, `${T}group-label`]) expect((await style(page.locator(part).first(), ['position'])).position, `${part} does not stick`).toBe('static');
  // Every bar is inside its track, and the last tick of the axis is inside the page.
  const bars = await page.locator(`${T}slot`).evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); const t = el.closest('[class*="__track"]').getBoundingClientRect(); return r.width > 0 && r.left >= t.left - 1 && r.left < t.right; }));
  expect(bars.length).toBeGreaterThan(3);
  expect(bars.every(Boolean), 'bars follow the narrower axis').toBe(true);
  await expect(page.locator(`${T}now`)).toBeHidden();
  // Every lane name and every window name is drawn.
  for (const name of await page.locator(`${T}body ${T}lane-name`).all()) await expect(name).toBeVisible();
  for (const name of await page.locator(`${T}overlay-name`).all()) await expect(name).toBeVisible();
});

test('AC1 / AC2 (timeline): ink on paper in either theme; the high band, the windows and the grid lines do not depend on a background', async ({ page }) => {
  await openTimelinePrinted(page, 'case=lanes');
  expect((await style(page.locator('.uix-scheduling-timeline'), ['color'])).color).toBe(INK);
  expect((await style(page.locator(`${T}scroller`), ['background-color']))['background-color']).toBe(PAPER);
  const high = page.locator(`${T}item[data-band="high"]`);
  expect(await high.count()).toBeGreaterThan(0);
  for (const bar of await high.all()) {
    const look = await style(bar, ['background-color', 'background-image', 'border-bottom-color', 'border-bottom-width', 'color']);
    // Not the signal colour as a fill: the surface of the paper, so the bar covers the window behind it.
    expect(look['background-color'], 'no fill in the signal colour').toBe(PAPER);
    expect(look['background-image']).toBe('none');
    expect(look['border-bottom-color']).toBe(SIGNAL);
    expect(look['border-bottom-width']).toBe('2px');
    expect(look.color === INK || look.color === 'rgb(82, 82, 82)', `ink text, got ${look.color}`).toBe(true);
  }
  // A window's kind is its edges: one style per pattern.
  const edges = await page.locator(`${T}overlay[data-pattern]`).evaluateAll((els) => els.map((el) => [el.dataset.pattern, getComputedStyle(el).borderLeftStyle]));
  const expected = { solid: 'solid', diagonal: 'dashed', cross: 'double', dotted: 'dotted' };
  expect(edges.length).toBeGreaterThan(0);
  for (const [pattern, edge] of edges) expect(edge, `a ${pattern} window`).toBe(expected[pattern]);
  expect(new Set(edges.map(([pattern]) => pattern)).size, 'the specimen has more than one pattern').toBeGreaterThan(1);
  // A grid line is an edge, not a painted strip.
  const line = await style(page.locator(`${T}gridline`).first(), ['background-color', 'background-image', 'border-left-width', 'border-left-style']);
  expect([line['background-color'], line['background-image'], line['border-left-width']]).toEqual([CLEAR, 'none', '1px']);
});

test('AC1 (timeline): a timeline that windows its rows and scrolls inside itself on a screen prints every lane, without a scroller', async ({ page }) => {
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.goto(`${TIMELINE}?case=stress&height=400`, { waitUntil: 'networkidle' });
  const lanes = page.locator(`${T}row[data-lane-id]`);
  const scroller = page.locator(`${T}scroller`);
  await expect(scroller).toHaveAttribute('data-virtual', /.*/);
  const windowed = await lanes.count();
  expect(windowed).toBeGreaterThan(0);
  expect(windowed, 'a window of lanes on the screen').toBeLessThan(500);
  // Laid out for paper, all 500 lanes and their bars are mounted and nothing scrolls.
  await page.emulateMedia({ media: 'print' });
  await expect(lanes).toHaveCount(500);
  expect(await page.locator(`${T}spacer`).count(), 'no space kept for rows that are not mounted').toBe(0);
  expect(await page.locator('[data-item-id]').count()).toBeGreaterThanOrEqual(500);
  expect(await style(scroller, ['overflow-y', 'max-height'])).toEqual({ 'overflow-y': 'visible', 'max-height': 'none' });
  const box = await scroller.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
  expect(box.scroll).toBeLessThanOrEqual(box.client + 1);
  // Back on the screen it is a window again.
  await page.emulateMedia({ media: 'screen' });
  await expect(lanes).toHaveCount(windowed);
  await expect(scroller).toHaveAttribute('data-virtual', /.*/);
});
