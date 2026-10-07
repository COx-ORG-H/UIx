/* The UIx chart theme in a real browser (HAR-1552).
 *
 * The harness (tests/chart/harness.tsx) renders a React Chart whose option has data and series only.
 * What only exists once ECharts draws: the SVG gridlines and their dash pattern, the text fonts, the
 * tooltip surface, and a theme flip recolouring the mounted chart. The pure theme and the docs port
 * are locked in packages/react/src/chart-theme.test.mjs; the palette checks in
 * packages/tokens/tests/chart-palette.test.mjs.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/chart/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#plain svg path').first()).toBeAttached();
});

/** Resolve a token to the rgb() string the browser computes for it. */
const tokenRgb = (page, token) => page.evaluate((t) => {
  const probe = document.createElement('i');
  probe.style.color = `var(${t})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}, token);

/** Every stroked path in a chart, with its computed stroke and dash pattern. */
const strokes = (page, id) => page.evaluate((sel) => [...document.querySelectorAll(`${sel} svg path`)].map((p) => {
  const cs = getComputedStyle(p);
  return { stroke: cs.stroke, dash: cs.strokeDasharray, width: cs.strokeWidth };
}).filter((s) => s.stroke !== 'none'), id);

test('gridlines are solid 1px hairlines in --uix-chart-grid (no stroke-dasharray)', async ({ page }) => {
  const grid = await tokenRgb(page, '--uix-chart-grid');
  const gridLines = (await strokes(page, '#plain')).filter((s) => s.stroke === grid);
  expect(gridLines.length, `paths stroked ${grid}`).toBeGreaterThan(2);
  for (const line of gridLines) {
    expect(line.dash).toBe('none');
    expect(line.width).toBe('1px');
  }
});

test('series take the token palette; text uses the token font; nothing is styled by the option', async ({ page }) => {
  const [c1, c2] = [await tokenRgb(page, '--uix-chart-1'), await tokenRgb(page, '--uix-chart-2')];
  const paths = await strokes(page, '#plain');
  expect(paths.some((s) => s.stroke === c1), `a path stroked chart-1 ${c1}`).toBe(true);
  const fills = await page.evaluate(() => [...document.querySelectorAll('#plain svg path')].map((p) => getComputedStyle(p).fill));
  expect(fills.includes(c2), `a bar filled chart-2 ${c2}`).toBe(true);
  const font = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--uix-font-mono').trim().replace(/"/g, ''));
  const fonts = await page.evaluate(() => [...document.querySelectorAll('#plain svg text')].map((t) => t.getAttribute('style') ?? '').join(' '));
  expect(fonts).toContain(font.split(',')[0]);
  // the control chart (theme="none") keeps ECharts' own defaults: proof the look comes from the theme
  const rawPaths = await strokes(page, '#raw');
  expect(rawPaths.some((s) => s.stroke === c1)).toBe(false);
});

test('the tooltip is the UIx surface with token text', async ({ page }) => {
  const box = await page.locator('#plain .uix-chart__plot > div[role="img"]').boundingBox();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
  const tooltip = page.locator('#plain div[role="img"] > div').filter({ hasText: 'Merged' }).last();
  await expect(tooltip).toBeVisible();
  const [bg, surface] = [await tooltip.evaluate((el) => getComputedStyle(el).backgroundColor), await tokenRgb(page, '--uix-surface')];
  expect(bg).toBe(surface);
});

test('flipping data-theme recolours the mounted chart without a remount', async ({ page }, testInfo) => {
  const other = testInfo.project.name === 'dark' ? 'light' : 'dark';
  const before = await tokenRgb(page, '--uix-chart-grid');
  const svgBefore = await page.evaluate(() => { const svg = document.querySelector('#plain svg'); svg.dataset.mark = 'kept'; return true; });
  expect(svgBefore).toBe(true);
  const inits = await page.evaluate(() => window.__chartInits.plain);
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), other);
  const after = await tokenRgb(page, '--uix-chart-grid');
  expect(after).not.toBe(before);
  await expect.poll(async () => (await strokes(page, '#plain')).filter((s) => s.stroke === after).length).toBeGreaterThan(2);
  expect((await strokes(page, '#plain')).filter((s) => s.stroke === before).length).toBe(0);
  expect(await page.evaluate(() => window.__chartInits.plain)).toBe(inits);
  expect(await page.evaluate(() => document.querySelector('#plain svg')?.dataset.mark)).toBe('kept');
});

test('docs chart examples: gridlines are solid, only the threshold is dashed', async ({ page }, testInfo) => {
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch {} }, testInfo.project.name);
  await page.goto('docs/explorer.html#examples-data-display', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-uix-chart] svg path').first()).toBeAttached({ timeout: 15_000 });
  const grid = await tokenRgb(page, '--uix-chart-grid');
  const reference = await tokenRgb(page, '--uix-chart-reference');
  const all = await page.evaluate(() => [...document.querySelectorAll('[data-uix-chart] svg path')].map((p) => {
    const cs = getComputedStyle(p);
    return { stroke: cs.stroke, dash: cs.strokeDasharray };
  }));
  const gridLines = all.filter((s) => s.stroke === grid);
  expect(gridLines.length).toBeGreaterThan(2);
  expect(gridLines.every((s) => s.dash === 'none')).toBe(true);
  const dashed = all.filter((s) => s.dash !== 'none');
  expect(dashed.length).toBeGreaterThan(0);
  expect(dashed.every((s) => s.stroke === reference), JSON.stringify(dashed)).toBe(true);
});

test('no serious or critical axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).include('#root').analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
});
