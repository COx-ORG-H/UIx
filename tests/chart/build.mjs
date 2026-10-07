/* Bundles tests/chart/harness.tsx (React + the components, from source) into
 * tests/chart/dist/ for tests/a11y/chart-theme.spec.mjs.
 * Not deployed, not committed.   node tests/chart/build.mjs */
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export async function buildChartHarness() {
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await buildChartHarness();
