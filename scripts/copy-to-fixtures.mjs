#!/usr/bin/env node
/**
 * Copies every registry item source (registry/uix/<item>/*.ts|tsx) FLAT into
 * each fixture's components/uix/ directory, mirroring what `shadcn add` does
 * on the consumer side. Run before building fixtures so their Tailwind scan
 * sees exactly the code consumers will vendor (feeds check-emission.mjs).
 *
 * Destination dirs are created if missing; existing files are overwritten.
 */
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registryDir = join(root, 'registry', 'uix');
const FIXTURES = ['radix-app', 'baseui-app'];
const posix = (p) => p.split(sep).join('/');

if (!existsSync(registryDir)) {
  console.error('copy-to-fixtures: registry/uix/ not found — nothing to copy.');
  process.exit(1);
}

// Collect <item>/*.ts(x) — one level deep, flat output by basename.
const sources = [];
const byBasename = new Map();
for (const item of readdirSync(registryDir, { withFileTypes: true })) {
  if (!item.isDirectory()) continue;
  const itemDir = join(registryDir, item.name);
  for (const f of readdirSync(itemDir)) {
    if (!f.endsWith('.ts') && !f.endsWith('.tsx')) continue;
    const full = join(itemDir, f);
    const prev = byBasename.get(f);
    if (prev) {
      console.warn(
        `copy-to-fixtures: WARNING basename collision '${f}' — ${posix(relative(root, prev))} is overwritten by ${posix(relative(root, full))} in the flat copy`,
      );
    }
    byBasename.set(f, full);
    sources.push(full);
  }
}

if (!sources.length) {
  console.error('copy-to-fixtures: no .ts/.tsx sources found under registry/uix/<item>/.');
  process.exit(1);
}

for (const fixture of FIXTURES) {
  const destDir = join(root, 'fixtures', fixture, 'components', 'uix');
  mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const src of sources) {
    copyFileSync(src, join(destDir, basename(src))); // copyFileSync overwrites by default
    count++;
  }
  console.log(`copy-to-fixtures: ${count} file(s) -> fixtures/${fixture}/components/uix`);
}

// Shared fixture-side helpers (preview gallery): fixtures/shared/*.tsx is
// copied into each fixture's components/shared/ so both mount the SAME
// gallery source against their own @/ alias, theme toggle, and dark
// convention. Same overwrite semantics as the registry copies above.
const sharedDir = join(root, 'fixtures', 'shared');
const sharedSources = existsSync(sharedDir)
  ? readdirSync(sharedDir)
      .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
      .map((f) => join(sharedDir, f))
  : [];
if (!sharedSources.length) {
  console.error('copy-to-fixtures: no .ts/.tsx sources found under fixtures/shared/ (preview gallery missing).');
  process.exit(1);
}
for (const fixture of FIXTURES) {
  const destDir = join(root, 'fixtures', fixture, 'components', 'shared');
  mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const src of sharedSources) {
    copyFileSync(src, join(destDir, basename(src)));
    count++;
  }
  console.log(`copy-to-fixtures: ${count} shared file(s) -> fixtures/${fixture}/components/shared`);
}
