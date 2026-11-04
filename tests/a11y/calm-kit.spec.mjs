/* Calm kit (2.56), measured in Chromium on tests/calm-kit/harness.html, in both themes:
 *   - the arrival: each card fades and rises 8 px over 420 ms, 45 ms after the one before; lines
 *     trace (700 ms) and numbers count up; then the stage rests, fully visible;
 *   - new data never replays it, and a stage waiting for its data plays when the data lands;
 *   - reduced motion: a fade of <= 200 ms, and marks are drawn at once;
 *   - the glance charts: dashed gridlines, a direct label, a dark tooltip on hover;
 *   - StatusDot words and the critical pill wear the text roles; only the destructive button is a
 *     solid red fill;
 *   - axe is clean.
 * The token values are pinned in packages/tokens/tests/calm-kit.test.mjs. Screenshots at four
 * widths are attached to the report (calm-<width>-<theme>.png). */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const GATED = new Set(['serious', 'critical']);
const URL = '../../tests/calm-kit/harness.html';

async function open(page, theme, query = '') {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(`${URL}${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

const stage = (page) => page.locator('#stage');
/** Every running animation under the stage: [{ name, duration, delay, target }]. */
const animations = (page) => page.evaluate(() => document.getAnimations()
  .filter((a) => a.effect?.target && document.getElementById('stage')?.contains(a.effect.target))
  .map((a) => ({ name: a.animationName, duration: a.effect.getTiming().duration, delay: a.effect.getTiming().delay, target: a.effect.target.className?.baseVal ?? a.effect.target.className })));

const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

test('the arrival: cards rise in reading order, lines trace, then the stage rests fully visible', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  await expect(stage(page)).toHaveAttribute('data-uix-arrive', 'play');
  const running = await animations(page);
  const rise = running.filter((a) => a.name === 'uix-arrive-rise');
  expect(rise.length).toBe(9);
  expect(new Set(rise.map((a) => a.duration))).toEqual(new Set([420]));
  expect(rise.map((a) => Math.round(a.delay)).sort((a, b) => a - b)).toEqual([0, 45, 90, 135, 180, 225, 270, 315, 360]);
  const trace = running.find((a) => a.name === 'uix-arrive-trace');
  expect(trace?.duration).toBe(700);
  expect(Math.round(trace?.delay)).toBe(3 * 45 + 150); // the sparkline in card 3
  expect(running.some((a) => a.name === 'uix-arrive-grow' && a.duration === 500)).toBe(true);
  expect(running.some((a) => a.name === 'uix-arrive-slide' && a.duration === 500)).toBe(true);
  await expect(stage(page)).toHaveAttribute('data-uix-arrive', 'rest', { timeout: 3000 });
  expect(await animations(page)).toEqual([]);
  const items = await page.locator('#stage .uix-arrive__item').evaluateAll((els) => els.map((el) => ({ o: getComputedStyle(el).opacity, t: getComputedStyle(el).transform })));
  expect(items.every((i) => i.o === '1' && i.t === 'none')).toBe(true);
  await expect(page.locator('#count-backlog')).toHaveText('85');
});

test('new data never replays the arrival; a waiting stage plays when its data lands', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  await expect(stage(page)).toHaveAttribute('data-uix-arrive', 'rest', { timeout: 3000 });
  await page.locator('#refresh').click();
  await expect(page.locator('#count-backlog')).toHaveText('86');
  await expect(stage(page)).toHaveAttribute('data-uix-arrive', 'rest');
  const after = await animations(page);
  expect(after.filter((a) => a.name.startsWith('uix-arrive'))).toEqual([]);
  // the line does not animate the new point either (animationDurationUpdate 0, animation off at rest)
  await expect(page.locator('#card-backlog svg text', { hasText: 'Prognose 140' })).toHaveCount(1);

  await open(page, themeOf(testInfo), '?ready=0');
  await expect(stage(page)).toHaveAttribute('data-uix-arrive', 'wait');
  expect(await animations(page)).toEqual([]);
  // the charts drawn while it waited draw in when it plays: the bars are still growing at first
  const tallest = () => page.locator('#card-flow svg').evaluate((svg) => Math.max(...[...svg.querySelectorAll('path')].map((p) => p.getBBox().height)));
  const before = await tallest();
  await page.locator('#load').click();
  await expect(stage(page)).toHaveAttribute('data-uix-arrive', 'play');
  await page.waitForTimeout(520);
  const growing = await tallest();
  await expect(stage(page)).toHaveAttribute('data-uix-arrive', 'rest', { timeout: 3000 });
  await page.waitForTimeout(300);
  const grown = await tallest();
  expect(growing).toBeLessThan(grown * 0.95);
  expect(Math.round(grown)).toBe(Math.round(before));
});

test('reduced motion: the cards only fade, for at most 200 ms, and the marks are simply there', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, themeOf(testInfo));
  const running = await animations(page);
  const fades = running.filter((a) => a.name === 'uix-arrive-fade');
  expect(fades.length).toBe(9);
  expect(fades.every((a) => a.duration <= 200)).toBe(true);
  expect(running.filter((a) => /rise|trace|grow|slide/.test(a.name))).toEqual([]);
  await expect(page.locator('#count-wait')).toHaveText('16');
});

test('glance charts: dashed gridlines, a direct label, a dark tooltip with the exact value', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  await expect(stage(page)).toHaveAttribute('data-uix-arrive', 'rest', { timeout: 3000 });
  const card = page.locator('#card-backlog');
  await expect(card.locator('svg text', { hasText: 'Prognose 140' })).toHaveCount(1);
  const dashed = await card.locator('svg path[stroke-dasharray]').count();
  expect(dashed).toBeGreaterThanOrEqual(3);
  const box = await card.locator('[role="img"]').boundingBox();
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height / 2);
  const tip = card.locator('.uix-glance-tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText(/Woche ab .*offen/s);
  const colours = await tip.evaluate((el) => {
    const box = el.parentElement;
    const probe = document.createElement('span');
    probe.style.color = 'var(--uix-text)';
    document.body.append(probe);
    const text = getComputedStyle(probe).color;
    probe.remove();
    return { bg: getComputedStyle(box).backgroundColor, ink: text };
  });
  expect(colours.bg).toBe(colours.ink);
  // the paired bars: blue and grey, no legend drawn by the chart (the note carries the key)
  await expect(page.locator('#card-flow .uix-legend__item')).toHaveCount(2);
  await expect(page.locator('#card-flow table.uix-visually-hidden th')).toHaveText(['Tag', 'eröffnet', 'gelöst']);
});

test('status words wear the text roles; only the destructive button is a solid red fill', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const got = await page.evaluate(() => {
    const colour = (v) => { const p = document.createElement('span'); p.style.color = v; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const bg = (v) => { const p = document.createElement('span'); p.style.backgroundColor = v; document.body.append(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return c; };
    const s = (sel) => getComputedStyle(document.querySelector(sel));
    return {
      critical: [s('#dot-critical').color, colour('var(--uix-danger-text)')],
      warning: [s('#dot-warning').color, colour('var(--uix-warning-text)')],
      dot: [getComputedStyle(document.querySelector('#dot-critical'), '::before').backgroundColor, bg('var(--uix-danger-solid)')],
      pill: [s('#pill-critical').backgroundColor, bg('var(--uix-danger-bg)'), s('#pill-critical').color, colour('var(--uix-danger-text)')],
      button: [s('#destroy').backgroundColor, bg('var(--uix-danger)')],
    };
  });
  expect(got.critical[0]).toBe(got.critical[1]);
  expect(got.warning[0]).toBe(got.warning[1]);
  expect(got.dot[0]).toBe(got.dot[1]);
  expect(got.pill[0]).toBe(got.pill[1]);
  expect(got.pill[2]).toBe(got.pill[3]);
  expect(got.button[0]).toBe(got.button[1]);
});

test('axe: no serious or critical violations, and screenshots at four widths', async ({ page }, testInfo) => {
  const theme = themeOf(testInfo);
  await open(page, theme);
  await expect(stage(page)).toHaveAttribute('data-uix-arrive', 'rest', { timeout: 3000 });
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `no horizontal scroll at ${width}px`).toBeLessThanOrEqual(0);
    const shot = await page.screenshot({ fullPage: true });
    await testInfo.attach(`calm-${width}-${theme}.png`, { body: shot, contentType: 'image/png' });
    // UIX_SHOTS=<dir>: also write them there, to look at them outside the report
    if (process.env.UIX_SHOTS) writeFileSync(join(process.env.UIX_SHOTS, `calm-${width}-${theme}.png`), shot);
  }
});
