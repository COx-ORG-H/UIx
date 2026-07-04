#!/usr/bin/env node
/* verify-all.mjs (FR-5) — run every example's isolated-tarball verify in sequence, fail-fast.
 * Each example doubles as smoke coverage (it packs @tensor_1/* to a tarball and installs into a
 * throwaway consumer). Wired into CI as `test:examples`. Assumes the packages are built (CI builds
 * first). Run: node examples/verify-all.mjs  (or `npm run test:examples`). Node built-ins only. */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXAMPLES = ['plain-css', 'tailwind', 'ts'];

for (const name of EXAMPLES) {
  console.log(`\n========== examples/${name} ==========`);
  try {
    execFileSync(process.execPath, [join(HERE, name, 'verify.mjs')], { stdio: 'inherit' });
  } catch (e) {
    console.error(`\n✗ examples/${name} verify FAILED (exit ${e.status ?? '?'})`);
    process.exit(1);
  }
}

console.log('\n✓ all example verifiers passed (plain-css, tailwind, ts).');
