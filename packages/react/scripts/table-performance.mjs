#!/usr/bin/env node
/* Coarse runtime regression guard for the table data path.
 *
 * This intentionally uses generous limits: it is meant to catch accidental
 * algorithmic/collation regressions, not compare CI machines. Run after build.
 */
import { performance } from 'node:perf_hooks';
import { multiSort, searchRows } from '../dist/table-engine.js';

const ROWS = 50_000;
const rows = Array.from({ length: ROWS }, (_, i) => ({
  id: String(i),
  name: `Item ${ROWS - i}`,
  team: `Team ${i % 20}`,
}));

function medianRun(run, samples = 5) {
  run();
  run();
  const timings = [];
  for (let i = 0; i < samples; i += 1) {
    const started = performance.now();
    run();
    timings.push(performance.now() - started);
  }
  timings.sort((a, b) => a - b);
  return timings[Math.floor(timings.length / 2)];
}

const sortMs = medianRun(() => multiSort(rows, [{ field: 'name', dir: 'ascending' }]));
const searchMs = medianRun(() => searchRows(rows, 'item 499'));
const limits = { sortMs: 250, searchMs: 150 };

console.log(`table performance — ${ROWS.toLocaleString()} rows: sort=${sortMs.toFixed(1)}ms, search=${searchMs.toFixed(1)}ms`);

const failures = [];
if (sortMs > limits.sortMs) failures.push(`sort ${sortMs.toFixed(1)}ms > ${limits.sortMs}ms`);
if (searchMs > limits.searchMs) failures.push(`search ${searchMs.toFixed(1)}ms > ${limits.searchMs}ms`);
if (failures.length) {
  console.error(`✗ table performance regression: ${failures.join('; ')}`);
  process.exit(1);
}
console.log('✓ table performance within coarse CI limits');
