/* The keyboard model of SchedulingCalendar and item emphasis in a real browser (HAR-1527, U6).
 *   AC1  from the control before the grid, day 15 of a 50-per-day month is one Tab and arrows
 *   AC3  axe passes on Month, Week (time grid), Day and Agenda, light and dark, 1024 and 1440
 *   AC4  Enter goes into a day's items, the arrow keys move between them, Escape goes back
 *   AC5  Enter on a day goes in; Enter on an item selects, or confirms a pending move
 *   AC6  emphasis is weight and quietness: dimmed text still passes contrast, no new hue
 * The harness is tests/scheduling-calendar/; logic is in packages/react/src/scheduling-keyboard-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleAnimations } from './settle.mjs';

const HARNESS = '../../tests/scheduling-calendar/harness.html';
const DOCS = 'docs/explorer.html#examples-scheduling-calendar';
const P = '.uix-scheduling-calendar__';
const item = (id) => `[data-item-id="${id}"]`;
const day = (date) => `[data-calendar-date="${date}"]`;

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
const focusedIn = (page, selector) => page.evaluate((sel) => Boolean(document.activeElement?.closest(sel)), selector);

test('AC1: from the control before the grid, day 15 of a 50-per-day month is one Tab press and two arrows', async ({ page }) => {
  await open(page, 'case=keyboard');
  await expect(page.locator(`${P}grid button`).first()).toBeVisible();
  expect(await page.locator(`${P}grid button`).count(), 'the grid holds well over a hundred controls').toBeGreaterThan(150);
  // The last control of the header is the element before the grid.
  await page.getByRole('button', { name: 'Agenda' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator(day('2026-10-07'))).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(day('2026-10-15'))).toBeFocused();
  // The grid is one tab stop: the next Tab leaves it, and Shift+Tab comes back to the same day.
  await page.keyboard.press('Tab');
  expect(await focusedIn(page, `${P}grid`)).toBe(false);
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator(day('2026-10-15'))).toBeFocused();
});

test('AC4 / AC5 (month): Enter goes into the day, arrows move between its items, Enter selects, Escape goes back', async ({ page }) => {
  await open(page, 'case=keyboard');
  await page.locator(day('2026-10-15')).focus();
  await page.keyboard.press('Enter');
  // The window and the three-day bar cover the 15th; then its three chips and its "+N".
  await expect(page.locator('[data-overlay-id="hold"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator(item('bar'))).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator(item('d15-0'))).toBeFocused();
  expect((await calls(page)).dates, 'Enter on the day did not activate the day number').toEqual([]);
  await page.keyboard.press('Enter');
  expect((await calls(page)).entries).toEqual(['d15-0']);
  await page.keyboard.press('End');
  await expect(page.locator(`${P}day:has(${day('2026-10-15')}) ${P}more`)).toBeFocused();
  await page.keyboard.press('Enter');
  expect((await calls(page)).more).toEqual(['2026-10-15']);
  await page.keyboard.press('Escape');
  await expect(page.locator(day('2026-10-15'))).toBeFocused();
  // Space on the day number activates it, as before.
  await page.keyboard.press('Space');
  expect((await calls(page)).dates).toEqual(['2026-10-15']);
});

test('AC4 / AC5 (time grid): one tab stop on a day head; Enter goes in; Enter selects or confirms a pending move', async ({ page }) => {
  await open(page, 'case=timegrid');
  await page.getByRole('button', { name: 'Agenda' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator(`${P}tg-dayhead ${day('2026-10-05')}`)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(`${P}tg-dayhead ${day('2026-10-07')}`)).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await focusedIn(page, `${P}timegrid`), 'the time grid is one tab stop').toBe(false);
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator(`${P}tg-dayhead ${day('2026-10-07')}`)).toBeFocused();

  await page.keyboard.press('Enter');
  // Wednesday: two windows over it, the top-lane span, then the items of the column by start.
  await expect(page.locator('[data-overlay-id="scoped"]')).toBeFocused();
  for (const expected of ['[data-overlay-id="third"]', item('long'), item('plain')]) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(expected).first()).toBeFocused();
  }
  await page.keyboard.press('Enter');
  expect((await calls(page)).entries).toEqual(['plain']);
  await page.keyboard.press('Shift+ArrowDown');
  await expect(page.locator(`${P}tg-ghost`)).toHaveCount(1);
  await page.keyboard.press('Enter');
  const sent = await calls(page);
  expect(sent.moves).toHaveLength(1);
  expect(sent.entries, 'Enter confirmed the move; it did not select again').toEqual(['plain']);
  await page.keyboard.press('Escape');
  await expect(page.locator(`${P}tg-dayhead ${day('2026-10-07')}`)).toBeFocused();
});

test('AC4 (agenda): one tab stop; the arrow keys walk the window note, the rows and "open day"', async ({ page }) => {
  await open(page, 'case=agenda');
  await page.getByRole('button', { name: 'Agenda' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-overlay-id="payroll"]')).toBeFocused();
  for (const expected of [item('a1'), item('a2'), item('a3'), `${P}agenda-more`, item('a4'), item('a5')]) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(expected)).toBeFocused();
  }
  await page.keyboard.press('Enter');
  expect((await calls(page)).entries).toEqual(['a5']);
  await page.keyboard.press('Tab');
  expect(await focusedIn(page, `${P}agenda`), 'the agenda is one tab stop').toBe(false);
});

for (const view of ['month', 'week', 'agenda']) {
  test(`AC6: highlighted and dimmed items in the ${view} keep readable text and add no hue`, async ({ page }) => {
    await open(page, `case=emphasis&view=${view}`);
    const report = await page.locator('[data-item-id]').evaluateAll((els) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const rgba = (css) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data; return { r, g, b, a: a / 255 }; };
      const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
      const backdrop = (el) => { const layers = []; for (let node = el; node; node = node.parentElement) { const bg = rgba(getComputedStyle(node).backgroundColor); if (bg.a > 0) layers.push(bg); if (bg.a >= 1) break; } return layers.reverse().reduce((under, top) => over(top, under), { r: 255, g: 255, b: 255, a: 1 }); };
      const lum = ({ r, g, b }) => { const ch = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b); };
      const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100; };
      const chroma = ({ r, g, b }) => Math.max(r, g, b) - Math.min(r, g, b);
      return els.map((el) => {
        const title = el.querySelector('.uix-scheduling-calendar__title') ?? el;
        const bg = backdrop(title);
        const style = getComputedStyle(el);
        return {
          id: el.getAttribute('data-item-id'), band: el.getAttribute('data-band'),
          highlight: el.hasAttribute('data-highlight'), dim: el.hasAttribute('data-dim'),
          text: ratio(over(rgba(getComputedStyle(title).color), bg), bg),
          textChroma: Math.round(chroma(rgba(getComputedStyle(title).color))), fillChroma: Math.round(chroma(bg)),
          weight: Number(getComputedStyle(title).fontWeight), border: style.borderTopWidth,
        };
      });
    });
    expect(report.map((r) => r.id).sort()).toEqual(['partner', 'partner-high', 'partner-high-tentative', 'partner-medium', 'picked', 'plain-high', 'plain-medium', 'plain-tentative', 'rest', 'rest-high', 'rest-tentative']);
    expect(report.filter((r) => r.text < 4.5), JSON.stringify(report)).toEqual([]);
    const by = Object.fromEntries(report.map((r) => [r.id, r]));
    expect(by.partner.weight).toBeGreaterThan(by.picked.weight);
    expect(by.rest.weight).toBeLessThanOrEqual(by.picked.weight);
    // Only the band has a hue: no emphasis colours text, and a dimmed high-band item has no fill.
    for (const r of report) expect(r.textChroma, `${r.id} text is neutral`).toBeLessThan(12);
    for (const r of report.filter((x) => x.band !== 'high' || x.dim)) expect(r.fillChroma, `${r.id} has no coloured fill`).toBeLessThan(12);
    if (view !== 'agenda') {
      expect(by['partner-high'].fillChroma, 'a highlighted high-band item keeps its fill').toBeGreaterThan(60);
      expect(by.partner.border).toBe('2px');
      expect(by.picked.border).toBe('1px');
      // Emphasis leaves the other channels alone. A highlighted medium band keeps a leading edge
      // heavier than its other edges; a dimmed tentative item keeps the dashed edge of the state, in its colour.
      const edges = await page.locator('[data-item-id]').evaluateAll((els) => Object.fromEntries(els.map((el) => { const s = getComputedStyle(el); return [el.getAttribute('data-item-id'), { left: parseFloat(s.borderLeftWidth), top: parseFloat(s.borderTopWidth), style: s.borderTopStyle, colour: s.borderTopColor, shadow: s.boxShadow }]; })));
      expect(edges['partner-medium'].left, 'medium + highlight: the leading edge stays the heavier one').toBeGreaterThan(edges['partner-medium'].top + 2);
      expect(edges['partner-medium'].left).toBeGreaterThan(edges.partner.left);
      expect([edges['rest-tentative'].style, edges['rest-tentative'].colour]).toEqual([edges['plain-tentative'].style, edges['plain-tentative'].colour]);
      expect(edges['rest-tentative'].style).toBe('dashed');
      // Round the fill the heavier edge is in the text colour, not the fill's: it shows on the cell
      // and on the fill, and the title keeps its distance from it (no ring inside the chip).
      expect(edges['partner-high'].top).toBe(2);
      expect(edges['partner-high'].colour).toBe(edges.partner.colour);
      expect(edges['partner-high'].colour).not.toBe(edges['plain-high'].colour);
      expect(edges['partner-high'].shadow).toBe('none');
      // A highlighted tentative item of the high band still shows its dashed edge: its colour is not the fill's.
      const fill = await page.locator('[data-item-id="partner-high-tentative"]').evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(edges['partner-high-tentative'].style).toBe('dashed');
      expect(edges['partner-high-tentative'].colour).not.toBe(fill);
      expect(edges['partner-high-tentative'].top).toBe(2);
    }
    await settleAnimations(page);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
}

for (const view of ['month', 'week', 'agenda']) {
  test(`AC6: with forced colours a highlighted item in the ${view} underlines its title and a dimmed one is grey text`, async ({ page }) => {
    await open(page, `case=emphasis&view=${view}`);
    await page.emulateMedia({ forcedColors: 'active' });
    const look = await page.locator('[data-item-id]').evaluateAll((els) => Object.fromEntries(els.map((el) => {
      const title = el.querySelector('.uix-scheduling-calendar__title') ?? el;
      return [el.getAttribute('data-item-id'), { line: getComputedStyle(title).textDecorationLine, colour: getComputedStyle(el).color }];
    })));
    for (const id of ['partner', 'partner-high', 'partner-medium', 'partner-high-tentative']) expect(look[id].line, `${id} is underlined`).toContain('underline');
    for (const id of ['picked', 'rest', 'plain-medium']) expect(look[id].line, `${id} is not`).not.toContain('underline');
    for (const id of ['rest', 'rest-high', 'rest-tentative']) expect(look[id].colour, `${id} is grey text`).not.toBe(look.picked.colour);
  });
}

test('List roving: the items are one tab stop, a control in an item is its own, and Shift+Tab passes the same stops as Tab', async ({ page }) => {
  await page.goto(`${HARNESS}?case=list`, { waitUntil: 'networkidle' });
  const where = () => page.evaluate(() => { const el = document.activeElement; return el?.getAttribute('data-probe') ?? el?.getAttribute('data-action') ?? (el?.getAttribute('data-id') ? `item ${el.getAttribute('data-id')}` : el?.tagName); });
  await page.locator('[data-probe="before"]').focus();
  const forward = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); forward.push(await where()); }
  expect(forward).toEqual(['item 1', '1', '2', '3', '4', 'after']);
  const back = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Shift+Tab'); back.push(await where()); }
  expect(back).toEqual(['4', '3', '2', '1', 'item 1', 'before']);
  // The arrow keys move between the items; the tab stop follows the item.
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  expect(await where()).toBe('item 3');
  await page.keyboard.press('Shift+Tab');
  expect(await where(), 'Shift+Tab from item 3 goes to the control before it').toBe('2');
  await settleAnimations(page);
  const { violations } = await new AxeBuilder({ page }).include('.uix-list').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
});

for (const width of [1024, 1440]) {
  for (const view of ['month', 'week', 'day', 'agenda']) {
    test(`AC3: axe passes on the ${view} view of the docs specimen at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(DOCS, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      if (view !== 'month') await page.locator(`.uix-docs__page [data-calendar-panel="month"] [data-calendar-view="${view}"]`).click();
      const panel = page.locator(`.uix-docs__page [data-calendar-panel="${view}"]`);
      await expect(panel).toBeVisible();
      await settleAnimations(page);
      const { violations } = await new AxeBuilder({ page }).include(`.uix-docs__page [data-calendar-panel="${view}"]`).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
      // The scan saw the view: it holds calendar controls.
      expect(await panel.locator('button').count()).toBeGreaterThan(10);
    });
  }
}
