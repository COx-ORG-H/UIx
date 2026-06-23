/* Visual-regression harness over the static styleguide (ADR-0016 Decision 6 — S5).
 *
 * Goldens are LINUX-rendered and OS-suffixed. Generate them in the pinned Playwright
 * container so they match the CI runner exactly:
 *     docker run --rm -v "$PWD:/w" -w /w mcr.microsoft.com/playwright:v1.61.0-jammy \
 *       sh -c "npm ci && npm run build:all && npm run test:visual:update"
 * or run the `update-visual-goldens` workflow. Commit only the *-linux.png files;
 * local Windows/macOS runs produce *-win32 / *-darwin goldens (gitignored) that will
 * NOT match Linux — they exist only to prove the harness runs.
 */
import { defineConfig } from '@playwright/test';

const PORT = 4178;
const BASE = `http://localhost:${PORT}/packages/tokens/`;

export default defineConfig({
  // covers tests/visual (VR) + tests/a11y (axe); the scripts filter by subdir. The
  // smoke-consumer fixtures aren't *.spec.* so they're never picked up.
  testDir: './tests',
  // flat, project- and platform-suffixed so light/dark/OS goldens never collide
  snapshotPathTemplate: 'tests/visual/__screenshots__/{projectName}-{arg}-{platform}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  expect: {
    // tolerate sub-pixel AA noise even on the same OS; a real regression moves far more pixels
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  use: {
    baseURL: BASE,
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  },
  projects: [
    { name: 'light', use: { browserName: 'chromium', colorScheme: 'light' } },
    { name: 'dark', use: { browserName: 'chromium', colorScheme: 'dark' } },
  ],
  webServer: {
    command: 'npm run serve:styleguide',
    url: `${BASE}index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
