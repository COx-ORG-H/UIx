/* Full-page visual snapshots of representative canonical docs routes in both themes.
 * The page set is the safety net the S7 tokenization migrated against: a wrong token
 * map changes rendering, and these goldens catch it. The showcase JS is deterministic
 * (no Math.random / Date / timers — checked), so full-page captures are stable once
 * animations are frozen (config: animations:'disabled') and webfonts have loaded.
 *
 * Theme = project (light | dark). All pages share a no-flash inline script that
 * reads localStorage['uix-theme'] (else OS pref) and sets [data-theme] before first
 * paint; we seed that key via addInitScript (runs before page scripts) so theming is
 * deterministic regardless of the runner's OS color scheme.
 */
import { test, expect } from '@playwright/test';

// The component showcase is intentionally a long full-page specimen. Rendering
// its lazy charts and encoding the complete Linux golden can exceed Playwright's
// 30-second per-test default on a cold container.
test.setTimeout(60_000);

const PAGES = [
  { name: 'docs-foundations', path: 'docs/explorer.html#examples-foundations' },
  { name: 'tables', path: 'tables.html' },
  { name: 'docs-workspace', path: 'docs/explorer.html#examples-workspace' },
  { name: 'docs-rule-builder-wide', path: 'docs/explorer.html#examples-rule-builder' },
  { name: 'docs-color-picker-narrow', path: 'docs/explorer.html#examples-color-picker', viewport: { width: 390, height: 844 }, openColorPicker: true },
];

for (const pg of PAGES) {
  test(pg.name, async ({ page }, testInfo) => {
    const theme = testInfo.project.name; // 'light' | 'dark'
    await page.addInitScript((t) => {
      try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
    }, theme);

    if (pg.viewport) await page.setViewportSize(pg.viewport);
    await page.goto(pg.path, { waitUntil: 'networkidle' });
    // theme seeded correctly + webfonts resolved before we snapshot
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.evaluate(() => document.fonts.ready);

    // Charts initialize near the viewport to keep their renderer out of the critical
    // path. Exercise that real user path before the full-page capture so the lazy
    // optimization does not turn the existing chart goldens into empty containers.
    const firstChart = page.locator('[data-uix-chart]').first();
    if (await firstChart.count()) {
      await firstChart.scrollIntoViewIfNeeded();
      // ECharts is intentionally fetched only when the chart section nears the
      // viewport. Allow the pinned Linux container enough time to resolve the CDN
      // asset before treating the renderer as missing.
      await expect(firstChart.locator('svg')).toBeVisible({ timeout: 15_000 });
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    // Capture the full ColorPicker surface rather than only its trigger on the
    // dedicated ColorPicker example route.
    if (pg.openColorPicker) {
      await page.locator('[data-color-trigger]').click();
      await expect(page.locator('[data-color-dialog]')).toBeVisible();
    }

    await expect(page).toHaveScreenshot(`${pg.name}.png`, { fullPage: true, timeout: 20_000 });
  });
}
