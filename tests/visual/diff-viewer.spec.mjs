/* Visual goldens for DiffViewer controlSize (UIx 2.24.0): the MOTUS-style programme
 * comparison (Bosnian words, controlSize="md" under a 60px --uix-control-h) and the compact
 * default, in both themes. Rendered from the React harness (tests/diff-viewer/harness.tsx,
 * bundled in globalSetup). Goldens are Linux-only — see playwright.config.mjs. */
import { test, expect } from '@playwright/test';

const HARNESS = '/tests/diff-viewer/harness.html';

for (const scope of ['programme', 'compact']) {
  test(`diff-viewer-${scope}`, async ({ page }, testInfo) => {
    const theme = testInfo.project.name;
    await page.addInitScript((t) => {
      try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
    }, theme);
    await page.goto(HARNESS, { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(`#${scope}`)).toHaveScreenshot(`diff-viewer-${scope}.png`);
  });
}
