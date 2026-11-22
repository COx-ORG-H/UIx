import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildDocsLive } from '../../packages/tokens/docs/live/build.mjs';

const here = dirname(fileURLToPath(import.meta.url));

export async function buildErrorSummaryFormHarness() {
  await Promise.all([build({
    entryPoints: [join(here, 'harness.tsx')], outdir: join(here, 'dist'),
    bundle: true, format: 'esm', platform: 'browser', target: 'es2022', jsx: 'automatic',
    sourcemap: 'linked', logLevel: 'warning',
    define: { 'process.env.NODE_ENV': '"development"' },
  }), buildDocsLive()]); // The live-docs regression must also run from a clean checkout.
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await buildErrorSummaryFormHarness();
