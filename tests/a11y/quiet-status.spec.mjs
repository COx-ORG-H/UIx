/* Quiet status defaults (HAR-1563, colour K2), measured in Chromium on the docs pages that show
 * them, in both themes:
 *   - a danger pill with the dot treatment: label = --uix-text-hushed, dot = --uix-danger-solid,
 *     no fill, no inline padding;
 *   - a non-critical outline pill: border = --uix-border-strong and a hushed label; the critical
 *     outline keeps a toned border;
 *   - a stat trend: a rise in SLA breaches is red, a fall in open tickets green, and no trend
 *     tile has a toned border;
 *   - the warning alert icon clears 3:1 on its tint (WCAG 1.4.11);
 *   - axe is clean on the Status pill, Stat tile, Alert and Data display pages.
 * The stylesheet rules are pinned in packages/tokens/tests/quiet-status.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const GATED = new Set(['serious', 'critical']);

async function open(page, hash, theme) {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(`docs/explorer.html#${hash}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.evaluate(() => document.fonts.ready);
}

/** Resolve a custom property to the colour the browser paints, as rgb()/rgba(). */
const tokenColour = (page, name) => page.evaluate((n) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${n})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}, name);

test('dot pill: hushed label, danger-solid dot, no fill and no inline padding', async ({ page }, testInfo) => {
  await open(page, 'status-pill', testInfo.project.name);
  const pill = page.locator('[data-pill-treatment="dot"] .uix-pill--danger');
  await expect(pill).toBeVisible();
  const got = await pill.evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, bg: s.backgroundColor, pl: s.paddingLeft, pr: s.paddingRight, dot: getComputedStyle(el.querySelector('.uix-pill__dot')).backgroundColor };
  });
  expect(got.color).toBe(await tokenColour(page, '--uix-text-hushed'));
  expect(got.dot).toBe(await tokenColour(page, '--uix-danger-solid'));
  expect(got.bg).toBe('rgba(0, 0, 0, 0)');
  expect([got.pl, got.pr]).toEqual(['0px', '0px']);
});

test('outline pill: neutral border and hushed label; only critical keeps a toned border', async ({ page }, testInfo) => {
  await open(page, 'status-pill', testInfo.project.name);
  const strong = await tokenColour(page, '--uix-border-strong');
  const hushed = await tokenColour(page, '--uix-text-hushed');
  for (const tone of ['neutral', 'progress', 'success', 'warning', 'danger']) {
    const got = await page.locator(`[data-pill-treatment="outline"] .uix-pill--${tone}`).evaluate((el) => {
      const s = getComputedStyle(el);
      return { border: s.borderTopColor, color: s.color, dot: !!el.querySelector('.uix-pill__dot') };
    });
    expect(got, tone).toEqual({ border: strong, color: hushed, dot: true });
  }
  const critical = await page.locator('[data-pill-treatment="outline"] .uix-pill--critical').evaluate((el) => getComputedStyle(el).borderTopColor);
  expect(critical).toBe(await tokenColour(page, '--uix-danger-solid'));
});

test('stat trends take their colour from sentiment, and toned tiles keep a neutral border', async ({ page }, testInfo) => {
  await open(page, 'examples-data-display', testInfo.project.name);
  const trends = await page.locator('.uix-docs__page .uix-stat__trend').evaluateAll((els) => els.map((el) => ({
    label: el.closest('.uix-stat').querySelector('.uix-stat__label').textContent.trim(),
    cls: el.className,
    color: getComputedStyle(el).color,
    glyph: !!el.querySelector('svg'),
    text: [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''),
  })));
  expect(trends.length).toBeGreaterThan(0);
  const danger = await tokenColour(page, '--uix-danger-text');
  const success = await tokenColour(page, '--uix-success-text');
  const breaches = trends.find((t) => t.label === 'SLA breaches');
  expect(breaches.cls).toContain('uix-stat__trend--up');
  expect(breaches.color, 'a rise in breaches is bad').toBe(danger);
  const openTickets = trends.find((t) => t.label === 'Open tickets');
  expect(openTickets.cls).toContain('uix-stat__trend--down');
  expect(openTickets.color, 'a fall in open tickets is good').toBe(success);
  // the arrow is an icon, never a text character
  for (const t of trends) {
    expect(t.glyph, t.label).toBe(true);
    expect(t.text, t.label).not.toMatch(/[↑↓]/);
  }
  const borders = await page.locator('.uix-docs__page .uix-stat:is(.uix-stat--warning, .uix-stat--danger)').evaluateAll((els) => els.map((el) => getComputedStyle(el).borderTopColor));
  const border = await tokenColour(page, '--uix-border');
  for (const b of borders) expect(b).toBe(border);
});

test('a trend without sentiment is neutral', async ({ page }, testInfo) => {
  await open(page, 'examples-data-display', testInfo.project.name);
  const color = await page.evaluate(() => {
    const el = document.createElement('span');
    el.className = 'uix-stat__trend uix-stat__trend--up';
    document.querySelector('.uix-docs__page').append(el);
    return getComputedStyle(el).color;
  });
  expect(color).toBe(await tokenColour(page, '--uix-text-hushed'));
});

test('the warning alert icon is at least 3:1 on its tint', async ({ page }, testInfo) => {
  await open(page, 'alert', testInfo.project.name);
  const ratio = await page.evaluate(() => {
    const host = document.createElement('div');
    host.className = 'uix-alert uix-alert--warning';
    host.innerHTML = '<div class="uix-alert__icon"><svg viewBox="0 0 24 24"></svg></div><div class="uix-alert__content">x</div>';
    document.querySelector('.uix-docs__page').append(host);
    const rgb = (c) => c.match(/[\d.]+/g).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    // the tint is translucent in dark: composite it over the page surface first
    const over = (fg, bg) => { const a = fg[3] ?? 1; return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)); };
    const page = rgb(getComputedStyle(document.querySelector('.uix-docs__page')).backgroundColor || 'rgb(255,255,255)');
    const base = page.length === 4 && page[3] === 0 ? rgb(getComputedStyle(document.body).backgroundColor) : page;
    const tint = over(rgb(getComputedStyle(host).backgroundColor), base);
    const icon = over(rgb(getComputedStyle(host.querySelector('.uix-alert__icon')).color), tint);
    const [hi, lo] = [lum(icon), lum(tint)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(3);
});

for (const hash of ['status-pill', 'stat-tile', 'alert', 'examples-data-display']) {
  test(`axe: no serious or critical violations on #${hash}`, async ({ page }, testInfo) => {
    await open(page, hash, testInfo.project.name);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([]);
  });
}
