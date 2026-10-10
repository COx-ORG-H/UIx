/* A green build must have produced every file package.json exports.
 *
 * tsup runs the two configs of tsup.config.ts in parallel into one dist/. While the ESM
 * config had `clean: true`, its clean deleted the CJS bundles whenever the CJS config had
 * already written them, and the build still exited 0 (2026-10-08, about one build in five).
 * The rule lives in scripts/check-dist.mjs; this file checks the real dist/, shows the
 * check going red on that exact loss, and keeps `clean` out of the configs.
 *
 * Reads the BUILT dist — run `npm run build` first; CI does.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { manifestTargets, missingTargets } from '../scripts/check-dist.mjs';

const PACKAGE = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('package.json', PACKAGE), 'utf8'));

test('every exports target is in the built dist', () => {
  const targets = manifestTargets(manifest);
  // types + import + require for each subpath; a shorter list means the walk lost a branch.
  assert.equal(targets.length, Object.keys(manifest.exports).length * 3);
  process.stdout.write(`dist-exports: ${targets.length} targets\n`);
  assert.deepEqual(missingTargets(manifest, PACKAGE).map((t) => `${t.problem}: ${t.file}`), []);
});

test('a dist that lost its CJS bundles fails the check', () => {
  const root = mkdtempSync(join(tmpdir(), 'uix-check-dist-'));
  try {
    for (const { file } of manifestTargets(manifest)) {
      const path = join(root, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, 'x');
    }
    const rootUrl = pathToFileURL(`${root}/`);
    assert.deepEqual(missingTargets(manifest, rootUrl), []);

    // What the racing clean left behind: every .cjs gone, everything else in place.
    const cjs = manifestTargets(manifest).filter((t) => t.file.endsWith('.cjs'));
    assert.equal(cjs.length, Object.keys(manifest.exports).length);
    for (const { file } of cjs) rmSync(join(root, file));
    writeFileSync(join(root, 'dist/index.js'), '');
    assert.deepEqual(
      missingTargets(manifest, rootUrl).map((t) => `${t.problem}: ${t.file}`).sort(),
      [...cjs.map((t) => `missing: ${t.file}`), 'empty: ./dist/index.js'].sort(),
    );
    assert.equal(missingTargets(manifest, rootUrl).find((t) => t.file === './dist/index.cjs').via, 'exports["."]["require"]');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a subpath pattern is refused, not skipped', () => {
  assert.throws(() => manifestTargets({ exports: { './*': './dist/*.js' } }), /pattern targets/);
});

test('no tsup config cleans the shared outDir, and the build cleans once before tsup', () => {
  const config = readFileSync(new URL('tsup.config.ts', PACKAGE), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  const cleans = [...config.matchAll(/\bclean:\s*([^,\n]+)/g)].map((m) => m[1].trim());
  // tsup's default is no clean, so a config without the key is fine; anything but `false` is not.
  assert.deepEqual(cleans.filter((value) => value !== 'false'), [], 'a config with `clean` on races the other config in dist/');
  for (const script of ['build', 'dev']) {
    assert.match(manifest.scripts[script], /^node scripts\/clean-dist\.mjs && tsup\b/, `${script} removes dist/ before tsup starts`);
  }
  assert.match(manifest.scripts.build, /&& node scripts\/check-dist\.mjs$/, 'build ends with the dist check');
  assert.equal(manifest.scripts.prepublishOnly, 'node scripts/check-dist.mjs');
});
