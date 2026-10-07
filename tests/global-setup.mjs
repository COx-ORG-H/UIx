/* Playwright globalSetup: bundle every React harness once per run (never per worker, so
 * parallel workers never load a half-written bundle).
 *
 * Harnesses are discovered, not listed. A harness is a directory tests/<name>/ holding a
 * harness.html and a build.mjs that exports one function named build…Harness (buildDrawerHarness,
 * buildHarness, …). Adding one means adding that directory and nothing here: the import line and
 * the Promise.all entry this file used to need were edited by every PR that added a harness, so
 * any two of them conflicted (2026-10-07: #91, #94, #97 and #99).
 * tests/a11y/harness-discovery.spec.mjs holds the convention to its failure cases. */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TESTS = fileURLToPath(new URL('.', import.meta.url));
const BUILDER = /^build.*Harness$/;

/** Every harness under `testsDir` as { name, build }, by directory name. Throws instead of
 * returning less than the tree holds: a harness page with no builder, a build.mjs whose builder
 * cannot be told apart, or no harness at all (an empty result would read as "all built"). */
export async function discoverHarnesses(testsDir = TESTS) {
  const dirs = readdirSync(testsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const has = (name, file) => existsSync(join(testsDir, name, file));

  const unbuilt = dirs.filter((name) => has(name, 'harness.html') && !has(name, 'build.mjs'));
  if (unbuilt.length) {
    throw new Error(
      `tests/${unbuilt[0]}/harness.html has no build.mjs next to it, so nothing bundles it` +
        `${unbuilt.length > 1 ? ` (also: ${unbuilt.slice(1).join(', ')})` : ''}. ` +
        'Add tests/<name>/build.mjs exporting one build…Harness function (copy tests/drawer/build.mjs).',
    );
  }

  const harnesses = await Promise.all(dirs.filter((name) => has(name, 'build.mjs')).map(async (name) => {
    const module = await import(pathToFileURL(join(testsDir, name, 'build.mjs')).href);
    const builders = Object.keys(module).filter((key) => BUILDER.test(key) && typeof module[key] === 'function');
    if (builders.length !== 1) {
      throw new Error(
        `tests/${name}/build.mjs must export exactly one function matching ${BUILDER} — found ` +
          `${builders.length ? builders.join(', ') : `none (exports: ${Object.keys(module).join(', ') || 'none'})`}.`,
      );
    }
    return { name, build: module[builders[0]] };
  }));

  if (!harnesses.length) {
    throw new Error(`No harness found: ${testsDir} has no <name>/build.mjs. The harness suites would run against nothing.`);
  }
  return harnesses;
}

export default async function globalSetup() {
  const harnesses = await discoverHarnesses();
  await Promise.all(harnesses.map(({ build }) => build()));
}
