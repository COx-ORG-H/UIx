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
];

for (const pg of PAGES) {
  test(pg.name, async ({ page }, testInfo) => {
    const theme = testInfo.project.name; // 'light' | 'dark'
    await page.addInitScript((t) => {
      try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
    }, theme);

    await page.goto(pg.path, { waitUntil: 'networkidle' });
    // theme seeded correctly + webfonts resolved before we snapshot
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot(`${pg.name}.png`, { fullPage: true });
  });
}
