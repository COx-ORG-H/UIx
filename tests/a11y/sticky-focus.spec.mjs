/* Sticky-layer focus offsets: WCAG 2.2 SC 2.4.11 Focus Not Obscured (Minimum), technique C43,
 * failure F110, in Chromium, Firefox and WebKit, on tests/sticky-focus/harness.html.
 *
 * A long DataWorkspace with a sticky header, a bulk bar, three toasts that stay and an open TaskTray.
 * Every keyboard focus is checked by hit-testing a grid of points over the focused element's
 * visible box (inside the viewport and every scroller that clips it): the topmost element at a
 * point must be the focused element or inside it.
 *   - at least one point hits it: the element is not entirely hidden (SC 2.4.11, F110);
 *   - every point hits it: nothing covers it at all (C43). A row is wider than any toast, so only
 *     this check fails a row half under the stack; it is what the virtualised case measures.
 * Scenes: `page` (the page scrolls; Tab through every control), `shell` (AppShell layout="viewport";
 * main scrolls under its top bar) and `virtual` (2,000 windowed rows, ↓ / End / ↑ / Home on the
 * keyboard row model, the scroller reaching the window's bottom edge under the layers, so the page
 * cannot scroll the row clear; useVirtualRows `scrollToIndex` and the registry's nudge do).
 * Also: the layers' heights land in --uix-sticky-bottom and leave with them. */
import { test, expect } from '@playwright/test';

const HARNESS = '/tests/sticky-focus/harness.html';
/* the dark project is dark; every other project (light, chromium, firefox, webkit) is light */
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

async function open(page, testInfo, query) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${HARNESS}?${query}&theme=${themeOf(testInfo)}`, { waitUntil: 'networkidle' });
  await expect(page.locator('#tickets tbody tr[data-uix-row-id]').first()).toBeVisible();
}

/** The layers are up and tall enough to cover rows: three toasts, the tray open with its tasks. */
async function layersUp(page) {
  await expect(page.locator('.uix-toaster > [data-toast-id]')).toHaveCount(3);
  await expect(page.locator('.uix-task-tray__panel')).toBeVisible();
  // the stack and the tray have finished arriving (their enter is a transition on the children)
  // (a looping indicator never ends, and a scroll-linked edge follows the scroll, not a clock)
  await page.waitForFunction(() => document.getAnimations().filter((a) => a.timeline === document.timeline && a.playState === 'running'
    && a.effect?.getComputedTiming().endTime !== Infinity).length === 0);
  const bottom = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--uix-sticky-bottom')) || 0);
  expect(bottom, '--uix-sticky-bottom').toBeGreaterThan(150);
  return bottom;
}

/** How much of the focused element shows, two frames after the focus (the registry's nudge runs one frame later). */
const focusReport = (page) => page.evaluate(async () => {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const rect = el.getBoundingClientRect();
  let top = Math.max(rect.top, 0);
  let bottom = Math.min(rect.bottom, document.documentElement.clientHeight);
  let left = Math.max(rect.left, 0);
  let right = Math.min(rect.right, document.documentElement.clientWidth);
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
    const box = node.getBoundingClientRect();
    top = Math.max(top, box.top + node.clientTop);
    bottom = Math.min(bottom, box.top + node.clientTop + node.clientHeight);
    left = Math.max(left, box.left + node.clientLeft);
    right = Math.min(right, box.left + node.clientLeft + node.clientWidth);
  }
  const name = `${el.tagName.toLowerCase()}${el.getAttribute('data-uix-row-id') ? `[row ${el.getAttribute('data-uix-row-id')}]` : ''} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}"`;
  const clipped = { top: Math.round(top), bottom: Math.round(bottom) };
  if (bottom - top < 1 || right - left < 1) return { name, seen: 0, total: 1, clipped, whole: false, covers: [] };
  const columns = 9;
  const rows = 5;
  let seen = 0;
  let total = 0;
  const covers = new Set();
  for (let i = 0; i < columns; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const x = left + 2 + ((right - left - 4) * i) / (columns - 1);
      const y = top + 2 + ((bottom - top - 4) * j) / (rows - 1);
      const hit = document.elementFromPoint(x, y);
      total += 1;
      if (hit && (hit === el || el.contains(hit))) seen += 1;
      else if (hit) covers.add(hit.closest('[class]')?.className.split(' ')[0] ?? hit.tagName);
    }
  }
  // the box is whole when nothing but the viewport edges or a scroller clips it
  const whole = top <= rect.top + 1 && bottom >= rect.bottom - 1;
  return { name, seen, total, clipped, whole, covers: [...covers] };
});

const assertClear = (report, step) => {
  expect(report, `${step}: something has focus`).not.toBeNull();
  expect(report.seen, `${step}: ${report.name} is not entirely hidden (2.4.11); covered by ${report.covers.join(', ')}`).toBeGreaterThan(0);
  expect(report.seen, `${step}: ${report.name} is not covered at all (C43); covered by ${report.covers.join(', ')}`).toBe(report.total);
};

/** Tab from the search field to the end of the page, checking every focus. Returns what was focused. */
async function tabThrough(page) {
  await page.getByRole('searchbox', { name: 'Search tickets' }).focus();
  const names = [];
  for (let step = 0; step < 400; step += 1) {
    await page.keyboard.press('Tab');
    const report = await focusReport(page);
    if (report == null) break; // out of the page
    if (names.length > 3 && report.name === names[0]) break; // wrapped round
    names.push(report.name);
    assertClear(report, `Tab ${step + 1}`);
  }
  return names;
}

for (const scene of ['page', 'shell']) {
  test(`${scene}: Tab through every control of a 60-row workspace; nothing that takes focus is under the header, the bulk bar, the toasts or the task tray`, async ({ page }, testInfo) => {
    await open(page, testInfo, `scene=${scene}`);
    await expect(page.getByRole('toolbar', { name: /bulk/i })).toBeVisible();
    await layersUp(page);
    const names = await tabThrough(page);
    // the run reached the last row's controls, the toasts and the tray, not a short page
    expect(names.some((n) => n.includes('Actions for INC-20459'))).toBe(true);
    expect(names.filter((n) => n.startsWith('button')).length).toBeGreaterThan(100);
  });
}

test('virtual: ↓ through 2,000 windowed rows, then End, ↑ and Home; every row lands clear of the header and the layers over the scroller', async ({ page }, testInfo) => {
  await open(page, testInfo, 'scene=virtual');
  await layersUp(page);
  // the scroller runs under the layers and the page cannot scroll it clear (the case CSS cannot fix)
  const geometry = await page.evaluate(() => {
    const wrap = document.querySelector('#tickets .uix-table-wrap');
    const tray = document.querySelector('.uix-task-tray__panel').getBoundingClientRect();
    const page = document.scrollingElement;
    return { wrapBottom: wrap.getBoundingClientRect().bottom, trayTop: tray.top, pageRoom: page.scrollHeight - page.clientHeight - page.scrollTop, windowed: wrap.querySelectorAll('tbody tr[data-uix-row-id]').length };
  });
  expect(geometry.wrapBottom).toBeGreaterThan(geometry.trayTop + 100);
  expect(geometry.pageRoom).toBeLessThan(100);
  expect(geometry.windowed).toBeLessThan(200);

  // into the rows: the keyboard row model has one row in the tab order
  await page.getByRole('searchbox', { name: 'Search tickets' }).focus();
  for (let step = 0; step < 20; step += 1) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.matches('tr[data-uix-row-id]'))) break;
  }
  await expect(page.locator('#tickets tbody tr[data-uix-row-id]:focus')).toHaveCount(1);
  assertClear(await focusReport(page), 'first row');
  for (let step = 0; step < 30; step += 1) {
    await page.keyboard.press('ArrowDown');
    const report = await focusReport(page);
    assertClear(report, `↓ ${step + 1}`);
  }
  await page.keyboard.press('End');
  await expect(page.locator('#tickets tbody tr[data-uix-row-id="INC-22399"]')).toBeFocused();
  assertClear(await focusReport(page), 'End');
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press('ArrowUp');
    assertClear(await focusReport(page), `↑ ${step + 1}`);
  }
  await page.keyboard.press('Home');
  await expect(page.locator('#tickets tbody tr[data-uix-row-id="INC-20400"]')).toBeFocused();
  assertClear(await focusReport(page), 'Home');
  // and back down past the layers once more, from the top
  for (let step = 0; step < 16; step += 1) {
    await page.keyboard.press('ArrowDown');
    assertClear(await focusReport(page), `↓ again ${step + 1}`);
  }
});

test('the offsets follow the layers: none without toasts or a tray, the stack and the open tray while shown, the property gone once they are', async ({ page }, testInfo) => {
  await open(page, testInfo, 'scene=page&layers=0');
  const read = () => page.evaluate(() => ({
    bottom: getComputedStyle(document.documentElement).getPropertyValue('--uix-sticky-bottom').trim(),
    padding: getComputedStyle(document.documentElement).scrollPaddingBottom,
  }));
  expect(await read()).toEqual({ bottom: '', padding: '0px' });
  await page.evaluate(() => window.__uix.toast.info('One toast', { duration: null }));
  await expect(page.locator('.uix-toaster > [data-toast-id]')).toHaveCount(1);
  await expect.poll(async () => parseFloat((await read()).bottom) || 0).toBeGreaterThan(40);
  const { bottom, padding } = await read();
  expect(padding).toBe(bottom);
  // the stack's own reach: the viewport's bottom edge to the toast's top
  const reach = await page.evaluate(() => Math.ceil(document.documentElement.clientHeight - document.querySelector('.uix-toaster').getBoundingClientRect().top));
  expect(parseFloat(bottom)).toBe(reach);
  await page.evaluate(() => window.__uix.toast.dismiss());
  await expect(page.locator('.uix-toaster > [data-toast-id]')).toHaveCount(0);
  await expect.poll(async () => (await read()).bottom).toBe('');
});
