/* Unit tests for the pure helpers in app.js. Run: node --test guide/app.test.js  (zero deps) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, nextTheme, parseColor, getContrast, aaVerdict, toggleSet, sortRows, filterRows, mergePinned, peekStep, enqueueToast, dequeueToast } from './app.js';
import { DENSITIES, defaultViewPrefs, readViewPrefs, writeViewPrefs, toggleReaction } from './app.js';
import { multiSort, toggleSortKeys, searchRows, highlightSegments, selectAllState, togglePage, clampWidth } from './app.js';

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

test('peekStep clamps at both ends', () => {
  assert.equal(peekStep(0, +1, 3), 1);
  assert.equal(peekStep(2, +1, 3), 2);   // clamp at last
  assert.equal(peekStep(0, -1, 3), 0);   // clamp at first
});

test('enqueueToast caps the queue, dequeueToast removes by id', () => {
  let list = [];
  list = enqueueToast(list, { id: 'a' });
  list = enqueueToast(list, { id: 'b' });
  list = enqueueToast(list, { id: 'c' });
  list = enqueueToast(list, { id: 'd' });          // cap 3 → drops 'a'
  assert.deepEqual(list.map((t) => t.id), ['b', 'c', 'd']);
  assert.deepEqual(dequeueToast(list, 'c').map((t) => t.id), ['b', 'd']);
});

test('defaultViewPrefs: standard/zebra/freeze/no-hidden', () => {
  assert.deepEqual(defaultViewPrefs(), { density: 'standard', zebra: true, freeze: true, hiddenCols: [] });
});

test('DENSITIES order', () => {
  assert.deepEqual(DENSITIES, ['compact', 'standard', 'comfortable']);
});

test('readViewPrefs: empty → defaults', () => {
  assert.deepEqual(readViewPrefs(null, null), defaultViewPrefs());
});

test('readViewPrefs: round-trips a written value', () => {
  const p = { density: 'comfortable', zebra: false, freeze: true, hiddenCols: [2, 4] };
  assert.deepEqual(readViewPrefs(writeViewPrefs(p), null), p);
});

test('readViewPrefs: invalid density falls back to standard', () => {
  assert.equal(readViewPrefs('{"density":"huge"}', null).density, 'standard');
});

test('readViewPrefs: migrates legacy uix-cols array into hiddenCols when no new prefs', () => {
  assert.deepEqual(readViewPrefs(null, '[1,3]').hiddenCols, [1, 3]);
});

test('readViewPrefs: garbage JSON → defaults', () => {
  assert.deepEqual(readViewPrefs('not json', null), defaultViewPrefs());
});

test('toggleReaction: adds a new reaction as mine, count 1', () => {
  assert.deepEqual(toggleReaction([], '🎉'), [{ emoji: '🎉', count: 1, mine: true }]);
});

test('toggleReaction: joins an existing reaction (not mine → mine, count+1)', () => {
  const r = toggleReaction([{ emoji: '👍', count: 2, mine: false }], '👍');
  assert.deepEqual(r, [{ emoji: '👍', count: 3, mine: true }]);
});

test('toggleReaction: un-reacts (mine → removed when count hits 0)', () => {
  assert.deepEqual(toggleReaction([{ emoji: '👍', count: 1, mine: true }], '👍'), []);
});

test('toggleReaction: un-reacts but keeps others (count stays > 0)', () => {
  assert.deepEqual(toggleReaction([{ emoji: '👍', count: 3, mine: true }], '👍'),
    [{ emoji: '👍', count: 2, mine: false }]);
});

test('toggleReaction: does not mutate input', () => {
  const input = [{ emoji: '👍', count: 1, mine: false }];
  toggleReaction(input, '👍');
  assert.deepEqual(input, [{ emoji: '👍', count: 1, mine: false }]);
});

/* ── engine-aligned table helpers (must match @tensor_1/react table-engine) ── */

test('multiSort: secondary key breaks ties; stable; does not mutate', () => {
  const rows = [
    { team: 'b', name: 'Zoe' }, { team: 'a', name: 'Yan' },
    { team: 'a', name: 'Ada' }, { team: 'b', name: 'Ann' },
  ];
  const before = rows.slice();
  const out = multiSort(rows, [{ field: 'team', dir: 'asc' }, { field: 'name', dir: 'asc' }]);
  assert.deepEqual(out.map((r) => `${r.team}:${r.name}`), ['a:Ada', 'a:Yan', 'b:Ann', 'b:Zoe']);
  assert.deepEqual(rows, before); // input untouched
});

test('multiSort: numeric-aware, nulls first, custom getField', () => {
  assert.deepEqual(multiSort([{ v: 'x10' }, { v: 'x2' }], [{ field: 'v', dir: 'asc' }]).map((r) => r.v), ['x2', 'x10']);
  assert.deepEqual(multiSort([{ v: 2 }, { v: null }, { v: 1 }], [{ field: 'v', dir: 'desc' }]).map((r) => r.v), [2, 1, null]);
  // getField lets the same sort drive rows keyed differently (mirrors the live-<tr> use in app.js)
  const rows = [{ c: ['b'] }, { c: ['a'] }];
  assert.deepEqual(multiSort(rows, [{ field: 0, dir: 'asc' }], (r, i) => r.c[i]).map((r) => r.c[0]), ['a', 'b']);
});

test('toggleSortKeys: non-additive replaces + cycles asc→desc→off', () => {
  assert.deepEqual(toggleSortKeys([], 'a'), [{ field: 'a', dir: 'asc' }]);
  assert.deepEqual(toggleSortKeys([{ field: 'a', dir: 'asc' }], 'a'), [{ field: 'a', dir: 'desc' }]);
  assert.deepEqual(toggleSortKeys([{ field: 'a', dir: 'desc' }], 'a'), []);
  assert.deepEqual(toggleSortKeys([{ field: 'a', dir: 'asc' }], 'b'), [{ field: 'b', dir: 'asc' }]);
});

test('toggleSortKeys: additive appends/updates a secondary key, drops on cycle-off', () => {
  const one = toggleSortKeys([{ field: 'a', dir: 'asc' }], 'b', true);
  assert.deepEqual(one, [{ field: 'a', dir: 'asc' }, { field: 'b', dir: 'asc' }]);
  const two = toggleSortKeys(one, 'b', true);
  assert.deepEqual(two, [{ field: 'a', dir: 'asc' }, { field: 'b', dir: 'desc' }]);
  assert.deepEqual(toggleSortKeys(two, 'b', true), [{ field: 'a', dir: 'asc' }]);
});

test('searchRows: any field / restricted fields / blank returns a copy', () => {
  const rows = [{ a: 'Alpha', b: 1 }, { a: 'Beta', b: 22 }];
  assert.deepEqual(searchRows(rows, 'et').map((r) => r.a), ['Beta']);
  assert.deepEqual(searchRows(rows, '22').map((r) => r.a), ['Beta']);
  assert.deepEqual(searchRows([{ name: 'Ada', city: 'Paris' }, { name: 'Paris', city: 'Rome' }], 'paris', ['city']).map((r) => r.name), ['Ada']);
  const copy = searchRows(rows, '  ');
  assert.deepEqual(copy, rows);
  assert.notEqual(copy, rows);
});

test('highlightSegments: case-insensitive runs; reassembles to the input', () => {
  assert.deepEqual(highlightSegments('Hello World', 'o w'), [
    { text: 'Hell', match: false }, { text: 'o W', match: true }, { text: 'orld', match: false },
  ]);
  assert.deepEqual(highlightSegments('Hi', ''), [{ text: 'Hi', match: false }]);
  assert.equal(highlightSegments('The Quick Brown', 'quick').map((s) => s.text).join(''), 'The Quick Brown');
});

test('selectAllState / togglePage: page-scoped selection', () => {
  const page = ['1', '2', '3'];
  assert.equal(selectAllState(new Set(), page), 'none');
  assert.equal(selectAllState(new Set(['2']), page), 'some');
  assert.equal(selectAllState(new Set(page), page), 'all');
  assert.deepEqual([...togglePage(new Set(), page)].sort(), ['1', '2', '3']);
  assert.deepEqual([...togglePage(new Set(page), page)], []);
  assert.deepEqual([...togglePage(new Set(['2']), page)].sort(), ['1', '2', '3']); // partial fills to full
});

test('clampWidth: floors to min, ceils to max, rounds', () => {
  assert.equal(clampWidth(40), 64);
  assert.equal(clampWidth(120.4), 120);
  assert.equal(clampWidth(1000, 64, 500), 500);
});
