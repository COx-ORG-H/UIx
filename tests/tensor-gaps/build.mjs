/* Bundles tests/tensor-gaps/harness.tsx (React + the components, from source) into
 * tests/tensor-gaps/dist/ for tests/a11y/tensor-gaps.spec.mjs.
 * Not deployed, not committed.   node tests/tensor-gaps/build.mjs */
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export async function buildTensorGapsHarness() {
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await buildTensorGapsHarness();
