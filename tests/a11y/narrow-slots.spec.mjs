/* The Alert `actions` and the SectionHead `action` move under the text when the row has no room
 * (HAR-4803; TENSOR HAR-4779). At 320 px an alert with a short button squeezed its sentence to a
 * few letters per line, and a section head wrapped a three-option Segmented inside itself instead
 * of moving it under the title. The alert's text and actions now share one wrapping row
 * (.uix-alert__main) in which the text asks for 14rem first; the section head's row wraps.
 *
 * Measured on a React harness (tests/narrow-slots/harness.tsx) in both themes, at 320 px and at
 * 1280 px, including alerts sized by their content: those must keep their natural width (a
 * size-contained alert became a fixed 354 px in review). */
import { test, expect } from '@playwright/test';
import AxeBuilder from './axe.mjs';

const HARNESS = '/tests/narrow-slots/harness.html';
const GATED = new Set(['serious', 'critical']);
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

const open = async (page, testInfo, width) => {
  await page.setViewportSize({ width, height: 1400 });
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, themeOf(testInfo));
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeOf(testInfo));
  await expect(page.locator('#alert')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
};

/** Boxes of an alert's parts. */
const alertParts = (page, id) => page.locator(`#${id}`).evaluate((alert) => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; };
  return {
    alert: box(alert),
    // Markup before HAR-4803 has no shared row: the text column stands in for it.
    main: box(alert.querySelector('.uix-alert__main') ?? alert.querySelector('.uix-alert__content')),
    content: box(alert.querySelector('.uix-alert__content')),
    action: box(alert.querySelector('.uix-alert__actions > *')),
    dismiss: box(alert.querySelector('.uix-alert__dismiss')),
  };
});

const headParts = (page, id) => page.locator(`#${id}`).evaluate((head) => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; };
  const action = head.lastElementChild;
  const options = Array.from(action.querySelectorAll('button, a'));
  return {
    head: box(head),
    title: box(head.firstElementChild),
    action: box(action),
    rows: new Set(options.map((o) => Math.round(o.getBoundingClientRect().top))).size,
  };
});

const noPageOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test('at 320 px an alert\'s action sits under its text, which keeps the full row', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, info, 320);
  for (const id of ['alert', 'alert-short', 'alert-short-dismiss', 'alert-plain', 'alert-col']) {
    const p = await alertParts(page, id);
    // The sentence used to share the row with the button and break every few letters.
    expect(p.content.width, `${id}: the text takes the whole row beside the icon`).toBeGreaterThan(p.main.width - 1);
    expect(p.action.top, `${id}: the action starts under the text`).toBeGreaterThanOrEqual(p.content.bottom - 0.5);
    expect(Math.abs(p.action.left - p.content.left), `${id}: the action starts where the text does`).toBeLessThan(1);
    expect(p.action.right, `${id}: the action stays inside the alert`).toBeLessThanOrEqual(p.alert.right + 0.5);
    if (p.dismiss) {
      expect(p.dismiss.top, `${id}: the × stays on the first row`).toBeLessThan(p.content.bottom);
      expect(p.dismiss.left, `${id}: the × keeps the end`).toBeGreaterThanOrEqual(p.content.right - 0.5);
    }
  }
  expect(await noPageOverflow(page), 'nothing scrolls sideways').toBe(true);
  await page.screenshot({ path: info.outputPath('alerts-320.png'), fullPage: true });
});

test('at 1280 px an alert\'s action stays beside its text, and a content-sized alert keeps its width', async ({ page }, info) => {
  await open(page, info, 1280);
  for (const id of ['alert', 'alert-short', 'alert-short-dismiss', 'alert-plain', 'alert-panel', 'alert-col', 'alert-grid']) {
    const p = await alertParts(page, id);
    expect(p.action.left, `${id}: the action follows the text`).toBeGreaterThanOrEqual(p.content.right - 0.5);
    expect(p.action.top, `${id}: on the text's row`).toBeLessThan(p.content.bottom);
  }
  // Sized by its content: "Gespeichert." and its button, not a fixed fallback width. Its text is
  // shorter than the 14rem the text asks for, so the button sits under it: a narrow box, still
  // its own content's width.
  const fit = await alertParts(page, 'alert-fit');
  expect(fit.alert.width, 'a fit-content alert is as wide as its content').toBeLessThan(300);
  expect(fit.action.right, 'and holds its button').toBeLessThanOrEqual(fit.alert.right + 0.5);
  expect(await noPageOverflow(page)).toBe(true);
});

test('alerts sized by their content never push a 320 px page sideways', async ({ page }, info) => {
  await open(page, info, 320);
  const column = await page.locator('#alert-col').evaluate((el) => el.getBoundingClientRect().right <= el.parentElement.getBoundingClientRect().right + 0.5);
  const grid = await page.locator('#alert-grid').evaluate((el) => el.getBoundingClientRect().right <= el.parentElement.getBoundingClientRect().right + 0.5);
  expect(column, 'the column-flex alert fits its column').toBe(true);
  expect(grid, 'the grid alert fits its column').toBe(true);
  expect(await noPageOverflow(page)).toBe(true);
});

test('at 320 px a section head\'s action moves under its title, whole', async ({ page }, info) => {
  await open(page, info, 320);
  const head = await headParts(page, 'head');
  expect(head.action.top, 'the Segmented starts under the title').toBeGreaterThanOrEqual(head.title.bottom - 0.5);
  expect(head.rows, 'its three options stay on one row').toBe(1);
  expect(head.action.right).toBeLessThanOrEqual(head.head.right + 0.5);
  expect(Math.abs(head.action.left - head.head.left), 'lined up with the title').toBeLessThan(1);
  // A short title and a quiet link still share the row.
  const link = await headParts(page, 'head-link');
  expect(link.action.top).toBeLessThan(link.title.bottom);
  expect(link.action.right).toBeGreaterThan(link.head.right - 1);
});

test('at 1280 px a section head\'s action stays at the end of the title row', async ({ page }, info) => {
  await open(page, info, 1280);
  const head = await headParts(page, 'head');
  expect(head.action.top).toBeLessThan(head.title.bottom);
  expect(head.action.right).toBeGreaterThan(head.head.right - 1);
});

for (const width of [320, 1280]) test(`the narrow-slot harness has no serious axe violation at ${width} px`, async ({ page }, info) => {
  await open(page, info, width);
  const results = await new AxeBuilder({ page }).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact ?? ''));
  expect(gated.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
