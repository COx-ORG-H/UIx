/* Bundles the docs' live demos (the entryPoints below: React plus the real components, from source) into packages/tokens/docs/live/dist/. Not committed. The docs site workflow runs it
 * before assembling the site; run it locally to see the playground in the repository preview:
 *   node packages/tokens/docs/live/build.mjs */
import { build } from 'esbuild';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export async function buildDocsLive() {
  await build({
    // Every demo in this folder: a PR adds its demo by adding the file, and edits no shared list
    // (a hand-kept list here made every pair of PRs that each added a demo conflict).
    entryPoints: readdirSync(here).filter((file) => file.endsWith('.tsx')).sort().map((file) => join(here, file)),
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
