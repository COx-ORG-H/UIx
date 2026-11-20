/* Bundles tests/sticky-focus/harness.tsx (React + the components, from source) into
 * tests/sticky-focus/dist/ for tests/a11y/sticky-focus.spec.mjs (WCAG 2.2 SC 2.4.11).
 * Not deployed, not committed.   node tests/sticky-focus/build.mjs */
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export async function buildStickyFocusHarness() {
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
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await buildStickyFocusHarness();
