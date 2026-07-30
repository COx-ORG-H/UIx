/* Open-state accessibility gate (UIX-A11Y-5 follow-up to the 2026-07 audit).
 *
 * The base a11y.spec.mjs scans each page in its DEFAULT state — dialogs, popovers,
 * and the rich select are closed, so axe never sees inside them. This spec opens the
 * interactive overlays on index.html first, then scans, closing that blind spot.
 * Same bar as the base gate: serious/critical WCAG 2.1 A/AA violations fail.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const GATED = new Set(['serious', 'critical']);

async function expectNoGatedViolations(page, testInfo, label) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const gated = violations.filter((v) => GATED.has(v.impact));
  await testInfo.attach(`axe-violations-${label}.json`, {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  });
  const summary = gated
    .map((v) => `[${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`)
    .join('\n');
  expect(gated, `${gated.length} serious/critical violation(s) with ${label} open:\n${summary}`).toEqual([]);
}

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name; // 'light' | 'dark'
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto('index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
});

test('modal open', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Open modal' }).click();
  const dialog = page.locator('dialog#demo-modal');
  await expect(dialog).toHaveAttribute('open', '');
  // the dialog must expose an accessible name (audit S2: unnamed dialogs)
  await expect(dialog).toHaveAttribute('aria-labelledby', /.+/);
  await expectNoGatedViolations(page, testInfo, 'modal');
});

test('rich select open', async ({ page }, testInfo) => {
  const trigger = page.locator('[popovertarget="status-sel"]');
  await trigger.click();
  await expect(page.locator('#status-sel')).toBeVisible();
  await expectNoGatedViolations(page, testInfo, 'rich-select');
});
