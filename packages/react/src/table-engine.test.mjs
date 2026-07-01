/* Unit tests for the framework-agnostic table engine. Zero deps; Node strips the
 * TS types on import (Node >= 22.18 / 24). Run: node --test  (from packages/react),
 * or  npm test -w @tensor_1/react.
 *
 * Precedent: packages/tokens/guide/app.test.js. These lock the algorithms the React
 * layer AND the vanilla styleguide both delegate to, so the two behave identically. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  multiSort, nextSortDir, toggleSort,
  matchFilter, applyFilters,
  searchRows, highlightSegments,
  serializeView, parseView,
  virtualWindow, shouldVirtualize,
  clampWidth, reorder,
  toggleId, selectAllState, togglePage, mergePinned,
} from './table-engine.ts';

/* ── sorting ─────────────────────────────────────────────────────────────────── */

test('multiSort: single key ascending / descending', () => {
  const rows = [{ n: 3 }, { n: 1 }, { n: 2 }];
  assert.deepEqual(multiSort(rows, [{ field: 'n', dir: 'ascending' }]).map((r) => r.n), [1, 2, 3]);
  assert.deepEqual(multiSort(rows, [{ field: 'n', dir: 'descending' }]).map((r) => r.n), [3, 2, 1]);
});

test('multiSort: secondary key breaks primary ties', () => {
  const rows = [
    { team: 'b', name: 'Zoe' }, { team: 'a', name: 'Yan' },
    { team: 'a', name: 'Ada' }, { team: 'b', name: 'Ann' },
  ];
  const out = multiSort(rows, [
    { field: 'team', dir: 'ascending' },
    { field: 'name', dir: 'ascending' },
  ]);
  assert.deepEqual(out.map((r) => `${r.team}:${r.name}`), ['a:Ada', 'a:Yan', 'b:Ann', 'b:Zoe']);
});

test('multiSort: is stable and does not mutate input', () => {
  const rows = [{ k: 1, i: 'a' }, { k: 1, i: 'b' }, { k: 1, i: 'c' }];
  const before = rows.slice();
  const out = multiSort(rows, [{ field: 'k', dir: 'ascending' }]);
  assert.deepEqual(out.map((r) => r.i), ['a', 'b', 'c']); // original order kept on ties
  assert.deepEqual(rows, before);                          // input untouched
  assert.notEqual(out, rows);                              // new array
});

test('multiSort: numeric-aware string compare and null ordering', () => {
  assert.deepEqual(
    multiSort([{ v: 'item10' }, { v: 'item2' }], [{ field: 'v', dir: 'ascending' }]).map((r) => r.v),
    ['item2', 'item10'], // numeric collation, not lexicographic
  );
  assert.deepEqual(
    multiSort([{ v: 2 }, { v: null }, { v: 1 }], [{ field: 'v', dir: 'ascending' }]).map((r) => r.v),
    [null, 1, 2], // nulls sort first ascending
  );
});

test('multiSort: no keys returns a copy in original order', () => {
  const rows = [{ n: 2 }, { n: 1 }];
  const out = multiSort(rows, []);
  assert.deepEqual(out, rows);
  assert.notEqual(out, rows);
});

test('nextSortDir: cycles none -> ascending -> descending -> none', () => {
  assert.equal(nextSortDir(undefined), 'ascending');
  assert.equal(nextSortDir('none'), 'ascending');
  assert.equal(nextSortDir('ascending'), 'descending');
  assert.equal(nextSortDir('descending'), 'none');
});

test('toggleSort: non-additive replaces the whole key list', () => {
  assert.deepEqual(toggleSort([], 'a'), [{ field: 'a', dir: 'ascending' }]);
  assert.deepEqual(toggleSort([{ field: 'a', dir: 'ascending' }], 'a'), [{ field: 'a', dir: 'descending' }]);
  assert.deepEqual(toggleSort([{ field: 'a', dir: 'descending' }], 'a'), []); // cycles off
  // switching to a different field drops the previous one
  assert.deepEqual(toggleSort([{ field: 'a', dir: 'ascending' }], 'b'), [{ field: 'b', dir: 'ascending' }]);
});

test('toggleSort: additive appends/updates a secondary key and removes on cycle-off', () => {
  const one = toggleSort([{ field: 'a', dir: 'ascending' }], 'b', true);
  assert.deepEqual(one, [{ field: 'a', dir: 'ascending' }, { field: 'b', dir: 'ascending' }]);
  const two = toggleSort(one, 'b', true); // b -> descending, stays secondary
  assert.deepEqual(two, [{ field: 'a', dir: 'ascending' }, { field: 'b', dir: 'descending' }]);
  const three = toggleSort(two, 'b', true); // b -> none, removed
  assert.deepEqual(three, [{ field: 'a', dir: 'ascending' }]);
});

/* ── typed filters (every op) ────────────────────────────────────────────────── */

test('matchFilter: enum isAnyOf / isNoneOf', () => {
  assert.equal(matchFilter({ s: 'open' }, { field: 's', kind: 'enum', op: 'isAnyOf', value: ['open', 'wip'] }), true);
  assert.equal(matchFilter({ s: 'done' }, { field: 's', kind: 'enum', op: 'isAnyOf', value: ['open', 'wip'] }), false);
  assert.equal(matchFilter({ s: 'done' }, { field: 's', kind: 'enum', op: 'isNoneOf', value: ['open', 'wip'] }), true);
  assert.equal(matchFilter({ s: 'open' }, { field: 's', kind: 'enum', op: 'isNoneOf', value: ['open', 'wip'] }), false);
});

test('matchFilter: text contains / equals / startsWith (case-insensitive)', () => {
  assert.equal(matchFilter({ t: 'Hello World' }, { field: 't', kind: 'text', op: 'contains', value: 'lo wo' }), true);
  assert.equal(matchFilter({ t: 'Hello' }, { field: 't', kind: 'text', op: 'contains', value: 'zz' }), false);
  assert.equal(matchFilter({ t: 'Hello' }, { field: 't', kind: 'text', op: 'equals', value: 'Hello' }), true);
  assert.equal(matchFilter({ t: 'Hello' }, { field: 't', kind: 'text', op: 'equals', value: 'hello' }), false); // equals is exact-case
  assert.equal(matchFilter({ t: 'Hello' }, { field: 't', kind: 'text', op: 'startsWith', value: 'HEL' }), true);
  assert.equal(matchFilter({ t: 'Hello' }, { field: 't', kind: 'text', op: 'startsWith', value: 'ello' }), false);
});

test('matchFilter: number eq / lt / gt / between', () => {
  assert.equal(matchFilter({ n: 5 }, { field: 'n', kind: 'number', op: 'eq', value: 5 }), true);
  assert.equal(matchFilter({ n: 5 }, { field: 'n', kind: 'number', op: 'eq', value: '5' }), true); // asNum coerces
  assert.equal(matchFilter({ n: 5 }, { field: 'n', kind: 'number', op: 'lt', value: 10 }), true);
  assert.equal(matchFilter({ n: 5 }, { field: 'n', kind: 'number', op: 'lt', value: 5 }), false);
  assert.equal(matchFilter({ n: 5 }, { field: 'n', kind: 'number', op: 'gt', value: 1 }), true);
  assert.equal(matchFilter({ n: 5 }, { field: 'n', kind: 'number', op: 'between', value: [1, 5] }), true); // inclusive
  assert.equal(matchFilter({ n: 6 }, { field: 'n', kind: 'number', op: 'between', value: [1, 5] }), false);
});

test('matchFilter: boolean is', () => {
  assert.equal(matchFilter({ b: true }, { field: 'b', kind: 'boolean', op: 'is', value: true }), true);
  assert.equal(matchFilter({ b: 0 }, { field: 'b', kind: 'boolean', op: 'is', value: false }), true); // truthiness
  assert.equal(matchFilter({ b: true }, { field: 'b', kind: 'boolean', op: 'is', value: false }), false);
});

test('applyFilters: ANDs across columns; empty list returns a copy', () => {
  const rows = [
    { s: 'open', n: 3 }, { s: 'open', n: 9 }, { s: 'done', n: 3 },
  ];
  const out = applyFilters(rows, [
    { field: 's', kind: 'enum', op: 'isAnyOf', value: ['open'] },
    { field: 'n', kind: 'number', op: 'lt', value: 5 },
  ]);
  assert.deepEqual(out, [{ s: 'open', n: 3 }]);
  const copy = applyFilters(rows, []);
  assert.deepEqual(copy, rows);
  assert.notEqual(copy, rows);
});

/* ── search + highlight ──────────────────────────────────────────────────────── */

test('searchRows: matches any field, blank query returns a copy', () => {
  const rows = [{ a: 'Alpha', b: 1 }, { a: 'Beta', b: 22 }, { a: 'Gamma', b: 3 }];
  assert.deepEqual(searchRows(rows, 'et').map((r) => r.a), ['Beta']);
  assert.deepEqual(searchRows(rows, '22').map((r) => r.a), ['Beta']); // numbers stringified
  const copy = searchRows(rows, '   ');
  assert.deepEqual(copy, rows);
  assert.notEqual(copy, rows);
});

test('searchRows: restricting fields limits the columns searched', () => {
  const rows = [{ name: 'Ada', city: 'Paris' }, { name: 'Paris', city: 'Rome' }];
  assert.deepEqual(searchRows(rows, 'paris', ['city']).map((r) => r.name), ['Ada']);
});

test('highlightSegments: splits into matched / unmatched runs (case-insensitive)', () => {
  assert.deepEqual(highlightSegments('Hello World', 'o w'), [
    { text: 'Hell', match: false },
    { text: 'o W', match: true },
    { text: 'orld', match: false },
  ]);
  // multiple occurrences
  assert.deepEqual(highlightSegments('aXaXa', 'x'), [
    { text: 'a', match: false }, { text: 'X', match: true },
    { text: 'a', match: false }, { text: 'X', match: true },
    { text: 'a', match: false },
  ]);
  // no match / empty query -> single unmatched segment (original casing preserved)
  assert.deepEqual(highlightSegments('Hello', 'zz'), [{ text: 'Hello', match: false }]);
  assert.deepEqual(highlightSegments('Hello', ''), [{ text: 'Hello', match: false }]);
  // reassembling the segments reproduces the input exactly
  const segs = highlightSegments('The Quick Brown', 'quick');
  assert.equal(segs.map((s) => s.text).join(''), 'The Quick Brown');
});

/* ── saved views: serialize <-> parse round-trip ─────────────────────────────── */

test('serializeView / parseView: full round-trip', () => {
  const view = {
    sort: [{ field: 'name', dir: 'ascending' }, { field: 'age', dir: 'descending' }],
    columns: ['name', 'age', 'city'],
    density: 'compact',
    q: 'foo',
    filters: [{ field: 'status', kind: 'text', op: 'isAnyOf', value: ['open', 'wip'] }],
  };
  assert.deepEqual(parseView(serializeView(view)), view);
});

test('serializeView: omits standard density and empty sections; tolerates a leading "?"', () => {
  assert.equal(serializeView({ density: 'standard' }), '');
  assert.equal(serializeView({}), '');
  const qs = serializeView({ q: 'x', density: 'comfortable' });
  assert.deepEqual(parseView('?' + qs), { q: 'x', density: 'comfortable' });
});

test('parseView: single-value filter comes back as a scalar; sort dir short codes decode', () => {
  const v = parseView('sort=a:d&filter=owner~equals~ada');
  assert.deepEqual(v.sort, [{ field: 'a', dir: 'descending' }]);
  assert.deepEqual(v.filters, [{ field: 'owner', kind: 'text', op: 'equals', value: 'ada' }]);
});

/* ── virtualization ──────────────────────────────────────────────────────────── */

test('virtualWindow: computes window, overscan, and spacer padding', () => {
  const w = virtualWindow(1000, 500, 50, 1000, 6);
  assert.deepEqual(w, { start: 14, end: 36, padTop: 700, padBottom: 48200, total: 50000 });
});

test('virtualWindow: clamps at the top edge (no negative start)', () => {
  const w = virtualWindow(0, 500, 50, 1000, 6);
  assert.equal(w.start, 0);
  assert.equal(w.padTop, 0);
  assert.equal(w.end, 22);
});

test('virtualWindow: degenerate inputs render everything', () => {
  assert.deepEqual(virtualWindow(0, 500, 0, 10), { start: 0, end: 10, padTop: 0, padBottom: 0, total: 0 });
  assert.deepEqual(virtualWindow(0, 500, 50, 0), { start: 0, end: 0, padTop: 0, padBottom: 0, total: 0 });
});

test('shouldVirtualize: only past the threshold', () => {
  assert.equal(shouldVirtualize(100), false);
  assert.equal(shouldVirtualize(101), true);
  assert.equal(shouldVirtualize(5, 4), true);
});

/* ── resize + reorder ────────────────────────────────────────────────────────── */

test('clampWidth: floors to min, ceils to max, rounds', () => {
  assert.equal(clampWidth(40), 64);           // below default min
  assert.equal(clampWidth(120.4), 120);       // rounds
  assert.equal(clampWidth(1000, 64, 500), 500); // above max
});

test('reorder: moves an item and returns a new array; out-of-range is a no-op copy', () => {
  assert.deepEqual(reorder(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(reorder(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
  const arr = ['a', 'b'];
  const out = reorder(arr, 5, 0); // from out of range
  assert.deepEqual(out, arr);
  assert.notEqual(out, arr);
});

/* ── selection helpers ───────────────────────────────────────────────────────── */

test('toggleId: adds when absent, removes when present (new set each time)', () => {
  const a = toggleId(new Set(), 'x');
  assert.deepEqual([...a], ['x']);
  const b = toggleId(a, 'x');
  assert.deepEqual([...b], []);
  assert.notEqual(a, b);
});

test('selectAllState: none / some / all against the current page', () => {
  const page = ['1', '2', '3'];
  assert.equal(selectAllState(new Set(), page), 'none');
  assert.equal(selectAllState(new Set(['2']), page), 'some');
  assert.equal(selectAllState(new Set(['1', '2', '3']), page), 'all');
});

test('togglePage: selects the whole page, then clears it', () => {
  const page = ['1', '2', '3'];
  const on = togglePage(new Set(), page);
  assert.deepEqual([...on].sort(), ['1', '2', '3']);
  const off = togglePage(on, page);
  assert.deepEqual([...off], []);
  // a partial page fills to full rather than clearing
  const filled = togglePage(new Set(['2']), page);
  assert.deepEqual([...filled].sort(), ['1', '2', '3']);
});

test('mergePinned: hoists pinned rows above the filtered set, even when filtered out', () => {
  const all = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
  const visible = [{ id: '3' }, { id: '4' }]; // rows 1 & 2 filtered away
  const out = mergePinned(all, visible, new Set(['1']));
  assert.deepEqual(out.map((r) => r.id), ['1', '3', '4']); // pinned #1 reappears at the top
});

test('mergePinned: a pinned row already visible is not duplicated; preserves order', () => {
  const all = [{ id: '1' }, { id: '2' }, { id: '3' }];
  const visible = [{ id: '2' }, { id: '3' }];
  const out = mergePinned(all, visible, new Set(['3']));
  assert.deepEqual(out.map((r) => r.id), ['3', '2']); // #3 hoisted, not repeated
});

test('mergePinned: no pins returns a copy of visible; honours a custom id field', () => {
  const all = [{ key: 'a' }, { key: 'b' }];
  const visible = [{ key: 'b' }];
  const copy = mergePinned(all, visible, new Set());
  assert.deepEqual(copy, visible);
  assert.notEqual(copy, visible);
  assert.deepEqual(mergePinned(all, visible, new Set(['a']), 'key').map((r) => r.key), ['a', 'b']);
});
