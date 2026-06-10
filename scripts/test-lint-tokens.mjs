#!/usr/bin/env node
/** Self-test for uix-lint-tokens: a good consumer CSS must pass, each
 *  violation class must fail with the expected message. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lint = join(root, 'packages', 'tokens', 'bin', 'uix-lint-tokens.mjs');
const dir = mkdtempSync(join(tmpdir(), 'uix-lint-'));

const GOOD = `@import "tailwindcss";
@import "@uix/tokens/tokens.css";
@import "@uix/tokens/shadcn-bridge.css";
@custom-variant dark (&:is(.dark *));
/* @uix-overrides */
:root { --uix-accent: #0088FF; --uix-accent-fg: #FFFFFF; --background: var(--uix-bg-subtle); }
:root:where(.dark, [data-theme="dark"]) { --uix-accent: #0091FF; }
/* @uix-overrides-end */
`;

const cases = [
  { name: 'good consumer css passes', css: GOOD, ok: true },
  { name: 'missing imports fails', css: GOOD.replace('@import "@uix/tokens/tokens.css";\n', ''), ok: false, expect: 'missing @import' },
  { name: 'invented token name fails', css: GOOD.replace('--uix-accent:', '--uix-brand-accent:'), ok: false, expect: 'not a contract token' },
  { name: 'override outside marker block fails', css: GOOD + ':root { --uix-ring: red; }\n', ok: false, expect: 'outside the @uix-overrides' },
  { name: 'rgb triplet pattern fails', css: GOOD.replace('/* @uix-overrides-end */', ':root{ color: rgb(var(--legacy) / 0.5); }\n/* @uix-overrides-end */'), ok: false, expect: 'triplet' },
];

let failures = 0;
for (const c of cases) {
  const file = join(dir, 'globals.css');
  writeFileSync(file, c.css);
  let passed = true, out = '';
  try { out = execFileSync('node', [lint, file], { encoding: 'utf8' }); }
  catch (e) { passed = false; out = String(e.stderr ?? e.stdout ?? e); }
  const ok = passed === c.ok && (c.expect ? out.includes(c.expect) : true);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
  if (!ok) { failures++; console.log(out.split('\n').map((l) => '      ' + l).join('\n')); }
}

// cold-gray source scan
const srcDir = join(dir, 'src');
writeFileSync(join(dir, 'globals.css'), GOOD);
import('node:fs').then(() => {});
import { mkdirSync } from 'node:fs';
mkdirSync(srcDir, { recursive: true });
writeFileSync(join(srcDir, 'bad.tsx'), 'export const X = () => <div className="bg-slate-100 text-zinc-500" />;\n');
let coldOk = false;
try { execFileSync('node', [lint, join(dir, 'globals.css'), '--src', srcDir], { encoding: 'utf8' }); }
catch (e) { coldOk = String(e.stderr).includes('cold-gray class'); }
console.log(`${coldOk ? 'PASS' : 'FAIL'}  cold-gray class in source fails`);
if (!coldOk) failures++;

rmSync(dir, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
