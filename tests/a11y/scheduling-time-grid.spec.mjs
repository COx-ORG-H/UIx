/* The Week/Day time grid of SchedulingCalendar in a real browser (HAR-1509, U3): what jsdom
 * cannot measure.
 *   AC1  a 23-hour and a 25-hour day are drawn as long as they are; an item sits under its hour
 *   AC2 / AC4  a keyboard day move keeps the wall-clock time; a gap hour moves forward, announced
 *   AC3  an item that crosses midnight is one tab stop; dragging its second part moves the whole
 *   AC6  a top-lane span drags by whole days only
 *   AC7  below the minimum lane width fewer lanes are drawn; no label is cut under four characters
 *   AC8  350 events stay under 3,000 elements
 *   AC9  with moving off there is no grab cursor and no gesture
 *   AC10 / AC11  a press that does not travel is a click; a drag proposes once, on drop;
 *        Enter activates, or confirms a pending move, never both; Escape drops it
 *   AC12 the column "+N" is the consumer's; AC13 windows are reachable and named
 *   AC14 the first hour row is above the fold at 1280 × 800 with the strips full; at 375 px the
 *        grid scrolls inside itself; an empty week keeps its columns
 *   AC17 / AC18 day headers and the now-line
 * The harness is tests/scheduling-calendar/; logic is in packages/react/src/scheduling-time-grid-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleAnimations } from './settle.mjs';

const HARNESS = '../../tests/scheduling-calendar/harness.html';
const P = '.uix-scheduling-calendar__';
const item = (id) => `[data-item-id="${id}"]`;
const column = (date) => `[data-tg-column="${date}"]`;

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
});

const open = async (page, query, viewport = { width: 1280, height: 800 }) => {
  await page.setViewportSize(viewport);
  await page.goto(`${HARNESS}?${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator(`${P}timegrid`)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
};
const calls = (page) => page.evaluate(() => window.__calendar);
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; });
/** The height of one hour: the distance between the first two hour labels of the axis. */
const hourHeight = async (page) => {
  const [first, second] = await page.locator(`${P}tg-gutter ${P}tg-hour`).evaluateAll((els) => els.slice(0, 2).map((el) => el.getBoundingClientRect().top));
  return second - first;
};
const centre = async (locator) => { const b = await box(locator); return { x: b.left + b.width / 2, y: b.top + Math.min(b.height / 2, 12) }; };
/** A real mouse drag from an element, in steps, by (dx, dy). */
const dragBy = async (page, locator, dx, dy) => {
  await locator.scrollIntoViewIfNeeded();
  const from = await centre(locator);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 4 });
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 4 });
  return { release: () => page.mouse.up() };
};
// Europe/Berlin wall-clock times as instants: UTC+2 between the two clock changes of 2026.
const berlin = (date, time) => new Date(`${date}T${time}:00${date >= '2026-03-29' && date < '2026-10-25' ? '+02:00' : '+01:00'}`).toISOString();

for (const [date, hours, id] of [['2026-03-29', 23, 'spring'], ['2026-10-25', 25, 'autumn']]) {
  test(`AC1: ${date} is ${hours} hours tall and the 03:00 item sits under "03"`, async ({ page }) => {
    await open(page, `case=timegrid&view=day&date=${date}`);
    const labels = page.locator(`${P}tg-gutter ${P}tg-hour`);
    await expect(labels).toHaveCount(hours);
    const names = await labels.evaluateAll((els) => els.map((el) => el.getAttribute('data-hour')));
    expect(names.filter((name) => name === '02')).toHaveLength(hours === 23 ? 0 : 2);
    const hour = await hourHeight(page);
    expect(hour).toBeGreaterThan(30);
    const columnBox = await box(page.locator(column(date)));
    expect(Math.abs(columnBox.height - hours * hour)).toBeLessThanOrEqual(1);
    const three = await box(page.locator(`${P}tg-gutter [data-hour="03"]`));
    const placed = await box(page.locator(item(id)));
    expect(Math.abs(placed.top - three.top), 'the item starts at the 03 line').toBeLessThanOrEqual(1);
    expect(Math.abs(placed.height - hour), 'and is one hour tall').toBeLessThanOrEqual(2);
    if (hours === 25) await expect(labels.filter({ hasText: '+01:00' })).toHaveCount(1);
  });
}

test('AC10 / AC11: a press that does not travel is a click; a drag proposes once, on drop, and the item stays', async ({ page }) => {
  await open(page, 'case=timegrid');
  const plain = page.locator(item('plain'));
  await plain.scrollIntoViewIfNeeded();
  const hour = await hourHeight(page);
  const before = await box(plain);

  // 3 px of travel: still a click.
  const point = await centre(plain);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 2, point.y + 2);
  await page.mouse.up();
  expect((await calls(page)).entries).toEqual(['plain']);
  expect((await calls(page)).moves).toEqual([]);

  // One hour down: an outline follows, nothing is called until the drop.
  const drag = await dragBy(page, plain, 0, hour);
  await expect(page.locator(`${P}tg-ghost`)).toHaveCount(1);
  expect((await calls(page)).moves).toEqual([]);
  await drag.release();
  const after = await calls(page);
  expect(after.moves).toEqual([{ id: 'plain', start: berlin('2026-10-07', '10:00'), end: berlin('2026-10-07', '11:00'), adjusted: null }]);
  expect(after.entries, 'the click that ends a drag is not an activation').toEqual(['plain']);
  await expect(page.locator(`${P}tg-ghost`)).toHaveCount(0);
  expect((await box(plain)).top, 'the props did not change, so the item is where it was').toBe(before.top);

  // One column to the right: the next day, the same wall-clock time.
  const columnWidth = (await box(page.locator(column('2026-10-07')))).width;
  await (await dragBy(page, plain, columnWidth, 0)).release();
  expect((await calls(page)).moves[1]).toEqual({ id: 'plain', start: berlin('2026-10-08', '09:00'), end: berlin('2026-10-08', '10:00'), adjusted: null });

  // Escape during a drag drops it.
  await dragBy(page, plain, 0, hour);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect((await calls(page)).moves).toHaveLength(2);
});

test('AC3: an item that crosses midnight is one tab stop, and dragging its second part moves the whole window', async ({ page }) => {
  await open(page, 'case=timegrid');
  const start = page.locator(item('night'));
  const rest = page.locator('[data-continuation-of="night"]');
  await expect(start).toHaveCount(1);
  await expect(start).toHaveAttribute('data-part', 'start');
  await expect(rest).toHaveAttribute('aria-hidden', 'true');
  await expect(rest).toContainText('from 23:00');
  expect(await rest.evaluate((el) => [el.tagName, el.tabIndex])).toEqual(['DIV', -1]);
  // The two parts read as one item: the shared edge is open on both sides.
  expect(await start.evaluate((el) => getComputedStyle(el).borderBottomStyle)).toBe('dashed');
  expect(await rest.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('dashed');
  // The evening item that ends at midnight has no second part.
  await expect(page.locator('[data-continuation-of="evening"]')).toHaveCount(0);

  const hour = await hourHeight(page);
  await (await dragBy(page, rest, 0, hour)).release();
  expect((await calls(page)).moves).toEqual([{ id: 'night', start: berlin('2026-10-06', '00:00'), end: berlin('2026-10-06', '03:00'), adjusted: null }]);
  // A click on the second part activates the item.
  await rest.click({ position: { x: 20, y: 30 } });
  expect((await calls(page)).entries).toEqual(['night']);
});

test('AC6: a top-lane span moves by whole days, whatever the pointer does vertically', async ({ page }) => {
  await open(page, 'case=timegrid');
  const long = page.locator(`${P}tg-top ${item('long')}`);
  await expect(page.locator(`${P}tg-top [data-item-id]`)).toHaveCount(3);
  await expect(page.locator(`${P}tg-body ${item('long')}`)).toHaveCount(0);
  const columnWidth = (await box(page.locator(column('2026-10-07')))).width;
  await (await dragBy(page, long, columnWidth, 220)).release();
  expect((await calls(page)).moves).toEqual([{ id: 'long', start: berlin('2026-10-07', '08:00'), end: berlin('2026-10-08', '14:00'), adjusted: null }]);
  await (await dragBy(page, long, 0, 200)).release();
  expect((await calls(page)).moves, 'vertical travel alone proposes nothing').toHaveLength(1);
  await long.focus();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Enter');
  expect((await calls(page)).moves[1]).toEqual({ id: 'long', start: berlin('2026-10-06', '08:15'), end: berlin('2026-10-07', '14:15'), adjusted: null });
});

test('AC10 / AC11: Enter activates an item, or confirms its pending move, never both; Escape drops the move', async ({ page }) => {
  await open(page, 'case=timegrid');
  const plain = page.locator(item('plain'));
  await plain.focus();
  await expect(plain).toHaveAccessibleDescription(/Shift.*Enter confirms.*Escape cancels/);
  await page.keyboard.press('Enter');
  expect((await calls(page)).entries).toEqual(['plain']);

  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowDown');
  await expect(page.locator(`${P}tg-ghost`)).toHaveCount(1);
  await expect(page.locator(`${P}timegrid [aria-live]`)).toContainText('Enter confirms');
  expect((await calls(page)).moves).toEqual([]);
  await page.keyboard.press('Enter');
  const sent = await calls(page);
  expect(sent.moves).toEqual([{ id: 'plain', start: berlin('2026-10-07', '10:00'), end: berlin('2026-10-07', '11:00'), adjusted: null }]);
  expect(sent.entries, 'Enter confirmed the move and did not open the item').toEqual(['plain']);
  await expect(page.locator(`${P}tg-ghost`)).toHaveCount(0);

  await page.keyboard.press('Shift+ArrowUp');
  await expect(page.locator(`${P}tg-ghost`)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator(`${P}tg-ghost`)).toHaveCount(0);
  await expect(page.locator(`${P}timegrid [aria-live]`)).toHaveText('Move cancelled.');
  await page.keyboard.press('Enter');
  const end = await calls(page);
  expect(end.moves).toHaveLength(1);
  expect(end.entries, 'with nothing pending Enter activates again').toEqual(['plain', 'plain']);
});

test('AC10: a refused proposal leaves the item where it was and removes the outline', async ({ page }) => {
  await open(page, 'case=timegrid&reject=1');
  const plain = page.locator(item('plain'));
  await plain.focus();
  const before = await box(plain);
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Enter');
  expect((await calls(page)).moves).toHaveLength(1);
  await expect(page.locator(`${P}tg-ghost`)).toHaveCount(0);
  expect((await box(plain)).top).toBe(before.top);
});

test('AC2: a 22:00 item on 24.10. moved one day lands on 22:00 on the 25-hour day', async ({ page }) => {
  await open(page, 'case=timegrid&date=2026-10-24');
  await page.locator(item('late')).focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Enter');
  expect((await calls(page)).moves).toEqual([{ id: 'late', start: '2026-10-25T21:00:00.000Z', end: '2026-10-25T22:00:00.000Z', adjusted: null }]);
});

test('AC4: a move into the gap hour of 29.03. goes to 03:30 and is announced', async ({ page }) => {
  await open(page, 'case=timegrid&date=2026-03-28');
  await page.locator(item('gap')).focus();
  await page.keyboard.press('Shift+ArrowRight');
  const live = page.locator(`${P}timegrid [aria-live]`);
  await expect(live).toContainText('does not exist');
  await expect(live).toContainText('03:30');
  await page.keyboard.press('Enter');
  expect((await calls(page)).moves).toEqual([{ id: 'gap', start: berlin('2026-03-29', '03:30'), end: berlin('2026-03-29', '03:45'), adjusted: 'gap_forward' }]);
});

test('AC9: with moving off there is no grab cursor, no hint and no gesture; a pinned entry never moves', async ({ page }) => {
  await open(page, 'case=timegrid&move=0');
  const plain = page.locator(item('plain'));
  expect(await plain.evaluate((el) => getComputedStyle(el).cursor)).not.toBe('grab');
  await expect(page.locator(`${P}timegrid [aria-describedby]`)).toHaveCount(0);
  await expect(page.locator(`${P}timegrid`)).not.toContainText('Shift');
  const hour = await hourHeight(page);
  await (await dragBy(page, plain, 0, hour)).release();
  await plain.focus();
  await page.keyboard.press('Shift+ArrowDown');
  await expect(page.locator(`${P}tg-ghost`)).toHaveCount(0);
  await page.keyboard.press('Enter');
  const off = await calls(page);
  expect(off.moves).toEqual([]);
  expect(off.entries.length, 'the item still opens').toBeGreaterThanOrEqual(1);

  await open(page, 'case=timegrid');
  expect(await page.locator(item('plain')).evaluate((el) => getComputedStyle(el).cursor)).toBe('grab');
  const pinned = page.locator(item('pinned'));
  expect(await pinned.evaluate((el) => getComputedStyle(el).cursor)).not.toBe('grab');
  await (await dragBy(page, pinned, 0, hour)).release();
  expect((await calls(page)).moves).toEqual([]);
});

test('AC7: fewer lanes below the minimum lane width, every label at least four characters, markers kept', async ({ page }) => {
  const report = async () => page.evaluate((prefix) => {
    const probe = document.querySelector(`${prefix}tg-probe`).getBoundingClientRect().width;
    const items = [...document.querySelectorAll(`${prefix}tg-body [data-item-id]`)].map((el) => {
      const text = el.querySelector(`${prefix}entry-text`);
      const title = el.querySelector(`${prefix}title`);
      let fourVisible = true;
      if (text && title?.firstChild) {
        // The first four characters of what the item writes ("HH:M…") must be inside the item.
        const time = el.querySelector(`${prefix}time`).firstChild;
        const range = document.createRange();
        range.setStart(time, 0);
        range.setEnd(time, 4);
        fourVisible = range.getBoundingClientRect().right <= el.getBoundingClientRect().right;
      }
      return { id: el.getAttribute('data-item-id'), width: el.getBoundingClientRect().width, hasText: Boolean(text), fourVisible, marker: el.querySelector(`${prefix}marker`)?.getBoundingClientRect().width ?? null };
    });
    return { probe, items, more: document.querySelector(`${prefix}tg-dayhead[data-date="2026-10-07"] ${prefix}more`)?.textContent ?? null };
  }, P);

  // One wide day column: all four lanes the cap allows, the fifth item behind "+1".
  await open(page, 'case=lanes&view=day', { width: 1280, height: 800 });
  const wide = await report();
  expect(wide.items).toHaveLength(4);
  expect(wide.more).toBe('+1');

  // Seven columns at 1600: about 215 px each, room for two readable lanes but not four.
  await open(page, 'case=lanes', { width: 1600, height: 800 });
  const week = await report();
  const columnWidth = (await box(page.locator(column('2026-10-07')))).width;
  expect(week.items).toHaveLength(Math.min(4, Math.floor(columnWidth / week.probe)));
  expect(week.items.length).toBeLessThan(4);
  expect(week.items.length).toBeGreaterThanOrEqual(2);

  // Narrower still: the count follows the width down, without a reload.
  await page.setViewportSize({ width: 900, height: 800 });
  await expect.poll(async () => (await report()).items.length).toBeLessThan(week.items.length);
  const narrow = await report();
  expect(narrow.items.length).toBeGreaterThanOrEqual(1);
  expect(narrow.more).toBe(`+${5 - narrow.items.length}`);

  for (const state of [wide, week, narrow]) {
    for (const drawn of state.items) {
      expect(drawn.width, `${drawn.id}: a lane is never narrower than the probe`).toBeGreaterThanOrEqual(state.probe - 3);
      expect(drawn.fourVisible, `${drawn.id}: no label under four characters`).toBe(true);
    }
    const flagged = state.items.find((drawn) => drawn.id === 'l0');
    expect(flagged?.marker, 'the marker is drawn').toBeGreaterThan(6);
  }
});

test('AC7: an item too short for a line shows its marker and no text', async ({ page }) => {
  await open(page, 'case=timegrid');
  const quarter = page.locator(item('quarter'));
  await quarter.scrollIntoViewIfNeeded();
  await expect(quarter.locator(`${P}entry-text`)).toHaveCount(0);
  await expect(quarter.locator(`${P}marker`)).toBeVisible();
  await expect(quarter).toHaveAccessibleName(/Cache flush.*Needs sign-off/);
  expect((await box(quarter)).height).toBeGreaterThanOrEqual(12);
});

test('AC8: a 350-event week stays under 3,000 elements and inside the page', async ({ page }) => {
  await open(page, 'case=dense');
  const count = await page.locator('.uix-scheduling-calendar *').count();
  expect(count).toBeLessThan(3000);
  expect(await page.locator(`${P}tg-body [data-item-id]`).count()).toBeGreaterThan(40);
  const scroll = await page.evaluate(() => ({ scroll: document.scrollingElement.scrollWidth, client: document.scrollingElement.clientWidth }));
  expect(scroll.scroll).toBeLessThanOrEqual(scroll.client);
});

test('AC12 / AC17: a day header shows the consumer count, its marker with text and "+N", and names itself', async ({ page }) => {
  await open(page, 'case=timegrid');
  const head = page.locator(`${P}tg-dayhead[data-date="2026-10-07"]`);
  await expect(head).toHaveAccessibleName('Wednesday 7 October 2026, 6 items, 1 needs sign-off');
  await expect(head.locator(`${P}count`)).toHaveText('6');
  await expect(head.locator(`${P}marker-label`)).toBeVisible();
  await expect(head.locator(`${P}date`)).toBeVisible();
  const date = await head.locator(`${P}date`).evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(date.scroll, 'the date is not cut').toBeLessThanOrEqual(date.client);
  const more = head.locator(`${P}more`);
  await expect(more).toHaveText('+2');
  await more.click();
  expect((await calls(page)).more).toEqual(['2026-10-07']);
  await head.locator(`${P}date`).click();
  expect((await calls(page)).dates).toEqual(['2026-10-07']);
});

test('AC13: a window is one named tab stop; only the global one shades the hours; a full strip shows "+N windows"', async ({ page }) => {
  await open(page, 'case=timegrid&caps=1');
  const scoped = page.locator('[data-overlay-id="scoped"]');
  await expect(scoped).toHaveCount(1);
  await expect(scoped).toHaveAccessibleName(/^Hold, Payroll lock, Payroll services, .*6 October 2026 00:00 to .*8 October 2026 00:00$/);
  await expect(scoped).not.toHaveAttribute('title', /.*/);
  await expect(scoped.locator(`${P}window-scope`)).toBeVisible();
  await scoped.focus();
  await page.keyboard.press('Enter');
  expect((await calls(page)).overlays).toEqual(['scoped']);
  const shades = page.locator(`${P}tg-shade`);
  await expect(shades).toHaveCount(1);
  await expect(shades).toHaveAttribute('aria-hidden', 'true');
  // The shade is under the items: a click on an item in a shaded hour still reaches the item.
  const clash = page.locator(item('clash-a'));
  await clash.scrollIntoViewIfNeeded();
  await clash.click({ position: { x: 10, y: 10 } });
  expect((await calls(page)).entries).toEqual(['clash-a']);

  await expect(page.locator(`${P}tg-strip ${P}window`)).toHaveCount(3);
  await expect(page.locator('[data-overlay-id="fourth"]')).toHaveCount(0);
  const more = page.locator(`${P}tg-strip ${P}rowmore`).first();
  await expect(more).toHaveText('+1 windows');
  await more.click();
  expect((await calls(page)).more).toEqual(['2026-10-08']);
});

test('AC14: with the window strip and the top lane full, the first hour row is above the fold at 1280 × 800', async ({ page }) => {
  await open(page, 'case=timegrid&caps=1', { width: 1280, height: 800 });
  await expect(page.locator(`${P}tg-top [data-item-id]`)).toHaveCount(4);
  const lanes = await page.locator(`${P}tg-top [data-item-id]`).evaluateAll((els) => new Set(els.map((el) => Math.round(el.getBoundingClientRect().top))).size);
  expect(lanes, 'the top lane is at its cap of three rows').toBe(3);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const first = await box(page.locator(`${P}tg-gutter [data-hour="00"]`));
  const second = await box(page.locator(`${P}tg-gutter [data-hour="01"]`));
  expect(first.top).toBeGreaterThan(0);
  expect(second.top, 'the whole first hour row is on screen').toBeLessThan(800);
});

test('AC14: at 375 px the week scrolls inside its own container; an empty week keeps seven columns and the note', async ({ page }) => {
  await open(page, 'case=timegrid', { width: 375, height: 812 });
  const page_ = await page.evaluate(() => ({ scroll: document.scrollingElement.scrollWidth, client: document.scrollingElement.clientWidth }));
  expect(page_.scroll, 'no page scroll').toBeLessThanOrEqual(page_.client);
  const grid = await page.locator(`${P}timegrid`).evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(grid.scroll).toBeGreaterThan(grid.client);
  await page.locator(`${P}timegrid`).evaluate((el) => { el.scrollLeft = el.scrollWidth; });
  await expect(page.locator(`${P}tg-dayhead[data-date="2026-10-11"] ${P}date`)).toBeInViewport();
  expect(await page.evaluate(() => window.scrollX)).toBe(0);

  await open(page, 'case=timegrid&empty=1', { width: 375, height: 812 });
  await expect(page.locator(`${P}tg-column`)).toHaveCount(7);
  await expect(page.locator(`${P}timegrid ${P}empty`)).toHaveText('Nothing is scheduled this week.');
});

test('AC18: one now-line, in the column of its day, at its time', async ({ page }) => {
  await open(page, 'case=timegrid');
  const lines = page.locator(`${P}tg-now`);
  await expect(lines).toHaveCount(1);
  const hour = await hourHeight(page);
  const columnBox = await box(page.locator(column('2026-10-08')));
  const line = await box(lines);
  expect(line.left).toBeGreaterThanOrEqual(columnBox.left - 1);
  expect(line.right).toBeLessThanOrEqual(columnBox.right + 1);
  expect(Math.abs(line.top - (columnBox.top + 10.5 * hour)), '10:30').toBeLessThanOrEqual(1);
  await open(page, `case=timegrid&now=${encodeURIComponent('2026-11-01T10:00:00Z')}`);
  await expect(page.locator(`${P}tg-now`)).toHaveCount(0);
});

test('AC5: the head of the hour axis names the zone', async ({ page }) => {
  await open(page, 'case=timegrid');
  await expect(page.locator(`${P}tg-zone`)).toHaveText('Europe/Berlin');
  await expect(page.locator(`${P}tg-zone`)).toBeVisible();
});

for (const query of ['case=timegrid&caps=1', 'case=timegrid&view=day&date=2026-10-25', 'case=lanes']) {
  test(`no serious accessibility violation: ${query}`, async ({ page }) => {
    await open(page, query);
    await settleAnimations(page);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
}
