/* SchedulingCalendar in a real browser (HAR-1506, U2): what jsdom cannot measure.
 *   AC2  every month cell has one height, before and after "+N"; nothing expands in place
 *   AC6  six overlapping windows change no cell height and cover no chip
 *   AC7  a window is reached by keyboard, named, and activated with Enter
 *   AC12 band="high": fill ≥ 3:1 on the cell, text ≥ 4.5:1 on the fill, both themes;
 *        bands, statuses, patterns and marker shapes differ in greyscale and in forced colours
 *   AC13 tentative, done and dead are three treatments, and tentative is not dead
 *   AC14 Enter on a chip and on a span activates it
 *   AC15 at 375 px the grid scrolls inside itself, the page does not; a day number activates
 *   AC16 an empty month still draws every day cell, with the note
 * and, on the docs page, the operator's review points (HAR-1506 comment, 2026-10-07): chips
 * read "HH:MM title" with at least six title characters at 1024 and 1440, stay inside their
 * cell, and at most a quarter of the items are filled.
 * The harness is tests/scheduling-calendar/; behaviour is in packages/react/src/scheduling-calendar-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleAnimations } from './settle.mjs';

const HARNESS = '../../tests/scheduling-calendar/harness.html';
const DOCS = 'docs/explorer.html#examples-scheduling-calendar';
const DAY = '.uix-scheduling-calendar__day';
const cell = (date) => `${DAY}:has([data-calendar-date="${date}"])`;

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
});

const open = async (page, query, viewport = { width: 1280, height: 900 }) => {
  await page.setViewportSize(viewport);
  await page.goto(`${HARNESS}?${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('.uix-scheduling-calendar')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
};
const calls = (page) => page.evaluate(() => window.__calendar);
const heights = (page) => page.locator(DAY).evaluateAll((cells) => cells.map((el) => Math.round(el.getBoundingClientRect().height * 10) / 10));
const spread = (values) => Math.max(...values) - Math.min(...values);
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; });
const overlap = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;

test('AC2: every month cell has the same height, and "+N" hands the day over without expanding it', async ({ page }) => {
  await open(page, 'case=controlled');
  const before = await heights(page);
  expect(before).toHaveLength(42);
  expect(spread(before), JSON.stringify(before)).toBeLessThanOrEqual(1);

  const busy = page.locator(cell('2026-10-07'));
  await expect(busy.locator('.uix-scheduling-calendar__entry')).toHaveCount(3);
  const more = busy.locator('.uix-scheduling-calendar__more');
  await expect(more).toHaveText('+47 more');
  // The picks and the "+N" are inside the cell, not clipped by its fixed height.
  const cellBox = await box(busy);
  for (const part of [...await busy.locator('.uix-scheduling-calendar__entry').all(), more]) {
    const partBox = await box(part);
    expect(partBox.bottom, 'inside the cell').toBeLessThanOrEqual(cellBox.bottom);
    expect(partBox.height).toBeGreaterThan(10);
  }
  await more.click();
  expect((await calls(page)).more).toEqual(['2026-10-07']);
  await expect(busy.locator('.uix-scheduling-calendar__entry')).toHaveCount(3);
  await expect(page.locator('.uix-scheduling-calendar__grid [aria-expanded], .uix-scheduling-calendar__grid [data-expanded]')).toHaveCount(0);
  expect(await heights(page)).toEqual(before);
});

test('AC3: a day with a count and no chip shows the count, its marker and "+N"', async ({ page }) => {
  await open(page, 'case=controlled');
  const day = page.locator(cell('2026-10-08'));
  await expect(day.locator('.uix-scheduling-calendar__entry')).toHaveCount(0);
  await expect(day.locator('.uix-scheduling-calendar__count > [aria-hidden]')).toHaveText('7');
  await expect(day.locator('.uix-scheduling-calendar__count')).toContainText('7 items, 2 need review');
  const marker = await box(day.locator('.uix-scheduling-calendar__marker'));
  expect(marker.width).toBeGreaterThan(6);
  await expect(day.locator('.uix-scheduling-calendar__more')).toHaveText('+7 more');
  await expect(day.locator('.uix-scheduling-calendar__more')).toBeVisible();
});

test('AC6: six overlapping windows change no cell height, take no chip slot and are visible on the busy day', async ({ page }) => {
  await open(page, 'case=controlled');
  const without = await heights(page);
  await open(page, 'case=controlled&windows=6');
  const withWindows = await heights(page);
  expect(withWindows).toEqual(without);

  const busy = page.locator(cell('2026-10-07'));
  await expect(busy.locator('.uix-scheduling-calendar__entry')).toHaveCount(3);
  const windows = page.locator('.uix-scheduling-calendar__window');
  await expect(windows).toHaveCount(2);
  const rowMore = page.locator('.uix-scheduling-calendar__rowmore');
  await expect(rowMore).toHaveText('+4');
  const cellBox = await box(busy);
  const chips = await Promise.all((await busy.locator('.uix-scheduling-calendar__entry, .uix-scheduling-calendar__more, .uix-scheduling-calendar__dayhead').all()).map(box));
  const span = await box(page.locator('[data-item-id="span3"]'));
  for (const drawn of await windows.all()) {
    await expect(drawn).toBeVisible();
    const windowBox = await box(drawn);
    expect(windowBox.top, 'drawn in the busy day row').toBeGreaterThanOrEqual(cellBox.top);
    expect(windowBox.bottom).toBeLessThanOrEqual(cellBox.bottom);
    expect(windowBox.left).toBeLessThanOrEqual(cellBox.left + 8);
    expect(windowBox.right).toBeGreaterThanOrEqual(cellBox.right - 8);
    for (const chip of [...chips, span]) expect(overlap(windowBox, chip), 'a window covers no chip, span or day head').toBe(false);
    await expect(drawn.locator('.uix-scheduling-calendar__window-name')).toBeVisible();
  }
  await rowMore.click();
  expect((await calls(page)).more).toEqual(['2026-10-05']);
});

test('AC7: a window is a button with a full name, visible words and no title, and Enter activates it', async ({ page }) => {
  await open(page, 'case=encodings');
  const scoped = page.locator('[data-overlay-id="scoped"]');
  await expect(scoped).toHaveAccessibleName(/^Hold, Payroll lock, Payroll services, .*29 October 2026 07:00 to .*30 October 2026 19:00$/);
  await expect(scoped).not.toHaveAttribute('title', /.*/);
  for (const part of ['kind', 'name', 'scope']) {
    const words = scoped.locator(`.uix-scheduling-calendar__window-${part}`);
    await expect(words).toBeVisible();
    expect((await box(words)).width, `${part} is drawn`).toBeGreaterThan(12);
  }
  await expect(scoped).not.toHaveAttribute('data-global', /.*/);
  const global = page.locator('[data-overlay-id="global"]');
  await expect(global).toHaveAttribute('data-global', 'true');
  const edge = (locator) => locator.evaluate((el) => getComputedStyle(el).borderTopWidth);
  expect(await edge(scoped), 'a scoped window never gets the global treatment').not.toBe(await edge(global));

  await scoped.focus();
  await expect(scoped).toBeFocused();
  await page.keyboard.press('Enter');
  expect((await calls(page)).overlays).toEqual(['scoped']);
});

test('AC14 / AC15: Enter activates a chip and a span; Space activates a day number, and Enter goes into the day (HAR-1527)', async ({ page }) => {
  await open(page, 'case=controlled');
  await page.locator('[data-item-id="b0"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-item-id="span3"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-calendar-date="2026-10-14"]').focus();
  // Enter on a day with items moves into them (the keyboard model of HAR-1527) and selects nothing.
  await page.keyboard.press('Enter');
  expect((await calls(page)).dates).toEqual([]);
  expect(await page.evaluate(() => document.activeElement.hasAttribute('data-calendar-date'))).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-calendar-date="2026-10-14"]')).toBeFocused();
  await page.keyboard.press('Space');
  const seen = await calls(page);
  expect(seen.entries).toEqual(['b0', 'span3']);
  expect(seen.dates).toEqual(['2026-10-14']);
  await expect(page.locator('[data-item-id="span3"]')).toHaveCount(1);
});

/** Each matched element's text colour against what is painted behind it, and that backdrop
 * against the first opaque colour under it. Colours go through a canvas, so color-mix() and
 * alpha resolve to sRGB. */
const contrasts = (page, selector) => page.locator(selector).evaluateAll((els) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const rgba = (css) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const backdrop = (el) => {
    const layers = [];
    for (let node = el; node; node = node.parentElement) {
      const bg = rgba(getComputedStyle(node).backgroundColor);
      if (bg.a > 0) layers.push(bg);
      if (bg.a >= 1) break;
    }
    return layers.reverse().reduce((under, top) => over(top, under), { r: 255, g: 255, b: 255, a: 1 });
  };
  const lum = ({ r, g, b }) => {
    const ch = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  };
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100; };
  return els.map((el) => {
    const bg = backdrop(el);
    const item = el.closest('[data-item-id]') ?? el;
    return {
      id: item.getAttribute('data-item-id') ?? el.className,
      text: ratio(over(rgba(getComputedStyle(el).color), bg), bg),
      fill: item.parentElement ? ratio(backdrop(item), backdrop(item.parentElement)) : null,
    };
  });
});

test('AC12: the high band fill is 3:1 on the cell and every item text is 4.5:1 on what it sits on', async ({ page }) => {
  await open(page, 'case=encodings');
  const texts = await contrasts(page, '.uix-scheduling-calendar__entry .uix-scheduling-calendar__entry-text, .uix-scheduling-calendar__window-name');
  expect(texts.length).toBeGreaterThanOrEqual(15);
  expect(texts.filter((t) => t.text < 4.5), JSON.stringify(texts)).toEqual([]);
  const high = texts.filter((t) => /^(band-high|high-)/.test(t.id));
  expect(high.map((t) => t.id)).toEqual(['band-high', 'high-tentative', 'high-done']);
  expect(high.filter((t) => t.fill < 3), JSON.stringify(high)).toEqual([]);
  // The fill is a real fill: the untinted bands sit on the cell colour.
  const plain = texts.filter((t) => /^band-(none|low|medium)$/.test(t.id));
  expect(plain.map((t) => t.fill)).toEqual([1, 1, 1]);
});

/** How many pixels of two screenshots differ by more than `step` grey levels, over the area
 * both cover (an element at a fractional offset can come out one pixel wider). The step is the
 * difference between the kit's default border and the surface it sits on, less a margin: a cue
 * weaker than a hairline border does not count. */
const differingPixels = (page, a, b, step = 24) => page.evaluate(async ([first, second, threshold]) => {
  const pixels = async (base64) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    return { width: bitmap.width, height: bitmap.height, data: ctx.getImageData(0, 0, bitmap.width, bitmap.height).data };
  };
  const [one, two] = [await pixels(first), await pixels(second)];
  if (Math.abs(one.width - two.width) > 1 || Math.abs(one.height - two.height) > 1) return -1;
  const grey = ({ data, width }, x, y) => { const i = (y * width + x) * 4; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; };
  let count = 0;
  for (let y = 0; y < Math.min(one.height, two.height); y++) {
    for (let x = 0; x < Math.min(one.width, two.width); x++) if (Math.abs(grey(one, x, y) - grey(two, x, y)) > threshold) count++;
  }
  return count;
}, [a, b, step]);
const pairs = (items) => items.flatMap((first, index) => items.slice(index + 1).map((second) => [first, second]));

for (const mode of ['greyscale', 'forced-colours']) {
  test(`AC12 / AC13: bands, statuses, patterns and marker shapes stay apart in ${mode}`, async ({ page }) => {
    if (mode === 'forced-colours') await page.emulateMedia({ forcedColors: 'active' });
    await open(page, 'case=encodings');
    if (mode === 'greyscale') await page.addStyleTag({ content: 'html { filter: grayscale(1); }' });
    const shot = async (selector) => (await page.locator(selector).first().screenshot({ animations: 'disabled' })).toString('base64');
    const swatch = (id) => `[data-legend-id="${id}"] .uix-scheduling-calendar__swatch`;
    const groups = {
      // `low` and `none` are both untinted by design, so `low` is not in the list.
      band: ['none', 'medium', 'high'].map((band) => [`band ${band}`, swatch(`band-${band}`)]),
      status: ['tentative', 'committed', 'live', 'done', 'dead'].map((status) => [`status ${status}`, swatch(`status-${status}`)]),
      pattern: ['diagonal', 'cross', 'dotted', 'solid'].map((pattern) => [`pattern ${pattern}`, swatch(`pattern-${pattern}`)]),
      marker: ['refused', 'warning', 'neutral'].map((emphasis) => [`marker ${emphasis}`, `[data-item-id="marker-${emphasis}"] .uix-scheduling-calendar__marker`]),
    };
    const same = [];
    for (const [group, members] of Object.entries(groups)) {
      const shots = new Map();
      for (const [name, selector] of members) shots.set(name, await shot(selector));
      for (const [[first], [second]] of pairs(members)) {
        const differing = await differingPixels(page, shots.get(first), shots.get(second));
        if (differing < 8) same.push(`${group}: ${first} and ${second} differ in ${differing} pixel(s)`);
      }
    }
    expect(same).toEqual([]);
    // The comparison can tell equal from different: the two untinted bands are the same picture.
    expect(await differingPixels(page, await shot(swatch('band-none')), await shot(swatch('band-low')))).toBe(0);
  });
}

test('AC13: tentative is dashed at full weight, dead is dotted and struck through, done is dimmed', async ({ page }) => {
  await open(page, 'case=encodings');
  const style = (id) => page.locator(`[data-item-id="status-${id}"]`).evaluate((el) => {
    const item = getComputedStyle(el);
    const text = getComputedStyle(el.querySelector('.uix-scheduling-calendar__entry-text'));
    const title = getComputedStyle(el.querySelector('.uix-scheduling-calendar__title'));
    return { border: item.borderTopStyle, strike: text.textDecorationLine, weight: title.fontWeight, color: item.color };
  });
  const [committed, tentative, done, dead] = await Promise.all(['committed', 'tentative', 'done', 'dead'].map(style));
  expect(tentative.border).toBe('dashed');
  expect(tentative.weight, 'tentative keeps the full text weight').toBe(committed.weight);
  expect(tentative.color).toBe(committed.color);
  expect(dead.border).toBe('dotted');
  expect(dead.strike).toBe('line-through');
  expect(tentative.strike).toBe('none');
  expect(done.border).toBe('none');
  expect(done.color).not.toBe(committed.color);
  expect(done.strike).toBe('none');
  // On the filled band the fill hides dimming, so each status keeps a line the fill cannot hide.
  const onFill = (id) => page.locator(`[data-item-id="${id}"]`).evaluate((el) => {
    const item = getComputedStyle(el);
    return { fill: item.backgroundColor, top: item.borderTopStyle, bottom: item.borderBottomStyle, rule: item.borderBottomColor };
  });
  const [high, highDone, highTentative] = await Promise.all(['band-high', 'high-done', 'high-tentative'].map(onFill));
  expect(highDone.fill).toBe(high.fill);
  expect(high.rule, 'a committed high item has no visible rule').toBe(high.fill);
  expect([highDone.top, highDone.bottom]).toEqual(['none', 'solid']);
  expect(highDone.rule, 'done on the fill shows a rule in the text colour').not.toBe(highDone.fill);
  expect(highTentative.top).toBe('dashed');
  expect(highTentative.rule).not.toBe(highTentative.fill);
});

test('AC15: at 375 px the month scrolls inside its own container and the page does not', async ({ page }) => {
  await open(page, 'case=controlled&windows=3', { width: 375, height: 812 });
  const page_ = await page.evaluate(() => ({ scroll: document.scrollingElement.scrollWidth, client: document.scrollingElement.clientWidth }));
  expect(page_.scroll, 'no page scroll').toBeLessThanOrEqual(page_.client);
  const grid = await page.locator('.uix-scheduling-calendar__grid').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, overflow: getComputedStyle(el).overflowX }));
  expect(grid.scroll).toBeGreaterThan(grid.client);
  expect(grid.overflow).toBe('auto');
  // Scrolling the grid reaches the last column; the page still does not move.
  await page.locator('.uix-scheduling-calendar__grid').evaluate((el) => { el.scrollLeft = el.scrollWidth; });
  await expect(page.locator('[data-calendar-date="2026-10-11"]')).toBeInViewport();
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
});

test('AC16: an empty month draws every day cell and the note, readable at 375 px', async ({ page }) => {
  await open(page, 'case=empty', { width: 375, height: 812 });
  await expect(page.locator(DAY)).toHaveCount(42);
  const note = page.locator('.uix-scheduling-calendar__grid .uix-scheduling-calendar__empty');
  await expect(note).toHaveText('Nothing is scheduled this month.');
  await note.scrollIntoViewIfNeeded();
  await expect(note).toBeInViewport();
});

for (const query of ['case=controlled&windows=3', 'case=encodings', 'case=empty']) {
  test(`no serious accessibility violation: ${query}`, async ({ page }) => {
    await open(page, query);
    await settleAnimations(page);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
}

for (const width of [1024, 1440]) {
  test(`docs: every chip reads "HH:MM title" with six title characters and stays in its cell at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(DOCS, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const specimens = page.locator('.uix-docs__page .uix-scheduling-calendar');
    await expect(specimens.first()).toBeVisible();
    const report = await specimens.evaluateAll((roots) => roots.flatMap((root) => [...root.querySelectorAll('.uix-scheduling-calendar__day .uix-scheduling-calendar__entry')]
      .filter((chip) => chip.getClientRects().length > 0)
      .map((chip) => {
        const text = chip.querySelector('.uix-scheduling-calendar__entry-text');
        const title = chip.querySelector('.uix-scheduling-calendar__title');
        const clip = text.getBoundingClientRect();
        const range = document.createRange();
        range.setStart(title.firstChild, 0);
        range.setEnd(title.firstChild, Math.min(6, title.firstChild.length));
        const six = range.getBoundingClientRect();
        const cellBox = chip.closest('.uix-scheduling-calendar__day').getBoundingClientRect();
        const chipBox = chip.getBoundingClientRect();
        return {
          text: chip.textContent.trim(),
          startsWithTime: /^([01]\d|2[0-3]):[0-5]\d /.test(chip.textContent),
          sixVisible: title.firstChild.length < 6 || six.right <= clip.right + 0.5,
          inCell: chipBox.left >= cellBox.left - 0.5 && chipBox.right <= cellBox.right + 0.5,
        };
      })));
    expect(report.length).toBeGreaterThanOrEqual(12);
    expect(report.filter((chip) => !chip.startsWithTime || !chip.sixVisible || !chip.inCell)).toEqual([]);
  });
}

test('docs: no state-tinted copy, at most a quarter of the items filled, windows hatched and labelled', async ({ page }) => {
  await page.goto(DOCS, { waitUntil: 'networkidle' });
  const specimens = page.locator('.uix-docs__page .uix-scheduling-calendar');
  await expect(specimens.first()).toBeVisible();
  const words = (await specimens.allTextContents()).join(' ');
  expect(words).not.toMatch(/violation|conflicted/i);
  const items = await specimens.locator('[data-item-id]').evaluateAll((els) => els.map((el) => el.getAttribute('data-band')));
  expect(items.length).toBeGreaterThanOrEqual(20);
  expect(items.filter((band) => band === 'high').length / items.length).toBeLessThanOrEqual(0.25);
  const windows = await specimens.locator('.uix-scheduling-calendar__window').evaluateAll((els) => els.filter((el) => el.getClientRects().length > 0).map((el) => ({
    pattern: el.getAttribute('data-pattern'),
    name: el.querySelector('.uix-scheduling-calendar__window-name')?.textContent ?? '',
    title: el.getAttribute('title'),
  })));
  expect(windows.length).toBeGreaterThanOrEqual(4);
  expect(windows.filter((w) => !w.pattern || !w.name || w.title !== null)).toEqual([]);
});
