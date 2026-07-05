#!/usr/bin/env node
/* check-docs-coverage.mjs (DOCS-4) — every exported component has a documentation page, or is on a
 * shrinking allowlist. Reads the component list from the api-extractor report (via the same parser
 * that builds the docs index) and the docs/content/*.json set; a component is COVERED when it has a
 * content file with the required fields (overview, do, dont, a11yNotes). Anything not covered must be
 * listed in docs-coverage-allowlist.json (the DOCS-6 burn-down) or the gate fails.
 *
 * Also flags STALE allowlist entries — a component that is now documented but still allowlisted, or
 * an allowlist id that is not a component — so the list can only shrink honestly. Dependency-free.
 * Run: npm run test:docs
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { parseApiMd } from './build-docs-index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_MD = resolve(__dirname, '../../react/etc/uix-react.api.md');
const CONTENT_DIR = resolve(__dirname, '../docs/content');
const ALLOWLIST = resolve(__dirname, '../docs/docs-coverage-allowlist.json');

const REQUIRED_ARRAYS = ['do', 'dont', 'a11yNotes'];

/** A content object is complete when overview is a non-empty string and do/dont/a11yNotes are
 *  non-empty arrays. Returns null if valid, else a reason string. */
export function contentProblem(obj) {
  if (!obj || typeof obj !== 'object') return 'not an object';
  if (typeof obj.overview !== 'string' || !obj.overview.trim()) return 'missing overview';
  for (const f of REQUIRED_ARRAYS) {
    if (!Array.isArray(obj[f]) || obj[f].length === 0) return `missing/empty ${f}`;
  }
  return null;
}

function loadContent(slug) {
  const p = join(CONTENT_DIR, `${slug}.json`);
  if (!existsSync(p)) return { exists: false };
  try {
    return { exists: true, obj: JSON.parse(readFileSync(p, 'utf8')) };
  } catch (e) {
    return { exists: true, obj: null, parseError: e.message };
  }
}

function main() {
  const md = readFileSync(API_MD, 'utf8');
  const components = parseApiMd(md).components; // [{ name, slug, ... }]
  const allowRaw = JSON.parse(readFileSync(ALLOWLIST, 'utf8'));
  const allow = new Set(allowRaw.allow || []);
  const componentSlugs = new Set(components.map((c) => c.slug));

  const errors = [];
  let covered = 0;

  for (const c of components) {
    const { exists, obj, parseError } = loadContent(c.slug);
    const problem = exists && !parseError ? contentProblem(obj) : parseError || 'no content file';
    const isCovered = exists && !parseError && problem === null;
    if (isCovered) {
      covered++;
      if (allow.has(c.slug)) {
        errors.push(`"${c.slug}" is documented — remove it from docs-coverage-allowlist.json (stale).`);
      }
    } else if (!allow.has(c.slug)) {
      errors.push(`"${c.slug}" (${c.name}) — ${problem}; add a docs/content/${c.slug}.json or allowlist it.`);
    }
  }

  // allowlist ids that aren't components at all
  for (const id of allow) {
    if (!componentSlugs.has(id)) errors.push(`allowlist id "${id}" is not an exported component (stale).`);
  }

  if (errors.length) {
    console.error(`✗ docs coverage — ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const remaining = allow.size;
  console.log(
    `✓ docs coverage — ${covered}/${components.length} components documented; ${remaining} allowlisted (DOCS-6 burn-down).`
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
