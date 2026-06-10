#!/usr/bin/env node
/**
 * Token-contract semver gate (publish-blocking).
 * Compares packages/tokens/theme-contract.json against contract-snapshot.json
 * (the contract as of the last published version).
 *
 *   removed/renamed token  -> requires MAJOR bump (+ ADR, by convention)
 *   emitted -> slot flip   -> requires MAJOR bump (the variable disappears
 *                             from the generated CSS — breaking)
 *   added token            -> requires at least MINOR bump
 *   slot -> emitted flip   -> requires at least MINOR bump (new variable)
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

const cur = new Map(contract.tokens.map((t) => [t.name, t]));
const old = new Map(snap.tokens.map((t) => [t.name, t]));
const removed = [...old.keys()].filter((n) => !cur.has(n));
const added = [...cur.keys()].filter((n) => !old.has(n));
const bridgeRemoved = (snap.bridge ?? []).filter((n) => !contract.bridge.includes(n));
// slot-flag transitions on surviving tokens: emitted -> slot removes the
// variable from the generated CSS (breaking); slot -> emitted adds it.
const becameSlot = [...cur.keys()].filter((n) => old.has(n) && !old.get(n).slot && cur.get(n).slot);
const becameEmitted = [...cur.keys()].filter((n) => old.has(n) && old.get(n).slot && !cur.get(n).slot);

const errors = [];
if ((removed.length || bridgeRemoved.length || becameSlot.length) && curMaj <= snapMaj)
  errors.push(`removed/renamed: ${[...removed, ...bridgeRemoved, ...becameSlot.map((n) => `${n} (emitted -> slot)`)].join(', ')} — requires a MAJOR bump (currently ${snap.version} -> ${contract.version}) and an ADR`);
if ((added.length || becameEmitted.length) && curMaj === snapMaj && curMin <= snapMin)
  errors.push(`added: ${[...added, ...becameEmitted.map((n) => `${n} (slot -> emitted)`)].join(', ')} — requires at least a MINOR bump (currently ${snap.version} -> ${contract.version})`);

if (errors.length) {
  console.error('check-token-semver: contract change without the required version bump');
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`check-token-semver: OK (snapshot v${snap.version} -> contract v${contract.version}; +${added.length + becameEmitted.length}/-${removed.length + becameSlot.length} tokens)`);
