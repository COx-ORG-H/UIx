/* RelationshipGraph map controls (`controls="compact"`) measured in a real browser (TENSOR
 * HAR-2512). jsdom has no layout, so the geometry is checked here; the harness
 * (tests/relationship-graph/harness.tsx) is bundled from source in globalSetup.
 *
 * On 2.45.0 the hint ("Ziehen zum Verschieben · Strg + Mausrad zum Zoomen") and the zoom level
 * were positioned independently: the hint was capped at `100% - 15rem` and hidden only below a
 * 640 px *viewport*, so a 500–600 px map on a wide screen drew "Zoom 75 %" over the end of the
 * hint (574 px: the CI record beside its side cards at 1280 px). Now they share one row:
 *   - at every map width from 280 to 1200 px, the hint, the zoom level and the icon cluster
 *     never intersect, and each stays inside the map;
 *   - the hint gives way first (ellipsis, then hidden), then the zoom level; the icon cluster
 *     never goes;
 *   - on a wide map the hint is shown whole.
 * Runs once per theme project, German (TENSOR's labels, the longest we ship) and English. */
import { test, expect } from '@playwright/test';

const HARNESS = '/tests/relationship-graph/harness.html';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#de .uix-relationship-graph__control-cluster')).toBeVisible();
});

const WIDTHS = [280, 300, 324, 360, 400, 420, 460, 500, 510, 540, 574, 600, 640, 700, 760, 800, 900, 1000, 1100, 1200];

/** Sets the map's frame to `width` px (or leaves it to the page when null) and measures the footer. */
const measure = (page, section, width) => page.locator(`${section} .frame`).evaluate(async (frame, w) => {
  frame.style.width = w === null ? '' : `${w}px`;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') return null;
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width };
  };
  const viewport = frame.querySelector('.uix-relationship-graph__viewport');
  const hint = frame.querySelector('.uix-relationship-graph__hint');
  const zoom = frame.querySelector('.uix-relationship-graph__zoom-level');
  return {
    map: box(viewport),
    hint: box(hint),
    zoom: box(zoom),
    cluster: box(frame.querySelector('.uix-relationship-graph__control-cluster')),
    hintCut: hint.scrollWidth > hint.clientWidth + 0.5,
    zoomCut: zoom.scrollWidth > zoom.clientWidth + 0.5,
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}, width);

const intersect = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5
  && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
const inside = (inner, outer) => inner.left >= outer.left - 0.5 && inner.right <= outer.right + 0.5
  && inner.top >= outer.top - 0.5 && inner.bottom <= outer.bottom + 0.5;

for (const [section, language] of [['#de', 'German'], ['#en', 'English']]) {
  test(`${language}: hint, zoom level and icon cluster never overlap at any map width from 280 to 1200 px`, async ({ page }) => {
    const rows = [];
    for (const width of WIDTHS) {
      const m = await measure(page, section, width);
      rows.push({ width, map: Math.round(m.map.width), hint: m.hint ? `${Math.round(m.hint.width)}${m.hintCut ? '…' : ''}` : '—', zoom: m.zoom ? `${Math.round(m.zoom.width)}${m.zoomCut ? '…' : ''}` : '—' });
      expect.soft(Math.round(m.map.width), `${width}: the map is as wide as its frame`).toBe(width);
      expect.soft(m.cluster, `${width}: the icon cluster is always there`).not.toBeNull();
      if (!m.cluster) continue;
      expect.soft(inside(m.cluster, m.map), `${width}: the cluster sits inside the map`).toBe(true);
      const shown = [['hint', m.hint], ['zoom level', m.zoom], ['cluster', m.cluster]].filter(([, b]) => b);
      for (let i = 0; i < shown.length; i += 1) {
        expect.soft(inside(shown[i][1], m.map), `${width}: the ${shown[i][0]} sits inside the map`).toBe(true);
        for (let j = i + 1; j < shown.length; j += 1) {
          expect.soft(intersect(shown[i][1], shown[j][1]), `${width}: the ${shown[i][0]} and the ${shown[j][0]} overlap`).toBe(false);
        }
      }
      // The hint gives way first: while the zoom level is cut or gone, there is no hint.
      if (!m.zoom || m.zoomCut) expect.soft(m.hint, `${width}: the zoom level gave way before the hint`).toBeNull();
      expect.soft(m.pageOverflow, `${width}: no sideways page scroll`).toBeLessThanOrEqual(0);
    }
    test.info().annotations.push({ type: 'widths', description: JSON.stringify(rows) });
    // A wide map shows the whole hint and the zoom level; a 280 px map keeps at least the cluster.
    for (const width of [900, 1200]) {
      const m = await measure(page, section, width);
      expect(m.hint, `${width}: the hint is shown`).not.toBeNull();
      expect(m.hintCut, `${width}: the hint is shown whole`).toBe(false);
      expect(m.zoom && !m.zoomCut, `${width}: the zoom level is shown whole`).toBe(true);
    }
  });
}

test('the reported width: a 574 px map beside side cards at 1280 px keeps the zoom level clear of the hint', async ({ page }) => {
  const m = await measure(page, '#de', 574);
  expect(m.zoom).not.toBeNull();
  expect(m.zoomCut).toBe(false);
  if (m.hint) expect(intersect(m.hint, m.zoom)).toBe(false);
  if (m.hint) expect(m.hint.right).toBeLessThanOrEqual(m.zoom.left);
});

test('phone: a 390 px screen shows the cluster inside the map and no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const m = await measure(page, '#de', null);
  expect(m.cluster).not.toBeNull();
  expect(inside(m.cluster, m.map)).toBe(true);
  for (const other of [m.hint, m.zoom].filter(Boolean)) expect(intersect(other, m.cluster)).toBe(false);
  if (m.hint && m.zoom) expect(intersect(m.hint, m.zoom)).toBe(false);
  expect(m.pageOverflow).toBeLessThanOrEqual(0);
});
