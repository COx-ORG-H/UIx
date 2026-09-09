/**
 * Bundles the UIx stylesheets (and all their @imports) using postcss + postcss-import.
 *   styles/main.css       -> build/css/styles.css      (full: tokens + base + util + motion + components)
 *   styles/components.css -> build/css/components.css   (component-only: util + motion + components,
 *                                                        NO token block / NO global reset — for consumers
 *                                                        that get tokens from @tensor_1/tokens/css + a theme)
 *
 * Run: node scripts/build-styles.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import { transform } from 'esbuild';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

mkdirSync(join(root, 'build', 'css'), { recursive: true });

async function bundle(srcName, outName) {
  const from = join(root, 'styles', srcName);
  const to = join(root, 'build', 'css', outName);
  const css = readFileSync(from, 'utf8');
  const result = await postcss([postcssImport]).process(css, { from, to });
  // Authored CSS stays readable under styles/. Published output is minified so
  // consumers do not pay for comments and formatting on the wire or in parsing.
  const built = await transform(result.css, { loader: 'css', minify: true });
  writeFileSync(to, built.code);
  console.log(`✓ build/css/${outName}`);
}

await bundle('main.css', 'styles.css');
await bundle('components.css', 'components.css');
