#!/usr/bin/env node
/*
 * Every file package.json promises a consumer is in dist/ after a build.
 *
 * tsup exits 0 once each config has written its files; it never looks at dist/ again. A
 * build can therefore be green with an entry missing: on 2026-10-08 the ESM config's
 * `clean` deleted the CJS bundles the other config had just written, in about one build
 * of five. This reads the `exports` map (plus main/module/types) and fails when a target
 * is missing or empty.
 *
 * Usage:
 *   node scripts/check-dist.mjs     exit 1 and list every missing target
 * Runs at the end of `npm run build`, as `npm run test:dist` in CI's gates job, and as
 * `prepublishOnly`, because release.yml publishes a build that no gate has looked at.
 */
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PACKAGE = new URL('../', import.meta.url);

/** Every file an `exports` field can resolve to, with the subpath and condition that lead to it. */
export function exportTargets(field, via = 'exports') {
  if (field == null) return [];
  if (typeof field === 'string') return [{ file: field, via }];
  if (Array.isArray(field)) return field.flatMap((item, index) => exportTargets(item, `${via}[${index}]`));
  return Object.entries(field).flatMap(([key, value]) => exportTargets(value, `${via}["${key}"]`));
}

/** The files a manifest points a consumer at: the `exports` targets, then main/module/types. */
export function manifestTargets(manifest) {
  const targets = exportTargets(manifest.exports);
  for (const key of ['main', 'module', 'types']) {
    if (typeof manifest[key] === 'string') targets.push({ file: manifest[key], via: key });
  }
  // A subpath pattern names no single file, so it cannot be checked here. Fail instead of skipping it.
  const patterns = targets.filter((target) => target.file.includes('*'));
  if (patterns.length) {
    throw new Error(`check-dist cannot verify pattern targets (${patterns.map((p) => p.via).join(', ')}); teach it to expand them first.`);
  }
  return targets;
}

/** The targets of `manifest` that are missing or empty under `root` (a file URL ending in "/"). */
export function missingTargets(manifest, root) {
  return manifestTargets(manifest).flatMap((target) => {
    let size;
    try {
      const stat = statSync(new URL(target.file, root));
      size = stat.isFile() ? stat.size : -1;
    } catch {
      return [{ ...target, problem: 'missing' }];
    }
    if (size < 0) return [{ ...target, problem: 'not a file' }];
    return size === 0 ? [{ ...target, problem: 'empty' }] : [];
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = JSON.parse(readFileSync(new URL('package.json', PACKAGE), 'utf8'));
  const targets = manifestTargets(manifest);
  // A check that derives its list can come up short without anyone seeing it.
  if (targets.length === 0) {
    console.error(`✗ check-dist: ${manifest.name} declares no exports targets, so there is nothing to check.`);
    process.exit(1);
  }
  const missing = missingTargets(manifest, PACKAGE);
  if (missing.length) {
    console.error(`✗ check-dist: ${missing.length} of ${targets.length} files that ${manifest.name} exports are not in ${fileURLToPath(PACKAGE)}`);
    for (const { file, via, problem } of missing) console.error(`  ${problem}: ${file}  (${via})`);
    console.error('  The build did not produce them, or something removed them after it wrote them.\n  Rebuild with `npm run build -w @tensor_1/react`. If a config in tsup.config.ts has `clean` on again, that is the cause.');
    process.exit(1);
  }
  console.log(`✓ check-dist: all ${targets.length} files that ${manifest.name} exports are in dist/`);
}
