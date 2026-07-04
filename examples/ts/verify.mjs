/* Smoke check for the TS / cssVar example (FR-4).
 *
 * Isolated-tarball mechanism copied from tests/smoke-consumer/run.mjs (no symlink): pack
 * @tensor_1/tokens, install it into a throwaway project OUTSIDE the workspace via `file:<tgz>`,
 * then prove the `./ts` entry both TYPE-CHECKS (tsc --noEmit against the packed .d.ts) and
 * RUNTIME-RESOLVES with the right values. Node built-ins only. Run: node examples/ts/verify.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
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

for (const f of [join(TOKENS, 'build', 'ts', 'tokens.js'), join(TOKENS, 'build', 'ts', 'tokens.d.ts')]) {
  if (!existsSync(f)) {
    console.error(`✗ verify: missing build artifact ${f}\n  Run \`npm run build\` in packages/tokens first (CI builds before verify).`);
    process.exit(1);
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'uix-ts-'));
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

  step('write consumer package.json + copy app.ts/tsconfig');
  writeFileSync(join(tmp, 'package.json'), JSON.stringify({
    name: 'uix-ts-verify',
    private: true,
    version: '0.0.0',
    type: 'module',
    dependencies: { '@tensor_1/tokens': `file:${fwd(tokensTgz)}` },
  }, null, 2));
  copyFileSync(join(HERE, 'app.ts'), join(tmp, 'app.ts'));
  copyFileSync(join(HERE, 'tsconfig.json'), join(tmp, 'tsconfig.json'));

  step('npm install (isolated; tarball, no symlinks)');
  npm(['install', '--no-audit', '--no-fund', '--prefer-offline', '--silent'], { cwd: tmp, stdio: 'inherit' });

  step('tsc --noEmit against the packed .d.ts');
  execFileSync(process.execPath, [join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '--project', join(tmp, 'tsconfig.json')],
    { cwd: tmp, stdio: 'inherit' });

  step('runtime: import @tensor_1/tokens/ts and assert values');
  const out = execFileSync(process.execPath, ['--input-type=module', '-e',
    `import { cssVar, num } from '@tensor_1/tokens/ts';
     const assert = (c, m) => { if (!c) { console.error('  ✗ ' + m); process.exit(1); } console.log('  ✓ ' + m); };
     assert(cssVar.accent === 'var(--uix-accent)', "cssVar.accent === 'var(--uix-accent)'");
     assert(typeof num['space-4'] === 'number', "num['space-4'] is a number (" + num['space-4'] + ')');`],
    { cwd: tmp, encoding: 'utf8' });
  process.stdout.write(out);

  ok = true;
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
}

console.log(ok ? '\n✓ verify OK — packed @tensor_1/tokens/ts type-checks and resolves cssVar/num with correct values in an isolated consumer.'
              : '\n✗ verify FAILED');
process.exit(ok ? 0 : 1);
