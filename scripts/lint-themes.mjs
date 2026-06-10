#!/usr/bin/env node
/** Lints every shipped theme overlay (packages/tokens/themes/*.css) with
 *  uix-lint-tokens --overlay. */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const themesDir = join(root, 'packages', 'tokens', 'themes');
const lint = join(root, 'packages', 'tokens', 'bin', 'uix-lint-tokens.mjs');
const files = readdirSync(themesDir).filter((f) => f.endsWith('.css'));
let failures = 0;
for (const f of files) {
  try { execFileSync('node', [lint, join(themesDir, f), '--overlay'], { stdio: 'inherit' }); }
  catch { failures++; }
}
if (failures) process.exit(1);
console.log(`lint-themes: OK (${files.length} overlay(s))`);
