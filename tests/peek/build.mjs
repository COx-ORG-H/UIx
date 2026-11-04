import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export async function buildPeekHarness() {
  await build({ entryPoints: [join(here, 'harness.tsx')], outdir: join(here, 'dist'), bundle: true,
    format: 'esm', platform: 'browser', target: 'es2022', jsx: 'automatic', sourcemap: 'linked',
    define: { 'process.env.NODE_ENV': '"development"' }, logLevel: 'warning' });
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await buildPeekHarness();
