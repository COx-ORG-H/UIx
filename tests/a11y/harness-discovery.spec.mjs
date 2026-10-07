/* The harness convention cannot break quietly.
 *
 * tests/global-setup.mjs finds the React harnesses instead of listing them (a list was a line
 * every harness PR edited, so any two conflicted). What a list gave for free is that a harness
 * missing from it was visible in review; discovery has to say so itself. This spec runs
 * discoverHarnesses() against small trees that each break the convention one way, and against the
 * real tests/ directory:
 *   - a harness.html with no build.mjs fails, and names the directory;
 *   - a build.mjs with no build…Harness export, or two, fails;
 *   - a tree with no harness fails (zero found must not read as "all built").
 * No browser. Theme-independent, so it runs once (light).
 */
import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverHarnesses } from '../global-setup.mjs';

const TESTS = fileURLToPath(new URL('..', import.meta.url));

test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== 'light', 'theme-independent'));

const trees = [];
test.afterAll(() => trees.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

/** A throwaway tests/ directory from { 'name/file': contents }. A fresh path each time, because
 * `import()` caches a module by URL. */
const tree = (files) => {
  const root = mkdtempSync(join(tmpdir(), 'uix-harness-'));
  trees.push(root);
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), contents);
  }
  return root;
};

const builder = (name) => `export async function ${name}() { return '${name}'; }\n`;

test('finds every harness, whatever its builder is called, and nothing else', async () => {
  const root = tree({
    'rich-text/harness.html': '',
    'rich-text/build.mjs': builder('buildHarness'),
    'drawer/harness.html': '',
    // a helper next to the builder is not a second builder
    'drawer/build.mjs': `${builder('buildDrawerHarness')}export const outdir = 'dist';\nexport function rebuild() {}\n`,
    'visual/styleguide.spec.mjs': '',
    'smoke-consumer/run.mjs': '',
    'README.md': '',
  });
  const harnesses = await discoverHarnesses(root);
  expect(harnesses.map(({ name }) => name)).toEqual(['drawer', 'rich-text']);
  expect(await Promise.all(harnesses.map(({ build }) => build()))).toEqual(['buildDrawerHarness', 'buildHarness']);
});

test('a harness.html with no build.mjs fails and names the directory', async () => {
  const root = tree({
    'drawer/harness.html': '',
    'drawer/build.mjs': builder('buildDrawerHarness'),
    'select/harness.html': '',
    'select/harness.tsx': '',
  });
  await expect(discoverHarnesses(root)).rejects.toThrow(/tests\/select\/harness\.html has no build\.mjs/);
});

test('a build.mjs with no build…Harness export fails', async () => {
  const root = tree({ 'select/harness.html': '', 'select/build.mjs': builder('bundleSelect') });
  await expect(discoverHarnesses(root)).rejects.toThrow(/tests\/select\/build\.mjs must export exactly one function.*none \(exports: bundleSelect\)/);
});

test('a build.mjs with two build…Harness exports fails rather than picking one', async () => {
  const root = tree({ 'select/harness.html': '', 'select/build.mjs': builder('buildSelectHarness') + builder('buildListboxHarness') });
  await expect(discoverHarnesses(root)).rejects.toThrow(/exactly one function.*buildListboxHarness, buildSelectHarness/);
});

test('a build…Harness export that is not a function does not count', async () => {
  const root = tree({ 'select/harness.html': '', 'select/build.mjs': "export const buildSelectHarness = 'dist';\n" });
  await expect(discoverHarnesses(root)).rejects.toThrow(/exactly one function.*none/);
});

test('no harness at all fails', async () => {
  await expect(discoverHarnesses(tree({ 'visual/styleguide.spec.mjs': '' }))).rejects.toThrow(/No harness found/);
  await expect(discoverHarnesses(tree({}))).rejects.toThrow(/No harness found/);
});

test('this repository: every tests/*/harness.html is discovered, and global setup bundled it', async () => {
  // Listed here independently of discoverHarnesses(), so the two cannot agree by sharing a bug.
  const pages = readdirSync(TESTS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(TESTS, entry.name, 'harness.html')))
    .map((entry) => entry.name)
    .sort();
  expect(pages.length, 'tests/ holds harness pages').toBeGreaterThan(0);

  const discovered = (await discoverHarnesses()).map(({ name }) => name);
  expect(discovered).toEqual(pages);
  // global setup ran before this worker started; each harness it built left a dist/ behind
  expect(pages.filter((name) => !existsSync(join(TESTS, name, 'dist'))), 'harnesses with no bundle').toEqual([]);
});
