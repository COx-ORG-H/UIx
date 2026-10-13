#!/usr/bin/env node
/* Consumer-visible budgets for the tree-shaken chart entries. size-limit externalizes
 * peer dependencies, so this explicit esbuild check includes ECharts while
 * keeping only React external, matching a real application bundle.
 *   chart/preset    ≤ 170 kB Brotli (line, bar, pie)
 *   chart/analytic  ≤ 185 kB Brotli (line, bar, scatter + marks, visual map, zoom, axis pointer — HAR-1553) */
import { build } from 'esbuild';
import { brotliCompressSync, constants } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUDGETS = [
  { name: 'chart preset', file: 'dist/chart-preset.js', limit: 170_000 },
  { name: 'chart analytic', file: 'dist/chart-analytic.js', limit: 185_000 },
];

let failed = false;
for (const { name, file, limit } of BUDGETS) {
  const result = await build({
    entryPoints: [resolve(packageRoot, file)],
    bundle: true,
    minify: true,
    write: false,
    platform: 'browser',
    format: 'esm',
    external: ['react', 'react-dom', 'react/jsx-runtime'],
  });
  const size = brotliCompressSync(result.outputFiles[0].contents, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;
  const line = `${name} is ${(size / 1000).toFixed(2)} kB Brotli; limit is ${limit / 1000} kB`;
  if (size > limit) {
    console.error(`✗ ${line}`);
    failed = true;
  } else {
    console.log(`✓ ${line}`);
  }
}
if (failed) process.exit(1);
