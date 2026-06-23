/* Accessibility gate (ADR-0016 Decision 6 — S6). Runs axe-core over the three static
 * styleguide pages in both themes and fails on serious/critical WCAG 2.1 A/AA violations.
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

const PAGES = [
  { name: 'index', path: 'index.html' },      // the component showcase
  { name: 'tables', path: 'tables.html' },    // data-grid example app
  { name: 'dashboard', path: 'dashboard.html' }, // dashboard example app
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
  });
}
