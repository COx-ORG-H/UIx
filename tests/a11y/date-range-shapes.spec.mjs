/* HAR-1570 — DateRangePicker day states share one shape (operator review 2026-10-07).
 *
 * Hover, start, end, today and focus must all be the same circle, concentric with the
 * cell, and the in-range band must join the start and end circles without notches.
 * jsdom has no layout, so the geometry is measured here in Chromium, on the docs
 * specimen (`#examples-date-range-picker`, which starts with 8 Sep picked), in both
 * themes and at desktop and 320 px widths.
 *
 * The midline check reads real pixels: it screenshots the row and decodes it in the page
 * (canvas), so it sees exactly what a person sees, not what the CSS claims.
 */
import { test, expect } from '@playwright/test';

const ROUTE = 'docs/explorer.html#examples-date-range-picker';
const day = (page, date) => page.locator(`[data-range-date="${date}"]`);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((value) => localStorage.setItem('uix-theme', value), theme);
});

const open = async (page, width) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(ROUTE, { waitUntil: 'networkidle' });
  await expect(day(page, '2026-09-08')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
};

/** The ::after circle of a day cell, in page coordinates, plus its radius and colours. */
const circle = (locator) => locator.evaluate((el) => {
  const box = el.getBoundingClientRect();
  const cs = getComputedStyle(el, '::after');
  const left = box.left + parseFloat(cs.left);
  const top = box.top + parseFloat(cs.top);
  const width = parseFloat(cs.width);
  const height = parseFloat(cs.height);
  return {
    cell: { cx: box.left + box.width / 2, cy: box.top + box.height / 2, width: box.width, height: box.height },
    cx: left + width / 2, cy: top + height / 2, width, height,
    radius: cs.borderTopLeftRadius, background: cs.backgroundColor, shadow: cs.boxShadow,
  };
});

/** The ::before band of a day cell, in page coordinates. */
const band = (locator) => locator.evaluate((el) => {
  const box = el.getBoundingClientRect();
  const cs = getComputedStyle(el, '::before');
  const left = box.left + parseFloat(cs.left);
  return { left, right: left + parseFloat(cs.width), cellLeft: box.left, cellRight: box.right, cellCx: box.left + box.width / 2, background: cs.backgroundColor };
});

const transparent = (color) => color === 'rgba(0, 0, 0, 0)' || color === 'transparent' || color === 'none';

/** RGB pixels along the horizontal line y, from x0 to x1 (page px), read from a screenshot. */
const sampleRow = async (page, y, x0, x1) => {
  const png = await page.screenshot({ clip: { x: Math.floor(x0), y: Math.floor(y), width: Math.ceil(x1 - x0), height: 1 }, animations: 'disabled', caret: 'hide', scale: 'css' });
  return page.evaluate(async (b64) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, bitmap.width, 1);
    const out = [];
    for (let i = 0; i < data.length; i += 4) out.push([data[i], data[i + 1], data[i + 2]]);
    return out;
  }, png.toString('base64'));
};

/** The picker's surface colour as [r, g, b], read from a pixel of its own top padding. */
const surfacePixel = async (page) => {
  const box = await page.locator('[data-range-picker]').evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width }; });
  const x = box.x + box.width / 2;
  const [px] = await sampleRow(page, box.y + 6, x, x + 1);
  return px;
};
const near = (a, b, tol = 3) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
/** The start/end digits are accent-fg, which is the surface colour in light mode; hide the
 * digits so the midline samples only the shapes (circle, band) the test is about. */
const hideDigits = (page) => page.addStyleTag({ content: '[data-range-date] { color: transparent !important; }' });
// Layout snaps to 1/64 px, so "equal" diameters can differ by one LayoutUnit.
const LAYOUT_UNIT = 1 / 64 + 0.001;

for (const width of [1280, 320]) {
  test.describe(`at ${width}px`, () => {
    test('hover, start, end, today and focus are one concentric circle', async ({ page }) => {
      await open(page, width);
      await day(page, '2026-09-12').click();
      await expect(page.locator('[data-range-live]')).toContainText('2026-09-08 to 2026-09-12 selected');

      const start = await circle(day(page, '2026-09-08'));
      const end = await circle(day(page, '2026-09-12'));
      const today = await circle(day(page, '2026-09-18'));
      // focus-visible: move focus from the clicked end with the keyboard
      await page.keyboard.press('ArrowRight');
      await expect(day(page, '2026-09-13')).toBeFocused();
      const focus = await circle(day(page, '2026-09-13'));
      await day(page, '2026-09-22').hover();
      const hover = await circle(day(page, '2026-09-22'));

      const states = { start, end, today, focus, hover };
      for (const [name, c] of Object.entries(states)) {
        expect(c.radius, `${name} radius`).toBe('50%');
        expect(Math.abs(c.width - c.height), `${name} is round`).toBeLessThanOrEqual(LAYOUT_UNIT);
        expect(Math.abs(c.width - start.width), `${name} diameter equals start`).toBeLessThanOrEqual(LAYOUT_UNIT);
        expect(Math.abs(c.cx - c.cell.cx), `${name} concentric x`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(c.cy - c.cell.cy), `${name} concentric y`).toBeLessThanOrEqual(0.5);
      }
      expect(transparent(start.background)).toBe(false);
      expect(transparent(end.background)).toBe(false);
      expect(transparent(hover.background)).toBe(false);
      expect(today.shadow).toMatch(/inset/);
      expect(focus.shadow).not.toBe('none');
      // the cell itself paints no square any more
      const cellPaint = await day(page, '2026-09-22').evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, outline: getComputedStyle(el).outlineStyle }));
      expect(transparent(cellPaint.bg)).toBe(true);
    });

    test('the band joins start and end along the row midline, with no surface showing', async ({ page }) => {
      await open(page, width);
      await day(page, '2026-09-12').click();
      await page.mouse.move(0, 0);
      await page.locator('body').evaluate(() => document.activeElement?.blur());
      await hideDigits(page);
      const surface = await surfacePixel(page);
      const start = await circle(day(page, '2026-09-08'));
      const end = await circle(day(page, '2026-09-12'));
      const row = await sampleRow(page, start.cy, start.cx, end.cx);
      const hits = row.map((px, i) => (near(px, surface) ? i : -1)).filter((i) => i >= 0);
      expect(hits, `surface pixels on the midline (surface ${surface})`).toEqual([]);
      // and the bands stop at the circles: the start's half band starts at its centre
      const startBand = await band(day(page, '2026-09-08'));
      expect(Math.abs(startBand.left - startBand.cellCx)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(startBand.right - startBand.cellRight)).toBeLessThanOrEqual(0.5);
      const endBand = await band(day(page, '2026-09-12'));
      expect(Math.abs(endBand.left - endBand.cellLeft)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(endBand.right - endBand.cellCx)).toBeLessThanOrEqual(0.5);
    });

    test('no band while only a start is picked', async ({ page }) => {
      await open(page, width);
      const bands = await page.locator('[data-range-date]').evaluateAll((els) => els.map((el) => getComputedStyle(el, '::before').backgroundColor).filter((c) => c !== 'rgba(0, 0, 0, 0)' && c !== 'none'));
      expect(bands).toEqual([]);
      await page.locator('body').evaluate(() => document.activeElement?.blur());
      const surface = await surfacePixel(page);
      const start = await circle(day(page, '2026-09-08'));
      const right = start.cell.cx + start.cell.width / 2;
      const row = await sampleRow(page, start.cy, start.cx + start.width / 2 + 1, right);
      expect(row.every((px) => near(px, surface))).toBe(true);
    });
  });
}

test('exactly one day carries aria-current="date"', async ({ page }) => {
  await open(page, 1280);
  await expect(page.locator('[data-range-picker] [aria-current="date"]')).toHaveCount(1);
});

test('focus ring clears 3:1 against the band, and its surface gap against the accent circle', async ({ page }) => {
  await open(page, 1280);
  await day(page, '2026-09-12').click();
  const colours = await page.evaluate(() => {
    const probe = (prop) => {
      const el = document.createElement('div');
      el.style.color = `var(${prop})`;
      document.querySelector('[data-range-picker]').append(el);
      const value = getComputedStyle(el).color;
      el.remove();
      return value;
    };
    return { ring: probe('--uix-ring'), surface: probe('--uix-surface'), accent: probe('--uix-accent'), muted: probe('--uix-brand-muted') };
  });
  const parse = (c) => {
    const srgb = c.match(/color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)/);
    if (srgb) return { rgb: [1, 2, 3].map((i) => Number(srgb[i]) * 255), a: srgb[4] === undefined ? 1 : Number(srgb[4]) };
    const m = c.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/);
    return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], a: m[4] === undefined ? 1 : Number(m[4]) };
  };
  const over = (top, bottom) => top.rgb.map((v, i) => v * top.a + bottom.rgb[i] * (1 - top.a));
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const surface = parse(colours.surface).rgb;
  const ring = over(parse(colours.ring), { rgb: surface });
  const bandRgb = over(parse(colours.muted), { rgb: surface });
  const accent = over(parse(colours.accent), { rgb: surface });
  const ringVsBand = ratio(ring, bandRgb);
  const ringVsGap = ratio(ring, surface);
  const gapVsAccent = ratio(surface, accent);
  console.log(`[HAR-1570] ring/band ${ringVsBand.toFixed(2)} ring/gap ${ringVsGap.toFixed(2)} gap/accent ${gapVsAccent.toFixed(2)}`);
  expect(ringVsBand).toBeGreaterThanOrEqual(3);
  expect(ringVsGap).toBeGreaterThanOrEqual(3);
  expect(gapVsAccent).toBeGreaterThanOrEqual(3);
  // and the gap really is there on a focused edge
  await day(page, '2026-09-12').focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  const shadow = await day(page, '2026-09-12').evaluate((el) => getComputedStyle(el, '::after').boxShadow);
  expect(shadow).toMatch(/0px 0px 0px 2px.*0px 0px 0px 4px/);
});

test('the range stays visible in forced-colours mode', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page, 1280);
  await day(page, '2026-09-12').click();
  const states = await page.evaluate(() => {
    const at = (d) => document.querySelector(`[data-range-date="${d}"]`);
    return {
      startFill: getComputedStyle(at('2026-09-08'), '::after').backgroundColor,
      endFill: getComputedStyle(at('2026-09-12'), '::after').backgroundColor,
      middle: getComputedStyle(at('2026-09-10')).textDecorationLine,
      plain: getComputedStyle(at('2026-09-22')).textDecorationLine,
      todayOutline: getComputedStyle(at('2026-09-18'), '::after').outlineStyle,
    };
  });
  expect(transparent(states.startFill)).toBe(false);
  expect(transparent(states.endFill)).toBe(false);
  expect(states.middle).toContain('underline');
  expect(states.plain).toBe('none');
  expect(states.todayOutline).toBe('solid');
});

test('RTL mirrors the half bands and keeps the band joined', async ({ page }) => {
  await open(page, 1280);
  await page.locator('[data-range-picker]').evaluate((el) => el.setAttribute('dir', 'rtl'));
  await day(page, '2026-09-12').click();
  await page.mouse.move(0, 0);
  await page.locator('body').evaluate(() => document.activeElement?.blur());
  await hideDigits(page);
  const start = await circle(day(page, '2026-09-08'));
  const end = await circle(day(page, '2026-09-12'));
  expect(start.cx).toBeGreaterThan(end.cx); // the row runs right to left
  const startBand = await band(day(page, '2026-09-08'));
  expect(Math.abs(startBand.left - startBand.cellLeft)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(startBand.right - startBand.cellCx)).toBeLessThanOrEqual(0.5);
  const endBand = await band(day(page, '2026-09-12'));
  expect(Math.abs(endBand.left - endBand.cellCx)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(endBand.right - endBand.cellRight)).toBeLessThanOrEqual(0.5);
  const surface = await surfacePixel(page);
  const row = await sampleRow(page, start.cy, end.cx, start.cx);
  expect(row.filter((px) => near(px, surface))).toEqual([]);
});
