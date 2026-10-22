/* Bundles tests/display-preferences/harness.tsx (React + the components, from source) into
 * tests/display-preferences/dist/ for tests/a11y/display-preferences.spec.mjs, and writes
 * dist/pre-paint.js: the exact string displayPreferencesScript() returns, which harness.html loads
 * as a classic script in <head>, before the stylesheet, the way a product inlines it.
 * Not deployed, not committed.   node tests/display-preferences/build.mjs */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export async function buildDisplayPreferencesHarness() {
  await build({
    entryPoints: [join(here, 'harness.tsx')],
    outdir: join(here, 'dist'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    sourcemap: 'linked',
    logLevel: 'warning',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  // the model from source, run in Node, to print the script the head gets
  const out = await build({
    entryPoints: [join(here, '../../packages/react/src/display-preferences-model.ts')],
    bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'warning',
  });
  const model = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
  mkdirSync(join(here, 'dist'), { recursive: true });
  writeFileSync(join(here, 'dist/pre-paint.js'), `${model.displayPreferencesScript('uix-harness-display')}\nwindow.__firstPaint = { theme: document.documentElement.getAttribute('data-theme'), scale: document.documentElement.getAttribute('data-text-scale') };\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await buildDisplayPreferencesHarness();
