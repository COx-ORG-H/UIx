#!/usr/bin/env node
/**
 * Token-contract semver gate (publish-blocking).
 * Compares packages/tokens/theme-contract.json against contract-snapshot.json
 * (the contract as of the last published version).
 *
 *   removed/renamed token  -> requires MAJOR bump (+ ADR, by convention)
 *   added token            -> requires at least MINOR bump
 *   value-only changes     -> any bump
 *
 * After publishing: node scripts/check-token-semver.mjs --update
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contractPath = join(root, 'packages', 'tokens', 'theme-contract.json');
const snapshotPath = join(root, 'contract-snapshot.json');

const contract = JSON.parse(readFileSync(contractPath, 'utf8'));

if (process.argv.includes('--update')) {
  writeFileSync(snapshotPath, JSON.stringify(contract, null, 2) + '\n');
  console.log(`snapshot updated to v${contract.version}`);
  process.exit(0);
}

if (!existsSync(snapshotPath)) {
  console.error('no contract-snapshot.json — run with --update once to initialize.');
  process.exit(1);
}
const snap = JSON.parse(readFileSync(snapshotPath, 'utf8'));

const parse = (v) => v.split('.').map(Number);
const [curMaj, curMin] = parse(contract.version);
const [snapMaj, snapMin] = parse(snap.version);

const cur = new Set(contract.tokens.map((t) => t.name));
const old = new Set(snap.tokens.map((t) => t.name));
const removed = [...old].filter((n) => !cur.has(n));
const added = [...cur].filter((n) => !old.has(n));
const bridgeRemoved = (snap.bridge ?? []).filter((n) => !contract.bridge.includes(n));

const errors = [];
if ((removed.length || bridgeRemoved.length) && curMaj <= snapMaj)
  errors.push(`removed/renamed: ${[...removed, ...bridgeRemoved].join(', ')} — requires a MAJOR bump (currently ${snap.version} -> ${contract.version}) and an ADR`);
if (added.length && curMaj === snapMaj && curMin <= snapMin)
  errors.push(`added: ${added.join(', ')} — requires at least a MINOR bump (currently ${snap.version} -> ${contract.version})`);

if (errors.length) {
  console.error('check-token-semver: contract change without the required version bump');
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`check-token-semver: OK (snapshot v${snap.version} -> contract v${contract.version}; +${added.length}/-${removed.length} tokens)`);
