#!/usr/bin/env node
/**
 * uix-lint-tokens — the consumer-side design-system gate. Ships inside
 * @uix/tokens so every consumer runs the linter version matching its
 * installed contract (gates cannot drift behind the rules).
 *
 * Usage: uix-lint-tokens [globals.css] [--src <dir>] [--contract <path>]
 *                        [--overlay] [--strict-vars] [--allow-vars <prefix,prefix,...>]
 *
 * Either a CSS file, --src, or both must be given.
 *   --overlay      lint a theme overlay (ships inside the package): skips the
 *                  required-@imports and theme-import-order checks
 *   --strict-vars  apply the unknown-var check to ALL walked JS/TS files,
 *                  not just files under a components/uix/ segment
 *   --allow-vars   extra var-name prefixes the unknown-var check accepts
 *                  (comma-separated; --tw- is always allowed)
 *
 * CSS-file checks:
 *   1. globals.css imports @uix/tokens/tokens.css AND shadcn-bridge.css
 *      (skipped under --overlay)
 *   2. every --uix-* defined in consumer CSS is a contract name
 *      (override VALUES, never invent NAMES; slot tokens may be DEFINED)
 *   3. --uix-* overrides appear only inside the marker block
 *      /* @uix-overrides *​/ ... /* @uix-overrides-end *​/
 *   4. no rgb(var(--...)) triplet pattern (legacy; Tailwind v4 alpha
 *      works via color-mix on full color values)
 *   5. theme overlays (tokens/themes/*) imported AFTER tokens.css and
 *      shadcn-bridge.css — source order decides (skipped under --overlay)
 *
 * --src scan checks:
 *   6. no cold-gray Tailwind classes in app source:
 *      slate/zinc/gray are banned per design-system.md §1
 *   7. no rgb(var(--...)) triplets in any walked file
 *   8. unknown-var check (JS/TS files under components/uix/, or all JS/TS
 *      under --strict-vars): every fallback-less var(--name) read must be a
 *      contract token, a bridge name, or match an allowed prefix; reading a
 *      write-only slot token (e.g. var(--uix-brand)) is always an error
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function usage() {
  console.error(
    'usage: uix-lint-tokens [globals.css] [--src <dir>] [--contract <path>] [--overlay] [--strict-vars] [--allow-vars <prefix,prefix,...>]',
  );
}

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(['--src', '--contract', '--allow-vars']);
const BOOL_FLAGS = new Set(['--overlay', '--strict-vars']);
let cssArg = null;
const opts = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (VALUE_FLAGS.has(a)) opts[a] = args[++i];
  else if (BOOL_FLAGS.has(a)) opts[a] = true;
  else if (!a.startsWith('--') && cssArg === null) cssArg = a;
  else { usage(); process.exit(2); }
}
if (!cssArg && !opts['--src']) { usage(); process.exit(2); }

const cssPath = cssArg ? resolve(cssArg) : null;
const srcDir = opts['--src'] ? resolve(opts['--src']) : null;
const contractPath = opts['--contract']
  ? resolve(opts['--contract'])
  : join(dirname(fileURLToPath(import.meta.url)), '..', 'theme-contract.json');

const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
const contractNames = new Set(contract.tokens.map((t) => t.name));
const slotNames = new Set(contract.tokens.filter((t) => t.slot).map((t) => t.name));
const bridgeNames = new Set(contract.bridge);
const allowPrefixes = ['--tw-'].concat(
  opts['--allow-vars'] ? opts['--allow-vars'].split(',').map((s) => s.trim()).filter(Boolean) : [],
);
const errors = [];

if (cssPath) {
  const css = readFileSync(cssPath, 'utf8');

  // strip comments for analysis, but keep the override markers
  const markerStart = css.indexOf('/* @uix-overrides */');
  const markerEnd = css.indexOf('/* @uix-overrides-end */');
  const stripped = css.replace(/\/\*(?!\s@uix-overrides)[\s\S]*?\*\//g, '');

  if (!opts['--overlay']) {
    // 1. required imports
    const basePos = {};
    for (const need of ['tokens.css', 'shadcn-bridge.css']) {
      const re = new RegExp(`@import\\s+["'][^"']*tokens/${need.replace('.', '\\.')}["']`);
      if (!re.test(css)) errors.push(`missing @import of @uix/tokens/${need}`);
      const m = stripped.match(re);
      basePos[need] = m ? stripped.indexOf(m[0]) : -1;
    }

    // 5. theme overlays must come after both base imports (source order wins)
    for (const m of stripped.matchAll(/@import\s+["'][^"']*tokens\/themes\/[^"']*["']/g)) {
      if (Object.values(basePos).some((p) => p !== -1 && m.index < p)) {
        errors.push(
          'theme overlay imported before tokens.css/shadcn-bridge.css — overlays must come after the base imports to win by source order',
        );
      }
    }
  }

  // 2 + 3. --uix-* definitions: contract names only, inside the marker block only
  const defRe = /(--uix-[a-z0-9-]+)\s*:/g;
  let m;
  while ((m = defRe.exec(stripped)) !== null) {
    const name = m[1];
    const pos = css.indexOf(m[0]); // approximate position in original
    if (!contractNames.has(name)) {
      errors.push(`"${name}" is not a contract token — override values, never invent names (theme-contract.json v${contract.version})`);
      continue;
    }
    if (markerStart === -1 || markerEnd === -1) {
      errors.push(`"${name}" overridden but no /* @uix-overrides */ ... /* @uix-overrides-end */ marker block found`);
    } else if (pos < markerStart || pos > markerEnd) {
      errors.push(`"${name}" overridden outside the @uix-overrides marker block`);
    }
  }

  // re-pointing bridge names is legal, but only inside the marker block
  const bridgeDefRe = /(--[a-z][a-z0-9-]*)\s*:/g;
  while ((m = bridgeDefRe.exec(stripped)) !== null) {
    const name = m[1];
    if (!bridgeNames.has(name)) continue;
    const pos = css.indexOf(m[0]);
    if (markerStart !== -1 && (pos < markerStart || pos > markerEnd)) {
      errors.push(`bridge name "${name}" re-pointed outside the @uix-overrides marker block`);
    }
  }

  // 4. legacy triplet pattern
  if (/rgb\(\s*var\(--/.test(stripped)) {
    errors.push('rgb(var(--...)) triplet pattern found — use full color values; Tailwind v4 handles alpha via color-mix');
  }
}

// 6–8. source scan
const COLD = /\b(?:bg|text|border|ring|fill|stroke|divide|outline|decoration|from|via|to|shadow)-(?:slate|zinc|gray)-\d{2,3}\b/;
const UIX_COMPONENT_PATH = /[\\/]components[\\/]uix[\\/]/;
const VAR_RE = /var\(\s*(--[A-Za-z0-9_-]+)\s*([,)])/g;
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
    const checkVars =
      /\.(tsx?|jsx?)$/.test(fp) && (opts['--strict-vars'] || UIX_COMPONENT_PATH.test(fp));
    const lines = readFileSync(fp, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const hit = line.match(COLD);
      if (hit) errors.push(`${fp}:${i + 1} cold-gray class "${hit[0]}" — warm neutrals only (design-system §1); use uix tokens`);
      if (/rgb\(\s*var\(--/.test(line)) {
        errors.push(`${fp}:${i + 1} rgb(var(--...)) triplet — use full-value tokens; alpha via color-mix`);
      }
      if (!checkVars) return;
      for (const vm of line.matchAll(VAR_RE)) {
        const [, name, after] = vm;
        if (after === ',') continue; // fallback present — always allowed
        if (slotNames.has(name)) {
          errors.push(`${fp}:${i + 1} "var(${name})" — brand slots are write-only; read --uix-accent/--uix-link/--uix-ring instead`);
        } else if (!contractNames.has(name) && !bridgeNames.has(name) && !allowPrefixes.some((p) => name.startsWith(p))) {
          errors.push(`${fp}:${i + 1} "var(${name})" is not a contract or bridge token — use --uix-* names or add a fallback`);
        }
      }
    });
  }
}

if (errors.length) {
  console.error(`uix-lint-tokens: ${errors.length} problem(s) in ${cssPath ?? srcDir}`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`uix-lint-tokens: OK (contract v${contract.version}, ${contractNames.size} tokens)`);
