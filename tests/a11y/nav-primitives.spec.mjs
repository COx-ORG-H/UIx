/* Navigation primitives of the overlays-and-keyboard batch, measured in a browser on a German
 * React harness (tests/nav-primitives/harness.tsx), in both themes:
 *
 *   HAR-1754  Tabs overflow="wrap" (the default) wraps the tab row: a row that does not fit goes
 *             onto more rows in all three variants, no tab is wider than its row (one long or
 *             unbroken label wraps inside its tab), nothing scrolls sideways at 240 / 320 px, and
 *             a row that fits stays one row. overflow="scroll" keeps its single row.
 *   HAR-1764  a click or an arrow key on a tab inside a <form> never submits it.
 *   HAR-1810  NavItem as="button" forwards its ref: a Popover anchored to it opens beside the row.
 *   HAR-1828  each treeitem is named by its own row, not by its expanded subtree.
 *   HAR-1829  useVirtualRows measureRows: the spacers and window follow the rows' real height.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleOverlay } from './settle.mjs';

const HARNESS = '/tests/nav-primitives/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
});

const open = async (page, testInfo, width = 1280) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#tabs-line')).toBeVisible();
};

/** Geometry of a tab list: its box, each tab's box, and how many rows the tabs form. */
const rowsOf = (page, id) => page.locator(`#${id}`).evaluate((list) => {
  const box = list.getBoundingClientRect();
  const tabs = [...list.querySelectorAll('[role="tab"]')].map((tab) => {
    const r = tab.getBoundingClientRect();
    return { left: r.left, right: r.right, top: Math.round(r.top), width: r.width };
  });
  return {
    left: box.left, right: box.right, width: box.width, scrollWidth: list.scrollWidth, clientWidth: list.clientWidth,
    wrap: getComputedStyle(list).flexWrap, rows: new Set(tabs.map((t) => t.top)).size, tabs,
  };
});

for (const width of [320, 390]) {
  test(`Tabs wrap: at ${width} px every variant wraps onto more rows and nothing sticks out`, async ({ page }, testInfo) => {
    await open(page, testInfo, width);
    for (const id of ['tabs-line-240', 'tabs-line', 'tabs-enclosed', 'tabs-pill', 'tabs-unbroken']) {
      const g = await rowsOf(page, id);
      expect(g.wrap, `${id} wraps`).toBe('wrap');
      if (id !== 'tabs-unbroken') expect(g.rows, `${id} uses more than one row`).toBeGreaterThan(1);
      expect(g.scrollWidth, `${id} does not scroll sideways`).toBeLessThanOrEqual(g.clientWidth + 1);
      for (const tab of g.tabs) {
        expect(tab.width, `${id}: no tab is wider than its row`).toBeLessThanOrEqual(g.width + 0.5);
        expect(tab.right, `${id}: no tab crosses the row's end`).toBeLessThanOrEqual(g.right + 0.5);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the page does not scroll sideways').toBe(true);
  });
}

test('Tabs wrap: a row that fits stays one row; overflow="scroll" keeps its single scrolling row', async ({ page }, testInfo) => {
  await open(page, testInfo, 1280);
  const wide = await rowsOf(page, 'tabs-line-wide');
  expect(wide.rows).toBe(1);
  // The record harness's scrolling strip is elsewhere; build one here to read the CSS rule.
  const scroll = await page.evaluate(() => {
    const list = document.createElement('div');
    list.className = 'uix-tabs uix-tabs--line uix-tabs--scroll';
    document.body.append(list);
    const value = getComputedStyle(list).flexWrap;
    list.remove();
    return value;
  });
  expect(scroll).toBe('nowrap');
});

test('Tabs wrap: the selected tab keeps its cue on an upper row (line underline, enclosed border, pill fill)', async ({ page }, testInfo) => {
  await open(page, testInfo, 390);
  const cue = await page.evaluate(() => {
    const selected = (id) => document.querySelector(`#${id} [role="tab"][aria-selected="true"]`);
    const line = selected('tabs-line');
    const after = getComputedStyle(line, '::after');
    const lineTab = line.getBoundingClientRect();
    const lineList = document.getElementById('tabs-line').getBoundingClientRect();
    const enclosed = getComputedStyle(selected('tabs-enclosed'));
    const pill = getComputedStyle(selected('tabs-pill'));
    return {
      lineOnUpperRow: lineTab.bottom < lineList.bottom - 8,
      underline: after.transform, underlineHeight: after.height,
      enclosedBorder: enclosed.borderTopWidth, pillShadow: pill.boxShadow,
    };
  });
  expect(cue.lineOnUpperRow, 'the selected line tab sits on an upper row').toBe(true);
  expect(cue.underline === 'none' || cue.underline === 'matrix(1, 0, 0, 1, 0, 0)', `the underline is drawn (${cue.underline})`).toBe(true);
  expect(cue.underlineHeight).toBe('2px');
  expect(cue.enclosedBorder).toBe('1px');
  expect(cue.pillShadow).not.toBe('none');
});

test('Tabs motion: the underline slides after a pointer choice, moves at once from the keyboard and with reduced motion', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const duration = () => page.locator('#tabs-line-wide [role="tab"][aria-selected="true"]')
    .evaluate((tab) => parseFloat(getComputedStyle(tab, '::after').transitionDuration));
  await page.locator('#tabs-line-wide').getByRole('tab', { name: 'Prüfpfad' }).click();
  expect(await duration(), 'a pointer choice keeps the short slide').toBeGreaterThan(0.05);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#tabs-line-wide').getByRole('tab', { name: 'Regulatorische Meldungen' })).toHaveAttribute('aria-selected', 'true');
  expect(await duration(), 'arrow keys: no animation').toBeLessThan(0.01);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.click(5, 5);
  await page.locator('#tabs-line-wide').getByRole('tab', { name: 'Übersicht' }).click();
  expect(await duration(), 'reduced motion: none').toBeLessThan(0.01);
});

test('Tabs in a form: a click and the arrow keys switch tabs and never submit the form', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const preview = page.getByRole('tab', { name: 'Vorschau' });
  await preview.click();
  await expect(preview).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Bearbeiten' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await page.keyboard.press('End');
  await expect(preview).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate(() => window.__nav.submits)).toBe(0);
});

test('NavItem as="button": the forwarded ref anchors a Popover beside the row', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const row = page.locator('#account');
  await expect(row).toHaveJSProperty('tagName', 'BUTTON');
  await row.click();
  const pop = page.locator('#account-menu');
  await expect.poll(() => pop.evaluate((el) => el.matches(':popover-open'))).toBe(true);
  await settleOverlay(pop);
  const [r, p] = [await row.boundingBox(), await pop.boundingBox()];
  expect(Math.abs(p.x - (r.x + r.width)), 'placed against the row\'s end (right-start)').toBeLessThan(12);
  expect(Math.abs(p.y - r.y), 'aligned with the row\'s top').toBeLessThan(12);
});

test('Tree: each treeitem is named by its own row, not by its expanded subtree', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const tree = page.getByRole('tree', { name: 'Organigramm' });
  const items = tree.getByRole('treeitem');
  const expected = ['Grace Hopper', 'Alice Lovelace', 'Bob Builder', 'Cleo Ruiz', 'Mira Kovač', 'Jan Novak', 'Ana Petrović'];
  await expect(items).toHaveCount(expected.length);
  for (const [i, name] of expected.entries()) await expect(items.nth(i)).toHaveAccessibleName(name);
  await expect(tree.getByRole('treeitem', { name: 'Grace Hopper', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(tree.getByRole('treeitem', { name: /Alice Lovelace/ }), 'only Alice matches, not her manager').toHaveCount(1);
  await expect(tree.getByRole('treeitem', { name: /Cleo/ })).toHaveCount(1);
  await expect(tree.getByRole('treeitem', { name: 'Mira Kovač', exact: true }), 'the rich row is named by ariaLabel').toHaveCount(1);
  // Each level is indented past its parent (the `.uix-tree ul` reset used to win: every row at x 0).
  const lefts = await tree.locator('.uix-tree__label').evaluateAll((labels) => labels.map((l) => Math.round(l.getBoundingClientRect().left)));
  const [grace, alice, bob, cleo, mira] = lefts;
  expect(alice).toBeGreaterThan(grace + 8);
  expect(bob).toBe(alice);
  expect(cleo).toBeGreaterThan(bob + 8);
  expect(mira).toBe(grace);
});

test('useVirtualRows measureRows: the window and spacers follow the rows\' real height', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const scroller = page.locator('#rows-scroller');
  await expect(scroller.locator('tr[data-row]').first()).toBeVisible();
  const pitch = await scroller.locator('tr[data-row]').evaluateAll((rows) => {
    const tops = rows.slice(0, 6).map((row) => row.getBoundingClientRect().top);
    return (tops[tops.length - 1] - tops[0]) / (tops.length - 1);
  });
  expect(pitch, 'the rows render taller than the 32 px estimate').toBeGreaterThan(40);
  await expect.poll(() => page.evaluate(() => window.__nav.rows.rowHeight)).toBeCloseTo(pitch, 0);
  const total = await page.evaluate(() => window.__nav.rows.totalHeight);
  expect(Math.abs(total - 5000 * pitch)).toBeLessThan(5000);
  expect(await scroller.evaluate((el) => el.scrollHeight)).toBeGreaterThan(5000 * pitch - 400);
  // Scroll to row 1000: the row at the top of the scroller is row 1000.
  await scroller.evaluate((el, y) => { el.scrollTop = y; }, Math.round(1000 * pitch));
  await expect.poll(() => scroller.evaluate((el) => {
    const top = el.getBoundingClientRect().top;
    const row = [...el.querySelectorAll('tr[data-row]')].find((r) => r.getBoundingClientRect().bottom > top + 1);
    return Number(row?.dataset.index);
  })).toBeGreaterThanOrEqual(999);
  const atTop = await scroller.evaluate((el) => {
    const top = el.getBoundingClientRect().top;
    const row = [...el.querySelectorAll('tr[data-row]')].find((r) => r.getBoundingClientRect().bottom > top + 1);
    return Number(row?.dataset.index);
  });
  expect(atTop).toBeLessThanOrEqual(1001);
  const start = await page.evaluate(() => window.__nav.rows.startIndex);
  expect(start).toBeGreaterThanOrEqual(1000 - 6);
  expect(start).toBeLessThanOrEqual(1000);
});

test('axe: the harness, with the account popover open', async ({ page }, testInfo) => {
  await open(page, testInfo, 390);
  await page.locator('#account').click();
  await settleOverlay(page.locator('#account-menu'));
  const results = await new AxeBuilder({ page }).include('body').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
