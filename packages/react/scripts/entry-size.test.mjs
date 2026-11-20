/* The main-entry bundle budget's arithmetic (scripts/entry-size.mjs), without a build. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compare, nextBaseline, tolerance } from './entry-size.mjs';

const base = { main: { min: 600_000, gzip: 200_000, brotli: 170_000 }, probe: { min: 20_000, gzip: 8_000, brotli: 7_000 } };

test('tolerance is 2% with a 512-byte floor', () => {
  assert.equal(tolerance(170_000), 3_400);
  assert.equal(tolerance(7_000), 512);
});

test('growth within tolerance passes; past it fails and names the metric', () => {
  assert.deepEqual(compare(base, { ...base, main: { ...base.main, brotli: 173_400 } }), []);
  const problems = compare(base, { ...base, main: { ...base.main, brotli: 173_401 } });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^main: brotli grew/);
});

test('shrinking never fails the check', () => {
  assert.deepEqual(compare(base, { ...base, probe: { min: 1, gzip: 1, brotli: 1 } }), []);
});

test('a new or a missing entry fails', () => {
  assert.match(compare(base, { main: base.main })[0], /probe: in the baseline but no longer measured/);
  assert.match(compare({ main: base.main }, base)[0], /probe: NEW entry/);
});

test('--update rewrites only the entries that moved past the tolerance, either way', () => {
  const current = { main: { ...base.main, brotli: 170_100 }, probe: { ...base.probe, brotli: 6_000 } };
  const { next, changed } = nextBaseline(base, current);
  assert.deepEqual(next.main, base.main); // within tolerance: recorded numbers kept
  assert.deepEqual(next.probe, current.probe); // shrank past it: rewritten
  assert.equal(changed.length, 1);
});

test('the committed baseline lists both entries with every metric', () => {
  const { sizes } = JSON.parse(readFileSync(new URL('../etc/entry-size.baseline.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(sizes).sort(), ['main (everything)', 'main → Button only']);
  for (const entry of Object.values(sizes)) for (const m of ['min', 'gzip', 'brotli']) assert.ok(Number.isInteger(entry[m]) && entry[m] > 0);
});
