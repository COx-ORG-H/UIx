#!/usr/bin/env node
/**
 * RDY-COMPLIANCE-DOC-01 — license + honest-docs gate (CI-blocking).
 *
 * Lesson 21, layer 10: "never assert a control is enforced in a
 * regulator-facing doc unless its gate exists — a false claim in a compliance
 * artifact is the worst kind of doc-vs-code drift." UIx's README/AUDIT are its
 * regulator-facing docs. Checks:
 *
 *   1. LICENSE present at repo root AND in the published package
 *      (packages/tokens/), and neither package.json declares UNLICENSED / a
 *      missing license — the package is meant for a PUBLIC scope and vendored
 *      into other repos, so UNLICENSED is a legal contradiction.
 *   2. THIRD_PARTY.md present (the attribution artifact).
 *   3. No over-claim: every gate ARTIFACT a doc names — a `*.mjs` script or a
 *      `uix-lint-tokens`/`uix-diff` bin command — must actually exist on disk.
 *      A doc that references a gate script that isn't there is asserting an
 *      enforcement that has no gate.
 *
 * Exit: 0 OK, 1 violations, 2 IO error.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const posix = (p) => p.split(sep).join('/');
const errors = [];

// --- 1. license present + not UNLICENSED -----------------------------------
for (const [label, p] of [
  ['repo-root LICENSE', join(root, 'LICENSE')],
  ['published-package LICENSE (packages/tokens/LICENSE)', join(root, 'packages', 'tokens', 'LICENSE')],
]) {
  if (!existsSync(p)) errors.push(`missing ${label} — a package for a public scope must ship a license`);
}
for (const [label, rel] of [
  ['@uix/tokens (published)', 'packages/tokens/package.json'],
  ['root workspace', 'package.json'],
]) {
  const pj = JSON.parse(readFileSync(join(root, ...rel.split('/')), 'utf8'));
  const lic = pj.license;
  if (!lic || /^unlicensed$/i.test(lic)) {
    errors.push(`${label} package.json license is ${lic ? `"${lic}"` : 'unset'} — set a real SPDX id (UNLICENSED contradicts the public-scope, vendor-freely design)`);
  }
}

// --- 2. attribution artifact ------------------------------------------------
if (!existsSync(join(root, 'THIRD_PARTY.md'))) {
  errors.push('missing THIRD_PARTY.md — the third-party notices / provenance artifact');
}

// --- 3. no over-claim: doc-named gate artifacts must exist -------------------
const docs = ['README.md', 'AUDIT.md', 'READINESS.md', 'MIGRATIONS.md', 'packages/tokens/README.md'];
// where a referenced *.mjs / bin could legitimately live
const searchDirs = [
  join(root, 'scripts'),
  join(root, 'packages', 'tokens', 'scripts'),
  join(root, 'packages', 'tokens', 'bin'),
];
const resolvesToFile = (basename) => searchDirs.some((d) => existsSync(join(d, basename)));

const MJS_REF = /\b([a-z0-9][a-z0-9_-]*\.mjs)\b/gi;
const BIN_REF = /\b(uix-lint-tokens|uix-diff)\b/g;
const BIN_FILE = { 'uix-lint-tokens': 'uix-lint-tokens.mjs', 'uix-diff': 'uix-diff.mjs' };

for (const docRel of docs) {
  const abs = join(root, ...docRel.split('/'));
  if (!existsSync(abs)) continue;
  const text = readFileSync(abs, 'utf8');
  const flagged = new Set();
  for (const m of text.matchAll(MJS_REF)) {
    const name = m[1];
    if (flagged.has(name) || resolvesToFile(name)) continue;
    flagged.add(name);
    const line = text.slice(0, m.index).split('\n').length;
    errors.push(`${docRel}:${line} references gate script "${name}" which does not exist in scripts/ | packages/tokens/{scripts,bin}/ — an enforcement claim with no gate`);
  }
  for (const m of text.matchAll(BIN_REF)) {
    const name = m[1];
    if (flagged.has(name) || resolvesToFile(BIN_FILE[name])) continue;
    flagged.add(name);
    const line = text.slice(0, m.index).split('\n').length;
    errors.push(`${docRel}:${line} references "${name}" but ${BIN_FILE[name]} is not on disk`);
  }
}

if (errors.length) {
  console.error(`check-doc-claims: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('check-doc-claims: OK (LICENSE present + SPDX set in both manifests, THIRD_PARTY.md present, every doc-named gate artifact exists)');
