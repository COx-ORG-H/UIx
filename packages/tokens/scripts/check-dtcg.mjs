#!/usr/bin/env node
/* check-dtcg.mjs (DTCG-2) — a DTCG-validity conformance gate over the token SOURCE.
 *
 * Walks tokens/base/*.json + tokens/dark/*.json and, for every token leaf, asserts:
 *   - both `$type` and `$value` are present,
 *   - `$type` is one of the ADR-0019-ratified families
 *     (color, fontFamily, dimension, number, shadow, cubicBezier, duration),
 *   - the leaf carries no stray non-`$` metadata keys (DTCG metadata is `$`-prefixed).
 *
 * It reads JSON ONLY — it never rebuilds or compares build/css/tokens.css, so it CANNOT move
 * `--uix-*` output (parity-neutral by construction; the deviations themselves are ratified in
 * ADR-0019, this gate just keeps the source structurally valid). Dependency-free. Exits non-zero
 * with a per-token message on the first batch of problems. Run: npm run test:dtcg -w @tensor_1/tokens
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_ROOT = resolve(__dirname, '../tokens');
const DIRS = ['base', 'dark'];

// ADR-0019 §Decision — the ratified $type set (identical to check-dtcg's contract with the audit).
export const RATIFIED_TYPES = new Set([
  'color',
  'fontFamily',
  'dimension',
  'number',
  'shadow',
  'cubicBezier',
  'duration',
]);

// Metadata keys DTCG allows alongside a token's $value.
const ALLOWED_LEAF_KEYS = new Set(['$type', '$value', '$description', '$extensions', '$deprecated']);

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Recursively validate one parsed token document. Returns an array of error strings. */
export function validateDoc(doc, fileLabel = '<doc>') {
  const errors = [];
  const walk = (node, path) => {
    if (!isObject(node)) return;
    if ('$value' in node) {
      // token leaf
      const where = `${fileLabel}:${path}`;
      if (!('$type' in node)) errors.push(`${where} — leaf has $value but no $type`);
      else if (!RATIFIED_TYPES.has(node.$type)) {
        errors.push(`${where} — $type ${JSON.stringify(node.$type)} not in the ADR-0019 ratified set`);
      }
      for (const key of Object.keys(node)) {
        if (!ALLOWED_LEAF_KEYS.has(key)) {
          errors.push(`${where} — stray key ${JSON.stringify(key)} on a token leaf (expected $-prefixed metadata)`);
        }
      }
      return;
    }
    // group: recurse into child tokens/groups (non-$ keys); a lone $type here would be malformed
    if ('$type' in node && !Object.keys(node).some((k) => !k.startsWith('$'))) {
      errors.push(`${fileLabel}:${path} — $type present but no $value and no child tokens`);
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      walk(child, path ? `${path}.${key}` : key);
    }
  };
  walk(doc, '');
  return errors;
}

function main() {
  const errors = [];
  let leafFiles = 0;
  for (const dir of DIRS) {
    const abs = join(TOKENS_ROOT, dir);
    let files;
    try {
      files = readdirSync(abs).filter((f) => f.endsWith('.json'));
    } catch {
      continue; // dir may not exist (e.g. dark only overrides some families)
    }
    for (const f of files) {
      leafFiles++;
      const full = join(abs, f);
      const label = relative(TOKENS_ROOT, full).replace(/\\/g, '/');
      let doc;
      try {
        doc = JSON.parse(readFileSync(full, 'utf8'));
      } catch (e) {
        errors.push(`${label} — invalid JSON: ${e.message}`);
        continue;
      }
      errors.push(...validateDoc(doc, label));
    }
  }
  if (errors.length) {
    console.error(`✗ DTCG validity — ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`✓ DTCG validity — ${leafFiles} token files valid; every leaf has $type ∈ {${[...RATIFIED_TYPES].join(', ')}} + $value.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
