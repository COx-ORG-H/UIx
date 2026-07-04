#!/usr/bin/env node
/**
 * RDY-GATE-CONSISTENCY-01 — the meta-gate (CI-blocking).
 *
 * Law 1: an unenforced rule is a suggestion. Two silent ways a gate stops
 * being real, both closed here:
 *
 *   1. ORPHAN GATE — a scripts/check-*.mjs or scripts/lint-*.mjs file exists
 *      but nothing in the `check` chain ever runs it. It looks like coverage;
 *      it is decoration. Every gate-named script must be reachable from
 *      `pnpm check` (via an npm sub-script or a direct `node scripts/X.mjs`).
 *   2. CI DRIFT — `ci.yml` runs a hand-picked subset instead of the same
 *      `pnpm check` a developer runs. The gate a PR passes must be the gate
 *      the dev passes. `ci.yml` must invoke `pnpm check`.
 *
 * Also: every check:/lint:/test: npm script must be reachable from `check`
 * (a gate script defined but never chained is the same failure as #1).
 *
 * Convention: gate files are scripts/check-*.mjs and scripts/lint-*.mjs. Build
 * steps (build.mjs, stamp-registry.mjs, copy-to-fixtures.mjs), the dev server
 * (serve-registry.mjs), and consumer-side tools (uix-diff.mjs, uix-doctor.mjs)
 * are NOT gates by this convention and are not required to be chained.
 *
 * Exit: 0 OK, 1 violations, 2 IO error.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'package.json');
const ciPath = join(root, '.github', 'workflows', 'ci.yml');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const scripts = pkg.scripts ?? {};
if (!scripts.check) {
  console.error('check-gate-consistency: no "check" script in package.json — nothing to verify against.');
  process.exit(2);
}

// --- reachability from `check` ----------------------------------------------
// Follow `pnpm <name>` / `pnpm run <name>` references between npm scripts;
// accumulate every reachable command string (which also contains the direct
// `node scripts/X.mjs` invocations).
const SCRIPT_REF = /\bpnpm\s+(?:run\s+)?(-r\s+)?([a-z][a-z0-9:_-]*)/gi;
const reachableNames = new Set();
const reachableCommands = [];
const work = ['check'];
while (work.length) {
  const name = work.pop();
  if (reachableNames.has(name)) continue;
  reachableNames.add(name);
  const cmd = scripts[name];
  if (cmd == null) continue;
  reachableCommands.push(cmd);
  for (const m of cmd.matchAll(SCRIPT_REF)) {
    const ref = m[2];
    if (ref && scripts[ref] != null && !reachableNames.has(ref)) work.push(ref);
  }
}
const reachableBlob = reachableCommands.join('\n');

const errors = [];

// --- 1. no orphan gate file --------------------------------------------------
const gateFiles = readdirSync(join(root, 'scripts'))
  .filter((f) => /^(check|lint)-.*\.mjs$/.test(f))
  .sort();
for (const f of gateFiles) {
  if (!reachableBlob.includes(f)) {
    errors.push(`orphan gate: scripts/${f} exists but is never run by the "check" chain — wire it into package.json "check" (or a sub-script it calls), or it is decorative`);
  }
}

// --- 2. every check:/lint:/test: npm script reachable from check ------------
for (const name of Object.keys(scripts)) {
  if (name === 'check') continue;
  if (!/^(check|lint|test):/.test(name)) continue;
  if (!reachableNames.has(name)) {
    errors.push(`unreachable gate script: package.json "${name}" is never invoked by "check" (defined but not chained)`);
  }
}

// --- 3. CI runs the same `pnpm check` ---------------------------------------
if (!existsSync(ciPath)) {
  errors.push('.github/workflows/ci.yml not found — CI cannot be verified to run the gate chain');
} else {
  const ci = readFileSync(ciPath, 'utf8');
  if (!/\bpnpm\s+(?:run\s+)?check\b(?!:|[a-z-])/.test(ci)) {
    errors.push('ci.yml does not run `pnpm check` — CI must run the same aggregate gate a developer runs, not a subset');
  }
}

if (errors.length) {
  console.error(`check-gate-consistency: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `check-gate-consistency: OK (${gateFiles.length} gate scripts all wired into "check"; ${reachableNames.size} reachable npm scripts; ci.yml runs pnpm check)`,
);
