#!/usr/bin/env node
/**
 * uix-diff — consumer-side drift tool for vendored uix components.
 *
 * Runs in a CONSUMER repo (paths resolve against cwd, not this script):
 *
 *   node uix-diff.mjs record [--dir components/uix] [--lock .uix-lock.json]
 *       sha256-hash every file under --dir into the lockfile:
 *       { version, dir, files: { "<file>": { addedAt: <mtime ISO>, hash } } }
 *
 *   node uix-diff.mjs check [--dir ...] [--lock ...] [--registry <path to built dist/r>]
 *                           [--max-age-days <N>]
 *       re-hash and classify every file:
 *         clean-current       hash matches lock (and matches the registry copy, if given)
 *         clean-but-outdated  hash matches lock, but the registry has a newer version
 *         forked              hash differs from lock — REQUIRES a `// uix-fork: <reason>`
 *                             marker in the first 5 lines, otherwise exit 1
 *         untracked           file on disk but not in the lock
 *
 *       --max-age-days N (requires --registry, else exit 2): any
 *       clean-but-outdated file older than N days fails the check (exit 1).
 *       Age comes from the vendored file's line-1 registry stamp
 *       `// @uix-registry <item> <sha> <ISO-date>` (written by
 *       stamp-registry.mjs at build, copied in by `shadcn add`); files
 *       without a parseable stamp fall back to the lock entry's addedAt —
 *       note that's record-time, not registry-commit time. Staleness "now"
 *       is Date.now() at check time (a CLI check, not build output).
 *
 * Registry JSON shape: dist/r/<name>.json with { files: [{ path?, target?, content }] };
 * vendored files are matched to registry files by basename.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';

const posix = (p) => p.split(sep).join('/');
const args = process.argv.slice(2);
const cmd = args[0];

const USAGE =
  'usage: uix-diff <record|check> [--dir components/uix] [--lock .uix-lock.json] [--registry <dist/r>] [--max-age-days <N>, requires --registry]';

if (cmd !== 'record' && cmd !== 'check') {
  console.error(USAGE);
  process.exit(1);
}

// Strict flag parsing: an unrecognized flag or a known flag with a missing
// value is a hard error (exit 2) — a typo like `--max-age-day 90` must not
// silently disable the gate it was meant to enable.
const KNOWN_FLAGS = new Set(['--dir', '--lock', '--registry', '--max-age-days']);
const flags = {};
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (!KNOWN_FLAGS.has(a)) {
    console.error(
      a.startsWith('--')
        ? `uix-diff: unrecognized flag "${a}"`
        : `uix-diff: unexpected argument "${a}"`
    );
    console.error(USAGE);
    process.exit(2);
  }
  const value = args[i + 1];
  if (value === undefined || value.startsWith('--')) {
    console.error(`uix-diff: ${a} requires a value`);
    console.error(USAGE);
    process.exit(2);
  }
  flags[a] = value;
  i++;
}

const dirArg = flags['--dir'] ?? 'components/uix';
const lockArg = flags['--lock'] ?? '.uix-lock.json';
const registryArg = flags['--registry'] ?? null;
const maxAgeArg = flags['--max-age-days'] ?? null;
const dirAbs = resolve(process.cwd(), dirArg);
const lockAbs = resolve(process.cwd(), lockArg);

let maxAgeDays = null;
if (maxAgeArg !== null) {
  maxAgeDays = Number(maxAgeArg);
  if (!Number.isFinite(maxAgeDays) || maxAgeDays < 0) {
    console.error(`uix-diff: --max-age-days expects a non-negative number, got "${maxAgeArg}"`);
    console.error(USAGE);
    process.exit(2);
  }
  if (!registryArg) {
    console.error('uix-diff: --max-age-days requires --registry — "outdated" only exists relative to a registry.');
    console.error(USAGE);
    process.exit(2);
  }
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const hashFile = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
// Line-ending / BOM-insensitive comparison for content-vs-registry checks
// (Windows checkouts may be CRLF while registry JSON content is LF).
const normalize = (s) => s.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

function listFiles() {
  if (!existsSync(dirAbs)) {
    console.error(`uix-diff: directory not found: ${posix(dirArg)}`);
    process.exit(1);
  }
  return [...walk(dirAbs)].sort();
}

/* ----------------------------------------------------------------- record */

function record() {
  const files = listFiles();
  const lock = { version: 1, dir: posix(dirArg), files: {} };
  for (const f of files) {
    const rel = posix(relative(dirAbs, f));
    lock.files[rel] = {
      addedAt: statSync(f).mtime.toISOString(),
      hash: hashFile(f),
    };
  }
  writeFileSync(lockAbs, JSON.stringify(lock, null, 2) + '\n');
  console.log(`uix-diff record: ${files.length} file(s) from ${posix(dirArg)} -> ${posix(lockArg)}`);
}

/* ------------------------------------------------------------------ check */

function loadRegistry(registryDir) {
  // basename -> normalized content from the latest built registry JSON
  const map = new Map();
  const abs = resolve(process.cwd(), registryDir);
  if (!existsSync(abs)) {
    console.error(`uix-diff: registry dir not found: ${posix(registryDir)}`);
    process.exit(1);
  }
  for (const f of readdirSync(abs)) {
    if (!f.endsWith('.json')) continue;
    let item;
    try {
      item = JSON.parse(readFileSync(join(abs, f), 'utf8'));
    } catch {
      console.error(`uix-diff: WARNING skipping unparseable registry JSON: ${f}`);
      continue;
    }
    for (const entry of item.files ?? []) {
      if (typeof entry.content !== 'string') continue;
      const name = basename(entry.path ?? entry.target ?? '');
      if (name) map.set(name, normalize(entry.content));
    }
  }
  return map;
}

const FORK_MARKER = /\/\/ uix-fork: .+/;
// Registry stamp written by stamp-registry.mjs at build time; `shadcn add`
// vendors it as line 1, so the capture is "how old is the copy I'm running".
const STAMP_RE = /^\/\/ @uix-registry \S+ \S+ (\S+)/;
const DAY_MS = 24 * 60 * 60 * 1000;

function check() {
  if (!existsSync(lockAbs)) {
    console.error(`uix-diff: no lockfile at ${posix(lockArg)} — run \`uix-diff record\` first.`);
    process.exit(1);
  }
  const lock = JSON.parse(readFileSync(lockAbs, 'utf8'));
  const registry = registryArg ? loadRegistry(registryArg) : null;

  const buckets = { 'clean-current': [], 'clean-but-outdated': [], forked: [] };
  const untracked = [];
  const forkViolations = [];
  const staleViolations = [];
  const seen = new Set();

  for (const f of listFiles()) {
    const rel = posix(relative(dirAbs, f));
    seen.add(rel);
    const entry = lock.files?.[rel];
    if (!entry) {
      untracked.push(rel);
      continue;
    }
    if (hashFile(f) === entry.hash) {
      const regContent = registry?.get(basename(rel));
      if (regContent !== undefined && normalize(readFileSync(f, 'utf8')) !== regContent) {
        buckets['clean-but-outdated'].push(rel);
        if (maxAgeDays !== null) {
          // Age source: line-1 registry stamp date; fallback addedAt (record-time).
          const stamp = STAMP_RE.exec(readFileSync(f, 'utf8').split('\n', 1)[0]);
          let date = stamp ? Date.parse(stamp[1]) : NaN;
          if (Number.isNaN(date)) {
            if (stamp) console.error(`uix-diff: WARNING unparseable stamp date in ${rel} ("${stamp[1]}") — falling back to lock addedAt`);
            else console.error(`uix-diff: WARNING ${rel}: no @uix-registry stamp on line 1 — age falls back to lock addedAt (record time)`);
            date = Date.parse(entry.addedAt);
          }
          if (Number.isNaN(date)) {
            console.error(`uix-diff: WARNING no usable date for ${rel} (no stamp, bad addedAt) — cannot age-check`);
          } else {
            const ageDays = Math.floor((Date.now() - date) / DAY_MS);
            if (ageDays > maxAgeDays) staleViolations.push({ rel, ageDays });
          }
        }
      } else {
        buckets['clean-current'].push(rel);
      }
    } else {
      const head = readFileSync(f, 'utf8').split('\n').slice(0, 5);
      if (head.some((l) => FORK_MARKER.test(l))) buckets.forked.push(rel);
      else forkViolations.push(rel);
    }
  }

  const missing = Object.keys(lock.files ?? {}).filter((rel) => !seen.has(rel));

  console.log(`uix-diff check: ${posix(dirArg)} (lock: ${posix(lockArg)}${registryArg ? `, registry: ${posix(registryArg)}` : ''})`);
  for (const [name, list] of Object.entries(buckets)) {
    console.log(`  ${name.padEnd(18)} ${list.length}`);
    for (const rel of list) console.log(`    ${name === 'forked' ? '~' : name === 'clean-but-outdated' ? '<' : '='} ${rel}`);
  }
  if (untracked.length) {
    console.log(`  untracked          ${untracked.length}  (on disk but not in the lock — re-run \`uix-diff record\` to track)`);
    for (const rel of untracked) console.log(`    ? ${rel}`);
  }
  if (missing.length) {
    console.log(`  missing            ${missing.length}  (in the lock but deleted on disk)`);
    for (const rel of missing) console.log(`    ! ${rel}`);
  }

  let failed = false;

  if (forkViolations.length) {
    failed = true;
    console.error('');
    console.error(`uix-diff: ${forkViolations.length} file(s) diverged from the recorded hash WITHOUT a fork marker:`);
    for (const rel of forkViolations) console.error(`  ✗ ${rel}`);
    console.error('');
    console.error('  A vendored uix file was edited locally with no `// uix-fork: <reason>` line in its');
    console.error('  first 5 lines (the `// @uix-registry ...` stamp is expected at line 1, so a');
    console.error('  stamped+forked file carries the marker on lines 2-5). Unmarked forks silently');
    console.error('  stop receiving registry updates. Either:');
    console.error('    - revert the file to the vendored version (then re-pull from the registry), or');
    console.error('    - re-run `uix-diff record` if this was an intentional registry update, or');
    console.error('    - add `// uix-fork: <why this consumer diverges>` near the top to own the fork.');
  }

  if (staleViolations.length) {
    failed = true;
    console.error('');
    console.error(`uix-diff: ${staleViolations.length} outdated file(s) exceed --max-age-days ${maxAgeDays}:`);
    for (const { rel, ageDays } of staleViolations) console.error(`  ✗ ${rel}  (outdated ${ageDays}d > max ${maxAgeDays}d)`);
    console.error('');
    console.error('  Re-pull from the registry (`shadcn add @uix/<item> --overwrite`, then `uix-diff record`)');
    console.error('  or raise the budget if the lag is intentional.');
  }

  if (failed) process.exit(1);
}

/* ------------------------------------------------------------------ main */

if (cmd === 'record') record();
else check(); // cmd validated up top
