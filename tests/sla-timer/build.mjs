/* Bundles tests/sla-timer/harness.tsx (React + the components, from source) into
 * tests/sla-timer/dist/ for tests/a11y/sla-timer.spec.mjs (spec: Docs/specs/2026-11-20-sla-timer.md).
 * Not deployed, not committed.   node tests/sla-timer/build.mjs */
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export async function buildSlaTimerHarness() {
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await buildSlaTimerHarness();
