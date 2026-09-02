/* Smoke check for the plain-css example (FR-2).
 *
 * The isolated-tarball mechanism is copied VERBATIM from tests/smoke-consumer/run.mjs
 * (ADR-0016 Decision 6): pack @tensor_1/tokens to a tarball, install it into a throwaway
 * project OUTSIDE the workspace (via `file:<tgz>` so npm can't symlink and hide packaging
 * bugs), then require.resolve every subpath this example's index.html links.
 *
 * Asserts the four export subpaths index.html depends on resolve from a real consumer:
 *   @tensor_1/tokens/css            — the --uix-* token contract (light on :root, dark on [data-theme])
 *   @tensor_1/tokens/styles         — the .uix-* component CSS (.uix-btn, .uix-card)
 *   @tensor_1/tokens/bundle         — css + components in one file (the ./bundle convenience entry)
 *   @tensor_1/tokens/themes/tensor  — the Tensor brand override layer
 *
 * Node built-ins only. Cleans up its temp dir. Run: node examples/plain-css/verify.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TOKENS = join(ROOT, 'packages', 'tokens');
const fwd = (p) => p.replace(/\\/g, '/');
const step = (m) => console.log(`\n• ${m}`);

// Invoke npm by running its CLI .js with node (npm_execpath is set by `npm run`).
// No shell -> space-safe args, cross-platform, no .cmd spawn issue, no DEP0190.
const NPM_CLI = process.env.npm_execpath;
const npm = (args, opts) => NPM_CLI
  ? execFileSync(process.execPath, [NPM_CLI, ...args], opts)
  : execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { ...opts, shell: process.platform === 'win32' });

// Preconditions: the build outputs the tarball will capture must exist.
for (const f of [
  join(TOKENS, 'build', 'css', 'tokens.css'),
  join(TOKENS, 'build', 'css', 'components.css'),
  join(TOKENS, 'build', 'css', 'styles.css'),
  join(TOKENS, 'themes', 'tensor.css'),
]) {
  if (!existsSync(f)) {
    console.error(`✗ verify: missing build artifact ${f}\n  Run \`npm run build\` in packages/tokens first (CI builds before verify).`);
    process.exit(1);
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'uix-plain-css-'));
let ok = false;
try {
  step(`temp consumer: ${tmp}`);

  const pack = (dir) => {
    // execFile + arg array (no shell string interpolation); npm CLI run via node above.
    const out = npm(['pack', fwd(dir), '--pack-destination', fwd(tmp), '--json'], { cwd: ROOT, encoding: 'utf8' });
    const json = JSON.parse(out.slice(out.indexOf('[')));
    return join(tmp, json[0].filename);
  };
  step('pack @tensor_1/tokens');
  const tokensTgz = pack(TOKENS);

  step('write consumer package.json');
  writeFileSync(join(tmp, 'package.json'), JSON.stringify({
    name: 'uix-plain-css-verify',
    private: true,
    version: '0.0.0',
    dependencies: {
      '@tensor_1/tokens': `file:${fwd(tokensTgz)}`,
    },
  }, null, 2));

  step('npm install (isolated; tarball, no symlinks)');
  npm(['install', '--no-audit', '--no-fund', '--prefer-offline', '--silent'], { cwd: tmp, stdio: 'inherit' });

  step('resolve aggregate and selective CSS subpaths');
  const subpaths = [
    '@tensor_1/tokens/css',
    '@tensor_1/tokens/styles',
    '@tensor_1/tokens/bundle',
    '@tensor_1/tokens/motion',
    '@tensor_1/tokens/components/button',
    '@tensor_1/tokens/components/card',
    '@tensor_1/tokens/themes/tensor',
  ];
  // require.resolve from inside the isolated install and print each resolved path.
  const out = execFileSync(process.execPath, ['-e',
    `${JSON.stringify(subpaths)}.forEach(s => console.log('  ' + s + '  ->  ' + require.resolve(s)));`],
    { cwd: tmp, encoding: 'utf8' });
  process.stdout.write(out);

  ok = true;
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
}

console.log(ok ? '\n✓ verify OK — packed @tensor_1/tokens resolves aggregate and selective CSS interfaces in an isolated consumer.'
              : '\n✗ verify FAILED');
process.exit(ok ? 0 : 1);
