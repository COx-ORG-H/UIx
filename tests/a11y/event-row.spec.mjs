/* EventRow media, weekday, year and time slots (HAR-1370; MOTUS B-P8 programme, TENSOR portal
 * events). In Chromium, light and dark, with Bosnian titles: the tile reads top to bottom
 * weekday, month, day, year, time and is a <time> with a machine date; titles in one list start
 * at one x whatever the tile holds; the thumbnail is 4:3 and cropped; on a phone it goes under
 * the text so the title keeps the row's width; axe passes.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/display/harness.html?case=events';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#event-full')).toBeVisible();
};

const geometry = (page) => page.evaluate(() => Object.fromEntries(['event-plain', 'event-full', 'event-time', 'event-media'].map((id) => {
  const row = document.getElementById(id);
  const title = row.querySelector('.uix-event-row__title').getBoundingClientRect();
  const media = row.querySelector('.uix-event-row__media')?.getBoundingClientRect();
  const r = row.getBoundingClientRect();
  return [id, { row: { left: r.left, right: r.right }, titleLeft: title.left, titleWidth: title.width, titleBottom: title.bottom, media: media && { left: media.left, right: media.right, top: media.top, ratio: media.width / media.height } }];
})));

test('the tile reads weekday, month, day, year, time, and is a <time> with a machine date', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const tile = page.locator('#event-full time.uix-event-date');
  await expect(tile).toHaveAttribute('datetime', '2026-10-22T18:00+02:00');
  const order = await tile.evaluate((el) => [...el.children].map((child) => [child.className.replace('uix-event-date__', ''), child.getBoundingClientRect().top]));
  expect(order.map(([part]) => part)).toEqual(['weekday', 'month', 'day', 'year', 'time']);
  for (let i = 1; i < order.length; i += 1) expect(order[i][1]).toBeGreaterThan(order[i - 1][1]);
});

test('wide: titles start at one x, the thumbnail is 4:3 at the row’s end', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 1280, height: 900 });
  const g = await geometry(page);
  const lefts = Object.values(g).map((row) => Math.round(row.titleLeft));
  expect(new Set(lefts).size, `title x: ${lefts.join(', ')}`).toBe(1);
  expect(g['event-full'].media.ratio).toBeCloseTo(4 / 3, 1);
  expect(Math.abs(g['event-full'].media.right - g['event-full'].row.right)).toBeLessThan(1);
  const fit = await page.locator('#event-full .uix-event-row__media img').evaluate((img) => getComputedStyle(img).objectFit);
  expect(fit).toBe('cover');
});

test('phone: the thumbnail goes under the text, the title keeps the row’s width, nothing scrolls sideways', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 900 });
  const doc = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(doc.scroll).toBe(doc.client);
  const g = await geometry(page);
  for (const id of ['event-full', 'event-media']) {
    expect(g[id].media.top, `${id}: media under the title`).toBeGreaterThanOrEqual(g[id].titleBottom);
    expect(Math.round(g[id].media.left)).toBe(Math.round(g[id].titleLeft));
    expect(g[id].titleWidth, `${id}: the title is not squeezed by the thumbnail`).toBeGreaterThan(g[id].row.right - g[id].titleLeft - 2);
  }
});

test('axe: plain, full, time only, thumbnail only', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
