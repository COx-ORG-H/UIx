#!/usr/bin/env node
/* Emit comparable Brotli sizes for the actual published entry interfaces.
 * The script is copied to the runner temp directory for base/head comparisons,
 * so dependencies are resolved explicitly from the checkout in process.cwd().
 */
import { readFileSync, existsSync } from 'node:fs';
import { brotliCompressSync, constants } from 'node:zlib';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const Q = { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } };
const brotli = (buffer) => brotliCompressSync(buffer, Q).length;

const fileBrotli = (relativePath) => {
  const path = resolve(ROOT, relativePath);
  return existsSync(path) ? brotli(readFileSync(path)) : null;
};

const esbuildPath = resolve(ROOT, 'node_modules/esbuild/lib/main.js');
const { build } = await import(pathToFileURL(esbuildPath).href);

async function entryBrotli(relativePath, external) {
  const path = resolve(ROOT, relativePath);
  if (!existsSync(path)) return null;
  const result = await build({
    absWorkingDir: ROOT,
    entryPoints: [path],
    bundle: true,
    minify: true,
    write: false,
    platform: 'browser',
    format: 'esm',
    external,
  });
  return brotli(result.outputFiles[0].contents);
}

const reactExternal = ['react', 'react-dom', 'react/jsx-runtime'];
const wrapperExternal = [...reactExternal, 'echarts', 'echarts/*'];

const sizes = {
  'react:main (UIx code)': await entryBrotli('packages/react/dist/index.js', wrapperExternal),
  'react:chart (UIx code)': await entryBrotli('packages/react/dist/chart.js', wrapperExternal),
  'react:chart/preset (consumer bundle)': await entryBrotli('packages/react/dist/chart-preset.js', reactExternal),
  'css:tokens.css': fileBrotli('packages/tokens/build/css/tokens.css'),
  'css:components.css': fileBrotli('packages/tokens/build/css/components.css'),
  'css:styles.css (bundle)': fileBrotli('packages/tokens/build/css/styles.css'),
};

console.log(JSON.stringify(sizes, null, 2));
