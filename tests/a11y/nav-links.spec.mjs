/* Router links in Breadcrumbs (HAR-1385) and the Segmented link mode / LocaleSwitcher (HAR-1380).
 * MOTUS computes locale-prefixed breadcrumb hrefs and hand-builds `uix-btn` language links with
 * aria-current; TENSOR's portal switch benefits.
 *
 * Measured on a React harness (tests/nav-links/harness.tsx) with German and Bosnian labels, in
 * both themes: client navigation through `renderLink`, the tab order of a link group, the lifted
 * current page next to a toggle Segmented, forced colours, and 320 px.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/nav-links/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#crumbs')).toBeVisible();
};

test('breadcrumb links are the router\'s: a click navigates on the client, the page stays', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const crumbs = page.getByRole('navigation', { name: 'Brotkrümel' });
  await expect(crumbs.locator('a[data-router-link]')).toHaveCount(3);
  await page.evaluate(() => { window.__marker = 'same page'; });
  await crumbs.getByRole('link', { name: 'Autorinnen und Autoren' }).click();
  await expect(page.locator('#where')).toHaveText('/de/autor');
  expect(await page.evaluate(() => window.__marker), 'no reload').toBe('same page');
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText(/Donaudampf/);
});

test('a link group is a named navigation; Tab visits every language, Enter follows it', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const nav = page.getByRole('navigation', { name: 'Sprache', exact: true });
  await expect(nav.getByRole('list')).toBeVisible();
  await expect(nav.getByRole('link')).toHaveCount(3);
  await expect(nav.getByRole('link', { name: 'DE' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Anmelden' }).focus();
  await page.keyboard.press('Tab');
  await expect(nav.getByRole('link', { name: 'BS' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(nav.getByRole('link', { name: 'BS' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(nav.getByRole('link', { name: 'DE' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(nav.getByRole('link', { name: 'EN' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#where')).toHaveText('/en/program/2026');
  await expect(nav.getByRole('link', { name: 'EN' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'EN' })).toHaveAttribute('hreflang', 'en');
  await expect(nav.getByRole('link', { name: 'EN' })).toHaveAttribute('lang', 'en');
});

test('the current link looks like the chosen segment of a toggle group', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const look = (selector) => page.locator(selector).first().evaluate((el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { bg: s.backgroundColor, color: s.color, shadow: s.boxShadow, radius: s.borderRadius, font: s.fontSize, weight: s.fontWeight, height: Math.round(r.height), underline: s.textDecorationLine };
  });
  const chosen = await look('#header [aria-pressed="true"]');
  const current = await look('#locale [aria-current="page"]');
  expect(current).toEqual({ ...chosen, underline: 'none' });
  const idle = await look('#locale li:first-child a');
  expect(idle.bg).not.toBe(current.bg);
  // The two groups are the same height in one header row.
  const heights = await page.evaluate(() => ['#header .uix-segmented', '#locale .uix-segmented'].map((s) => Math.round(document.querySelector(s).getBoundingClientRect().height)));
  expect(heights[0]).toBe(heights[1]);
});

test('forced colours: the current link and the pressed segment keep an outline', async ({ page }, testInfo) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page, testInfo);
  for (const selector of ['#locale [aria-current="page"]', '#header [aria-pressed="true"]', '#long [aria-current="page"]']) {
    const outline = await page.locator(selector).evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline, selector).toBe('solid');
  }
});

test('at 320 px: long titles and long language names wrap; nothing scrolls sideways', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 800 });
  const doc = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(doc.scroll).toBe(doc.client);
  const inside = await page.evaluate(() => ['#crumbs', '#long', '#sidebar'].map((id) => {
    const box = document.querySelector(id).getBoundingClientRect();
    return [...document.querySelectorAll(`${id} a, ${id} [aria-current]`)].every((el) => el.getBoundingClientRect().right <= box.right + 0.5);
  }));
  expect(inside).toEqual([true, true, true]);
});

test('axe: breadcrumbs and link groups', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
