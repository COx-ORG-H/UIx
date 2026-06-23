/* Per-consumer smoke build (ADR-0016 Decision 6).
 *
 * Proves the PUBLISHED artifacts actually work for a consumer: packs @tensor_1/tokens
 * and @tensor_1/react to tarballs, installs them into a throwaway project OUTSIDE the
 * workspace (so npm can't symlink and hide packaging bugs), then checks every
 * consumption mode:
 *   1. ESM bundle      — esbuild bundles app.tsx importing @tensor_1/react + @tensor_1/tokens/ts
 *   2. ESM import      — node imports the same at runtime
 *   3. CJS require     — node require()s @tensor_1/react (it ships a CJS build)
 *   4. export presence — require.resolve the CSS + theme + ./chart subpaths (files/exports)
 *   5. types           — tsc --noEmit type-checks app.tsx against the packed .d.ts
 *
 * Assumes the packages are built (CI runs build:all first). Run: npm run test:smoke
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, copyFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TOKENS = join(ROOT, 'packages', 'tokens');
const REACT = join(ROOT, 'packages', 'react');
const fwd = (p) => p.replace(/\\/g, '/');
const step = (m) => console.log(`\n• ${m}`);

// Invoke npm by running its CLI .js with node (npm_execpath is set by `npm run`).
// No shell -> space-safe args, cross-platform, no .cmd spawn issue, no DEP0190.
const NPM_CLI = process.env.npm_execpath;
const npm = (args, opts) => NPM_CLI
  ? execFileSync(process.execPath, [NPM_CLI, ...args], opts)
  : execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { ...opts, shell: process.platform === 'win32' });

// Preconditions: the build outputs the tarballs will capture must exist.
for (const f of [join(TOKENS, 'build', 'ts', 'tokens.js'), join(REACT, 'dist', 'index.js'), join(REACT, 'dist', 'index.cjs')]) {
  if (!existsSync(f)) {
    console.error(`✗ smoke: missing build artifact ${f}\n  Run \`npm run build:all\` first (CI does this before test:smoke).`);
    process.exit(1);
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'uix-smoke-'));
let ok = false;
try {
  step(`temp consumer: ${tmp}`);

  const pack = (dir) => {
    // execFile + arg array (no shell string interpolation); shell:true so npm.cmd resolves on Windows.
    const out = npm(['pack', fwd(dir), '--pack-destination', fwd(tmp), '--json'], { cwd: ROOT, encoding: 'utf8' });
    const json = JSON.parse(out.slice(out.indexOf('[')));
    return join(tmp, json[0].filename);
  };
  step('pack @tensor_1/tokens + @tensor_1/react');
  const tokensTgz = pack(TOKENS);
  const reactTgz = pack(REACT);

  step('write consumer package.json + copy fixture');
  writeFileSync(join(tmp, 'package.json'), JSON.stringify({
    name: 'uix-smoke-consumer',
    private: true,
    version: '0.0.0',
    dependencies: {
      '@tensor_1/tokens': `file:${fwd(tokensTgz)}`,
      '@tensor_1/react': `file:${fwd(reactTgz)}`,
      'react': '^18.3.1',
      'react-dom': '^18.3.1',
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0'
    }
  }, null, 2));
  copyFileSync(join(HERE, 'app.tsx'), join(tmp, 'app.tsx'));
  copyFileSync(join(HERE, 'tsconfig.json'), join(tmp, 'tsconfig.json'));

  step('npm install (isolated; tarballs, no symlinks)');
  npm(['install', '--no-audit', '--no-fund', '--prefer-offline', '--silent'], { cwd: tmp, stdio: 'inherit' });

  step('1. ESM bundle (esbuild)');
  // Bare specifier resolves from this module's dir up to the repo-root node_modules.
  const esbuild = await import('esbuild');
  const res = await esbuild.build({
    absWorkingDir: tmp,
    entryPoints: [join(tmp, 'app.tsx')],
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    outfile: join(tmp, 'out.mjs'),
    logLevel: 'silent',
  });
  if (res.errors?.length) throw new Error('esbuild bundle failed');

  step('2. ESM import (runtime)');
  execFileSync(process.execPath, ['--input-type=module', '-e',
    "import { Button } from '@tensor_1/react'; import { cssVar } from '@tensor_1/tokens/ts'; if(!Button||!cssVar?.accent) process.exit(3);"],
    { cwd: tmp, stdio: 'inherit' });

  step('3. CJS require + 4. export resolution');
  execFileSync(process.execPath, ['-e',
    "const u=require('@tensor_1/react'); if(!u.Button||!u.Card) process.exit(4);" +
    "['@tensor_1/tokens/css','@tensor_1/tokens/styles','@tensor_1/tokens/tailwind','@tensor_1/tokens/themes/tensor','@tensor_1/react/chart']" +
    ".forEach(s=>require.resolve(s));"],
    { cwd: tmp, stdio: 'inherit' });

  step('5. types (tsc --noEmit)');
  execFileSync(process.execPath, [join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '--project', join(tmp, 'tsconfig.json')],
    { cwd: tmp, stdio: 'inherit' });

  ok = true;
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
}

console.log(ok ? '\n✓ smoke OK — packed @tensor_1/tokens + @tensor_1/react install, import (ESM+CJS), resolve, and type-check in an isolated consumer.'
              : '\n✗ smoke FAILED');
process.exit(ok ? 0 : 1);
