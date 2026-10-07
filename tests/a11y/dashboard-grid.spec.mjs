/* DashboardGrid in a real browser (HAR-1555). jsdom has no layout, so the spans are measured here:
 * the harness (tests/dashboard-grid/harness.tsx) is bundled from source in globalSetup.
 *   - span 1 / 2 / full widths against the grid's content width (±1 px) at 1280, 768, 375, 320 px;
 *   - span 2 clamps to one column and nothing overflows sideways;
 *   - the column count follows the GRID's width (container query), and an explicit `columns`
 *     set never picks up the CSS defaults;
 *   - a Chart inside an item takes its height from the item's width (cqi) and ECharts redraws
 *     at the item's width;
 *   - widgets in one row share a height; axe in both themes.
 * The class contract itself is in packages/react/src/dashboard-grid-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/dashboard-grid/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('[data-testid="full"] svg').first()).toBeVisible();
});

/** Content width, gap and every item's box, relative to the grid. */
const measure = (page, section) => page.locator(`${section} .uix-dashboard-grid`).first().evaluate((grid) => {
  const cs = getComputedStyle(grid);
  const box = grid.getBoundingClientRect();
  const width = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
  // The gap token, as the CSS caps it: min(gap, width / 12).
  const gap = Math.min(parseFloat(cs.getPropertyValue('--dashboard-grid-gap')), width / 12);
  const items = Object.fromEntries([...grid.children].map((el) => {
    const r = el.getBoundingClientRect();
    return [el.dataset.testid, { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }];
  }));
  return { width, gap, items, overflow: grid.scrollWidth - grid.clientWidth };
});

const pageOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Expected widths at `n` columns. */
const expected = ({ width, gap }, n) => {
  const one = (width - (n - 1) * gap) / n;
  return { one, two: n >= 2 ? 2 * one + gap : width, full: width };
};

const expectWidths = (m, n, ids) => {
  const e = expected(m, n);
  const report = {};
  for (const [id, kind] of Object.entries(ids)) {
    report[id] = Math.round(m.items[id].w * 10) / 10;
    expect(Math.abs(m.items[id].w - e[kind]), `${id} (${kind}) at ${n} column(s): ${m.items[id].w} vs ${e[kind]}`).toBeLessThanOrEqual(1);
  }
  return { columns: n, grid: Math.round(m.width * 10) / 10, gap: m.gap, ...report };
};

const DEFAULT_IDS = { a: 'one', b: 'one', c: 'one', wide: 'two', d: 'one', full: 'full', 'chart-1': 'one' };

for (const [viewport, columns] of [[1280, 3], [768, 2], [375, 1], [320, 1]]) {
  test(`default columns at ${viewport} px: ${columns} column(s), full = grid width, span 2 clamps, no sideways scroll`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport, height: 900 });
    const m = await measure(page, '#default');
    const row = expectWidths(m, columns, DEFAULT_IDS);
    // Full starts at the grid's left edge on its own row.
    expect(Math.abs(m.items.full.x)).toBeLessThanOrEqual(1);
    if (columns === 1) for (const id of Object.keys(DEFAULT_IDS)) expect(Math.abs(m.items[id].w - m.width)).toBeLessThanOrEqual(1);
    expect(m.overflow).toBe(0);
    expect(await pageOverflow(page)).toBe(0);
    testInfo.annotations.push({ type: 'measured', description: JSON.stringify({ viewport, ...row }) });
    console.log(`[dashboard-grid] ${testInfo.project.name} #default ${JSON.stringify({ viewport, ...row })}`);
  });
}

test('the column count follows the grid width, and an explicit set never picks up the defaults', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const section = page.locator('#explicit');
  const ids = { x1: 'one', x2: 'two', xfull: 'full', x3: 'one' };
  // columns={{ base: 1, sm: 2, xl: 3 }}: xl is 80rem of GRID width. 1100 px is past the CSS
  // default's lg (60rem → 3 columns) but not xl, so it must stay at 2.
  for (const [width, n] of [[1296, 3], [1100, 2], [800, 2], [576, 2], [575, 1], [320, 1]]) {
    await section.evaluate((el, w) => { el.style.width = `${w}px`; }, width);
    const m = await measure(page, '#explicit');
    const row = expectWidths(m, n, ids);
    expect(m.overflow).toBe(0);
    console.log(`[dashboard-grid] ${testInfo.project.name} #explicit ${JSON.stringify({ width, ...row })}`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  // columns={2} on a 1248 px grid: 2, not the default 3.
  console.log(`[dashboard-grid] ${testInfo.project.name} #fixed ${JSON.stringify(expectWidths(await measure(page, '#fixed'), 2, { f1: 'one', f2: 'one', f3: 'two' }))}`);
  // The default grid in a 35rem box on a 1280 px screen: one column (a viewport query would give 3).
  console.log(`[dashboard-grid] ${testInfo.project.name} #narrow ${JSON.stringify(expectWidths(await measure(page, '#narrow'), 1, { n1: 'full', n2: 'full', n3: 'full' }))}`);
});

test('a Chart in an item takes its height from the item width (cqi) and redraws at the item width', async ({ page }, testInfo) => {
  const plot = (id) => page.locator(`[data-testid="${id}"] .uix-chart__plot > [role="img"]`);
  const sizes = (id) => page.locator(`[data-testid="${id}"]`).evaluate((item) => {
    const host = item.querySelector('.uix-chart__plot > [role="img"]');
    const svg = host.querySelector('svg');
    return { item: item.getBoundingClientRect().width, host: host.getBoundingClientRect().height, hostW: host.getBoundingClientRect().width, svgW: svg ? svg.getBoundingClientRect().width : 0, svgH: svg ? svg.getBoundingClientRect().height : 0 };
  });
  const clamp = (w) => Math.min(360, Math.max(160, 0.4 * w));
  for (const viewport of [1280, 768, 320]) {
    await page.setViewportSize({ width: viewport, height: 900 });
    for (const id of ['full', 'chart-1']) {
      await expect(plot(id)).toBeVisible();
      // ECharts resizes on a ResizeObserver + rAF, so poll until its SVG matches the host.
      await expect.poll(async () => { const s = await sizes(id); return Math.abs(s.svgW - s.hostW) <= 1 && Math.abs(s.svgH - s.host) <= 1; }, { timeout: 5000 }).toBe(true);
      const s = await sizes(id);
      expect(Math.abs(s.host - clamp(s.item)), `${id} at ${viewport}: height ${s.host} vs clamp(160, 40% of ${s.item}, 360)`).toBeLessThanOrEqual(1);
      console.log(`[dashboard-grid] ${testInfo.project.name} chart ${JSON.stringify({ viewport, id, item: Math.round(s.item), height: Math.round(s.host * 10) / 10, svg: `${Math.round(s.svgW)}x${Math.round(s.svgH)}` })}`);
    }
  }
  // At 1280 the full-width chart is taller than the one-column chart: size-aware height.
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect.poll(async () => (await sizes('full')).host - (await sizes('chart-1')).host).toBeGreaterThan(100);
});

test('widgets in one row share a height', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const heights = await page.locator('#default').evaluate((section) => ['a', 'b', 'c'].map((id) => section.querySelector(`[data-testid="${id}"] .tile`).getBoundingClientRect().height));
  expect(heights[2]).toBeGreaterThan(0);
  for (const h of heights) expect(Math.abs(h - heights[2])).toBeLessThanOrEqual(1);
});

test('no serious or critical axe violations', async ({ page }) => {
  const violations = (await new AxeBuilder({ page }).include('#root').analyze()).violations
    .filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.length} node(s)`);
  expect(violations).toEqual([]);
});
