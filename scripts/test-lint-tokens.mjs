#!/usr/bin/env node
/** Self-test for uix-lint-tokens: a good consumer CSS must pass, each
 *  violation class must fail with the expected message. Covers CSS mode,
 *  --overlay mode, and the --src scan (incl. --strict-vars + src-only). */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lint = join(root, 'packages', 'tokens', 'bin', 'uix-lint-tokens.mjs');
const template = join(root, 'packages', 'tokens', 'themes', '_template.css');
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

const OVERLAY = `/* acme theme overlay */
/* @uix-overrides */
:root { --uix-brand: #0088FF; --uix-brand-fg: #FFFFFF; }
:root:where(.dark, [data-theme="dark"]) { --uix-brand: #0091FF; }
/* @uix-overrides-end */
`;

// css: consumer CSS written + passed as the positional arg (omit for src-only)
// cssFile: pass an existing file path as the positional arg instead
// files: { relPath: content } written under a per-case src/ dir, passed via --src
// flags: extra CLI flags
const cases = [
  // ---- CSS mode (existing six + brand tier) --------------------------------
  { name: 'good consumer css passes', css: GOOD, ok: true },
  { name: 'missing imports fails', css: GOOD.replace('@import "@uix/tokens/tokens.css";\n', ''), ok: false, expect: 'missing @import' },
  { name: 'invented token name fails', css: GOOD.replace('--uix-accent:', '--uix-brand-accent:'), ok: false, expect: 'not a contract token' },
  { name: 'override outside marker block fails', css: GOOD + ':root { --uix-ring: red; }\n', ok: false, expect: 'outside the @uix-overrides' },
  { name: 'rgb triplet pattern fails', css: GOOD.replace('/* @uix-overrides-end */', ':root{ color: rgb(var(--legacy) / 0.5); }\n/* @uix-overrides-end */'), ok: false, expect: 'triplet' },
  { name: 'brand-slot override inside fence passes', css: GOOD.replace('--uix-accent: #0088FF; --uix-accent-fg: #FFFFFF;', '--uix-brand: #0088FF; --uix-brand-fg: #FFFFFF;'), ok: true },
  { name: 'theme overlay import before base imports fails', css: '@import "@uix/tokens/themes/acme.css";\n' + GOOD, ok: false, expect: 'imported before' },
  { name: 'theme overlay import after base imports passes', css: GOOD.replace('@custom-variant', '@import "@uix/tokens/themes/acme.css";\n@custom-variant'), ok: true },

  // ---- --overlay mode ------------------------------------------------------
  { name: 'overlay: valid overlay (fence + brand, no imports) passes', css: OVERLAY, flags: ['--overlay'], ok: true },
  { name: 'overlay: invented name fails', css: OVERLAY.replace('--uix-brand-fg:', '--uix-brand-text:'), flags: ['--overlay'], ok: false, expect: 'not a contract token' },
  { name: 'overlay: definition outside fence fails', css: OVERLAY + ':root { --uix-ring: red; }\n', flags: ['--overlay'], ok: false, expect: 'outside the @uix-overrides' },
  { name: 'overlay: shipped themes/_template.css passes', cssFile: template, flags: ['--overlay'], ok: true },

  // ---- --src scan ----------------------------------------------------------
  { name: 'cold-gray class in source fails', css: GOOD, files: { 'bad.tsx': 'export const X = () => <div className="bg-slate-100 text-zinc-500" />;\n' }, ok: false, expect: 'cold-gray class' },
  { name: 'src-only: unknown var in components/uix fails', files: { 'components/uix/bad.tsx': "export const X = () => <div style={{ color: 'var(--text-primary)' }} />;\n" }, ok: false, expect: 'not a contract or bridge token' },
  { name: 'src-only: contract/bridge/tw/fallback vars pass', files: { 'components/uix/good.tsx': "export const s = 'var(--uix-text) var(--border) var(--tw-ring-color) var(--anything, red)';\n" }, ok: true },
  { name: 'src-only: reading the brand slot fails', files: { 'components/uix/brand.tsx': "export const s = 'var(--uix-brand)';\n" }, ok: false, expect: 'write-only' },
  { name: 'src: non-uix file with local var passes without --strict-vars', files: { 'app/local.tsx': "export const s = 'var(--font-geist-sans)';\n" }, ok: true },
  { name: 'src: non-uix file with local var fails with --strict-vars', files: { 'app/local.tsx': "export const s = 'var(--font-geist-sans)';\n" }, flags: ['--strict-vars'], ok: false, expect: 'not a contract or bridge token' },
  { name: 'src: rgb(var(--...)) triplet anywhere fails', files: { 'app/any.tsx': "export const s = 'rgb(var(--text-primary))';\n" }, ok: false, expect: 'triplet' },
];

let failures = 0;
cases.forEach((c, n) => {
  const args = [lint];
  if (c.css !== undefined) {
    const file = join(dir, `case-${n}.css`);
    writeFileSync(file, c.css);
    args.push(file);
  } else if (c.cssFile) {
    args.push(c.cssFile);
  }
  if (c.files) {
    const srcDir = join(dir, `src-${n}`);
    for (const [rel, content] of Object.entries(c.files)) {
      const fp = join(srcDir, ...rel.split('/'));
      mkdirSync(dirname(fp), { recursive: true });
      writeFileSync(fp, content);
    }
    args.push('--src', srcDir);
  }
  if (c.flags) args.push(...c.flags);
  let passed = true, out = '';
  try { out = execFileSync('node', args, { encoding: 'utf8' }); }
  catch (e) { passed = false; out = String(e.stderr ?? e.stdout ?? e); }
  const ok = passed === c.ok && (c.expect ? out.includes(c.expect) : true);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
  if (!ok) { failures++; console.log(out.split('\n').map((l) => '      ' + l).join('\n')); }
});

rmSync(dir, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
