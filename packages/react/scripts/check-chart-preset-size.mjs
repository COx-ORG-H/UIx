#!/usr/bin/env node
/* Consumer-visible budget for the lean chart adapter. size-limit externalizes
 * peer dependencies, so this explicit esbuild check includes ECharts while
 * keeping only React external, matching a real application bundle. */
import { build } from 'esbuild';
import { brotliCompressSync, constants } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(packageRoot, 'dist/chart-preset.js');
const limit = 170_000;
const result = await build({
  entryPoints: [entry],
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

if (size > limit) {
  console.error(`✗ chart preset is ${(size / 1000).toFixed(2)} kB Brotli; limit is ${limit / 1000} kB`);
  process.exit(1);
}
console.log(`✓ chart preset is ${(size / 1000).toFixed(2)} kB Brotli; limit is ${limit / 1000} kB`);
