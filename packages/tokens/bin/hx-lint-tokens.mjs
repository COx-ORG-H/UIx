#!/usr/bin/env node
/**
 * hx-lint-tokens — the consumer-side design-system gate. Ships inside
 * @hx/tokens so every consumer runs the linter version matching its
 * installed contract (gates cannot drift behind the rules).
 *
 * Usage: hx-lint-tokens <globals.css> [--src <dir>] [--contract <path>]
 *
 * Checks:
 *   1. globals.css imports @hx/tokens/tokens.css AND shadcn-bridge.css
 *   2. every --hx-* defined in consumer CSS is a contract name
 *      (override VALUES, never invent NAMES)
 *   3. --hx-* overrides appear only inside the marker block
 *      /* @hx-overrides *​/ ... /* @hx-overrides-end *​/
 *   4. no rgb(var(--...)) triplet pattern (legacy; Tailwind v4 alpha
 *      works via color-mix on full color values)
 *   5. (--src) no cold-gray Tailwind classes in app source:
 *      slate/zinc/gray are banned per design-system.md §1
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith('--')) {
  console.error('usage: hx-lint-tokens <globals.css> [--src <dir>] [--contract <path>]');
  process.exit(2);
}
const cssPath = resolve(args[0]);
const srcDir = args.includes('--src') ? resolve(args[args.indexOf('--src') + 1]) : null;
const contractPath = args.includes('--contract')
  ? resolve(args[args.indexOf('--contract') + 1])
  : join(dirname(fileURLToPath(import.meta.url)), '..', 'theme-contract.json');

const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
const contractNames = new Set(contract.tokens.map((t) => t.name));
const bridgeNames = new Set(contract.bridge);
const css = readFileSync(cssPath, 'utf8');
const errors = [];

// 1. required imports
for (const need of ['tokens.css', 'shadcn-bridge.css']) {
  const re = new RegExp(`@import\\s+["'][^"']*tokens/${need.replace('.', '\\.')}["']`);
  if (!re.test(css)) errors.push(`missing @import of @hx/tokens/${need}`);
}

// strip comments for definition analysis, but keep marker positions first
const markerStart = css.indexOf('/* @hx-overrides */');
const markerEnd = css.indexOf('/* @hx-overrides-end */');
const stripped = css.replace(/\/\*(?!\s@hx-overrides)[\s\S]*?\*\//g, '');

// 2 + 3. --hx-* definitions: contract names only, inside the marker block only
const defRe = /(--hx-[a-z0-9-]+)\s*:/g;
let m;
while ((m = defRe.exec(stripped)) !== null) {
  const name = m[1];
  const pos = css.indexOf(m[0]); // approximate position in original
  if (!contractNames.has(name)) {
    errors.push(`"${name}" is not a contract token — override values, never invent names (theme-contract.json v${contract.version})`);
    continue;
  }
  if (markerStart === -1 || markerEnd === -1) {
    errors.push(`"${name}" overridden but no /* @hx-overrides */ ... /* @hx-overrides-end */ marker block found`);
  } else if (pos < markerStart || pos > markerEnd) {
    errors.push(`"${name}" overridden outside the @hx-overrides marker block`);
  }
}

// re-pointing bridge names is legal, but only inside the marker block
const bridgeDefRe = /(--[a-z][a-z0-9-]*)\s*:/g;
while ((m = bridgeDefRe.exec(stripped)) !== null) {
  const name = m[1];
  if (!bridgeNames.has(name)) continue;
  const pos = css.indexOf(m[0]);
  if (markerStart !== -1 && (pos < markerStart || pos > markerEnd)) {
    errors.push(`bridge name "${name}" re-pointed outside the @hx-overrides marker block`);
  }
}

// 4. legacy triplet pattern
if (/rgb\(\s*var\(--/.test(stripped)) {
  errors.push('rgb(var(--...)) triplet pattern found — use full color values; Tailwind v4 handles alpha via color-mix');
}

// 5. banned cold-gray classes in source
const COLD = /\b(?:bg|text|border|ring|fill|stroke|divide|outline|decoration|from|via|to|shadow)-(?:slate|zinc|gray)-\d{2,3}\b/;
function* walk(dir) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const fp = join(dir, e);
    if (statSync(fp).isDirectory()) yield* walk(fp);
    else if (/\.(tsx?|jsx?|css)$/.test(e)) yield fp;
  }
}
if (srcDir && existsSync(srcDir)) {
  for (const fp of walk(srcDir)) {
    const lines = readFileSync(fp, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const hit = line.match(COLD);
      if (hit) errors.push(`${fp}:${i + 1} cold-gray class "${hit[0]}" — warm neutrals only (design-system §1); use hx tokens`);
    });
  }
}

if (errors.length) {
  console.error(`hx-lint-tokens: ${errors.length} problem(s) in ${cssPath}`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`hx-lint-tokens: OK (contract v${contract.version}, ${contractNames.size} tokens)`);
