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
 * CSS-file checks (comments are stripped first, so commented-out code never
 * satisfies or trips a check; errors carry the source line number):
 *   1. globals.css imports @uix/tokens/tokens.css AND shadcn-bridge.css
 *      (skipped under --overlay)
 *   2. every --uix-* defined in consumer CSS is a contract name
 *      (override VALUES, never invent NAMES; slot tokens may be DEFINED)
 *   3. --uix-* overrides and bridge re-points appear only inside the marker
 *      block /* @uix-overrides *​/ ... /* @uix-overrides-end *​/ — defining
 *      either with no marker block present is an error
 *   4. no rgb()/rgba()/hsl()/hsla() over var(--...) triplet pattern (legacy;
 *      Tailwind v4 alpha works via color-mix on full color values)
 *   5. theme overlays (tokens/themes/*) imported AFTER tokens.css and
 *      shadcn-bridge.css — source order decides (skipped under --overlay)
 *
 * --src scan checks (a --src directory that does not exist is a usage
 * error, exit 2):
 *   6. no cold-gray Tailwind classes in app source:
 *      slate/zinc/gray are banned per design-system.md §1
 *   7. no rgb()/rgba()/hsl()/hsla() over var(--...) triplets in any walked file
 *   8. unknown-var check (JS/TS files under components/uix/, or all JS/TS
 *      under --strict-vars): every fallback-less var(--name) read must be a
 *      contract token, a bridge name, or match an allowed prefix; reading a
 *      write-only slot token (e.g. var(--uix-brand)) is always an error,
 *      even with a fallback present
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
if (srcDir && !existsSync(srcDir)) {
  console.error(`uix-lint-tokens: --src directory not found: ${srcDir}`);
  process.exit(2);
}
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

  // Strip comments for analysis, but keep the override markers. Each stripped
  // comment is replaced by same-length whitespace with newlines preserved, so
  // every index and line number on the stripped string maps 1:1 to the
  // original file — all positions below are computed on `stripped`.
  const stripped = css.replace(/\/\*(?!\s@uix-overrides)[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const markerStart = stripped.indexOf('/* @uix-overrides */');
  const markerEnd = stripped.indexOf('/* @uix-overrides-end */');
  const lineOf = (idx) => stripped.slice(0, idx).split('\n').length;

  if (!opts['--overlay']) {
    // 1. required imports (commented-out imports do not count)
    const basePos = {};
    for (const need of ['tokens.css', 'shadcn-bridge.css']) {
      const re = new RegExp(`@import\\s+["'][^"']*tokens/${need.replace('.', '\\.')}["']`);
      const im = re.exec(stripped);
      if (!im) errors.push(`missing @import of @uix/tokens/${need}`);
      basePos[need] = im ? im.index : -1;
    }

    // 5. theme overlays must come after both base imports (source order wins)
    for (const m of stripped.matchAll(/@import\s+["'][^"']*tokens\/themes\/[^"']*["']/g)) {
      if (Object.values(basePos).some((p) => p !== -1 && m.index < p)) {
        errors.push(
          `line ${lineOf(m.index)}: theme overlay imported before tokens.css/shadcn-bridge.css — overlays must come after the base imports to win by source order`,
        );
      }
    }
  }

  // 2 + 3. --uix-* definitions: contract names only, inside the marker block
  // only (case-insensitive so a case-typo like --uix-Accent is caught)
  const defRe = /(--uix-[a-z0-9-]+)\s*:/gi;
  let m;
  while ((m = defRe.exec(stripped)) !== null) {
    const name = m[1];
    const line = lineOf(m.index);
    if (!contractNames.has(name)) {
      errors.push(`line ${line}: "${name}" is not a contract token — override values, never invent names (theme-contract.json v${contract.version})`);
      continue;
    }
    if (markerStart === -1 || markerEnd === -1) {
      errors.push(`line ${line}: "${name}" overridden but no /* @uix-overrides */ ... /* @uix-overrides-end */ marker block found`);
    } else if (m.index < markerStart || m.index > markerEnd) {
      errors.push(`line ${line}: "${name}" overridden outside the @uix-overrides marker block`);
    }
  }

  // re-pointing bridge names is legal, but only inside the marker block
  const bridgeDefRe = /(--[a-z][a-z0-9-]*)\s*:/g;
  while ((m = bridgeDefRe.exec(stripped)) !== null) {
    const name = m[1];
    if (!bridgeNames.has(name)) continue;
    const line = lineOf(m.index);
    if (markerStart === -1 || markerEnd === -1) {
      errors.push(`line ${line}: bridge name "${name}" re-pointed but no /* @uix-overrides */ ... /* @uix-overrides-end */ marker block found`);
    } else if (m.index < markerStart || m.index > markerEnd) {
      errors.push(`line ${line}: bridge name "${name}" re-pointed outside the @uix-overrides marker block`);
    }
  }

  // 4. legacy triplet pattern
  for (const tm of stripped.matchAll(/(?:rgba?|hsla?)\(\s*var\(--/g)) {
    errors.push(`line ${lineOf(tm.index)}: rgb()/hsl() over var() triplet pattern found — use full color values; Tailwind v4 handles alpha via color-mix`);
  }
}

// 6–8. source scan
const COLD = /\b(?:bg|text|border|ring|fill|stroke|divide|outline|decoration|from|via|to|shadow)-(?:slate|zinc|gray)-\d{2,3}\b/g;
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
if (srcDir) {
  for (const fp of walk(srcDir)) {
    const checkVars =
      /\.(tsx?|jsx?)$/.test(fp) && (opts['--strict-vars'] || UIX_COMPONENT_PATH.test(fp));
    const lines = readFileSync(fp, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const hit of line.matchAll(COLD)) {
        errors.push(`${fp}:${i + 1} cold-gray class "${hit[0]}" — warm neutrals only (design-system §1); use uix tokens`);
      }
      if (/(?:rgba?|hsla?)\(\s*var\(--/.test(line)) {
        errors.push(`${fp}:${i + 1} rgb()/hsl() over var() triplet — use full-value tokens; alpha via color-mix`);
      }
      if (!checkVars) return;
      for (const vm of line.matchAll(VAR_RE)) {
        const [, name, after] = vm;
        // slot reads are write-only violations even with a fallback present
        if (slotNames.has(name)) {
          errors.push(`${fp}:${i + 1} "var(${name})" — brand slots are write-only; read --uix-accent/--uix-link/--uix-ring instead`);
          continue;
        }
        if (after === ',') continue; // fallback present — allowed for non-slot names
        if (!contractNames.has(name) && !bridgeNames.has(name) && !allowPrefixes.some((p) => name.startsWith(p))) {
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
