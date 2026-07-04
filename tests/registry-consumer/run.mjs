/* registry-consumer smoke (DIST-3) — drive the `uix add` CLI over a handful of components and prove
 * each one's CSS lands and its registry-declared --uix-* deps are real (declared in tokens.css).
 * Node built-ins only. Assumes `npm run build` has produced build/css/tokens.css + registry.json.
 * Run: npm run test:registry:consumer
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TOKENS = join(ROOT, 'packages', 'tokens');
const CLI = join(TOKENS, 'bin', 'uix.mjs');
const TOKENS_CSS = join(TOKENS, 'build', 'css', 'tokens.css');
const REGISTRY = join(TOKENS, 'registry', 'registry.json');

const COMPONENTS = ['button', 'card', 'table', 'alert', 'status-pill'];

const assert = (cond, msg) => {
  if (!cond) {
    console.error(`  ✗ ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
};

for (const f of [CLI, TOKENS_CSS, REGISTRY]) {
  if (!existsSync(f)) {
    console.error(`✗ registry-consumer: missing ${f}\n  Run \`npm run build\` first (CI builds before this test).`);
    process.exit(1);
  }
}

const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
const tokensCss = readFileSync(TOKENS_CSS, 'utf8');
const isDeclared = (name) => new RegExp(name.replace(/[-]/g, '\\-') + '\\s*:').test(tokensCss);

const tmp = mkdtempSync(join(tmpdir(), 'uix-registry-consumer-'));
let ok = false;
try {
  for (const name of COMPONENTS) {
    console.log(`\n• uix add ${name}`);
    const comp = registry.components.find((c) => c.name === name);
    assert(comp, `registry has "${name}"`);
    execFileSync(process.execPath, [CLI, 'add', name, '--dest', tmp], { stdio: 'pipe' });
    const landed = join(tmp, basename(comp.file));
    assert(existsSync(landed), `${basename(comp.file)} copied into the consumer`);
    const missing = comp.tokens.filter((t) => !isDeclared(t));
    assert(missing.length === 0, `all ${comp.tokens.length} declared --uix-* deps exist in tokens.css` +
      (missing.length ? ` (missing: ${missing.join(', ')})` : ''));
  }

  console.log('\n• unknown component exits non-zero');
  let threw = false;
  try {
    execFileSync(process.execPath, [CLI, 'add', 'definitely-not-a-component', '--dest', tmp], { stdio: 'pipe' });
  } catch {
    threw = true;
  }
  assert(threw, 'uix add <unknown> exits non-zero');

  ok = true;
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
}

console.log(ok
  ? `\n✓ registry-consumer OK — uix add copied ${COMPONENTS.length} components; all declared token deps are real.`
  : '\n✗ registry-consumer FAILED');
process.exit(ok ? 0 : 1);
