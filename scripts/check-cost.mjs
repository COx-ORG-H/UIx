#!/usr/bin/env node
/**
 * RDY-COST-01 — per-item consumer-footprint gate (CI-blocking).
 *
 * Lesson 21, layer 11 (cost per feature + a budget alarm). For a VENDORED
 * design system, "cost" is what installing one registry item imposes on a
 * consumer. AUDIT §5.7: adding one small item (@uix/states) transitively
 * vendors the whole data-table chain and installs @tanstack/react-table — an
 * invisible, unbounded install cost. This makes it visible and bounded.
 *
 * For each item, over its transitive @uix/* registryDependencies closure:
 *   files   — distinct vendored files copied into the consumer
 *   npmDeps — distinct npm packages the consumer must install
 *   loc     — total lines of vendored source
 *
 * Enforced against cost-budget.json:
 *   { "default": {maxFiles,maxNpmDeps,maxLoc}, "overrides": { "<item>": {…} } }
 * Any item over its budget fails. `--report` prints the table and skips
 * enforcement (use to calibrate the budget). Without a budget file, prints the
 * table and exits 0 (advisory).
 *
 * Exit: 0 OK/report, 1 over budget, 2 IO error.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'registry', 'registry.json');
const budgetPath = join(root, 'cost-budget.json');
const reportOnly = process.argv.includes('--report');

if (!existsSync(manifestPath)) {
  console.error('check-cost: registry/registry.json not found');
  process.exit(2);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const byName = new Map(manifest.items.map((it) => [it.name, it]));

// transitive @uix/* closure (includes the item itself), cycle-safe
function closure(name, acc = new Set()) {
  if (acc.has(name)) return acc;
  acc.add(name);
  const it = byName.get(name);
  if (!it) return acc;
  for (const dep of it.registryDependencies ?? []) {
    if (dep.startsWith('@uix/')) closure(dep.slice('@uix/'.length), acc);
  }
  return acc;
}

const locOf = (relPath) => {
  const abs = join(root, ...relPath.split('/'));
  if (!existsSync(abs)) return 0;
  return readFileSync(abs, 'utf8').split('\n').length;
};

const footprints = manifest.items.map((it) => {
  const names = [...closure(it.name)];
  const files = new Set();
  const npmDeps = new Set();
  let loc = 0;
  for (const n of names) {
    const dep = byName.get(n);
    if (!dep) continue;
    for (const f of dep.files ?? []) {
      if (!files.has(f.path)) {
        files.add(f.path);
        loc += locOf(f.path);
      }
    }
    for (const d of dep.dependencies ?? []) npmDeps.add(d);
  }
  return {
    name: it.name,
    files: files.size,
    npmDeps: npmDeps.size,
    loc,
    chain: names.length,
    npmList: [...npmDeps].sort(),
  };
});

// --- report table ------------------------------------------------------------
const pad = (s, n) => String(s).padEnd(n);
console.log(`check-cost: per-item consumer install footprint (transitive @uix/* closure)\n`);
console.log(`  ${pad('item', 22)} ${pad('files', 6)} ${pad('npm', 4)} ${pad('loc', 6)} ${pad('chain', 6)} npm deps`);
for (const f of [...footprints].sort((a, b) => b.loc - a.loc)) {
  console.log(`  ${pad(f.name, 22)} ${pad(f.files, 6)} ${pad(f.npmDeps, 4)} ${pad(f.loc, 6)} ${pad(f.chain, 6)} ${f.npmList.join(', ')}`);
}
console.log('');

// --- enforcement -------------------------------------------------------------
if (reportOnly) {
  console.log('check-cost: --report (advisory, not enforcing)');
  process.exit(0);
}
if (!existsSync(budgetPath)) {
  console.log('check-cost: no cost-budget.json — advisory only (create one to enforce).');
  process.exit(0);
}
const budget = JSON.parse(readFileSync(budgetPath, 'utf8'));
const def = budget.default ?? {};
const overrides = budget.overrides ?? {};
const errors = [];
for (const f of footprints) {
  const b = { ...def, ...(overrides[f.name] ?? {}) };
  if (b.maxFiles != null && f.files > b.maxFiles) errors.push(`${f.name}: ${f.files} files > budget ${b.maxFiles}`);
  if (b.maxNpmDeps != null && f.npmDeps > b.maxNpmDeps) errors.push(`${f.name}: ${f.npmDeps} npm deps > budget ${b.maxNpmDeps}`);
  if (b.maxLoc != null && f.loc > b.maxLoc) errors.push(`${f.name}: ${f.loc} loc > budget ${b.maxLoc}`);
}

if (errors.length) {
  console.error(`check-cost: ${errors.length} item(s) over budget (raise cost-budget.json deliberately, or trim the chain):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`check-cost: OK (${footprints.length} items within cost-budget.json)`);
