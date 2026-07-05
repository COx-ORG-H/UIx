#!/usr/bin/env node
/* build-guide-status.mjs (A11Y-5) — mirror packages/react/component-status.json into a small ESM
 * module guide/component-status.js that the build-free styleguide can `import` (no network fetch,
 * no bundler). Regenerated in the tokens build chain so the badges never drift from the registry. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(__dirname, '..');
const SRC = resolve(PKG, '../react/component-status.json');
const OUT = join(PKG, 'guide', 'component-status.js');

const reg = JSON.parse(readFileSync(SRC, 'utf8'));
const entries = Object.fromEntries(
  Object.entries(reg)
    .filter(([k]) => !k.startsWith('$'))
    .map(([id, v]) => [id, { status: v.status }])
);

const body =
  '/* GENERATED — do not edit. Mirror of packages/react/component-status.json (A11Y-5).\n' +
  '   Regenerate with `npm run build` (build:guide-status). */\n' +
  'export const componentStatus = ' + JSON.stringify(entries, null, 2) + ';\n';

writeFileSync(OUT, body);
console.log(`✓ guide/component-status.js — ${Object.keys(entries).length} components mirrored`);
