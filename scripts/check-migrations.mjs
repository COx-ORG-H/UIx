#!/usr/bin/env node
/**
 * RDY-MIG-RECOVERY-01 — migration-entry gate (CI-blocking).
 *
 * check-token-semver.mjs blocks a breaking contract change that lacks a major
 * bump. This gate blocks a breaking change that lacks a MIGRATION PATH: when
 * the contract's MAJOR exceeds the published snapshot's MAJOR (a new major is
 * in flight), MIGRATIONS.md must carry a `## <version>` / `### <version>`
 * section documenting the rename map + consumer steps. It also guards the
 * runbook itself from rotting away.
 *
 *   contract.major >  snapshot.major   -> require a `<contract.version>` entry
 *   contract.major == snapshot.major   -> no entry required (back-compat)
 *   MIGRATIONS.md missing / no Recovery -> always fail (the runbook is a gate too)
 *
 * Exit: 0 OK, 1 violations, 2 IO error.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contractPath = join(root, 'packages', 'tokens', 'theme-contract.json');
const snapshotPath = join(root, 'contract-snapshot.json');
const migrationsPath = join(root, 'MIGRATIONS.md');

function fail(msg) {
  console.error(`check-migrations: ${msg}`);
  process.exit(2);
}
for (const [label, p] of [['theme-contract.json', contractPath], ['contract-snapshot.json', snapshotPath]]) {
  if (!existsSync(p)) fail(`${label} not found`);
}
if (!existsSync(migrationsPath)) {
  console.error('check-migrations: MIGRATIONS.md is missing — the recovery runbook is a required artifact (RDY-MIG-RECOVERY-01).');
  process.exit(1);
}

const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const migrations = readFileSync(migrationsPath, 'utf8');

const majorOf = (v) => Number(String(v).split('.')[0]);
const contractMajor = majorOf(contract.version);
const snapMajor = majorOf(snapshot.version);

const errors = [];

// The runbook must not rot to a stub.
if (!/^#{1,3}\s+Recovery runbook/mi.test(migrations)) {
  errors.push('MIGRATIONS.md has no "Recovery runbook" section — the rollback runbook is required.');
}

// A major in flight requires a matching version entry.
if (contractMajor > snapMajor) {
  const v = contract.version;
  // Accept `## 2.0.0`, `### v2.0.0`, `## 2.0.0 — summary`, etc.
  const headingRe = new RegExp(`^#{2,3}\\s+v?${v.replace(/\./g, '\\.')}\\b`, 'm');
  if (!headingRe.test(migrations)) {
    errors.push(
      `contract is v${contract.version} (major ${contractMajor}) but the last published snapshot is v${snapshot.version} (major ${snapMajor}) — a breaking bump is in flight, so MIGRATIONS.md must contain a "## ${v}" entry (rename map + consumer steps + rollback). Copy the template at the bottom of MIGRATIONS.md.`,
    );
  }
}

if (errors.length) {
  console.error(`check-migrations: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `check-migrations: OK (contract v${contract.version} vs snapshot v${snapshot.version}; ${contractMajor > snapMajor ? 'major-bump entry present' : 'no breaking bump in flight'}, runbook present)`,
);
