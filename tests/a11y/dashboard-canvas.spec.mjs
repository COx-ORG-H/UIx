/* DashboardCanvas in a real browser (TENSOR HAR-1823). jsdom has no layout and no pointer, so
 * these run here: the harness (tests/dashboard-canvas/harness.tsx) is bundled from source in
 * globalSetup.
 *   - every item sits at its {col, row, w, h} on twelve columns (±1 px);
 *   - dragging the move handle snaps to a cell and pushes what it lands on down; dragging the
 *     resize handle snaps to whole columns and rows; Escape drops a drag;
 *   - the arrow keys on a focused handle do the same one step at a time;
 *   - below 36rem of the canvas's width it is one column in reading order, the handles are
 *     gone, and nothing scrolls sideways — at 320 px too;
 *   - axe in both themes.
 * The class contract and the keyboard model are in packages/react/src/dashboard-canvas-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/dashboard-canvas/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#editable [data-canvas-id="needs-you"]')).toBeVisible();
});

const layout = async (page) => JSON.parse(await page.locator('[data-testid="layout"]').textContent());
const byId = (items) => Object.fromEntries(items.map(({ id, ...rest }) => [id, rest]));

/** The canvas's track geometry and every item's box, relative to the canvas. */
const measure = (page, section) => page.locator(`${section} .uix-dashboard-canvas`).evaluate((canvas) => {
  const cs = getComputedStyle(canvas);
  const box = canvas.getBoundingClientRect();
  // column-gap is capped with min(gap, 100% / 12), which the computed style leaves unresolved:
  // read it from the resolved tracks instead.
  const tracks = cs.gridTemplateColumns.split(' ').map(parseFloat).filter(Number.isFinite);
  const colGap = (box.width - tracks.reduce((sum, t) => sum + t, 0)) / (tracks.length - 1);
  const rowGap = parseFloat(cs.rowGap);
  // The row height token, in px.
  const token = cs.getPropertyValue('--uix-dashboard-canvas-row').trim();
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const row = token.endsWith('rem') ? parseFloat(token) * rootPx : parseFloat(token);
  const items = Object.fromEntries([...canvas.querySelectorAll('.uix-dashboard-canvas__item')].map((el) => {
    const r = el.getBoundingClientRect();
    return [el.dataset.canvasId, { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }];
  }));
  return { width: box.width, colGap, rowGap, row, items, overflow: canvas.scrollWidth - canvas.clientWidth };
});

test('each item sits at its place and size on twelve columns', async ({ page }) => {
  const m = await measure(page, '#editable');
  const col = (m.width - 11 * m.colGap) / 12;
  const expectBox = (id, c, r, w, h) => {
    const box = m.items[id];
    expect(Math.abs(box.x - c * (col + m.colGap)), `${id} x`).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y - r * (m.row + m.rowGap)), `${id} y`).toBeLessThanOrEqual(1);
    expect(Math.abs(box.w - (w * col + (w - 1) * m.colGap)), `${id} w`).toBeLessThanOrEqual(1);
    expect(Math.abs(box.h - (h * m.row + (h - 1) * m.rowGap)), `${id} h`).toBeLessThanOrEqual(1);
  };
  expectBox('needs-you', 0, 0, 8, 3);
  expectBox('updates', 8, 0, 4, 3);
  expectBox('sla', 0, 3, 4, 2);
  expectBox('trend', 4, 3, 8, 2);
  expect(m.overflow).toBeLessThanOrEqual(0);
});

/** Drags a handle by whole cells, with a stop half-way so the preview has a frame to show. */
async function dragHandle(page, id, kind, dCols, dRows, { escape = false } = {}) {
  const m = await measure(page, '#editable');
  const colPitch = (m.width + m.colGap) / 12;
  const rowPitch = m.row + m.rowGap;
  const handle = page.locator(`#editable [data-canvas-id="${id}"] .uix-dashboard-canvas__${kind}`);
  const box = await handle.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + (dCols * colPitch) / 2, y + (dRows * rowPitch) / 2, { steps: 4 });
  await page.mouse.move(x + dCols * colPitch, y + dRows * rowPitch, { steps: 4 });
  await expect(page.locator('#editable .uix-dashboard-canvas__preview')).toBeVisible();
  if (escape) await handle.press('Escape');
  await page.mouse.up();
}

test('dragging the move handle snaps to a cell and pushes what it lands on down', async ({ page }) => {
  await dragHandle(page, 'sla', 'move', 0, -2);
  const items = byId(await layout(page));
  expect(items.sla).toEqual({ col: 0, row: 1, w: 4, h: 2 });
  // needs-you (rows 0–2) is landed on, so it goes below sla.
  expect(items['needs-you'].row).toBe(3);
  expect(items.updates).toEqual({ col: 8, row: 0, w: 4, h: 3 });
  await expect(page.locator('#editable [role="status"]')).toHaveText('SLA risk: column 1, row 2');
});

test('dragging the resize handle snaps to whole columns and rows, inside the limits', async ({ page }) => {
  await dragHandle(page, 'trend', 'resize', -2, 3);
  const items = byId(await layout(page));
  // Two columns narrower; three rows taller is capped by maxH 3.
  expect(items.trend).toEqual({ col: 4, row: 3, w: 6, h: 3 });
});

test('Escape drops a drag: nothing moves and the preview goes', async ({ page }) => {
  const before = await layout(page);
  await dragHandle(page, 'updates', 'move', -4, 2, { escape: true });
  expect(await layout(page)).toEqual(before);
  await expect(page.locator('#editable .uix-dashboard-canvas__preview')).toHaveCount(0);
});

test('a focused handle takes the arrow keys, one step each', async ({ page }) => {
  const move = page.locator('#editable [data-canvas-id="sla"] .uix-dashboard-canvas__move');
  await move.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  expect(byId(await layout(page)).sla).toEqual({ col: 2, row: 3, w: 4, h: 2 });
  // The trend item it now overlaps was pushed down.
  expect(byId(await layout(page)).trend.row).toBe(5);
  await expect(move).toBeFocused();
  const resize = page.locator('#editable [data-canvas-id="sla"] .uix-dashboard-canvas__resize');
  await resize.focus();
  await page.keyboard.press('ArrowLeft');
  expect(byId(await layout(page)).sla.w).toBe(3);
});

for (const viewport of [1280, 375, 320]) {
  test(`below 36rem of its own width it is one column in reading order, without handles (${viewport} px)`, async ({ page }) => {
    await page.setViewportSize({ width: viewport, height: 900 });
    const m = await measure(page, '#narrow');
    const order = Object.entries(m.items).sort((a, b) => a[1].y - b[1].y).map(([id]) => id);
    expect(order).toEqual(['needs-you', 'updates', 'sla', 'trend']);
    for (const box of Object.values(m.items)) expect(Math.abs(box.w - m.width)).toBeLessThanOrEqual(1);
    // Each keeps the height of its rows on the wide canvas, and starts below the one before it.
    const rows = { 'needs-you': 3, updates: 3, sla: 2, trend: 2 };
    for (const [id, h] of Object.entries(rows)) {
      expect(Math.abs(m.items[id].h - (h * m.row + (h - 1) * m.rowGap)), `${id} h`).toBeLessThanOrEqual(1);
    }
    for (let i = 1; i < order.length; i += 1) {
      const above = m.items[order[i - 1]];
      expect(m.items[order[i]].y, `${order[i]} below ${order[i - 1]}`).toBeGreaterThanOrEqual(above.y + above.h + m.rowGap - 1);
    }
    expect(m.overflow).toBeLessThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    if (viewport < 600) {
      // The editable canvas is narrow too now: its handles step aside.
      await expect(page.locator('#editable .uix-dashboard-canvas__handle').first()).toBeHidden();
    }
  });
}

test('no serious or critical axe violations', async ({ page }) => {
  const violations = (await new AxeBuilder({ page }).include('#root').analyze()).violations
    .filter((v) => GATED.has(v.impact));
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
