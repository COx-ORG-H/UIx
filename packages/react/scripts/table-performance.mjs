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

// The home market (roadmap #15): names with diacritics and Serbian Cyrillic, searched with a
// Latin query that has to fold ("djordje" finds "Đorđe" and "Ђорђе"), sorted with Croatian rules.
const NAMES = ['Đorđe Balašević', 'Šemsa Čolić', 'Ђорђе Марјановић', 'Željko Ćosić', 'Ana Müller'];
const localRows = Array.from({ length: ROWS }, (_, i) => ({
  id: `INC-${ROWS - i}`,
  name: `${NAMES[i % NAMES.length]} ${i}`,
  team: `Tim ${i % 20}`,
}));

const sortMs = medianRun(() => multiSort(rows, [{ field: 'name', dir: 'ascending' }]));
const searchMs = medianRun(() => searchRows(rows, 'item 499'));
const localeSortMs = medianRun(() => multiSort(localRows, [{ field: 'name', dir: 'ascending' }], 'hr'));
const localeSearchMs = medianRun(() => searchRows(localRows, 'marjanovic 4999', undefined, 'sr-Latn'));
const limits = { sortMs: 250, searchMs: 150 };

console.log(`table performance — ${ROWS.toLocaleString()} rows: sort=${sortMs.toFixed(1)}ms, search=${searchMs.toFixed(1)}ms`);
console.log(`  locale (hr sort, sr-Latn folded search): sort=${localeSortMs.toFixed(1)}ms, search=${localeSearchMs.toFixed(1)}ms`);

const failures = [];
if (sortMs > limits.sortMs) failures.push(`sort ${sortMs.toFixed(1)}ms > ${limits.sortMs}ms`);
if (searchMs > limits.searchMs) failures.push(`search ${searchMs.toFixed(1)}ms > ${limits.searchMs}ms`);
if (localeSortMs > limits.sortMs) failures.push(`locale sort ${localeSortMs.toFixed(1)}ms > ${limits.sortMs}ms`);
if (localeSearchMs > limits.searchMs) failures.push(`locale search ${localeSearchMs.toFixed(1)}ms > ${limits.searchMs}ms`);
if (failures.length) {
  console.error(`✗ table performance regression: ${failures.join('; ')}`);
  process.exit(1);
}
console.log('✓ table performance within coarse CI limits');
