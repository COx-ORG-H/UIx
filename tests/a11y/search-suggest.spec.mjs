/* SearchSuggest + .uix-arrival in a real browser (TENSOR HAR-763).
 *
 * The harness (tests/search-suggest/harness.tsx) is bundled from source in globalSetup. What only
 * exists when rendered: axe over the open list in both themes, the popup's opaque surface above
 * the page, middle-first breadcrumb truncation at 280px, the two-line context clamp, the keyboard
 * journey to a landed target, and the arrival highlight (animated, and static under reduced
 * motion). The markup contract is in packages/react/src/search-suggest-dom.test.mjs.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/search-suggest/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#full .uix-search-suggest')).toBeVisible();
});

const field = (page) => page.getByRole('combobox', { name: 'Search settings', exact: true });

test('no serious or critical axe violations with results, recent list, loading and error open', async ({ page }) => {
  await field(page).fill('zone');
  await expect(page.locator('#full [role="option"]').first()).toBeVisible();
  const withResults = await new AxeBuilder({ page }).include('#full .uix-search-suggest').include('#narrow').analyze();
  expect(withResults.passes.length, 'axe measured something').toBeGreaterThan(0);
  expect(withResults.violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

  await field(page).fill('');
  await expect(page.getByText('Recently opened')).toBeVisible();
  await page.getByRole('combobox', { name: 'Search settings (loading)' }).focus();
  const states = await new AxeBuilder({ page }).include('#full .uix-search-suggest').include('#loading').include('#error').analyze();
  expect(states.passes.length).toBeGreaterThan(0);
  expect(states.violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test('the list floats on an opaque surface above the page', async ({ page }) => {
  await field(page).fill('s');
  const popup = page.locator('#full .uix-search-suggest__popup');
  await expect(popup).toBeVisible();
  const style = await popup.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { position: cs.position, bg: cs.backgroundColor, shadow: cs.boxShadow, z: Number(cs.zIndex) };
  });
  expect(style.position).toBe('absolute');
  expect(style.bg).toMatch(/^rgb\(/);
  expect(style.shadow).not.toBe('none');
  expect(style.z).toBeGreaterThan(0);
});

test('at 280px the breadcrumb gives up its middle crumbs first', async ({ page }) => {
  const crumbs = page.locator('#narrow [role="option"]').first().locator('.uix-search-suggest__crumb');
  await expect(crumbs).toHaveCount(4);
  const widths = await crumbs.evaluateAll((els) => els.map((el) => ({ client: el.clientWidth, scroll: el.scrollWidth })));
  const [first, ...rest] = widths;
  const last = rest.pop();
  expect(first.scroll - first.client, 'first crumb readable').toBeLessThanOrEqual(1);
  expect(last.scroll - last.client, 'last crumb readable').toBeLessThanOrEqual(1);
  expect(rest.some((w) => w.scroll > w.client), 'a middle crumb is truncated, or the fixture proves nothing').toBe(true);
});

test('the context clamps at two lines and the title stays on one', async ({ page }) => {
  const row = page.locator('#narrow [role="option"]').first();
  const lines = await row.evaluate((el) => {
    const lh = (node) => parseFloat(getComputedStyle(node).lineHeight);
    const desc = el.querySelector('.uix-search-suggest__desc');
    const title = el.querySelector('.uix-search-suggest__title');
    return { desc: Math.round(desc.clientHeight / lh(desc)), title: Math.round(title.clientHeight / lh(title)) };
  });
  expect(lines).toEqual({ desc: 2, title: 1 });
});

test('keyboard journey: type, arrow, Enter — the target lands in view with the arrival highlight', async ({ page }) => {
  await field(page).focus();
  await expect(page.getByText('Recently opened')).toBeVisible();
  await page.keyboard.type('geschaft'); // no match in English — empty state names a next step
  await expect(page.locator('#full .uix-search-suggest__state')).toContainText('No settings match');
  await field(page).fill('');
  await page.keyboard.type('hours');
  await page.keyboard.press('ArrowDown');
  const active = await field(page).getAttribute('aria-activedescendant');
  await expect(page.locator(`[id="${active}"]`)).toContainText('Business hours');
  await expect(field(page)).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.__ss.picks)).toEqual(['business-hours']);
  const target = page.locator('#setting-business-hours');
  await expect(target).toHaveClass(/uix-arrival/);
  await expect(target).toBeInViewport();
  const tint = await target.evaluate((el) => getComputedStyle(el).animationName);
  expect(tint).toBe('uix-arrival');
});

test('Escape closes the list, a second Escape clears the text', async ({ page }) => {
  await field(page).fill('zone');
  await expect(page.locator('#full .uix-search-suggest__popup')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#full .uix-search-suggest__popup')).toBeHidden();
  await expect(field(page)).toHaveValue('zone');
  await page.keyboard.press('Escape');
  await expect(field(page)).toHaveValue('');
});

test('strategy="fixed": the list escapes a clipping toolbar and matches the field width', async ({ page }) => {
  await page.locator('#clipped').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  const toolbarField = page.getByRole('combobox', { name: 'Search settings (toolbar)' });
  await toolbarField.focus();
  const popup = page.locator('#clipped .uix-search-suggest__popup');
  await expect(popup).toBeVisible();
  const geo = await page.evaluate(() => {
    const clip = document.querySelector('#clipped [data-clip]').getBoundingClientRect();
    const list = document.querySelector('#clipped .uix-search-suggest__popup');
    const field = document.querySelector('#clipped .uix-search-suggest__field').getBoundingClientRect();
    const box = list.getBoundingClientRect();
    const probe = document.elementFromPoint(box.left + box.width / 2, Math.min(box.bottom - 4, clip.bottom + 24));
    return { clipBottom: clip.bottom, listBottom: box.bottom, listWidth: Math.round(box.width), fieldWidth: Math.round(field.width), hit: list.contains(probe), position: getComputedStyle(list).position };
  });
  expect(geo.position).toBe('fixed');
  expect(geo.listBottom, 'the fixture must overflow the clip, or this proves nothing').toBeGreaterThan(geo.clipBottom + 24);
  expect(geo.hit, 'the part below the clipping box is painted, not cut off').toBe(true);
  expect(geo.listWidth).toBe(geo.fieldWidth);
});

test('reduced motion: no list animation, and the arrival is a static outline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await field(page).fill('mailbox');
  const popupAnimation = await page.locator('#full .uix-search-suggest__popup').evaluate((el) => getComputedStyle(el).animationName);
  expect(popupAnimation).toBe('none');
  await page.keyboard.press('Enter');
  const target = page.locator('#setting-mailbox');
  await expect(target).toHaveClass(/uix-arrival/);
  const arrival = await target.evaluate((el) => ({ name: getComputedStyle(el).animationName, timing: getComputedStyle(el).animationTimingFunction }));
  expect(arrival).toEqual({ name: 'uix-arrival-static', timing: 'steps(1)' });
});
