/* Bundles tests/at-evidence/harness.tsx (React + the six AT-evidence widgets, from source) into
 * tests/at-evidence/dist/ for tests/a11y/at-evidence.spec.mjs and the manual
 * screen-reader scripts in Docs/a11y/scripts/.
 * Not deployed, not committed.   node tests/at-evidence/build.mjs */
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export async function buildAtEvidenceHarness() {
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await buildAtEvidenceHarness();
