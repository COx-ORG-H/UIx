/* Bundles tests/perf/harness.tsx (React + the components, from source) into tests/perf/dist/ for the
 * performance lanes (tests/perf/bench.mjs). PRODUCTION React, minified: a benchmark of React's
 * development build measures its warnings and checks, not what a product ships.
 * Not deployed, not committed.   node tests/perf/build.mjs */
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export async function buildPerfHarness() {
  await build({
    entryPoints: [join(here, 'harness.tsx')],
    outdir: join(here, 'dist'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    minify: true,
    sourcemap: 'linked',
    logLevel: 'warning',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await buildPerfHarness();
