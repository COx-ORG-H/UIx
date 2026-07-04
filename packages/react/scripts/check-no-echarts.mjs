#!/usr/bin/env node
/* check-no-echarts.mjs (PERF-1) — prove the echarts library is NOT reachable from the main entry.
 *
 * `@tensor_1/react` splits `./chart` into its own entry so that importing the package's main entry
 * never drags in ECharts. This walks the ESM module graph starting at dist/index.js, following only
 * relative re-exports/imports, and asserts NO reachable module references `echarts`. It complements
 * the size budget (`.size-limit.cjs`) with a direct structural guarantee. Node built-ins only. */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, '../dist');
const ENTRY = resolve(DIST, 'index.js');

const RELATIVE_IMPORT = /(?:import|export)\b[^'"]*?from\s*['"](\.[^'"]+)['"]/g;
const ECHARTS_REF = /from\s*['"]echarts['"]|require\(\s*['"]echarts['"]\s*\)|['"]echarts['"]/;

function resolveSpecifier(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const cand of [base, base + '.js', resolve(base, 'index.js')]) {
    if (existsSync(cand)) return cand;
  }
  return null;
}

function main() {
  if (!existsSync(ENTRY)) {
    console.error(`✗ no-echarts: ${ENTRY} not found — run \`npm run build\` first`);
    process.exit(1);
  }
  const seen = new Set();
  const offenders = [];
  const stack = [ENTRY];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    if (ECHARTS_REF.test(src)) offenders.push(relative(DIST, file));
    for (const m of src.matchAll(RELATIVE_IMPORT)) {
      const next = resolveSpecifier(file, m[1]);
      if (next) stack.push(next);
    }
  }
  if (offenders.length) {
    console.error('✗ no-echarts: echarts is reachable from the main entry via:');
    for (const o of offenders) console.error(`  - ${o}`);
    console.error('  → keep the Chart/echarts surface in the ./chart entry only.');
    process.exit(1);
  }
  console.log(`✓ no-echarts — echarts is not reachable from dist/index.js (${seen.size} modules walked)`);
}

main();
