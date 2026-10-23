/* The description list stacks each label above its value when the LIST is narrow (HAR-2032;
 * TENSOR HAR-1651, audit UXC-04). `.uix-dl` is a `max-content 1fr` grid: on a phone the label
 * column took the longest label's width ("Neue Tickets pro Person und Stunde", ~250 px) and left
 * the value a few pixels, so it broke a letter per line or ran off the screen. The list is now
 * its own inline-size container and stacks below 22rem of its own width.
 *
 * Measured on a React harness (tests/description-list/harness.tsx) with TENSOR's German labels,
 * in both themes: at 320 px, in a 20rem side rail at desktop width, in a wide card, and as a flex
 * item (inline-size containment drops a box's content width, so a list sized by its content
 * must not collapse).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/description-list/harness.html';
const GATED = new Set(['serious', 'critical']);
/** The theme of a project: `light` / `dark`, and light in the cross-browser projects (HAR-2417). */
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, themeOf(testInfo));
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeOf(testInfo));
  await expect(page.locator('dl#card')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
};

/** Every label/value pair of a list, as boxes. */
const pairs = (page, id) => page.locator(`dl#${id}`).evaluate((dl) => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; };
  const list = box(dl);
  const dts = [...dl.querySelectorAll(':scope > dt, :scope > div > dt')];
  return { list, rows: dts.map((dt) => ({ term: dt.textContent, dt: box(dt), dd: box(dt.nextElementSibling) })) };
});

const expectStacked = ({ list, rows }, where) => {
  for (const { term, dt, dd } of rows) {
    expect(dd.top, `${where}: "${term}" sits above its value`).toBeGreaterThanOrEqual(dt.bottom - 0.5);
    expect(Math.abs(dd.left - list.left), `${where}: the value of "${term}" starts at the list's edge`).toBeLessThan(1);
    expect(dd.width, `${where}: the value of "${term}" has the list's full width`).toBeGreaterThan(list.width - 1);
    expect(dt.right, `${where}: "${term}" stays inside the list`).toBeLessThanOrEqual(list.right + 0.5);
  }
  // The label is closer to its own value than to the pair above it.
  for (let i = 1; i < rows.length; i += 1) {
    const inside = rows[i].dd.top - rows[i].dt.bottom;
    const between = rows[i].dt.top - rows[i - 1].dd.bottom;
    expect(inside, `${where}: label-to-value gap ${inside} px < gap between pairs ${between} px`).toBeLessThan(between);
  }
};

const expectSideBySide = ({ rows }, where) => {
  const valueLeft = rows[0].dd.left;
  for (const { term, dt, dd } of rows) {
    expect(dd.left, `${where}: the value of "${term}" is right of its label`).toBeGreaterThan(dt.right);
    expect(Math.abs(dd.top - dt.top), `${where}: "${term}" and its value share a line`).toBeLessThan(1);
    expect(Math.abs(dd.left - valueLeft), `${where}: the values form one column`).toBeLessThan(1);
  }
};

test('at 320 px the list stacks and nothing scrolls sideways', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 800 });
  const doc = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(doc.scroll, `${doc.scroll} px of content in a ${doc.client} px viewport`).toBe(doc.client);
  const card = await pairs(page, 'card');
  expectStacked(card, 'phone card');
  expectStacked(await pairs(page, 'auto'), 'card in an auto grid track');
  // The point of the change: the long label no longer squeezes its value.
  const tickets = card.rows.find((row) => row.term.startsWith('Neue Tickets'));
  expect(tickets.dd.width).toBeGreaterThan(200);
});

test('a 20rem side rail stacks at desktop width; a wide card keeps one label column', async ({ page }, testInfo) => {
  await open(page, testInfo);
  expectStacked(await pairs(page, 'rail'), 'side rail');
  expectSideBySide(await pairs(page, 'wide'), 'wide card');
});

test('the threshold is the list’s own 22rem; pairs in display:contents wrappers stack too', async ({ page }, testInfo) => {
  await open(page, testInfo);
  expectStacked(await pairs(page, 'at-21'), '21rem list');
  expectSideBySide(await pairs(page, 'at-23'), '23rem list');
  expectStacked(await pairs(page, 'wrapped'), 'wrapped pairs');
});

test('a list sized by its content (a flex item) is not collapsed by the containment', async ({ page }, testInfo) => {
  await open(page, testInfo);
  // Inline-size containment drops the content width; contain-intrinsic-inline-size (12rem) stands in.
  const flex = await pairs(page, 'flex');
  expect(flex.list.width, 'the list keeps a usable width beside the avatar').toBeGreaterThanOrEqual(191);
  expectStacked(flex, 'flex item');
  // Sized by the consumer, it takes the row and keeps its label column.
  await page.locator('dl#flex').evaluate((dl) => { dl.style.flex = '1'; });
  expectSideBySide(await pairs(page, 'flex'), 'flex: 1');
});

test('axe: the harness at 320 px', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 800 });
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.passes.length, 'axe measured something').toBeGreaterThan(0);
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
