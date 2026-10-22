/* Accessibility gate (ADR-0016 Decision 6 — S6). Runs axe-core over the canonical docs,
 * every integrated example route, and the specialist table specimen in both themes.
 *
 * Bar (the plan's "calibrated baseline"): serious + critical are GATED; minor/moderate are
 * reported as attachments but not failed. Any unavoidable, justified exception goes in
 * A11Y_ALLOW below WITH a reason and the smallest possible scope — never a blanket disable.
 *
 * Shares the VR harness's deterministic theming (seed localStorage before first paint, assert
 * [data-theme], await fonts) so the scanned DOM is the same one a user sees.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SHOWCASE_PAGES } from '../../packages/tokens/docs/showcase-data.js';

const PAGES = [
  { name: 'tables', path: 'tables.html' }, // specialist data-grid specimen
  { name: 'docs', path: 'docs/explorer.html#introduction' },
  { name: 'docs-status', path: 'docs/explorer.html#component-status' },
  { name: 'docs-chart', path: 'docs/explorer.html#chart' }, // analytical component reference
  { name: 'docs-pipeline', path: 'docs/explorer.html#pipeline' }, // operational stage reference
  { name: 'docs-flow', path: 'docs/explorer.html#flow' }, // process graph reference
  { name: 'docs-calendar-model', path: 'docs/explorer.html#calendar-model' }, // zoned calendar functions (HAR-1504)
  ...SHOWCASE_PAGES.map(({ slug, title }) => ({
    name: slug,
    path: `docs/explorer.html#${slug}`,
    title,
  })),
];

const GATED = new Set(['serious', 'critical']);

// Justified rule exceptions. Each { id, why } is a serious/critical rule we accept with a written
// reason and the smallest possible scope — never a blanket disable. Structural a11y bugs (roles,
// names, labels, focusability) are FIXED, not listed here.
//
// EMPTY as of the 2026-06-23 visual-a11y pass: the two design-level rules that were calibrated in
// S6 — `color-contrast` (~238 nodes) and `link-in-text-block` (10 nodes) — were remediated and are
// now ENFORCED. The fix was a token-contrast pass (new --uix-danger-text/--uix-info-text legible
// text roles mirroring --uix-warning-text; darkened --uix-text-muted; label text mixed toward
// --uix-text; in-text links underlined) — see Docs/plans/2026-06-22-phase2-release-and-gates.md (S6).
const A11Y_ALLOW = [];
const ALLOWED_IDS = new Set(A11Y_ALLOW.map((e) => e.id));

for (const pg of PAGES) {
  test(pg.name, async ({ page }, testInfo) => {
    const theme = testInfo.project.name; // 'light' | 'dark'
    await page.addInitScript((t) => {
      try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
    }, theme);

    await page.goto(pg.path, { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.evaluate(() => document.fonts.ready);

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const gated = violations.filter((v) => GATED.has(v.impact) && !ALLOWED_IDS.has(v.id));

    // attach the full violation set (all impacts) for triage when something fails
    await testInfo.attach('axe-violations.json', {
      body: JSON.stringify(violations, null, 2),
      contentType: 'application/json',
    });

    const summary = gated
      .map((v) => `[${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`)
      .join('\n');
    expect(gated, `${gated.length} serious/critical violation(s) on ${pg.name} [${theme}]:\n${summary}`).toEqual([]);
    // No browser dropdown anywhere in UIx (HAR-1575): only the kit Select's hidden form proxy.
    expect(await visibleNativeSelects(page), `native <select> on ${pg.name} [${theme}]`).toEqual([]);
  });
}

/** Visible native selects that are not the kit Select's form proxy, as "id or text" strings. */
const visibleNativeSelects = (page) => page.evaluate(() => [...document.querySelectorAll('select:not([data-uix-select-proxy])')]
  .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; })
  .map((el) => el.id || el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40)));

// The runtime half of the native-select gate (HAR-1575; the static half is
// packages/react/src/no-native-select.test.mjs): every route of the explorer (each component
// reference, each composition, each guide page) in this theme project. No axe here, so one page
// walks all of them.
test('no visible native select on any explorer route', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto('docs/explorer.html#all-components', { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  // every page the nav lists (guides, references) and every card of the catalogue
  const routes = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-uix-docs-nav] a.uix-docs__navlink, a.uix-docs__component-card')].map((a) => a.getAttribute('href')).filter((h) => h?.startsWith('#')).map((h) => h.slice(1)))]);
  for (const slug of SHOWCASE_PAGES.map((p) => p.slug)) if (!routes.includes(slug)) routes.push(slug);
  expect(routes.length, 'the walk found the catalogue').toBeGreaterThan(100);
  const found = [];
  for (const slug of routes) {
    await page.evaluate((s) => { location.hash = s; }, slug);
    await page.waitForFunction((s) => location.hash === `#${s}` && document.querySelector('[data-docs-page]')?.children.length > 0, slug);
    for (const hit of await visibleNativeSelects(page)) found.push(`#${slug}: ${hit}`);
  }
  expect(found, `native <select> in the explorer [${theme}]`).toEqual([]);
});
