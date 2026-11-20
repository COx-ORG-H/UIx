/* Bundles tests/ai-assistance/harness.tsx (React + the components, from source) into
 * tests/ai-assistance/dist/ for tests/a11y/ai-assistance.spec.mjs (spec: Docs/specs/2026-11-20-ai-proposals.md).
 * Not deployed, not committed.   node tests/ai-assistance/build.mjs */
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export async function buildAiAssistanceHarness() {
  await build({
    // the harness, and the docs page's live demo (packages/tokens/docs/live/ai-assistance-demo.tsx) on demo.html
    entryPoints: [join(here, 'harness.tsx'), join(here, 'demo.tsx')],
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await buildAiAssistanceHarness();
