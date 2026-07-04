/* Smoke check for the Tailwind example (FR-3).
 *
 * Isolated-tarball mechanism from tests/smoke-consumer/run.mjs (no symlink): pack @tensor_1/tokens,
 * install it + a PINNED Tailwind v4 CLI into a throwaway project OUTSIDE the workspace, run the real
 * Tailwind build over src/input.css + index.html, and assert the compiled CSS actually contains a
 * `uix-*` utility rule generated from the tokens' @theme. Node built-ins only.
 * Run: node examples/tailwind/verify.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TOKENS = join(ROOT, 'packages', 'tokens');
const fwd = (p) => p.replace(/\\/g, '/');
const step = (m) => console.log(`\n• ${m}`);

const NPM_CLI = process.env.npm_execpath;
const npm = (args, opts) => NPM_CLI
  ? execFileSync(process.execPath, [NPM_CLI, ...args], opts)
  : execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { ...opts, shell: process.platform === 'win32' });

for (const f of [join(TOKENS, 'build', 'css', 'tokens.css'), join(TOKENS, 'build', 'tailwind', 'theme.css'), join(TOKENS, 'themes', 'tensor.css')]) {
  if (!existsSync(f)) {
    console.error(`✗ verify: missing build artifact ${f}\n  Run \`npm run build\` in packages/tokens first (CI builds before verify).`);
    process.exit(1);
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'uix-tailwind-'));
let ok = false;
try {
  step(`temp consumer: ${tmp}`);

  const pack = (dir) => {
    const out = npm(['pack', fwd(dir), '--pack-destination', fwd(tmp), '--json'], { cwd: ROOT, encoding: 'utf8' });
    const json = JSON.parse(out.slice(out.indexOf('[')));
    return join(tmp, json[0].filename);
  };
  step('pack @tensor_1/tokens');
  const tokensTgz = pack(TOKENS);

  step('write consumer package.json + copy index.html/input.css');
  writeFileSync(join(tmp, 'package.json'), JSON.stringify({
    name: 'uix-tailwind-verify',
    private: true,
    version: '0.0.0',
    scripts: { build: 'tailwindcss -i src/input.css -o dist/output.css' },
    dependencies: { '@tensor_1/tokens': `file:${fwd(tokensTgz)}` },
    devDependencies: { '@tailwindcss/cli': '4.3.2' },
  }, null, 2));
  mkdirSync(join(tmp, 'src'), { recursive: true });
  copyFileSync(join(HERE, 'index.html'), join(tmp, 'index.html'));
  copyFileSync(join(HERE, 'src', 'input.css'), join(tmp, 'src', 'input.css'));

  step('npm install (isolated; tarball + pinned Tailwind, no symlinks)');
  npm(['install', '--no-audit', '--no-fund', '--silent'], { cwd: tmp, stdio: 'inherit' });

  step('tailwind build (src/input.css -> dist/output.css)');
  npm(['run', 'build'], { cwd: tmp, stdio: 'inherit' });

  step('assert the compiled CSS contains a uix-* utility rule from @theme');
  const css = readFileSync(join(tmp, 'dist', 'output.css'), 'utf8');
  const found = ['bg-uix-accent', 'text-uix-text-muted', 'rounded-uix-md'].filter((u) =>
    new RegExp('\\.' + u.replace(/[-]/g, '\\-') + '\\b').test(css));
  if (found.length === 0) {
    console.error('  ✗ no uix-* utility rule found in the compiled output — the @theme did not register utilities.');
    process.exit(1);
  }
  console.log('  ✓ generated utility rules: ' + found.map((u) => '.' + u).join(', '));

  ok = true;
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
}

console.log(ok ? '\n✓ verify OK — packed @tensor_1/tokens builds real Tailwind utilities from the --uix-* @theme in an isolated consumer.'
              : '\n✗ verify FAILED');
process.exit(ok ? 0 : 1);
