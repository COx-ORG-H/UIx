/* RelationshipGraph: TENSOR's K3 gaps map (HAR-1639).
 *
 * K3 (tests/graph-gaps/harness.tsx?case=k3), Chromium, light and dark, German labels:
 *   - a missing relation is a dashed edge in the danger tone; toned nodes match the legend;
 *   - no node gets the root border in a map with several starting points;
 *   - every label is shown and no two label boxes overlap in the dense column;
 *   - a table row reveals its node in the map and keeps the keyboard in the table;
 *   - each node's description carries its relationships, "erwartet, fehlt" included;
 *   - with reduced motion the reveal is a jump, not a slide.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/graph-gaps/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, query = '?case=k3', options = {}) => {
  if (options.viewport) await page.setViewportSize(options.viewport);
  if (options.reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(`${HARNESS}${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('.uix-relationship-graph__item').first()).toBeVisible();
};

test('K3: a missing relation is dashed and danger-toned; toned nodes match the legend; no root border', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const read = await page.evaluate(() => {
    const link = [...document.querySelectorAll('.uix-relationship-graph__link')].find((g) => g.dataset.variant === 'dashed');
    const path = getComputedStyle(link.querySelector('path'));
    const ledger = getComputedStyle(document.querySelector('[data-node-id="ledger"]'));
    const legendMissing = getComputedStyle(document.querySelector('.uix-relationship-graph__legend li[data-variant="dashed"]'), '::before');
    const legendAbsent = getComputedStyle(document.querySelector('.uix-relationship-graph__legend li[data-shape="node"][data-tone="danger"]'), '::before');
    return {
      dash: path.strokeDasharray, edge: path.stroke, node: ledger.borderTopColor,
      legendEdge: legendMissing.borderTopColor, legendEdgeStyle: legendMissing.borderTopStyle, legendNode: legendAbsent.borderLeftColor,
      roots: document.querySelectorAll('[data-root]').length,
    };
  });
  expect(read.dash).not.toBe('none');
  expect(read.edge).toBe(read.node);
  expect(read.legendEdge).toBe(read.edge);
  expect(read.legendEdgeStyle).toBe('dashed');
  expect(read.legendNode).toBe(read.node);
  expect(read.roots).toBe(0);
});

test('K3: every label shown, and no two label boxes overlap', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const boxes = await page.evaluate(() => [...document.querySelectorAll('.uix-relationship-graph__link text')].map((text) => {
    const r = text.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, text: text.textContent };
  }));
  expect(boxes.length).toBeGreaterThanOrEqual(8);
  const overlapping = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlapping.push(`${a.text} × ${b.text}`);
    }
  }
  expect(overlapping).toEqual([]);
});

test('K3: a table row reveals its node in the map and keeps focus in the table', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const row = page.locator('#k3-table [data-reveal="vm5"]');
  await row.focus();
  await page.keyboard.press('Enter');
  await expect(row).toBeFocused();
  await expect.poll(() => page.evaluate(() => {
    const viewport = document.querySelector('#k3 .uix-relationship-graph__viewport').getBoundingClientRect();
    const item = document.querySelector('[data-node-id="vm5"]').getBoundingClientRect();
    return item.top >= viewport.top && item.bottom <= viewport.bottom && item.left >= viewport.left && item.right <= viewport.right;
  })).toBe(true);
});

test('K3: with reduced motion the reveal jumps', async ({ page }, testInfo) => {
  await open(page, testInfo, '?case=k3', { reducedMotion: true });
  await page.locator('#k3-table [data-reveal="vm5"]').click();
  const animated = await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
    const stage = document.querySelector('#k3 .uix-relationship-graph__stage');
    resolve({ attribute: stage.hasAttribute('data-animate'), running: stage.getAnimations().length });
  }))));
  expect(animated).toEqual({ attribute: false, running: 0 });
});

test('K3: each node says its relationships, the missing one included', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const description = await page.locator('[data-node-id="ledger"]').evaluate((el) => document.getElementById(el.getAttribute('aria-describedby')).textContent);
  expect(description).toContain('deckt ab, von Kontrolle K3.2 (erwartet, fehlt)');
  expect(description).toContain('schreibt in, von Zahlungs-API');
  expect(description).toContain('läuft auf srv-ledger-prod-01');
});

test('K3: axe', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
