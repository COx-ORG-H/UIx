/* Full-page visual snapshots of the three static styleguide pages in both themes.
 * The page set is the safety net the S7 tokenization migrated against: a wrong token
 * map changes rendering, and these goldens catch it. The showcase JS is deterministic
 * (no Math.random / Date / timers — checked), so full-page captures are stable once
 * animations are frozen (config: animations:'disabled') and webfonts have loaded.
 *
 * Theme = project (light | dark). All three pages share a no-flash inline script that
 * reads localStorage['uix-theme'] (else OS pref) and sets [data-theme] before first
 * paint; we seed that key via addInitScript (runs before page scripts) so theming is
 * deterministic regardless of the runner's OS color scheme.
 */
import { test, expect } from '@playwright/test';

const PAGES = [
  { name: 'index', path: 'index.html' },      // the component showcase
  { name: 'tables', path: 'tables.html' },    // data-grid example app
  { name: 'dashboard', path: 'dashboard.html' }, // dashboard example app
  { name: 'phase-46-9-wide', path: 'phase-46-9.html' },
  { name: 'phase-46-9-narrow', path: 'phase-46-9.html', viewport: { width: 390, height: 844 } },
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
      await expect(firstChart.locator('svg')).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    // Capture the full ColorPicker surface rather than only its trigger on the
    // dedicated Phase 46.9 page.
    if (pg.path === 'phase-46-9.html') {
      await page.locator('[data-color-trigger]').click();
      await expect(page.locator('[data-color-dialog]')).toBeVisible();
    }

    await expect(page).toHaveScreenshot(`${pg.name}.png`, { fullPage: true, timeout: 20_000 });
  });
}
