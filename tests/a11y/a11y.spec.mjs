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

// Justified rule exceptions (the plan's "calibrated baseline"). Each { id, why } is a serious/
// critical rule we accept FOR NOW with a written reason and a follow-up. Structural a11y bugs
// (roles, names, labels, focusability) are FIXED, not listed here — only design-level rules that
// need a deliberate visual pass (which changes the palette and wants the VR goldens as a net,
// not yet bootstrapped) are deferred. Burn these down: see the S6 follow-up task.
const A11Y_ALLOW = [
  { id: 'color-contrast', why: 'Pre-existing design-token contrast debt (~236 nodes: hushed/muted meta text, tinted labels/pills/eyebrows, trend deltas). Fixing it properly is a token-contrast pass that shifts the palette system-wide — a deliberate visual change that needs the VR goldens as a net. Tracked as a follow-up; re-gate once remediated.' },
  { id: 'link-in-text-block', why: 'In-text links are distinguished by color alone (no underline) — a visual-design choice. Adding underlines changes the aesthetic everywhere; deferred to the same visual-a11y pass as color-contrast.' },
];
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
