/* Walking the docs explorer one route at a time, for the specs that check every component page
 * (a11y.spec.mjs's native-select walk, label-in-name.spec.mjs, the forced-colors lane). */
import { expect } from '@playwright/test';
import { SHOWCASE_PAGES } from '../../packages/tokens/docs/showcase-data.js';

/** Opens the explorer in `theme` and returns every route the nav and the catalogue list. */
export async function explorerRoutes(page, theme = 'light') {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto('docs/explorer.html#all-components', { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  const routes = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-uix-docs-nav] a.uix-docs__navlink, a.uix-docs__component-card')]
    .map((a) => a.getAttribute('href')).filter((h) => h?.startsWith('#')).map((h) => h.slice(1)))]);
  for (const slug of SHOWCASE_PAGES.map((p) => p.slug)) if (!routes.includes(slug)) routes.push(slug);
  expect(routes.length, 'the walk found the catalogue').toBeGreaterThan(100);
  return routes;
}

/** Shows one route in the already open explorer and waits for its page to render. */
export async function showRoute(page, slug) {
  await page.evaluate((s) => { location.hash = s; }, slug);
  await page.waitForFunction((s) => location.hash === `#${s}` && document.querySelector('[data-docs-page]')?.children.length > 0, slug);
}
