#!/usr/bin/env node
/* check-registry.mjs (DIST-2) — fail if registry/registry.json has drifted from the CSS.
 *
 * Mirrors check-contract.mjs: regenerate the manifest IN MEMORY from styles/components/*.css and
 * compare it byte-for-byte to the committed registry/registry.json. Any divergence (a component's
 * token usage changed, a file added/removed, a re-order) fails with a pointer to regenerate. This
 * gives the copy-in channel npm's "staleness, not breakage" property. Dependency-free.
 * Run: npm run test:registry
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { generateRegistry, serialize } from './build-registry.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMITTED = join(resolve(__dirname, '..'), 'registry', 'registry.json');

function main() {
  const fresh = generateRegistry();
  if (fresh.count !== 67) {
    console.error(`✗ registry: expected 67 components, found ${fresh.count}.`);
    process.exit(1);
  }
  let committed;
  try {
    committed = readFileSync(COMMITTED, 'utf8');
  } catch {
    console.error('✗ registry: registry/registry.json is missing — run `npm run build:registry`.');
    process.exit(1);
  }
  if (committed !== serialize(fresh)) {
    console.error('✗ registry: registry/registry.json is out of date vs styles/components/*.css.');
    console.error('  → regenerate with `npm run build:registry` (it is generated, never hand-edited).');
    process.exit(1);
  }
  console.log(`✓ registry OK — registry.json matches all ${fresh.count} component CSS files.`);
}

main();
