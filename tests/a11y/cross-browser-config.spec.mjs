/* The cross-browser run covers what it says it covers (HAR-2417).
 *
 * The 2.42.0 kit changes (description list, discard step, search bar, shortcut hints) were measured
 * in Chromium only: the opt-in Firefox / WebKit projects matched `select|stat-row`, CI's
 * select-cross-browser job ran those two specs, and each 2.42.0 spec compared `data-theme` with the
 * project name, which is `firefox` / `webkit` there. This reads the three places that have to
 * agree: CROSS_BROWSER_SPECS in playwright.config.mjs, the projects it builds with
 * UIX_CROSS_BROWSER set, the job's command in ci.yml, and each spec's theme mapping.
 * No page is opened.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPECS_2_42 = ['description-list', 'discard-prompt', 'search-bar', 'shortcut'];

/** The config as the cross-browser job loads it. */
const crossBrowserConfig = async () => {
  const before = process.env.UIX_CROSS_BROWSER;
  process.env.UIX_CROSS_BROWSER = '1';
  try {
    return await import(`${pathToFileURL(join(root, 'playwright.config.mjs')).href}?cross=${Date.now()}`);
  } finally {
    if (before === undefined) delete process.env.UIX_CROSS_BROWSER; else process.env.UIX_CROSS_BROWSER = before;
  }
};

test('the 2.42.0 specs are in the cross-browser list, and Firefox and WebKit match them', async () => {
  const { default: config, CROSS_BROWSER_SPECS } = await crossBrowserConfig();
  for (const spec of SPECS_2_42) expect(CROSS_BROWSER_SPECS).toContain(spec);
  const engines = config.projects.filter((p) => ['chromium', 'firefox', 'webkit'].includes(p.name));
  expect(engines.map((p) => p.use.browserName)).toEqual(['chromium', 'firefox', 'webkit']);
  for (const project of engines) {
    for (const spec of CROSS_BROWSER_SPECS) {
      for (const path of [join(root, 'tests', 'a11y', `${spec}.spec.mjs`), `/w/tests/a11y/${spec}.spec.mjs`]) {
        expect(project.testMatch.test(path), `${project.name} runs ${path}`).toBe(true);
      }
    }
    expect(project.testMatch.test(join(root, 'tests', 'a11y', 'drawer.spec.mjs')), `${project.name} runs only the list`).toBe(false);
  }
});

test('CI\'s select-cross-browser job runs every spec in the list, in all three engines', async () => {
  const { CROSS_BROWSER_SPECS } = await crossBrowserConfig();
  const ci = readFileSync(join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
  const job = ci.slice(ci.indexOf('  select-cross-browser:'), ci.indexOf('\n  a11y:'));
  const run = job.split('\n').find((line) => line.includes('npx playwright test'));
  expect(run, 'the job has a playwright command').toBeTruthy();
  for (const spec of CROSS_BROWSER_SPECS) expect(run).toContain(`tests/a11y/${spec}.spec.mjs`);
  for (const engine of ['chromium', 'firefox', 'webkit']) expect(run).toContain(`--project=${engine}`);
  expect(job).toContain("UIX_CROSS_BROWSER: '1'");
});

test('each cross-browser spec maps a firefox / webkit project to the light theme', async () => {
  const { CROSS_BROWSER_SPECS } = await crossBrowserConfig();
  for (const spec of CROSS_BROWSER_SPECS) {
    const source = readFileSync(join(root, 'tests', 'a11y', `${spec}.spec.mjs`), 'utf8');
    expect(source, `${spec} compares the theme with a mapped value`).not.toMatch(/'data-theme',\s*testInfo\.project\.name/);
    expect(source, `${spec} stores a mapped theme`).not.toMatch(/\},\s*testInfo\.project\.name\);/);
    expect(source).toMatch(/const themeOf = /);
  }
});
