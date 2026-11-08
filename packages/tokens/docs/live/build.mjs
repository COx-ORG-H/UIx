/* Bundles the docs' live motion playground (motion-playground.tsx: React plus the real components,
 * from source) into packages/tokens/docs/live/dist/. Not committed. The docs site workflow runs it
 * before assembling the site; run it locally to see the playground in the repository preview:
 *   node packages/tokens/docs/live/build.mjs */
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export async function buildDocsLive() {
  await build({
    entryPoints: [join(here, 'motion-playground.tsx')],
    outdir: join(here, 'dist'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    minify: true,
    sourcemap: 'linked',
    legalComments: 'linked',
    logLevel: 'warning',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await buildDocsLive();
