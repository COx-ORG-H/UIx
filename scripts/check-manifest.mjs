#!/usr/bin/env node
/**
 * RDY-HYGIENE-01 — registry manifest & internal-consistency gate (CI-blocking).
 *
 * Catches the "manifest drift" class the AUDIT flagged (§3: README named
 * status-pill/stat-tile before they existed). Nothing else mechanically ties
 * the manifest, the files on disk, and the counts asserted in prose together;
 * this does.
 *
 * Checks:
 *   1. every registry.json files[].path exists on disk
 *   2. no orphan: every *.ts/*.tsx under registry/uix/ is claimed by exactly
 *      one item's files[] (an untracked component file ships to nobody)
 *   3. every registryDependencies "@uix/<x>" resolves to a real item name
 *   4. no two items write the same files[].target (vendor-path collision)
 *   5. count consistency: the item / component-file / token counts asserted
 *      in the LIVING docs (README.md, packages/tokens/README.md,
 *      .project-status.json, READINESS.md) match the computed reality.
 *      AUDIT.md is intentionally NOT scanned — it is a frozen point-in-time
 *      artifact full of historical counts by design.
 *
 * Exit: 0 OK, 1 violations, 2 usage/IO error.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const posix = (p) => p.split(sep).join('/');
const registryDir = join(root, 'registry', 'uix');
const manifestPath = join(root, 'registry', 'registry.json');
const contractPath = join(root, 'packages', 'tokens', 'theme-contract.json');

function fail(msg) {
  console.error(`check-manifest: ${msg}`);
  process.exit(2);
}

if (!existsSync(manifestPath)) fail(`registry manifest not found: ${posix(relative(root, manifestPath))}`);
if (!existsSync(registryDir)) fail('registry/uix/ not found — refusing to silently pass.');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const items = manifest.items ?? [];
const itemNames = new Set(items.map((it) => it.name));
const contract = JSON.parse(readFileSync(contractPath, 'utf8'));

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const errors = [];

// --- computed reality --------------------------------------------------------
const manifestFilePaths = [];
const targetOwners = new Map(); // target -> [item names]
for (const it of items) {
  for (const f of it.files ?? []) {
    manifestFilePaths.push(f.path);
    if (f.target) {
      const list = targetOwners.get(f.target) ?? [];
      list.push(it.name);
      targetOwners.set(f.target, list);
    }
  }
}
const itemCount = items.length;
const fileCount = manifestFilePaths.length;
const tokenCount = (contract.tokens ?? []).length;

// --- 1. manifest paths exist -------------------------------------------------
const claimed = new Set();
for (const it of items) {
  for (const f of it.files ?? []) {
    const abs = join(root, ...f.path.split('/'));
    if (!existsSync(abs)) {
      errors.push(`item "${it.name}": files[].path does not exist on disk: ${f.path}`);
    } else {
      claimed.add(posix(relative(root, abs)));
    }
  }
}

// --- 2. no orphan component files -------------------------------------------
for (const abs of walk(registryDir)) {
  if (!['.ts', '.tsx'].includes(extname(abs))) continue;
  const rel = posix(relative(root, abs));
  if (!claimed.has(rel)) {
    errors.push(`orphan file (on disk under registry/uix/ but claimed by no item): ${rel}`);
  }
}

// --- 3. registryDependencies resolve ----------------------------------------
for (const it of items) {
  for (const dep of it.registryDependencies ?? []) {
    if (!dep.startsWith('@uix/')) continue; // external registry deps are out of scope
    const name = dep.slice('@uix/'.length);
    if (!itemNames.has(name)) {
      errors.push(`item "${it.name}": registryDependencies references "${dep}" — no such item`);
    }
  }
}

// --- 4. no target collision --------------------------------------------------
for (const [target, owners] of targetOwners) {
  if (owners.length > 1) {
    errors.push(`vendor-path collision: target "${target}" written by ${owners.length} items (${owners.join(', ')})`);
  }
}

// --- 5. count consistency in living docs ------------------------------------
const CLAIMS = [
  { label: 'item count', actual: itemCount, patterns: [/\b(\d+)\s+items\b/gi, /\b(\d+)-item\b/gi] },
  { label: 'component-file count', actual: fileCount, patterns: [/\b(\d+)\s+component files\b/gi] },
  { label: 'token count', actual: tokenCount, patterns: [/\b(\d+)-token\b/gi] },
];
const livingDocs = ['README.md', 'READINESS.md', 'packages/tokens/README.md', '.project-status.json'];
for (const docRel of livingDocs) {
  const abs = join(root, ...docRel.split('/'));
  if (!existsSync(abs)) continue;
  const text = readFileSync(abs, 'utf8');
  for (const claim of CLAIMS) {
    for (const re of claim.patterns) {
      re.lastIndex = 0;
      for (const m of text.matchAll(re)) {
        const n = Number(m[1]);
        if (n !== claim.actual) {
          const line = text.slice(0, m.index).split('\n').length;
          errors.push(`${docRel}:${line}: ${claim.label} prose says ${n} ("${m[0]}") but reality is ${claim.actual}`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error(`check-manifest: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `check-manifest: OK (${itemCount} items, ${fileCount} component files, ${tokenCount} tokens; paths exist, no orphans, deps resolve, counts consistent)`,
);
