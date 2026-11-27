/* The Alert `actions` and the SectionHead `action` move under the text when the row has no room
 * (HAR-4803; TENSOR HAR-4779). At 320 px an alert with a button squeezed its sentence to a letter
 * or a few per line, and a section head wrapped a three-option Segmented inside itself instead of
 * moving it under the title. The alert is now its own inline-size container: below 30rem its
 * actions take a row under the text, lined up with it, and the × keeps the top end. The section
 * head's row wraps.
 *
 * Measured on a React harness (tests/narrow-slots/harness.tsx) in both themes, at 320 px and at
 * 1280 px (where nothing moves). */
import { test, expect } from '@playwright/test';
import AxeBuilder from './axe.mjs';

const HARNESS = '/tests/narrow-slots/harness.html';
const GATED = new Set(['serious', 'critical']);
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

const open = async (page, testInfo, width) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, themeOf(testInfo));
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeOf(testInfo));
  await expect(page.locator('#alert')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
};

/** Boxes of an alert's parts, and how many characters its sentence fits on a line. */
const alertParts = (page, id) => page.locator(`#${id}`).evaluate((alert) => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; };
  const body = alert.querySelector('.uix-alert__body');
  let perLine = Infinity;
  if (body) {
    const range = document.createRange(); range.selectNodeContents(body);
    const lines = new Set(Array.from(range.getClientRects()).map((rect) => Math.round(rect.top))).size;
    perLine = body.textContent.length / Math.max(1, lines);
  }
  return {
    alert: box(alert),
    content: box(alert.querySelector('.uix-alert__content')),
    actions: box(alert.querySelector('.uix-alert__actions')),
    action: box(alert.querySelector('.uix-alert__actions > *')),
    dismiss: box(alert.querySelector('.uix-alert__dismiss')),
    icon: box(alert.querySelector('.uix-alert__icon')),
    perLine,
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

test('at 320 px an alert\'s actions sit under its text, and the text stays readable', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, info, 320);
  for (const id of ['alert', 'alert-dismiss', 'alert-plain']) {
    const p = await alertParts(page, id);
    // A readable measure: the sentence used to break every few characters beside the button.
    expect(p.perLine, `${id}: characters per line`).toBeGreaterThanOrEqual(20);
    expect(p.actions.top, `${id}: the actions start under the text`).toBeGreaterThanOrEqual(p.content.bottom - 0.5);
    expect(p.actions.right, `${id}: the actions stay inside the alert`).toBeLessThanOrEqual(p.alert.right + 0.5);
    // Lined up with the text, not with the icon.
    expect(Math.abs(p.action.left - p.content.left), `${id}: the action starts where the text does`).toBeLessThan(1);
    if (p.dismiss) {
      expect(p.dismiss.top, `${id}: the × stays on the first row`).toBeLessThan(p.content.bottom);
      expect(p.dismiss.right, `${id}: the × keeps the end`).toBeGreaterThan(p.content.right);
    }
  }
  // A flex item with no width of its own keeps a usable width.
  const flex = await alertParts(page, 'alert-flex');
  expect(flex.alert.width).toBeGreaterThan(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('alerts-320.png'), fullPage: true });
});

test('at 1280 px an alert\'s actions stay beside its text', async ({ page }, info) => {
  await open(page, info, 1280);
  for (const id of ['alert', 'alert-dismiss', 'alert-plain']) {
    const p = await alertParts(page, id);
    expect(p.actions.left, `${id}: the actions follow the text`).toBeGreaterThanOrEqual(p.content.right - 0.5);
    expect(p.actions.top, `${id}: on the text's row`).toBeLessThan(p.content.bottom);
  }
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
