/* SchedulingTimeline for service lanes in a real browser (HAR-1521, U5): what jsdom cannot measure.
 *   AC1  a collapsed group is one row; its toggle opens it
 *   AC2  three bars, two of them concurrent, take two sub-rows and never cover each other
 *   AC3  one element per window; a window limited to two lanes is painted, and hit, only over
 *        those lanes' rows; a window with no lanes covers every row
 *   AC4  500 lanes in 40 groups: at most 150 row elements while scrolling to the end and while
 *        walking every lane with the arrow keys, inside the timeline and with the page scrolling
 *   AC5  a real drag proposes once, on drop; Shift+Arrow then Enter proposes once; Escape drops;
 *        a refused move leaves the bar; with no onResizeItem Alt+Shift+Arrow does nothing
 *   AC6  a click that travels under 4 px and Enter with nothing pending select; every bar is a
 *        24 × 24 px target
 *   AC8  the notice is above the axis, a column note inside its day column, and an empty range
 *        keeps its axis
 *   AC9  one tab stop for the bars; axe at 1024 and 1440 in both themes, on the harness and on
 *        the docs specimen
 *   AC10 computed colours: the now-line and its label are neutral, only band="high" has the hue
 *   AC11 the docs specimen shows packing, sub-ticks, a collapsed group and a scope-true window
 *   AC15 / AC16 sub-ticks sit inside their day; the repeated hour shows its offset
 * and at 375 px the timeline scrolls inside itself while the page does not.
 * The harness is tests/scheduling-timeline/; logic is in packages/react/src/scheduling-timeline-lanes-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleAnimations } from './settle.mjs';

const HARNESS = '../../tests/scheduling-timeline/harness.html';
const DOCS = 'docs/explorer.html#examples-scheduling-calendar';
const P = '.uix-scheduling-timeline__';
const item = (id) => `[data-item-id="${id}"]`;
const lane = (id) => `${P}row[data-lane-id="${id}"]`;

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
});

const open = async (page, query, viewport = { width: 1280, height: 800 }) => {
  await page.setViewportSize(viewport);
  await page.goto(`${HARNESS}?${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('.uix-scheduling-timeline')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
};
const calls = (page) => page.evaluate(() => window.__timeline);
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; });
const centre = async (locator) => { const b = await box(locator); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
/** A real mouse drag from an element, in steps, by dx. */
const dragBy = async (page, locator, dx) => {
  await locator.scrollIntoViewIfNeeded();
  const from = await centre(locator);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx / 2, from.y + 1, { steps: 4 });
  await page.mouse.move(from.x + dx, from.y, { steps: 4 });
  return { release: () => page.mouse.up() };
};
/** The width of one day on the axis: the distance between the first two day ticks. */
const dayWidth = async (page) => {
  const [first, second] = await page.locator(`${P}row--axis ${P}tick:not([data-minor])`).evaluateAll((els) => els.slice(0, 2).map((el) => el.getBoundingClientRect().left));
  return second - first;
};
const berlin = (date, time) => new Date(`${date}T${time}:00${date >= '2026-03-29' && date < '2026-10-25' ? '+02:00' : '+01:00'}`).toISOString();
const rowCount = (page) => page.locator(`${P}row`).count();
/** Bars that are not the topmost element at their centre or at a corner of the 24 px square around it. */
const uncovered = (page) => page.locator('[data-item-id]').evaluateAll((els) => els.flatMap((el) => {
  const r = el.getBoundingClientRect();
  // A point off the screen, or scrolled out of the timeline, hits nothing: only bars in sight are judged.
  const clip = el.closest('.uix-scheduling-timeline__scroller').getBoundingClientRect();
  const labels = el.closest('.uix-scheduling-timeline__row').querySelector('.uix-scheduling-timeline__lane-label').getBoundingClientRect();
  if (r.top < Math.max(0, clip.top) || r.bottom > Math.min(window.innerHeight, clip.bottom) || r.left < labels.right || r.right > Math.min(window.innerWidth, clip.right)) return [];
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const points = [[cx, cy], [cx - 11, cy - 11], [cx + 11, cy - 11], [cx - 11, cy + 11], [cx + 11, cy + 11]];
  const missed = points.filter(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-item-id]') !== el).length;
  return missed ? [`${el.getAttribute('data-item-id')}: ${missed} of 5 points covered`] : [];
}));
/** Words of a bar title that show on its one line and are cut by its edge. The first word counts. */
const cutWords = (page) => page.locator('[data-item-id] .uix-scheduling-timeline__item-title').evaluateAll((titles) => titles.flatMap((title) => {
  const text = title.firstChild;
  if (!text || text.nodeType !== Node.TEXT_NODE) return [];
  const clip = title.getBoundingClientRect();
  return [...text.data.matchAll(/\S+/g)].flatMap((word) => {
    const range = document.createRange();
    range.setStart(text, word.index);
    range.setEnd(text, word.index + word[0].length);
    const r = range.getBoundingClientRect();
    const onTheLine = r.top < clip.bottom - 1 && r.bottom > clip.top + 1 && r.left < clip.right - 0.5;
    return onTheLine && r.right > clip.right + 0.5 ? [`${text.data}: "${word[0]}"`] : [];
  });
}));
/** Pixels of a screen region that differ from its top-left pixel (or, with `from: 'bottom'`, its
 * bottom-left one) by more than 40 grey levels: what is drawn there. */
const inkIn = async (page, clip, from = 'top') => {
  const shot = (await page.screenshot({ clip, animations: 'disabled' })).toString('base64');
  return page.evaluate(async ([base64, corner]) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const grey = (index) => 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
    const reference = grey(corner === 'bottom' ? (bitmap.height - 1) * bitmap.width * 4 : 0);
    let count = 0;
    for (let index = 0; index < data.length; index += 4) if (Math.abs(grey(index) - reference) > 40) count++;
    return count;
  }, [shot, from]);
};

/** WCAG contrast of two computed colours. */
const contrastOf = (a, b) => {
  const lum = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const axe = async (page, include) => {
  await settleAnimations(page);
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  const { violations } = await (include ? builder.include(include) : builder).analyze();
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};

test('AC1: a collapsed group is one summary row with the consumer count and marker; its toggle opens it', async ({ page }) => {
  await open(page, 'case=lanes');
  const storage = page.locator(`${P}row[data-group-id="storage"]`);
  await expect(storage).toHaveCount(1);
  await expect(storage).toHaveClass(/uix-scheduling-timeline__row--summary/);
  await expect(storage.locator(`${P}group-count`)).toHaveText('Items: 9');
  await expect(storage.locator(`${P}item-marker`)).toBeVisible();
  await expect(storage).toContainText('2 need sign-off');
  await expect(page.locator(lane('store-object'))).toHaveCount(0);
  await expect(page.locator(item('s1'))).toHaveCount(0);
  const toggle = storage.getByRole('button', { name: /Storage/ });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect((await box(toggle)).height, 'a 24 px target').toBeGreaterThanOrEqual(24);
  await toggle.focus();
  await page.keyboard.press('Enter');
  expect((await calls(page)).toggles).toEqual(['storage']);
  await expect(page.locator(lane('store-object'))).toBeVisible();
  await expect(page.locator(item('s1'))).toBeVisible();
  await expect(page.locator(`${P}row--summary`)).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('AC2: three bars with two running together take two sub-rows and never cover each other', async ({ page }) => {
  await open(page, 'case=lanes');
  const [a, b, c] = await Promise.all(['a', 'b', 'c'].map((id) => box(page.locator(item(id)))));
  expect(Math.round(a.top)).toBe(Math.round(c.top));
  expect(b.top).toBeGreaterThanOrEqual(a.bottom);
  expect(c.left).toBeGreaterThanOrEqual(a.right - 0.5);
  const row = await box(page.locator(lane('pay-api')));
  expect(b.bottom).toBeLessThanOrEqual(row.bottom);
  expect(await page.locator(lane('pay-api')).evaluate((el) => el.style.getPropertyValue('--uix-timeline-rows'))).toBe('2');
});

test('AC3: one element per window; the scoped one is painted and hit only over its two lanes, the global one over every row', async ({ page }) => {
  await open(page, 'case=lanes&collapsed=');
  await expect(page.locator(`${P}overlay`)).toHaveCount(2);
  const some = page.locator('[data-overlay-id="some"]');
  const all = page.locator('[data-overlay-id="all"]');
  await expect(some).toHaveCount(1);
  await expect(all).toHaveCount(1);
  expect(await some.evaluate((el) => getComputedStyle(el).clipPath)).toMatch(/^polygon\(/);
  expect(await all.evaluate((el) => getComputedStyle(el).clipPath)).toBe('none');

  const report = await page.evaluate((prefix) => {
    const probe = (overlay, row) => {
      const band = overlay.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      // Three points down the row, in the band's own columns, clear of the bars' column edges.
      return [0.2, 0.5, 0.8].map((f) => document.elementsFromPoint(band.left + band.width * 0.9, r.top + r.height * f).includes(overlay));
    };
    const rows = [...document.querySelectorAll(`${prefix}row[data-lane-id]`)];
    const heads = [...document.querySelectorAll(`${prefix}row[data-group-id]`)];
    const some = document.querySelector('[data-overlay-id="some"]');
    const all = document.querySelector('[data-overlay-id="all"]');
    const body = document.querySelector(`${prefix}body`).getBoundingClientRect();
    return {
      some: Object.fromEntries(rows.map((row) => [row.getAttribute('data-lane-id'), probe(some, row)])),
      all: Object.fromEntries(rows.map((row) => [row.getAttribute('data-lane-id'), probe(all, row)])),
      someOverHeads: heads.map((row) => probe(some, row)).flat(),
      allBox: { top: all.getBoundingClientRect().top - body.top, bottom: body.bottom - all.getBoundingClientRect().bottom },
      firstRow: rows[0].getBoundingClientRect().top - body.top,
    };
  }, P);
  const yes = [true, true, true];
  const no = [false, false, false];
  expect(report.some).toEqual({ 'pay-api': no, 'pay-ledger': yes, 'net-core': no, 'net-edge': yes, 'store-object': no, 'store-backup': no });
  expect(report.all).toEqual({ 'pay-api': yes, 'pay-ledger': yes, 'net-core': yes, 'net-edge': yes, 'store-object': yes, 'store-backup': yes });
  expect(report.someOverHeads.some(Boolean), 'not over a group head').toBe(false);
  expect(Math.abs(report.allBox.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(report.allBox.bottom)).toBeLessThanOrEqual(1);

  // The clip edges are the row edges, to the pixel: the rows' fixed geometry and the clip agree.
  const edges = await page.evaluate((prefix) => {
    const some = document.querySelector('[data-overlay-id="some"]');
    const band = some.getBoundingClientRect();
    const x = band.left + band.width * 0.9;
    const inside = (y) => document.elementsFromPoint(x, y).includes(some);
    return ['pay-ledger', 'net-edge'].map((id) => {
      const r = document.querySelector(`${prefix}row[data-lane-id="${id}"]`).getBoundingClientRect();
      return { id, aboveTop: inside(r.top - 2), belowTop: inside(r.top + 2), aboveBottom: inside(r.bottom - 2), belowBottom: inside(r.bottom + 2) };
    });
  }, P);
  for (const edge of edges) expect(edge, edge.id).toEqual({ id: edge.id, aboveTop: false, belowTop: true, aboveBottom: true, belowBottom: false });

  // Visible words: kind, name and scope; a click in a clear part of the band reaches the consumer.
  // The words are written once in each run of rows, so a bar on one of them does not hide the window's name.
  await expect(some.locator(`${P}overlay-label`)).toHaveCount(2);
  await expect(some.locator(`${P}overlay-kind`).last()).toBeVisible();
  await expect(some.locator(`${P}overlay-name`).last()).toBeVisible();
  await expect(some.locator(`${P}overlay-scope`).last()).toHaveText('2 services');
  const words = await page.evaluate((prefix) => {
    const labels = [...document.querySelectorAll(`[data-overlay-id="some"] ${prefix}overlay-label`)].map((el) => el.getBoundingClientRect());
    const rows = ['pay-ledger', 'net-edge'].map((id) => document.querySelector(`${prefix}row[data-lane-id="${id}"]`).getBoundingClientRect());
    const all = document.querySelector(`[data-overlay-id="all"] ${prefix}overlay-label`).getBoundingClientRect();
    const first = document.querySelector(`${prefix}row[data-lane-id]`).getBoundingClientRect();
    return { inRows: labels.map((label, index) => label.top >= rows[index].top && label.bottom <= rows[index].bottom), allInFirstLane: all.top >= first.top && all.bottom <= first.bottom };
  }, P);
  expect(words.inRows).toEqual([true, true]);
  expect(words.allInFirstLane, 'the words of a window over every row sit on the first lane, not under a group head').toBe(true);
  await expect(some).toHaveAccessibleName(/^Maintenance, Storage network, 2 services, /);
  await expect(some).not.toHaveAttribute('title', /.*/);
  await some.focus();
  await page.keyboard.press('Enter');
  expect((await calls(page)).overlays).toEqual(['some']);
  // A bar inside the window is still the bar: the band sits behind it.
  await page.locator(item('high')).click();
  expect((await calls(page)).items).toEqual(['high']);
});

/** Where one window is hit: over each lane row, and over the head and the strip of each group row. */
const hitsOf = (page, overlayId) => page.evaluate(([prefix, id]) => {
  const overlay = document.querySelector(`[data-overlay-id="${id}"]`);
  const band = overlay.getBoundingClientRect();
  const x = band.left + band.width / 2;
  const hit = (y) => document.elementsFromPoint(x, y).includes(overlay);
  const out = {};
  for (const row of document.querySelectorAll(`${prefix}body > ${prefix}row`)) {
    const r = row.getBoundingClientRect();
    if (row.hasAttribute('data-lane-id')) { out[row.getAttribute('data-lane-id')] = hit(r.top + r.height / 2); continue; }
    const head = row.querySelector(`${prefix}group-head`).getBoundingClientRect();
    const strip = row.querySelector(`${prefix}group-strip`)?.getBoundingClientRect();
    out[`group:${row.getAttribute('data-group-id')}`] = { head: hit(head.top + head.height / 2), strip: strip ? hit(strip.top + strip.height / 2) : null };
  }
  return out;
}, [P, overlayId]);

test('AC3: a window over lanes of a collapsed group is drawn on a strip of the row of that group, where nothing covers it', async ({ page }) => {
  await open(page, 'case=lanes&collapsed=payments');
  // Payments is collapsed and holds one of the two lanes the window names: its row has a strip that carries the window.
  expect(await hitsOf(page, 'some')).toEqual({
    'group:payments': { head: false, strip: true }, 'group:network': { head: false, strip: null }, 'net-core': false, 'net-edge': true,
    'group:storage': { head: false, strip: null }, 'store-object': false, 'store-backup': false,
  });
  // The words of the window are on that strip, and the window is still one focusable, named element.
  const some = page.locator('[data-overlay-id="some"]');
  await expect(some).toHaveCount(1);
  const strip = await box(page.locator(`${P}row[data-group-id="payments"] ${P}group-strip`));
  const words = await box(some.locator(`${P}overlay-label`).first());
  expect(words.top).toBeGreaterThanOrEqual(strip.top);
  expect(words.bottom).toBeLessThanOrEqual(strip.bottom);
  expect(strip.height, 'a strip is a target of full height').toBeGreaterThanOrEqual(24);
  await some.focus();
  await expect(some).toHaveAccessibleName(/^Maintenance, Storage network, 2 services, /);
  await page.keyboard.press('Enter');
  expect((await calls(page)).overlays).toEqual(['some']);
  // The group is still exactly one row.
  await expect(page.locator(`${P}row[data-group-id="payments"]`)).toHaveCount(1);
  // Every lane it names collapsed (payments and network): still drawn, on the two strips.
  await open(page, 'case=lanes&collapsed=payments,network');
  const both = await hitsOf(page, 'some');
  expect([both['group:payments'], both['group:network']]).toEqual([{ head: false, strip: true }, { head: false, strip: true }]);
});

test('AC3: a window on a collapsed group is in sight and clickable at its centre, however long the group label is', async ({ page }) => {
  // The window covers the first day of the first lane; the label of the collapsed group (name, meta,
  // count and two markers) is far wider than the lane column and would lie over that day.
  await open(page, 'case=lanes&collapsed=payments&early=1');
  const early = page.locator('[data-overlay-id="early"]');
  await expect(early).toHaveCount(1);
  const seen = await page.evaluate((prefix) => {
    const overlay = document.querySelector('[data-overlay-id="early"]');
    const row = document.querySelector(`${prefix}row[data-group-id="payments"]`);
    const strip = row.querySelector(`${prefix}group-strip`).getBoundingClientRect();
    const label = row.querySelector(`${prefix}group-label`).getBoundingClientRect();
    const band = overlay.getBoundingClientRect();
    const centre = [band.left + band.width / 2, strip.top + strip.height / 2];
    const corners = [[band.left + 3, strip.top + 3], [band.right - 3, strip.top + 3], [band.left + 3, strip.bottom - 3], [band.right - 3, strip.bottom - 3]];
    return {
      labelOverWindowColumns: label.right > band.left && label.left < band.right,
      labelOverStrip: label.bottom > strip.top + 1,
      top: document.elementFromPoint(...centre)?.closest('[data-overlay-id]')?.getAttribute('data-overlay-id') ?? null,
      corners: corners.map(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-overlay-id]')?.getAttribute('data-overlay-id') ?? null),
      centre,
    };
  }, P);
  expect(seen.labelOverWindowColumns, 'the fixture: the label reaches over the columns of the window').toBe(true);
  expect(seen.labelOverStrip, 'and it does not reach down into the strip').toBe(false);
  expect(seen.top, 'the window is the topmost element at its centre').toBe('early');
  expect(seen.corners).toEqual(['early', 'early', 'early', 'early']);
  await page.mouse.click(seen.centre[0], seen.centre[1]);
  expect((await calls(page)).overlays).toEqual(['early']);
  // The window is painted there: its cross hatch is ink on the strip.
  expect(await inkIn(page, { x: Math.round(seen.centre[0]) - 20, y: Math.round(seen.centre[1]) - 8, width: 40, height: 16 })).toBeGreaterThanOrEqual(20);
  // And the toggle still toggles.
  await page.locator(`${P}row[data-group-id="payments"]`).getByRole('button', { name: /Payments/ }).click();
  expect((await calls(page)).toggles).toEqual(['payments']);
  // A collapsed group no window covers keeps its one line: no strip.
  await open(page, 'case=lanes&collapsed=network&early=1');
  await expect(page.locator(`${P}row[data-group-id="network"] ${P}group-strip`)).toHaveCount(1); // the window over every row covers it
  await open(page, 'case=legacy');
  await expect(page.locator(`${P}group-strip`)).toHaveCount(0);
});

for (const height of ['480px', 'none']) {
  test(`AC4: 500 lanes in 40 groups mount at most 150 row elements, scrolled to the end and walked by keyboard (maxHeight ${height})`, async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, `case=stress&height=${height}`);
    const inside = height !== 'none';
    expect(await rowCount(page)).toBeLessThanOrEqual(150);
    expect(await page.locator('[data-item-id]').count()).toBeLessThanOrEqual(150);
    await expect(page.locator(`${P}scroller`)).toHaveAttribute('data-virtual', /.*/);
    await expect(page.locator(lane('lane-0'))).toBeVisible();
    await expect(page.locator(lane('lane-499'))).toHaveCount(0);
    if (inside) expect((await box(page.locator(`${P}scroller`))).height).toBeLessThanOrEqual(481);

    // Scroll to the end, the way a user does: the last lane and its bar are there.
    const toEnd = () => page.evaluate((prefix) => {
      const scroller = document.querySelector(`${prefix}scroller`);
      if (scroller.scrollHeight > scroller.clientHeight + 1) scroller.scrollTop = scroller.scrollHeight;
      else window.scrollTo(0, document.documentElement.scrollHeight);
    }, P);
    await toEnd();
    await expect(page.locator(lane('lane-499'))).toBeVisible();
    await toEnd(); // the height is exact, so there is nothing more to scroll to
    await expect(page.locator(item('item-499'))).toBeInViewport();
    expect(await rowCount(page)).toBeLessThanOrEqual(150);
    // The last bar takes focus by click and the arrows work from it.
    await page.locator(item('item-499')).click();
    await expect(page.locator(item('item-499'))).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.locator(`${lane('lane-498')} [data-item-id]`).first()).toBeFocused();

    // Every lane by keyboard from the top: Tab lands on one bar, then ArrowDown 499 times.
    await page.evaluate((prefix) => { document.querySelector(`${prefix}scroller`).scrollTop = 0; window.scrollTo(0, 0); }, P);
    await page.keyboard.press('Home');
    await expect(page.locator(`${lane('lane-498')} [data-item-id]`).first()).toBeFocused();
    const walked = await page.evaluate(async (prefix) => {
      const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      const laneOf = () => Number(document.activeElement.closest(`${prefix}row`)?.getAttribute('data-lane-id')?.slice('lane-'.length));
      const press = (key) => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      let most = 0;
      // Up to the first lane, then down through all of them.
      for (let guard = 0; guard < 600 && laneOf() > 0; guard++) { press('ArrowUp'); await frame(); }
      const top = laneOf();
      const seen = new Set([top]);
      for (let guard = 0; guard < 600 && laneOf() < 499; guard++) {
        press('ArrowDown');
        await frame();
        seen.add(laneOf());
        most = Math.max(most, document.querySelectorAll(`${prefix}row`).length);
      }
      const rect = document.activeElement.getBoundingClientRect();
      return { top, seen: seen.size, last: document.activeElement.getAttribute('data-item-id'), most, inViewport: rect.top >= 0 && rect.bottom <= window.innerHeight };
    }, P);
    expect(walked.top).toBe(0);
    expect(walked.seen, 'every lane took focus').toBe(500);
    expect(walked.last).toBe('item-499');
    expect(walked.most).toBeLessThanOrEqual(150);
    expect(walked.inViewport, 'the focused bar was scrolled into view').toBe(true);
    await expect(page.locator(lane('lane-0'))).toHaveCount(0);

    // The windows are still one element each, 500 lanes down.
    await expect(page.locator(`${P}overlay`)).toHaveCount(2);
    const hit = await page.evaluate((prefix) => {
      const some = document.querySelector('[data-overlay-id="some"]');
      const band = some.getBoundingClientRect();
      const over = (id) => { const r = document.querySelector(`${prefix}row[data-lane-id="${id}"]`).getBoundingClientRect(); return document.elementsFromPoint(band.left + band.width * 0.9, r.top + r.height / 2).includes(some); };
      return { 'lane-499': over('lane-499'), 'lane-498': over('lane-498') };
    }, P);
    expect(hit).toEqual({ 'lane-499': true, 'lane-498': false });
  });
}

test('AC4: inside a maxHeight the axis stays in view while the lanes scroll', async ({ page }) => {
  await open(page, 'case=stress&height=480px');
  const scroller = page.locator(`${P}scroller`);
  const before = await box(page.locator(`${P}row--axis`));
  await scroller.evaluate((el) => { el.scrollTop = 4000; });
  // The rows scrolled away are unmounted, all but the lane that holds the tab stop.
  await expect(page.locator(lane('lane-3'))).toHaveCount(0);
  await expect(page.locator(lane('lane-0'))).toHaveCount(1);
  const after = await box(page.locator(`${P}row--axis`));
  expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  // The words of the window over every row followed the scroll: they are on a lane in view, under the axis.
  const words = page.locator(`[data-overlay-id="all"] ${P}overlay-label`);
  await expect(words).toHaveCount(1);
  await expect(words).toBeInViewport();
  expect((await box(words)).top).toBeGreaterThanOrEqual(after.bottom - 1);
});

test('AC5 / AC6: a press that does not travel is a click; a drag proposes once, on drop, and the bar stays', async ({ page }) => {
  await open(page, 'case=lanes');
  const bar = page.locator(item('d'));
  const before = await box(bar);
  const day = await dayWidth(page);
  expect(day).toBeGreaterThan(60);

  const point = await centre(bar);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 2, point.y + 2);
  await page.mouse.up();
  expect((await calls(page)).items).toEqual(['d']);
  expect((await calls(page)).proposals).toEqual([]);

  const drag = await dragBy(page, bar, day);
  await expect(page.locator(`${P}ghost`)).toHaveCount(1);
  expect((await calls(page)).proposals, 'nothing is called while the pointer travels').toEqual([]);
  expect((await box(bar)).left, 'the bar itself does not follow').toBe(before.left);
  const ghost = await box(page.locator(`${P}ghost`));
  expect(Math.abs(ghost.left - (before.left + day))).toBeLessThanOrEqual(2);
  await drag.release();
  const after = await calls(page);
  expect(after.proposals).toEqual([{ id: 'd', start: berlin('2026-10-09', '06:00'), end: berlin('2026-10-10', '06:00'), adjusted: null }]);
  expect(after.items, 'the click that ends a drag is not an activation').toEqual(['d']);
  await expect(page.locator(`${P}ghost`)).toHaveCount(0);
  expect((await box(bar)).left, 'the props did not change, so the bar is where it was').toBe(before.left);

  // Escape during a drag drops it, and letting go over the bar is not a click.
  const second = await dragBy(page, bar, 20);
  await expect(page.locator(`${P}ghost`)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator(`${P}ghost`)).toHaveCount(0);
  await second.release();
  const end = await calls(page);
  expect(end.proposals).toHaveLength(1);
  expect(end.items).toEqual(['d']);
});

test('AC5 / AC6: Enter selects a bar, or confirms its pending move, never both; Escape drops the move', async ({ page }) => {
  await open(page, 'case=lanes');
  const bar = page.locator(item('d'));
  await bar.focus();
  await expect(bar).toHaveAccessibleDescription(/Shift.*Enter confirms.*Escape cancels/);
  await page.keyboard.press('Enter');
  expect((await calls(page)).items).toEqual(['d']);

  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.locator(`${P}ghost`)).toHaveCount(1);
  await expect(page.locator('.uix-scheduling-timeline [role="status"]')).toContainText('Enter confirms');
  expect((await calls(page)).proposals).toEqual([]);
  await page.keyboard.press('Enter');
  const sent = await calls(page);
  expect(sent.proposals).toEqual([{ id: 'd', start: berlin('2026-10-08', '08:00'), end: berlin('2026-10-09', '08:00'), adjusted: null }]);
  expect(sent.items, 'Enter confirmed the move and did not select the bar').toEqual(['d']);
  await expect(page.locator('.uix-scheduling-timeline [role="status"]'), 'the user hears that the move was asked for').toContainText('Requested a move to');
  await expect(page.locator(`${P}ghost`)).toHaveCount(0);
  await expect(bar).toBeFocused();

  await page.keyboard.press('Shift+ArrowLeft');
  await expect(page.locator(`${P}ghost`)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator(`${P}ghost`)).toHaveCount(0);
  await expect(page.locator('.uix-scheduling-timeline [role="status"]')).toHaveText('Move cancelled.');
  await page.keyboard.press('Enter');
  const end = await calls(page);
  expect(end.proposals).toHaveLength(1);
  expect(end.items, 'with nothing pending Enter selects again').toEqual(['d', 'd']);
});

test('AC5: a refused proposal leaves the bar where it was and removes the outline', async ({ page }) => {
  await open(page, 'case=lanes&reject=1');
  const bar = page.locator(item('d'));
  await bar.focus();
  const before = await box(bar);
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Enter');
  expect((await calls(page)).proposals).toHaveLength(1);
  await expect(page.locator(`${P}ghost`)).toHaveCount(0);
  expect((await box(bar)).left).toBe(before.left);
});

test('AC5 (PDR-0013): with no onResizeItem Alt+Shift+Arrow does nothing and no hint offers it; with it the end moves', async ({ page }) => {
  await open(page, 'case=lanes');
  const bar = page.locator(item('d'));
  await bar.focus();
  await page.keyboard.press('Alt+Shift+ArrowRight');
  await page.keyboard.press('Alt+Shift+ArrowLeft');
  await expect(page.locator(`${P}ghost`)).toHaveCount(0);
  await page.keyboard.press('Enter');
  const off = await calls(page);
  expect(off.proposals).toEqual([]);
  expect(off.resizes).toEqual([]);
  expect(off.moves).toEqual([]);
  await expect(page.locator('.uix-scheduling-timeline')).not.toContainText('Alt');

  await open(page, 'case=lanes&move=legacy');
  await page.locator(item('d')).focus();
  await page.keyboard.press('Alt+Shift+ArrowRight');
  expect((await calls(page)).moves, 'the older move prop alone does not resize either').toEqual([]);
  await page.keyboard.press('Shift+ArrowRight');
  expect((await calls(page)).moves).toEqual([{ id: 'd', start: berlin('2026-10-08', '07:00'), end: berlin('2026-10-09', '07:00') }]);
  await expect(page.locator('.uix-scheduling-timeline')).not.toContainText('Alt');

  await open(page, 'case=lanes&resize=1');
  await page.locator(item('d')).focus();
  await page.keyboard.press('Alt+Shift+ArrowRight');
  expect((await calls(page)).resizes).toEqual([{ id: 'd', start: berlin('2026-10-08', '06:00'), end: berlin('2026-10-09', '07:00') }]);
  await expect(page.locator(item('d'))).toHaveAccessibleDescription(/Alt, Shift and an arrow key/);
});

test('AC5: with no move prop there is no grab cursor and no gesture; a pinned bar never moves', async ({ page }) => {
  await open(page, 'case=lanes&move=0');
  const bar = page.locator(item('d'));
  expect(await bar.evaluate((el) => getComputedStyle(el).cursor)).not.toBe('grab');
  await expect(page.locator('.uix-scheduling-timeline [aria-describedby]')).toHaveCount(0);
  await (await dragBy(page, bar, 120)).release();
  await bar.focus();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.locator(`${P}ghost`)).toHaveCount(0);
  expect((await calls(page)).proposals).toEqual([]);

  await open(page, 'case=lanes');
  expect(await page.locator(item('d')).evaluate((el) => getComputedStyle(el).cursor)).toBe('grab');
  const pinned = page.locator(item('pinned'));
  expect(await pinned.evaluate((el) => getComputedStyle(el).cursor)).not.toBe('grab');
  await (await dragBy(page, pinned, 120)).release();
  expect((await calls(page)).proposals).toEqual([]);
});

test('AC6: every bar is at least a 24 × 24 px target, a zero-length one included, and its text is cut at a word', async ({ page }) => {
  await open(page, 'case=lanes&collapsed=');
  const bars = await page.locator('[data-item-id]').evaluateAll((els) => els.map((el) => {
    const r = el.getBoundingClientRect();
    const title = el.querySelector('.uix-scheduling-timeline__item-title');
    const t = title.getBoundingClientRect();
    return { id: el.getAttribute('data-item-id'), width: r.width, height: r.height, lines: Math.round(t.height / parseFloat(getComputedStyle(title).lineHeight)), titleInside: t.right <= r.right + 0.5 };
  }));
  expect(bars.length).toBe(10);
  for (const bar of bars) {
    expect(bar.width, `${bar.id} width`).toBeGreaterThanOrEqual(24);
    expect(bar.height, `${bar.id} height`).toBeGreaterThanOrEqual(24);
    expect(bar.lines, `${bar.id}: one line of text`).toBeLessThanOrEqual(1);
    expect(bar.titleInside, `${bar.id}: the text box stays inside the bar`).toBe(true);
  }
  expect(await uncovered(page), 'every bar is hit at its centre and at the corners of a 24 px square around it').toEqual([]);
  await expect(page.locator(item('point'))).toHaveAttribute('data-item-id', 'point');
  await expect(page.locator(item('a'))).toContainText('08:00 Schema update');
  expect(await cutWords(page)).toEqual([]);
});

test('AC6: short bars drawn at the minimum width do not cover each other, and no word is cut, the first included', async ({ page }) => {
  await open(page, 'case=short');
  const rows = await page.locator('[data-item-id^="s"]').evaluateAll((els) => els.map((el) => [el.getAttribute('data-item-id'), el.closest('li').style.getPropertyValue('--uix-timeline-row'), Math.round(el.getBoundingClientRect().width)]));
  expect(rows.map(([, , width]) => width), 'each is drawn at the minimum width').toEqual([24, 24, 24, 24]);
  expect(rows[1][1], 'the second starts inside the drawn box of the first: a sub-row of its own').not.toBe(rows[0][1]);
  expect(new Set(rows.map(([, row]) => row)).size).toBeGreaterThanOrEqual(3);
  expect(await uncovered(page)).toEqual([]);
  // A click in the middle of each selects that bar and no other.
  for (const id of ['s1', 's2', 's3', 's4']) await page.locator(item(id)).click();
  expect((await calls(page)).items).toEqual(['s1', 's2', 's3', 's4']);
  await expect(page.locator('[data-conflict]')).toHaveCount(0);
  // "Firewall rule update for the gateway" in a bar narrower than its first word shows no part of a word;
  // in a wide bar it shows whole words; "Internationalisation" is whole or not there.
  expect(await cutWords(page)).toEqual([]);
  const shown = await page.locator('[data-item-id^="w"] .uix-scheduling-timeline__item-title').evaluateAll((titles) => titles.map((title) => {
    const text = title.firstChild;
    const clip = title.getBoundingClientRect();
    return [...text.data.matchAll(/\S+/g)].filter((word) => { const range = document.createRange(); range.setStart(text, word.index); range.setEnd(text, word.index + word[0].length); const r = range.getBoundingClientRect(); return r.top < clip.bottom - 1 && r.bottom > clip.top + 1 && r.right <= clip.right + 0.5; }).map((word) => word[0]).join(' ');
  }));
  expect(shown[0], 'the first word does not fit: nothing rather than half of it').toBe('');
  expect(shown[1]).toMatch(/^Firewall rule( update)?( for)?$/);
  expect(['', 'Internationalisation']).toContain(shown[2]);
  // The whole title is still the name and the tooltip.
  await expect(page.locator(item('w1'))).toHaveAccessibleName(/^Firewall rule update for the gateway, /);
  await expect(page.locator(item('w1'))).toHaveAttribute('title', 'Firewall rule update for the gateway');
});

test('AC8: the notice is above the axis, the column note inside its day column, and an empty range keeps its axis and note', async ({ page }) => {
  await open(page, 'case=lanes');
  const notice = page.locator(`${P}notice`);
  await expect(notice).toHaveText('Showing 500 of 512 items. Narrow the filters to see the rest.');
  const axis = await box(page.locator(`${P}row--axis`));
  expect((await box(notice)).bottom).toBeLessThanOrEqual(axis.top);
  const note = page.locator(`${P}column-note[data-date="2026-10-08"]`);
  await expect(note).toBeVisible();
  const noteBox = await box(note);
  const ticks = await page.locator(`${P}row--axis ${P}tick:not([data-minor])`).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
  expect(noteBox.left).toBeGreaterThanOrEqual(ticks[3] - 1);
  expect(noteBox.right).toBeLessThanOrEqual(ticks[4] + 1);
  expect(noteBox.top).toBeGreaterThanOrEqual(axis.bottom - 1);
  const button = note.getByRole('button', { name: '12 not shown' });
  await expect(button).toBeVisible();
  expect((await box(button)).right, 'the consumer control fits its column').toBeLessThanOrEqual(noteBox.right + 1);

  await open(page, 'case=empty');
  await expect(page.locator(`${P}row--axis ${P}tick:not([data-minor])`)).toHaveCount(8);
  await expect(page.locator(`${P}row[data-lane-id]`)).toHaveCount(3);
  await expect(page.locator(`${P}empty`)).toHaveText('Nothing is scheduled this week.');
});

test('AC9: the bars are one tab stop; Tab goes through the windows and group toggles, arrows through the bars', async ({ page }) => {
  await open(page, 'case=lanes');
  const stops = await page.locator('[data-item-id]').evaluateAll((els) => els.filter((el) => el.tabIndex === 0).map((el) => el.getAttribute('data-item-id')));
  expect(stops).toEqual(['a']);
  await page.locator(item('a')).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(item('b'))).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(item('c'))).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator(item('high'))).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator(item('d'))).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.locator(item('d'))).toBeFocused();
  // The focus ring is not cut off by the row.
  const ring = await page.locator(item('d')).evaluate((el) => { const s = getComputedStyle(el); return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }; });
  expect(ring.style).not.toBe('none');
  expect(ring.width).toBeGreaterThanOrEqual(2);
});

for (const width of [1024, 1440]) {
  for (const query of ['case=lanes', 'case=lanes&collapsed=&flag=1&resize=1', 'case=legacy', 'case=hour', 'case=empty']) {
    test(`AC9: no serious accessibility violation at ${width} px: ${query}`, async ({ page }) => {
      await open(page, query, { width, height: 800 });
      expect(await axe(page)).toEqual([]);
    });
  }
  test(`AC9: no serious accessibility violation on the docs specimen at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(DOCS, { waitUntil: 'networkidle' });
    const specimen = page.locator('.uix-docs__page .uix-scheduling-timeline');
    await expect(specimen).toBeVisible();
    await specimen.scrollIntoViewIfNeeded();
    expect(await axe(page, '.uix-docs__page .uix-scheduling-timeline')).toEqual([]);
  });
}

test('AC9: no serious accessibility violation on the virtualised timeline', async ({ page }) => {
  await open(page, 'case=stress');
  expect(await axe(page)).toEqual([]);
});

test('AC10: the now-line and its label are neutral; only band="high" carries the hue; windows and state carry none', async ({ page }) => {
  await open(page, 'case=lanes&collapsed=');
  const colours = await page.evaluate((prefix) => {
    const token = (name) => { const probe = document.createElement('span'); probe.style.color = `var(${name})`; document.querySelector('.uix-scheduling-timeline').append(probe); const value = getComputedStyle(probe).color; probe.remove(); return value; };
    const style = (selector) => getComputedStyle(document.querySelector(selector));
    const chroma = (rgb) => { const [r, g, b] = rgb.match(/[\d.]+/g).map(Number); return Math.max(r, g, b) - Math.min(r, g, b); };
    const bars = [...document.querySelectorAll('[data-item-id]')].map((el) => ({ id: el.getAttribute('data-item-id'), band: el.getAttribute('data-band'), background: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopColor }));
    return {
      danger: token('--uix-danger'), text: token('--uix-text'),
      now: style(`${prefix}now`).backgroundColor, nowLabel: style(`${prefix}now-label`).backgroundColor, nowLabelText: style(`${prefix}now-label`).color,
      bars: bars.map((bar) => ({ ...bar, chroma: chroma(bar.background) })),
      overlays: [...document.querySelectorAll(`${prefix}overlay`)].map((el) => chroma(getComputedStyle(el).backgroundColor)),
      nowChroma: chroma(style(`${prefix}now`).backgroundColor),
    };
  }, P);
  expect(colours.now).toBe(colours.text);
  expect(colours.nowLabel).toBe(colours.text);
  expect(colours.now).not.toBe(colours.danger);
  expect(colours.nowLabelText).not.toBe(colours.nowLabel);
  const high = colours.bars.filter((bar) => bar.band === 'high');
  expect(high.map((bar) => bar.id)).toEqual(['high']);
  expect(high[0].background).toBe(colours.danger);
  for (const bar of colours.bars.filter((b) => b.band !== 'high')) expect(bar.chroma, `${bar.id} is untinted`).toBeLessThanOrEqual(12);
  for (const value of colours.overlays) expect(value).toBeLessThanOrEqual(12);
  expect(colours.nowChroma).toBeLessThanOrEqual(12);

  // The older props: states and kinds draw, and none of them is tinted any more.
  await open(page, 'case=legacy');
  const legacy = await page.evaluate((prefix) => {
    const chroma = (rgb) => { const [r, g, b] = rgb.match(/[\d.]+/g).map(Number); return Math.max(r, g, b) - Math.min(r, g, b); };
    return {
      bars: [...document.querySelectorAll('[data-item-id]')].map((el) => [el.getAttribute('data-state'), chroma(getComputedStyle(el).backgroundColor), chroma(getComputedStyle(el).borderLeftColor)]),
      overlays: [...document.querySelectorAll(`${prefix}overlay`)].map((el) => [el.getAttribute('data-kind'), chroma(getComputedStyle(el).backgroundColor)]),
      marker: chroma(getComputedStyle(document.querySelector(`${prefix}marker`)).borderLeftColor),
    };
  }, P);
  expect(legacy.bars.map(([state]) => state)).toEqual(['scheduled', 'conflicted', 'in-progress', 'blackout-violation']);
  for (const [state, background, border] of legacy.bars) { expect(background, `${state} background`).toBeLessThanOrEqual(12); expect(border, `${state} border`).toBeLessThanOrEqual(12); }
  expect(legacy.overlays.map(([kind]) => kind)).toEqual(['freeze', 'maintenance']);
  for (const [kind, background] of legacy.overlays) expect(background, kind).toBeLessThanOrEqual(12);
  expect(legacy.marker).toBeLessThanOrEqual(12);
});

test('AC10: band="high" fill is 3:1 on the row and its text 4.5:1 on the fill', async ({ page }) => {
  await open(page, 'case=lanes');
  const ratio = await page.locator(item('high')).evaluate((el) => {
    const parse = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
    const fill = parse(getComputedStyle(el).backgroundColor);
    const surface = parse(getComputedStyle(document.querySelector('.uix-scheduling-timeline__scroller')).backgroundColor);
    return { onRow: contrast(fill, surface), text: contrast(parse(getComputedStyle(el).color), fill) };
  });
  expect(ratio.onRow).toBeGreaterThanOrEqual(3);
  expect(ratio.text).toBeGreaterThanOrEqual(4.5);
});

test('AC11: the docs specimen shows lane packing, the axis with sub-ticks, a collapsed group and a scope-true window', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(DOCS, { waitUntil: 'networkidle' });
  const specimen = page.locator('.uix-docs__page .uix-scheduling-timeline');
  await expect(specimen).toHaveCount(1);
  await specimen.scrollIntoViewIfNeeded();
  await expect(page.locator('.uix-docs__page h3[data-timeline-specimen]')).toBeVisible();
  // Packing: a lane with two or more sub-rows whose bars do not cover each other.
  const packed = await specimen.locator(`${P}row[data-lane-id]`).evaluateAll((rows) => rows.map((row) => {
    const bars = [...row.querySelectorAll('[data-item-id]')].map((el) => el.getBoundingClientRect());
    const covering = bars.some((a, i) => bars.some((b, j) => i < j && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5));
    return { rows: Number(row.style.getPropertyValue('--uix-timeline-rows')), tops: new Set(bars.map((b) => Math.round(b.top))).size, covering };
  }));
  expect(packed.some((row) => row.rows >= 2 && row.tops >= 2)).toBe(true);
  expect(packed.some((row) => row.covering)).toBe(false);
  // The axis: day ticks with their label, and three labelled sub-ticks between two of them.
  const days = specimen.locator(`${P}row--axis ${P}tick:not([data-minor])`);
  expect(await days.count()).toBeGreaterThanOrEqual(7);
  await expect(specimen.locator(`${P}row--axis ${P}tick[data-minor]`).first()).toBeVisible();
  const first = await specimen.locator(`${P}row--axis ${P}tick`).evaluateAll((els) => els.map((el) => ({ minor: el.hasAttribute('data-minor'), left: el.getBoundingClientRect().left, text: el.textContent })).sort((a, b) => a.left - b.left).slice(0, 5));
  expect(first.map((tick) => tick.minor)).toEqual([false, true, true, true, false]);
  expect(first.slice(1, 4).map((tick) => tick.text)).toEqual(['06', '12', '18']);
  // A collapsed group, one row, with the consumer count.
  await expect(specimen.locator(`${P}row--summary`)).toHaveCount(1);
  await expect(specimen.locator(`${P}row--summary ${P}group-count`)).toBeVisible();
  await expect(specimen.locator(`${P}row--summary button`)).toHaveAttribute('aria-expanded', 'false');
  // A window limited to some lanes, painted only over them; and each window once.
  const windows = await specimen.locator(`${P}overlay`).evaluateAll((els, prefix) => els.map((el) => {
    const band = el.getBoundingClientRect();
    const rows = [...el.closest('.uix-scheduling-timeline').querySelectorAll(`${prefix}row[data-lane-id]`)];
    // Painted where the clip lets it: compare the clip polygon's vertical runs with each row.
    const clip = getComputedStyle(el).clipPath;
    const ys = clip === 'none' ? null : [...clip.matchAll(/([\d.]+)px(?=\s*(?:,|\)))/g)].map((m) => Number(m[1]));
    const runs = ys ? ys.reduce((list, y, i) => (i % 4 === 0 ? [...list, [y, ys[i + 2]]] : list), []) : [[0, band.height]];
    const covered = rows.filter((row) => { const r = row.getBoundingClientRect(); const mid = r.top + r.height / 2 - band.top; return runs.some(([from, to]) => mid > from && mid < to); }).map((row) => row.getAttribute('data-lane-id'));
    return { id: el.getAttribute('data-overlay-id'), scope: el.getAttribute('data-scope'), pattern: el.getAttribute('data-pattern'), covered, rows: rows.length, kind: el.querySelector(`${prefix}overlay-kind`)?.textContent ?? '', name: el.querySelector(`${prefix}overlay-name`)?.textContent ?? '' };
  }), P);
  expect(new Set(windows.map((w) => w.id)).size).toBe(windows.length);
  const scoped = windows.filter((w) => w.scope === 'lanes');
  const global = windows.filter((w) => w.scope === 'all');
  expect(scoped.length).toBeGreaterThanOrEqual(1);
  expect(global.length).toBeGreaterThanOrEqual(1);
  for (const w of scoped) { expect(w.covered.length).toBeGreaterThanOrEqual(1); expect(w.covered.length).toBeLessThan(w.rows); }
  for (const w of global) expect(w.covered.length).toBe(w.rows);
  for (const w of windows) { expect(w.pattern).toMatch(/diagonal|cross|dotted|solid/); expect(w.kind.length).toBeGreaterThan(2); expect(w.name.length).toBeGreaterThan(2); }
  // The specimen fits the page: it scrolls inside itself.
  const scroll = await page.evaluate(() => ({ scroll: document.scrollingElement.scrollWidth, client: document.scrollingElement.clientWidth }));
  expect(scroll.scroll).toBeLessThanOrEqual(scroll.client);
});

test('AC15: each day shows three sub-ticks inside its column, in order, with a grid line each', async ({ page }) => {
  await open(page, 'case=lanes');
  const ticks = await page.locator(`${P}row--axis ${P}tick`).evaluateAll((els) => els.map((el) => ({ minor: el.hasAttribute('data-minor'), left: el.getBoundingClientRect().left, text: el.textContent.trim() })).sort((a, b) => a.left - b.left));
  const days = ticks.filter((tick) => !tick.minor);
  expect(days).toHaveLength(8);
  expect(ticks.filter((tick) => tick.minor)).toHaveLength(21);
  const width = days[1].left - days[0].left;
  for (let index = 0; index < 7; index++) {
    const inDay = ticks.filter((tick) => tick.minor && tick.left > days[index].left && tick.left < days[index + 1].left);
    expect(inDay.map((tick) => tick.text)).toEqual(['06', '12', '18']);
    inDay.forEach((tick, n) => expect(Math.abs(tick.left - (days[index].left + (width * (n + 1)) / 4))).toBeLessThanOrEqual(1));
  }
  await expect(page.locator(`${P}gridline[data-minor]`)).toHaveCount(21);
  // The sub-tick labels do not run into the day labels.
  const labels = await page.locator(`${P}row--axis ${P}tick-label`).evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0).sort((a, b) => a.left - b.left).map((r) => [r.left, r.right, r.top, r.bottom]));
  for (let index = 1; index < labels.length; index++) {
    const [, right, top, bottom] = labels[index - 1];
    const [left, , nextTop, nextBottom] = labels[index];
    const sameLine = top < nextBottom - 1 && nextTop < bottom - 1;
    if (sameLine) expect(left, `label ${index} starts after label ${index - 1} ends`).toBeGreaterThanOrEqual(right - 0.5);
  }
});

test('AC16: the hour axis of the 25-hour day shows "02" twice, each with its offset, and the 03:00 bar sits under "03"', async ({ page }) => {
  await open(page, 'case=hour');
  const labels = page.locator(`${P}row--axis ${P}tick-label`);
  await expect(labels).toHaveCount(25);
  const twos = labels.filter({ hasText: /^02/ });
  await expect(twos).toHaveCount(2);
  await expect(twos.nth(0).locator(`${P}tick-offset`)).toHaveText('+02:00');
  await expect(twos.nth(1).locator(`${P}tick-offset`)).toHaveText('+01:00');
  await expect(twos.nth(1).locator(`${P}tick-offset`)).toBeVisible();
  const three = await box(page.locator(`${P}row--axis ${P}tick`).filter({ hasText: /^03/ }));
  const bar = await box(page.locator(item('h1')));
  expect(Math.abs(bar.left - three.left)).toBeLessThanOrEqual(1);
});

test('at 375 px the timeline scrolls inside its own container and the page does not', async ({ page }) => {
  await open(page, 'case=lanes', { width: 375, height: 812 });
  const doc = await page.evaluate(() => ({ scroll: document.scrollingElement.scrollWidth, client: document.scrollingElement.clientWidth }));
  expect(doc.scroll, 'no page scroll').toBeLessThanOrEqual(doc.client);
  const scroller = page.locator(`${P}scroller`);
  const inner = await scroller.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(inner.scroll).toBeGreaterThan(inner.client);
  await scroller.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
  await expect(page.locator(item('late'))).toBeInViewport();
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
  // The lane names stay put while the axis scrolls.
  const label = await box(page.locator(`${lane('pay-api')} ${P}lane-label`));
  const frame = await box(scroller);
  expect(Math.abs(label.left - frame.left)).toBeLessThanOrEqual(2);
});

test('what an existing consumer passes renders and still moves on every key press and every drop', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await open(page, 'case=legacy');
  await expect(page.locator('[data-item-id]')).toHaveCount(4);
  await expect(page.locator(`${P}overlay`)).toHaveCount(2);
  await expect(page.locator('[data-overlay-id="db"]')).toBeVisible();
  // The lane window is over its lane only.
  const lanes = await page.evaluate((prefix) => { const band = document.querySelector('[data-overlay-id="db"]').getBoundingClientRect(); return [...document.querySelectorAll(`${prefix}row[data-lane-id]`)].filter((row) => { const r = row.getBoundingClientRect(); return band.top < r.bottom - 1 && band.bottom > r.top + 1; }).map((row) => row.getAttribute('data-lane-id')); }, P);
  expect(lanes).toEqual(['pay-ledger']);
  const bar = page.locator(item('c'));
  await bar.focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  expect((await calls(page)).moves).toEqual([
    { id: 'c', start: berlin('2026-10-08', '09:00'), end: berlin('2026-10-09', '01:00') },
    { id: 'c', start: berlin('2026-10-08', '09:00'), end: berlin('2026-10-09', '01:00') },
  ]);
  const day = await dayWidth(page);
  await (await dragBy(page, bar, day)).release();
  const after = await calls(page);
  expect(after.moves).toHaveLength(3);
  expect(after.moves[2]).toEqual({ id: 'c', start: berlin('2026-10-09', '08:00'), end: berlin('2026-10-10', '00:00') });
  expect(after.items, 'the click that ends the drag selects nothing').toEqual([]);
  expect(errors).toEqual([]);
});

/* ── Review of PR 111 ────────────────────────────────────────────────────────────────────── */

const inViewport = (page) => page.evaluate((prefix) => {
  const rows = [...document.querySelectorAll(`${prefix}body > ${prefix}row[data-lane-id]`)];
  const seen = rows.filter((row) => { const r = row.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; });
  return { mounted: rows.length, inView: seen.length, first: seen[0]?.getAttribute('data-lane-id') ?? null };
}, P);
const pageTo = async (page, y) => { await page.evaluate((top) => window.scrollTo(0, top), y); await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(y); };

test('AC4: 200 plain lanes with the page scrolling still follow the scroll after loading, after an error and a retry, and when mounted loading', async ({ page }) => {
  // What an existing consumer passes: no groups, no windows, no maxHeight. Virtualisation is on by default.
  await open(page, 'case=stress&groups=0');
  await expect(page.locator(`${P}scroller`)).toHaveAttribute('data-virtual', /.*/);
  await pageTo(page, 5000);
  await expect.poll(async () => (await inViewport(page)).inView, 'before any reload').toBeGreaterThan(8);

  await pageTo(page, 0);
  await page.evaluate(() => window.__timelineState({ loading: true }));
  await expect(page.locator(`${P}scroller`)).toHaveCount(0);
  await page.evaluate(() => window.__timelineState({}));
  await expect(page.locator(lane('lane-0'))).toBeVisible();
  await pageTo(page, 5000);
  await expect.poll(async () => (await inViewport(page)).inView, 'after loading: rows in the viewport, not a blank page').toBeGreaterThan(8);
  expect((await inViewport(page)).mounted).toBeLessThanOrEqual(150);

  await pageTo(page, 0);
  await page.evaluate(() => window.__timelineState({ error: 'Could not load.' }));
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator(lane('lane-0'))).toBeVisible();
  await pageTo(page, 5000);
  await expect.poll(async () => (await inViewport(page)).inView, 'after an error and a retry').toBeGreaterThan(8);

  await open(page, 'case=stress&groups=0&state=loading');
  await expect(page.locator(`${P}scroller`)).toHaveCount(0);
  await page.evaluate(() => window.__timelineState({}));
  await expect(page.locator(lane('lane-0'))).toBeVisible();
  await pageTo(page, 5000);
  await expect.poll(async () => (await inViewport(page)).inView, 'mounted while loading').toBeGreaterThan(8);
  // The keyboard still walks the lanes and brings each into view.
  await pageTo(page, 0);
  await page.locator(item('item-0')).focus();
  for (let step = 0; step < 30; step++) await page.keyboard.press('ArrowDown');
  await expect(page.locator(`${lane('lane-30')} [data-item-id]`).first()).toBeFocused();
  await expect(page.locator(`${lane('lane-30')} [data-item-id]`).first()).toBeInViewport();
});

test('AC4: inside a maxHeight the timeline follows its own scroll after a loading cycle', async ({ page }) => {
  await open(page, 'case=stress&height=480px');
  await page.evaluate(() => window.__timelineState({ loading: true }));
  await page.evaluate(() => window.__timelineState({}));
  await expect(page.locator(lane('lane-0'))).toBeVisible();
  await page.locator(`${P}scroller`).evaluate((el) => { el.scrollTop = 6000; });
  await expect(page.locator(lane('lane-3'))).toHaveCount(0);
  const seen = await page.evaluate((prefix) => { const s = document.querySelector(`${prefix}scroller`).getBoundingClientRect(); return [...document.querySelectorAll(`${prefix}body > ${prefix}row`)].filter((row) => { const r = row.getBoundingClientRect(); return r.bottom > s.top && r.top < s.bottom; }).length; }, P);
  expect(seen).toBeGreaterThan(5);
});

test('AC4: a focused group toggle keeps its row and its focus when it scrolls out of the window', async ({ page }) => {
  await open(page, 'case=stress&height=480px');
  const toggle = page.locator(`${P}row[data-group-id="group-0"]`).getByRole('button');
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await page.locator(`${P}scroller`).evaluate((el) => { el.scrollTop = 12000; });
  await expect(page.locator(lane('lane-3'))).toHaveCount(0);
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toBeFocused();
  expect(await rowCount(page)).toBeLessThanOrEqual(150);
  // Enter on it still toggles the group it names (this timeline opens and closes its groups itself).
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

for (const mode of ['normal colours', 'forced colours']) {
  test(`AC9 / AC10: the high band, a marker shape, the now-line and the hatch of a window are drawn in ${mode}`, async ({ page }) => {
    if (mode === 'forced colours') await page.emulateMedia({ forcedColors: 'active' });
    await open(page, 'case=short');
    // The high band against no band: in forced colours a fill is stripped, so the edge carries it.
    const edges = await Promise.all(['b1', 'b4', 'b2'].map((id) => page.locator(item(id)).evaluate((el) => { const st = getComputedStyle(el); return [st.borderTopWidth, st.borderTopStyle, st.borderBottomWidth, st.borderBottomStyle].join(' '); })));
    if (mode === 'forced colours') {
      expect(edges[0], 'the high band is a heavier edge than no band').toBe('3px solid 3px solid');
      expect(edges[1]).toBe('1px solid 1px solid');
      expect(edges[2], 'done on the high band is not the committed high band').not.toBe(edges[0]);
    }
    // A marker shape is painted, not an empty box.
    const glyph = await box(page.locator(`${item('b3')} ${P}item-marker`));
    expect(glyph.width).toBeGreaterThan(6);
    expect(await inkIn(page, { x: Math.floor(glyph.left) - 2, y: Math.floor(glyph.top) - 2, width: Math.ceil(glyph.width) + 4, height: Math.ceil(glyph.height) + 4 }), 'the marker shape').toBeGreaterThanOrEqual(15);
    // The now-line is a line on an empty lane (the first lane has no bar under it).
    const now = await box(page.locator(`${P}now`));
    const lane0 = await box(page.locator(`${lane('pay-api')} ${P}track`));
    expect(await inkIn(page, { x: Math.round(now.left) - 5, y: Math.round(lane0.bottom) - 14, width: 12, height: 10 }), 'the now-line').toBeGreaterThanOrEqual(10);
    // And its word is readable: dark and light pixels both, on its patch.
    const word = await box(page.locator(`${P}now-label`));
    expect(await inkIn(page, { x: Math.round(word.left), y: Math.round(word.top), width: Math.round(word.width), height: Math.round(word.height) }), 'the word on the now-line').toBeGreaterThanOrEqual(20);
    // A window keeps its hatch and its edge.
    const band = await box(page.locator('[data-overlay-id="hatch"]'));
    expect(await inkIn(page, { x: Math.round(band.left + band.width / 2), y: Math.round(lane0.top) + 6, width: 40, height: 30 }), 'the hatch of the window').toBeGreaterThanOrEqual(40);
    // The hatch of a bar that shares time (the plain case, where the flag is on by default), past the end of its text.
    await open(page, 'case=legacy');
    const hatched = await box(page.locator(item('a')));
    expect(await inkIn(page, { x: Math.round(hatched.right) - 34, y: Math.round(hatched.top) + 4, width: 28, height: Math.round(hatched.height) - 8 }), 'the hatch of a bar that shares time').toBeGreaterThanOrEqual(20);
  });
}

test('AC10: the outline of a pending move reads at 3:1 against the row and against a bar under it, the high band included', async ({ page }) => {
  await open(page, 'case=short');
  // b1 is a high-band bar: two steps to the right and the outline lies mostly over the bar itself.
  const fill = await box(page.locator(item('b1')));
  // The top 8 px of the bar where the outline will be, counted against the fill 7 px down: nothing yet.
  const topEdge = { x: Math.round(fill.left) + 30, y: Math.round(fill.top), width: 60, height: 8 };
  expect(await inkIn(page, topEdge, 'bottom'), 'calibration: without an outline the top of the bar is fill').toBe(0);
  await page.locator(item('b1')).focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  const ghost = page.locator(`${P}ghost`);
  await expect(ghost).toHaveCount(1);
  const seen = await ghost.evaluate((el) => {
    const edge = getComputedStyle(el);
    const halo = getComputedStyle(el, '::after');
    const outer = getComputedStyle(el, '::before');
    const bar = document.querySelector('[data-item-id="b1"]');
    return {
      opacity: edge.opacity, edge: edge.borderTopColor, width: parseFloat(edge.borderTopWidth), style: edge.borderTopStyle,
      halo: halo.borderTopColor, haloWidth: parseFloat(halo.borderTopWidth), haloStyle: halo.borderTopStyle, outer: outer.borderTopColor, outerStyle: outer.borderTopStyle,
      row: getComputedStyle(document.querySelector('.uix-scheduling-timeline__scroller')).backgroundColor, high: getComputedStyle(bar).backgroundColor,
      overBar: (() => { const g = el.getBoundingClientRect(); const b = bar.getBoundingClientRect(); return Math.round(Math.min(g.right, b.right) - Math.max(g.left, b.left)); })(),
    };
  });
  expect(seen.opacity).toBe('1');
  expect(seen.overBar, 'the fixture: most of the outline is over the bar').toBeGreaterThan(60);
  expect(contrastOf(seen.edge, seen.row), 'the edge against the row').toBeGreaterThanOrEqual(3);
  // Over a bar the edge has a second tone beside it: one of the two is 3:1 against any fill.
  expect(seen.haloStyle).toBe('solid');
  expect(seen.outerStyle).toBe('solid');
  expect(seen.haloWidth).toBeGreaterThanOrEqual(1);
  expect(Math.max(contrastOf(seen.edge, seen.high), contrastOf(seen.halo, seen.high)), 'against the high band').toBeGreaterThanOrEqual(3);
  expect(Math.max(contrastOf(seen.edge, seen.row), contrastOf(seen.halo, seen.row))).toBeGreaterThanOrEqual(3);
  // And it is painted: along the top edge of the bar, where the outline now runs, pixels stand out from the fill.
  const g = await box(ghost);
  expect(g.left).toBeLessThan(topEdge.x);
  expect(Math.round(g.top)).toBe(Math.round(fill.top));
  expect(await inkIn(page, topEdge, 'bottom'), 'the top edge of the outline over the high bar').toBeGreaterThanOrEqual(60);
});

test('AC10: done on the high band is told apart from committed by a line that can be seen, and the bar keeps its height', async ({ page }) => {
  await open(page, 'case=short');
  const high = await box(page.locator(item('b1')));
  const done = await box(page.locator(item('b2')));
  expect(Math.round(done.height)).toBe(Math.round(high.height));
  // The last few pixel rows of each bar, under the text and clear of the rounded corners: committed is plain fill, done has a line in it.
  const lower = (b) => ({ x: Math.round(b.left) + 12, y: Math.round(b.bottom) - 7, width: Math.round(b.width) - 24, height: 6 });
  expect(await inkIn(page, lower(high)), 'committed: nothing but fill').toBe(0);
  expect(await inkIn(page, lower(done)), 'done: a line').toBeGreaterThanOrEqual(Math.round(done.width) - 30);
  // The line is inside the fill: the last pixel row of the bar is still the fill, not the colour of the row.
  const fills = await page.evaluate(() => ['b1', 'b2'].map((id) => getComputedStyle(document.querySelector(`[data-item-id="${id}"]`)).backgroundColor));
  expect(fills[1]).toBe(fills[0]);
  const below = { x: Math.round(done.left) + 20, y: Math.round(done.bottom) - 1, width: 20, height: 3 };
  expect(await inkIn(page, below), 'the bottom edge of the bar is where the fill ends').toBeGreaterThanOrEqual(20);
  const sameEdge = { x: Math.round(high.left) + 20, y: Math.round(high.bottom) - 1, width: 20, height: 3 };
  expect(await inkIn(page, sameEdge)).toBe(await inkIn(page, below));
});

test('AC9: in forced colours a done bar is a box, a solid window is filled in, and the sub-tick lines are drawn', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page, 'case=short');
  const edges = await page.locator(item('b2')).evaluate((el) => { const st = getComputedStyle(el); return [st.borderTopStyle, st.borderLeftStyle, st.borderRightStyle, st.borderBottomStyle]; });
  expect(edges.slice(0, 3)).toEqual(['solid', 'solid', 'solid']);
  expect(edges[3], 'its bottom edge is the cue that it is done').not.toBe('solid');
  const flat = await box(page.locator('[data-overlay-id="flat"]'));
  const lane0 = await box(page.locator(`${lane('pay-api')} ${P}track`));
  expect(await inkIn(page, { x: Math.round(flat.left) + 30, y: Math.round(lane0.bottom) - 30, width: 40, height: 26 }), 'a solid window has a fill of its own').toBeGreaterThanOrEqual(20);
  const minor = await box(page.locator(`${P}gridline[data-minor]`).first());
  expect(await inkIn(page, { x: Math.round(minor.left) - 4, y: Math.round(lane0.top) + 4, width: 9, height: 24 }), 'a sub-tick line').toBeGreaterThanOrEqual(6);
});

test('F1: whether a timeline is virtual or has fixed rows does not move with its width', async ({ page }) => {
  test.setTimeout(120_000);
  // 60 plain lanes with a one-hour bar every two hours: the narrower the track, the more sub-rows a lane needs.
  const state = () => page.evaluate((prefix) => {
    const root = document.querySelector('.uix-scheduling-timeline');
    const rows = [...document.querySelectorAll(`${prefix}body > ${prefix}row[data-lane-id]`)];
    const name = rows[0].querySelector(`${prefix}lane-name`);
    return { fixed: root.hasAttribute('data-fixed'), virtual: document.querySelector(`${prefix}scroller`).hasAttribute('data-virtual'), lanes: rows.length, subRows: Number(rows[0].style.getPropertyValue('--uix-timeline-rows')), wraps: getComputedStyle(name).whiteSpace !== 'nowrap' };
  }, P);
  await open(page, 'case=dense', { width: 1280, height: 900 });
  const wide = await state();
  expect(wide).toMatchObject({ fixed: false, virtual: false, lanes: 60, wraps: true });
  await page.setViewportSize({ width: 800, height: 900 });
  await expect.poll(async () => (await state()).subRows, 'narrower: more sub-rows for the same bars').toBeGreaterThan(wide.subRows);
  const narrow = await state();
  expect(narrow.subRows * 60, 'the fixture: by sub-rows this is past the default threshold').toBeGreaterThan(150);
  expect(narrow).toMatchObject({ fixed: false, virtual: false, lanes: 60, wraps: true });
  expect(await uncovered(page)).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect.poll(async () => (await state()).subRows).toBe(wide.subRows);
  expect(await state()).toEqual(wide);
  // The threshold counts what the consumer passes: 151 lanes are virtual at any width, 150 are not.
  for (const [count, virtual] of [[150, false], [151, true]]) {
    for (const width of [1280, 800]) {
      await open(page, `case=dense&lanes=${count}&bars=12`, { width, height: 900 });
      expect((await state()).virtual, `${count} lanes at ${width} px`).toBe(virtual);
    }
  }
});

for (const count of [60, 200]) {
  test(`F1: a resize that changes the packing keeps the first lane in view where it was (${count} lanes)`, async ({ page }) => {
    await open(page, `case=dense&lanes=${count}`, { width: 1280, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 3000));
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(3000);
    const first = () => page.evaluate((prefix) => {
      const rows = [...document.querySelectorAll(`${prefix}body > ${prefix}row[data-lane-id]`)];
      // The first lane in view: the one the top edge of the viewport cuts, or the first below it.
      const row = rows.find((el) => el.getBoundingClientRect().bottom > 1);
      return row ? { id: row.getAttribute('data-lane-id'), top: Math.round(row.getBoundingClientRect().top), subRows: Number(row.style.getPropertyValue('--uix-timeline-rows')) } : { id: null, top: 0, subRows: 0 };
    }, P);
    await expect.poll(async () => (await first()).id).not.toBe('lane-0');
    const before = await first();
    await page.setViewportSize({ width: 800, height: 900 });
    await expect.poll(async () => (await first()).subRows, 'the packing changed').toBeGreaterThan(before.subRows);
    await expect.poll(async () => (await first()).id, 'the same lane is first in view').toBe(before.id);
    expect(Math.abs((await first()).top - before.top)).toBeLessThanOrEqual(2);
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect.poll(async () => (await first()).subRows).toBe(before.subRows);
    await expect.poll(async () => (await first()).id).toBe(before.id);
    expect(Math.abs((await first()).top - before.top)).toBeLessThanOrEqual(2);
  });
}

test('F1: after tickWidth changes no frame shows bars covering each other', async ({ page }) => {
  await open(page, 'case=dense&lanes=12&tick=14rem', { width: 1280, height: 900 });
  expect(await uncovered(page)).toEqual([]);
  // Watch from inside the page: at the first frame in which the track has its new width, the bars must already be packed for it.
  const covered = await page.evaluate((prefix) => new Promise((resolve) => {
    const track = document.querySelector(`${prefix}layer > ${prefix}track`);
    const before = track.getBoundingClientRect().width;
    const pairs = () => {
      let count = 0;
      for (const list of document.querySelectorAll(`${prefix}items`)) {
        const boxes = [...list.querySelectorAll('[data-item-id]')].map((el) => el.getBoundingClientRect());
        for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
          if (boxes[a].left < boxes[b].right - 0.5 && boxes[b].left < boxes[a].right - 0.5 && boxes[a].top < boxes[b].bottom - 0.5 && boxes[b].top < boxes[a].bottom - 0.5) count++;
        }
      }
      return count;
    };
    let frames = 0;
    const watch = () => {
      frames++;
      if (Math.abs(document.querySelector(`${prefix}layer > ${prefix}track`).getBoundingClientRect().width - before) > 1) { resolve({ frames, pairs: pairs() }); return; }
      if (frames > 120) { resolve({ frames, pairs: -1 }); return; }
      requestAnimationFrame(watch);
    };
    window.__timelineTick('4rem');
    requestAnimationFrame(watch);
  }), P);
  expect(covered.pairs, `seen after ${covered.frames} frame(s)`).toBe(0);
});

test('F8: a viewport taller than 146 rows is filled, not left blank', async ({ page }) => {
  await open(page, 'case=stress&groups=0', { width: 1280, height: 9000 });
  await expect(page.locator(`${P}scroller`)).toHaveAttribute('data-virtual', /.*/);
  const filled = await page.evaluate((prefix) => {
    const rows = [...document.querySelectorAll(`${prefix}body > ${prefix}row[data-lane-id]`)];
    const last = rows[rows.length - 1].getBoundingClientRect();
    return { rows: rows.length, lastBottom: Math.round(last.bottom), viewport: window.innerHeight };
  }, P);
  expect(filled.lastBottom, `${filled.rows} rows mounted`).toBeGreaterThanOrEqual(filled.viewport);
  expect(filled.rows).toBeLessThan(200);
});

