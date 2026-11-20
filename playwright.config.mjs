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

/**
 * The specs that also run in Firefox and WebKit (CI's select-cross-browser job runs exactly these;
 * tests/a11y/cross-browser-config.spec.mjs keeps the two lists equal).
 */
export const CROSS_BROWSER_SPECS = ['select', 'stat-row', 'description-list', 'discard-prompt', 'search-bar', 'shortcut', 'view-transition', 'scroll-edge'];
const CROSS_BROWSER_MATCH = new RegExp(String.raw`[\\/](${CROSS_BROWSER_SPECS.join('|')})\.spec\.mjs$`);
const BASE = `http://localhost:${PORT}/packages/tokens/`;

/**
 * The accessibility lanes (roadmap #18): user settings a page cannot see, emulated in Chromium.
 * Each lane runs only its *.lane.spec.mjs file; light and dark never run a lane file.
 *   forced-colors  a Windows contrast theme (tests/a11y/forced-colors.lane.spec.mjs)
 *   text-spacing   the WCAG 1.4.12 values on every element (tests/a11y/text-settings.lane.spec.mjs)
 *   font-20/24     the browser's default font size at 20 and 24 px (the same file)
 */
const LANE_FILE = /\.lane\.spec\.mjs$/;
const TEXT_SETTINGS = /[\\/]text-settings\.lane\.spec\.mjs$/;
export const A11Y_LANES = [
  { name: 'forced-colors', testMatch: /[\\/]forced-colors\.lane\.spec\.mjs$/, use: { browserName: 'chromium', colorScheme: 'dark', forcedColors: 'active' } },
  { name: 'text-spacing', testMatch: TEXT_SETTINGS, metadata: { textSpacing: true }, use: { browserName: 'chromium', colorScheme: 'light' } },
  { name: 'font-20', testMatch: TEXT_SETTINGS, metadata: { defaultFontSize: 20 }, use: { browserName: 'chromium', colorScheme: 'light' } },
  { name: 'font-24', testMatch: TEXT_SETTINGS, metadata: { defaultFontSize: 24 }, use: { browserName: 'chromium', colorScheme: 'light' } },
];

export default defineConfig({
  // covers tests/visual (VR) + tests/a11y (axe); the scripts filter by subdir. The
  // smoke-consumer fixtures aren't *.spec.* so they're never picked up.
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  // stops a run that has no built CSS, then bundles the React harnesses once
  // (tests/a11y/rich-text.spec.mjs, operator-primitives.spec.mjs)
  globalSetup: ['./tests/require-bundle.mjs', './tests/global-setup.mjs'],
  // flat, project- and platform-suffixed so light/dark/OS goldens never collide
  snapshotPathTemplate: 'tests/visual/__screenshots__/{projectName}-{arg}-{platform}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // the JSON report feeds tests/report-flaky.mjs, which names every test that passed only on its retry
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/playwright-results.json' }]] : 'list',
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
    { name: 'light', testIgnore: LANE_FILE, use: { browserName: 'chromium', colorScheme: 'light' } },
    { name: 'dark', testIgnore: LANE_FILE, use: { browserName: 'chromium', colorScheme: 'dark' } },
    ...A11Y_LANES,
    // Cross-engine keyboard/focus/placement for the Select listbox (HAR-1572), the stat tiles of
    // one stretched row (HAR-1753: a <button> as a flex container), and the four 2.42.0 kit
    // changes (HAR-2417: the description list's container query, the discard step's focus and
    // Escape, the search bar, the shortcut hints), and the scroll edges (scroll timelines in
    // Chromium and WebKit, the static fallback in Firefox before 159). Opt-in, so the default runs stay Chromium-only:
    //   UIX_CROSS_BROWSER=1 npx playwright test <the CROSS_BROWSER_SPECS> --project=chromium --project=firefox --project=webkit
    //   (needs `npx playwright install firefox webkit`). These projects are light; a spec maps any
    //   project that is not `dark` to the light theme.
    ...(process.env.UIX_CROSS_BROWSER ? ['chromium', 'firefox', 'webkit'].map((browserName) => ({
      name: browserName, testMatch: CROSS_BROWSER_MATCH, use: { browserName, colorScheme: 'light' },
    })) : []),
  ],
  webServer: {
    command: 'npm run serve:styleguide',
    url: `${BASE}docs/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
