/* Decision-grade charts in a real browser (HAR-1553 overlays, HAR-1554 panels + scatter, HAR-1556
 * InsightCard). The harness (tests/insight/harness.tsx) renders the React components over the same
 * data as the docs page (packages/tokens/guide/insight-examples.js); the docs page is checked too.
 * What only exists once ECharts draws: text boxes that may collide, the dash pattern of every stroke,
 * the linked axis pointer, the scatter's hit targets, and the card's container-query layout.
 * The models themselves are unit-tested in packages/react/src/chart-analytic.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/insight/harness.html';
const DOCS = 'docs/explorer.html#examples-insight-charts';
const GATED = new Set(['serious', 'critical']);

const seedTheme = async (page, theme) => {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
};

const openHarness = async (page, theme) => {
  await seedTheme(page, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  for (const id of ['#analytic', '#delivery']) await expect(page.locator(`${id} [role="img"] svg`).first()).toBeVisible();
};

/** Pairs of visible SVG text boxes inside `selector` that intersect by more than 1 px. */
const textOverlaps = (page, selector) => page.evaluate((sel) => {
  const boxes = [];
  for (const root of document.querySelectorAll(sel)) {
    for (const text of root.querySelectorAll('svg text')) {
      const cs = getComputedStyle(text);
      if (!text.textContent?.trim() || cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      const r = text.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      boxes.push({ t: text.textContent.trim(), l: r.left, r: r.right, top: r.top, b: r.bottom });
    }
  }
  const hits = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
      const h = Math.min(a.b, b.b) - Math.max(a.top, b.top);
      if (w > 1 && h > 1) hits.push(`"${a.t}" × "${b.t}"`);
    }
  }
  return { checked: boxes.length, hits };
}, selector);

const tokenRgb = (page, token) => page.evaluate((t) => {
  const probe = document.createElement('i');
  probe.style.color = `var(${t})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}, token);

test.describe('harness', () => {
  test.beforeEach(async ({ page }, testInfo) => openHarness(page, testInfo.project.name));

  test('no SVG text box overlaps another, in the overlays chart and the level-2 card', async ({ page }) => {
    for (const sel of ['#analytic [role="img"]', '#delivery .uix-insight__main [role="img"]', '#delivery .uix-insight__aside [role="img"]']) {
      const { checked, hits } = await textOverlaps(page, sel);
      expect(checked, `${sel}: text boxes measured`).toBeGreaterThan(8);
      expect(hits, sel).toEqual([]);
    }
  });

  test('the overlays chart carries markArea, markLine and markPoint; only the projection is dashed', async ({ page }) => {
    const kinds = await page.evaluate(() => {
      const opt = window.__chart(document.querySelector('#analytic [role="img"]')).getOption();
      return ['markArea', 'markLine', 'markPoint'].filter((k) => opt.series.some((s) => s[k]?.data?.length));
    });
    expect(kinds).toEqual(['markArea', 'markLine', 'markPoint']);
    const projection = await tokenRgb(page, '--uix-chart-1');
    for (const sel of ['#analytic', '#delivery .uix-insight__main']) {
      const dashed = await page.evaluate((s) => [...document.querySelectorAll(`${s} svg path`)]
        .map((p) => getComputedStyle(p))
        .filter((cs) => cs.stroke !== 'none' && cs.strokeDasharray !== 'none')
        .map((cs) => cs.stroke), sel);
      expect(dashed.length, `${sel}: the projection is drawn dashed`).toBeGreaterThan(0);
      expect(new Set(dashed), `${sel}: every dashed stroke is the projection`).toEqual(new Set([projection]));
    }
  });

  test('the hidden tables gain lower, upper, threshold and event columns', async ({ page }) => {
    const headers = await page.locator('#analytic table.uix-visually-hidden th').allTextContents();
    for (const h of ['Lower', 'Upper', 'Threshold: 15 h budget', 'Event', 'Previous 15 days', 'Projection']) expect(headers).toContain(h);
    // one table per panel in the level-2 chart, plus the scatter's table of label, x and y
    await expect(page.locator('#delivery .uix-insight__main table.uix-visually-hidden')).toHaveCount(3);
    expect(await page.locator('#delivery .uix-insight__aside table.uix-visually-hidden th').allTextContents())
      .toEqual(['Point', 'Items in Review', 'Residence (h)']);
  });

  test('one crosshair: showing the tip on panel 1 moves the axis pointer of every panel to the same x', async ({ page }) => {
    const pointers = await page.evaluate(() => {
      const chart = window.__chart(document.querySelector('#delivery .uix-insight__main [role="img"]'));
      const opt = chart.getOption();
      const first = opt.series.findIndex((s) => s.id === 'residence:review');
      chart.dispatchAction({ type: 'showTip', seriesIndex: first, dataIndex: 5 });
      return chart.getOption().xAxis.map((axis) => ({ value: axis.axisPointer?.value, status: axis.axisPointer?.status }));
    });
    expect(pointers.length).toBe(4); // event lane + three panels
    for (const p of pointers) expect(p).toEqual({ value: 5, status: 'show' });
  });

  test('every scatter point has a hit target of at least 24 px around a smaller dot', async ({ page }) => {
    const sizes = await page.evaluate(() => [...document.querySelectorAll('#delivery .uix-insight__aside svg path')]
      .filter((p) => p.getAttribute('fill-opacity') === '0')
      .map((p) => { const r = p.getBoundingClientRect(); return Math.min(r.width, r.height); }));
    expect(sizes.length).toBe(30);
    for (const size of sizes) expect(size).toBeGreaterThanOrEqual(24);
    await expect(page.locator('#delivery .uix-chart__stats')).toHaveText(/^r = 0\.\d\d · n = 30 · association, not cause$/);
  });

  test('below eight points the scatter shows "not enough data", never a trend', async ({ page }) => {
    await expect(page.locator('#sparse .uix-chart__insufficient')).toHaveText('Not enough data (n = 5 of 8)');
    await expect(page.locator('#sparse svg')).toHaveCount(0);
  });

  test('an event pin is the click-through, not a rotated label', async ({ page }) => {
    const point = await page.evaluate(() => {
      const el = document.querySelector('#analytic [role="img"]');
      const chart = window.__chart(el);
      const [x, y] = chart.convertToPixel({ seriesId: 'uix-event-lane' }, ['Sep 1', 0]);
      const box = el.getBoundingClientRect();
      return { x: box.left + x, y: box.top + y };
    });
    await page.mouse.click(point.x, point.y);
    expect(await page.evaluate(() => window.__clicks)).toContain('event:Release freeze starts');
    // no event text is drawn in the chart at all
    const texts = await page.locator('#analytic svg text').allTextContents();
    expect(texts.some((t) => /leave|freeze|deployed/i.test(t))).toBe(false);
  });

  test('the status is a word and an icon; split puts the aside beside the chart at 1280 px', async ({ page }) => {
    const status = page.locator('#delivery .uix-insight__status');
    await expect(status).toHaveText('Over budget');
    await expect(status.locator('svg')).toHaveCount(1);
    const [main, aside] = await Promise.all(['.uix-insight__main', '.uix-insight__aside'].map((s) => page.locator(`#delivery ${s}`).boundingBox()));
    expect(aside.x).toBeGreaterThanOrEqual(main.x + main.width - 1);
  });

  test('below a 60rem card the split stacks, with no horizontal scroll at 375 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.waitForTimeout(250);
    const [main, aside] = await Promise.all(['.uix-insight__main', '.uix-insight__aside'].map((s) => page.locator(`#delivery ${s}`).boundingBox()));
    expect(aside.y).toBeGreaterThanOrEqual(main.y + main.height - 1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('axe: no serious or critical findings', async ({ page }) => {
    const results = await new AxeBuilder({ page }).include('#root').analyze();
    const gated = results.violations.filter((v) => GATED.has(v.impact));
    expect(gated.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

test.describe('docs page', () => {
  test('the docs examples draw every overlay without text collisions', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await seedTheme(page, testInfo.project.name);
    await page.goto(DOCS, { waitUntil: 'networkidle' });
    const analytic = page.locator('[data-uix-chart="analytic"]');
    await analytic.scrollIntoViewIfNeeded();
    await expect(analytic.locator('svg')).toBeVisible({ timeout: 15_000 });
    for (const el of await page.locator('[data-uix-chart]').all()) {
      await el.scrollIntoViewIfNeeded();
      await expect(el.locator('svg')).toBeVisible({ timeout: 15_000 });
    }
    const kinds = await analytic.evaluate((el) => {
      const opt = window.echarts.getInstanceByDom(el).getOption();
      return ['markArea', 'markLine', 'markPoint'].filter((k) => opt.series.some((s) => s[k]?.data?.length));
    });
    expect(kinds).toEqual(['markArea', 'markLine', 'markPoint']);
    for (const sel of ['[data-uix-chart="analytic"]', '[data-uix-chart="delivery-panels"]', '[data-uix-chart="delivery-scatter"]']) {
      const { checked, hits } = await textOverlaps(page, sel);
      expect(checked, sel).toBeGreaterThan(8);
      expect(hits, sel).toEqual([]);
    }
    await expect(page.locator('[data-uix-chart-stats="delivery-scatter"]').first()).toHaveText(/association, not cause/);
  });
});
