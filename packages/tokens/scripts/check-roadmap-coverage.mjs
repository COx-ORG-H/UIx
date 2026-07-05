#!/usr/bin/env node
/* check-roadmap-coverage.mjs (BREADTH-5) — the component roadmap covers every CSS component,
 * exactly once, with no phantom rows.
 *
 * Parser is pinned to BREADTH-1's table format in Docs/component-roadmap.md:
 *   | Component | CSS file | React export | Maturity | A11y-reviewed | Notes |
 * i.e. the SECOND pipe-delimited cell of each data row is the component's CSS file (`button.css`).
 * The gate fails, listing:
 *   - any styles/components/*.css file with no roadmap row, and
 *   - any roadmap row whose `CSS file` cell names a file that does not exist.
 * Dependency-free. Run: npm run test:roadmap
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(__dirname, '..');
const COMPONENTS_DIR = join(PKG, 'styles', 'components');
const ROADMAP = resolve(PKG, '../../Docs/component-roadmap.md');

/** CSS-file cells (2nd column) named in the roadmap table. */
export function roadmapCssFiles(md) {
  const files = [];
  for (const line of md.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    // cells[0] is '' (leading pipe); component = cells[1], css file = cells[2]
    const cssCell = cells[2];
    if (cssCell && /^[a-z0-9-]+\.css$/i.test(cssCell)) files.push(cssCell);
  }
  return files;
}

function main() {
  const onDisk = new Set(readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith('.css')));
  const md = readFileSync(ROADMAP, 'utf8');
  const rows = roadmapCssFiles(md);
  const rowSet = new Set(rows);

  const errors = [];
  for (const f of onDisk) {
    if (!rowSet.has(f)) errors.push(`CSS component "${f}" has NO row in Docs/component-roadmap.md.`);
  }
  for (const f of rows) {
    if (!onDisk.has(f)) errors.push(`roadmap row references "${f}", which is not a styles/components/*.css file.`);
  }
  // duplicate rows for the same file
  const seen = new Set();
  for (const f of rows) {
    if (seen.has(f)) errors.push(`roadmap lists "${f}" more than once.`);
    seen.add(f);
  }

  if (errors.length) {
    console.error(`✗ roadmap coverage — ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`✓ roadmap coverage — all ${onDisk.size} CSS components have exactly one roadmap row.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
