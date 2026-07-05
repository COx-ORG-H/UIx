#!/usr/bin/env node
/* measure-sizes.mjs (PERF-3) — emit brotli sizes for the shipped surfaces, as JSON.
 *
 * Used by size-report.yml to compare base vs head on a PR. Dependency-free (node:zlib at a fixed
 * quality). Reports:
 *   - react:index + react:chart — the two published React entries. Because the ESM build is
 *     per-file (bundle:false), we sum the brotli size of every dist/**\/*.js reachable, which tracks
 *     the shipped code consistently base-vs-head (the size GATE uses size-limit for the hard budget).
 *   - css:tokens / css:components / css:bundle — the three build/css bundles (single files).
 * Prints a JSON object of { label: bytes|null }. Run: node scripts/measure-sizes.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { brotliCompressSync, constants } from 'node:zlib';
import { resolve, join } from 'node:path';

// ROOT = the current working directory (the repo checkout), NOT the script's own location — so a
// copy of this script can be run against a different checkout (base vs head) from the repo root.
const ROOT = process.cwd();
const Q = { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } };
const brotli = (buf) => brotliCompressSync(buf, Q).length;

const fileBrotli = (rel) => {
  const p = resolve(ROOT, rel);
  return existsSync(p) ? brotli(readFileSync(p)) : null;
};

// Sum brotli of every *.js under a dir (per-file ESM); null if the dir is missing.
const dirJsBrotli = (rel) => {
  const base = resolve(ROOT, rel);
  if (!existsSync(base)) return null;
  let total = 0;
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const full = join(d, e);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (e.endsWith('.js')) total += brotli(readFileSync(full));
    }
  };
  walk(base);
  return total;
};

const sizes = {
  'react:dist (all .js, brotli sum)': dirJsBrotli('packages/react/dist'),
  'css:tokens.css': fileBrotli('packages/tokens/build/css/tokens.css'),
  'css:components.css': fileBrotli('packages/tokens/build/css/components.css'),
  'css:styles.css (bundle)': fileBrotli('packages/tokens/build/css/styles.css'),
};

console.log(JSON.stringify(sizes, null, 2));
