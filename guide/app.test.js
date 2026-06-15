/* Unit tests for the pure helpers in app.js. Run: node --test guide/  (Node 22+, zero deps) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, nextTheme, parseColor, getContrast, aaVerdict, toggleSet, sortRows, filterRows, mergePinned } from './app.js';

test('resolveTheme: stored value wins over OS', () => {
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
});

test('resolveTheme: falls back to OS when unset', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
  assert.equal(resolveTheme(undefined, true), 'dark');
});

test('nextTheme toggles', () => {
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
});

test('parseColor handles hex (3 + 6) and rgb', () => {
  assert.deepEqual(parseColor('#fff'), [255, 255, 255]);
  assert.deepEqual(parseColor('#1447E6'), [20, 71, 230]);
  assert.deepEqual(parseColor('rgb(20, 71, 230)'), [20, 71, 230]);
  assert.deepEqual(parseColor('rgb(255 101 104)'), [255, 101, 104]);
});

test('getContrast: black/white is ~21, white/white is 1', () => {
  assert.ok(Math.abs(getContrast('#000000', '#ffffff') - 21) < 0.01);
  assert.ok(Math.abs(getContrast('#ffffff', '#ffffff') - 1) < 0.01);
});

test('getContrast: accent blue #1447E6 vs white passes AA body text', () => {
  assert.ok(getContrast('#1447E6', '#FFFFFF') >= 4.5);
});

test('aaVerdict thresholds', () => {
  assert.equal(aaVerdict(21), 'AA');
  assert.equal(aaVerdict(4.5), 'AA');
  assert.equal(aaVerdict(3.2), 'AA-lg');
  assert.equal(aaVerdict(2), 'FAIL');
});

test('toggleSet adds then removes an id, immutably', () => {
  const a = toggleSet(new Set(), 'inc-1');
  assert.deepEqual([...a], ['inc-1']);
  const b = toggleSet(a, 'inc-1');
  assert.deepEqual([...b], []);
  assert.deepEqual([...a], ['inc-1']); // original untouched
});

test('sortRows by title asc/desc', () => {
  const rows = [{ id: 1, title: 'B' }, { id: 2, title: 'A' }, { id: 3, title: 'C' }];
  assert.deepEqual(sortRows(rows, 'title', 'asc').map((r) => r.id), [2, 1, 3]);
  assert.deepEqual(sortRows(rows, 'title', 'desc').map((r) => r.id), [3, 1, 2]);
});

test('filterRows by status set; empty set = no filter', () => {
  const rows = [{ id: 1, status: 'open' }, { id: 2, status: 'closed' }];
  assert.deepEqual(filterRows(rows, { status: new Set(['open']) }).map((r) => r.id), [1]);
  assert.equal(filterRows(rows, { status: new Set() }).length, 2);
});

test('mergePinned keeps pinned present even when filtered out', () => {
  const all = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const visible = [{ id: 2 }];
  assert.deepEqual(mergePinned(all, visible, [1]).map((r) => r.id), [1, 2]);
});
