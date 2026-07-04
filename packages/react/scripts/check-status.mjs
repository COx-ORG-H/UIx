#!/usr/bin/env node
/* check-status.mjs — the component-maturity gate (A11Y-2).
 *
 * Validates packages/react/component-status.json against the REAL exported component surface
 * (packages/react/etc/uix-react.api.md, which api-extractor generates from src/index.ts and
 * `test:api` locks). Fails the build on:
 *   - a missing entry for an exported component,
 *   - an unknown registry key that is not an exported component,
 *   - an out-of-enum status (must be draft | beta | stable),
 *   - a malformed entry (no a11y.manualSR),
 *   - status "stable" without a manual-SR result at <a11y>/results/<id>.md (per A11Y-1).
 *
 * Component id = kebab-case of the export name (Button→button, StatusPill→status-pill), the same
 * lowercase-basename vocabulary A11Y-1 (results/button.md) and BREADTH-1 (the roadmap) use.
 *
 * The manual-SR results live in the shared workspace tree OUTSIDE this repo
 * (Development/Docs/a11y/results). Override the location with UIX_A11Y_RESULTS_DIR (e.g. in CI).
 * Because the registry ships all-draft/beta, no results file is required day one. Node built-ins only. */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_MD = resolve(__dirname, '../etc/uix-react.api.md');
const STATUS_JSON = resolve(__dirname, '../component-status.json');
// packages/react/scripts → up 5 → the workspace root (Development), then Docs/a11y/results.
const DEFAULT_RESULTS_DIR = resolve(__dirname, '../../../../../Docs/a11y/results');
const RESULTS_DIR = process.env.UIX_A11Y_RESULTS_DIR
  ? resolve(process.env.UIX_A11Y_RESULTS_DIR)
  : DEFAULT_RESULTS_DIR;

export const STATUSES = ['draft', 'beta', 'stable'];

/** kebab-case an export name: StatusPill→status-pill, AppShell→app-shell, Td→td. */
export const toId = (name) =>
  String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();

/** Exported *components* from the api-extractor report: exports that return JSX or are a
 *  ForwardRefExoticComponent (excludes exported utilities like cx / applyFilters). */
export function exportedComponents(md) {
  const out = [];
  const seen = new Set();
  for (const line of String(md).split(/\r?\n/)) {
    const m = line.match(/^export (?:function|const) ([A-Za-z0-9_]+)\b/);
    if (m && !seen.has(m[1]) && /JSX\.Element|ForwardRefExoticComponent/.test(line)) {
      seen.add(m[1]);
      out.push(m[1]);
    }
  }
  return out;
}

/** Pure validator. `registry` = { <id>: { status, a11y:{ manualSR } } } (meta `$…` keys ignored).
 *  `componentNames` = PascalCase export names. `resultsExists(id)` decides stable-eligibility
 *  (defaults to a filesystem check under RESULTS_DIR). Returns { errors: string[] }. */
export function validate(registry, componentNames, resultsExists) {
  const errors = [];
  const hasResults = resultsExists || ((id) => existsSync(resolve(RESULTS_DIR, `${id}.md`)));
  const ids = new Set(componentNames.map(toId));
  const entries = Object.fromEntries(
    Object.entries(registry || {}).filter(([k]) => !k.startsWith('$'))
  );

  for (const name of componentNames) {
    const id = toId(name);
    if (!Object.prototype.hasOwnProperty.call(entries, id)) {
      errors.push(`missing entry for exported component "${name}" (expected id "${id}")`);
    }
  }
  for (const [id, entry] of Object.entries(entries)) {
    if (!ids.has(id)) {
      errors.push(`unknown key "${id}" — not an exported component`);
      continue;
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`entry "${id}" must be an object`);
      continue;
    }
    if (!STATUSES.includes(entry.status)) {
      errors.push(`entry "${id}" has out-of-enum status ${JSON.stringify(entry.status)} (expected ${STATUSES.join(' | ')})`);
    }
    if (!entry.a11y || typeof entry.a11y !== 'object' || !('manualSR' in entry.a11y)) {
      errors.push(`entry "${id}" is missing a11y.manualSR`);
    }
    if (entry.status === 'stable' && !hasResults(id)) {
      errors.push(`entry "${id}" is "stable" but has no manual-SR result at ${resolve(RESULTS_DIR, `${id}.md`)} (A11Y-1)`);
    }
  }
  return { errors };
}

function main() {
  const md = readFileSync(API_MD, 'utf8');
  const registry = JSON.parse(readFileSync(STATUS_JSON, 'utf8'));
  const names = exportedComponents(md);
  const { errors } = validate(registry, names);
  if (errors.length) {
    console.error(`✗ component maturity status — ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const entries = Object.entries(registry).filter(([k]) => !k.startsWith('$'));
  const tally = entries.reduce((a, [, v]) => ((a[v.status] = (a[v.status] || 0) + 1), a), {});
  const parts = STATUSES.map((s) => `${tally[s] || 0} ${s}`).join(', ');
  console.log(`✓ component maturity status — ${entries.length} components (${parts}), registry matches api.md`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
