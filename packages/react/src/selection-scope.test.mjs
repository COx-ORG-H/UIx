/* The selection scope model (roadmap #12): ids or "all matching the query, except these". */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_SELECTION_SCOPE, isInSelectionScope, isSelectionScopeEmpty, selectAllMatching, selectionQueryKey,
  selectionScopeCount, selectionScopeMatcher, setInSelectionScope, toggleInSelectionScope,
} from './selection-scope.ts';

const query = { search: 'disk', filters: { status: { kind: 'enum', values: ['open'] } } };

test('the empty scope is an ids scope with no ids, frozen, and survives JSON', () => {
  assert.deepEqual(EMPTY_SELECTION_SCOPE, { kind: 'ids', ids: [] });
  assert.equal(Object.isFrozen(EMPTY_SELECTION_SCOPE), true);
  assert.equal(isSelectionScopeEmpty(EMPTY_SELECTION_SCOPE), true);
  assert.deepEqual(JSON.parse(JSON.stringify(EMPTY_SELECTION_SCOPE)), { kind: 'ids', ids: [] });
});

test('ids: add in order, remove, respect the cap, same object when nothing changes', () => {
  let scope = setInSelectionScope(EMPTY_SELECTION_SCOPE, ['a', 'b', 'c'], true);
  assert.deepEqual(scope, { kind: 'ids', ids: ['a', 'b', 'c'] });
  assert.equal(selectionScopeCount(scope), 3);
  assert.equal(setInSelectionScope(scope, ['a'], true), scope, 'adding a row already in is no change');
  assert.equal(setInSelectionScope(scope, ['z'], false), scope, 'removing a row not in is no change');
  scope = setInSelectionScope(scope, ['b'], false);
  assert.deepEqual(scope.ids, ['a', 'c']);
  const capped = setInSelectionScope(scope, ['d', 'e', 'f'], true, 3);
  assert.deepEqual(capped.ids, ['a', 'c', 'd'], 'adding stops at the cap');
  assert.equal(setInSelectionScope(capped, ['g'], true, 3), capped, 'at the cap adds nothing');
});

test('query: select all matching counts the total, unticking excludes, ticking puts back', () => {
  const all = selectAllMatching(query, 4213);
  assert.deepEqual(all, { kind: 'query', query, excludedIds: [], total: 4213 });
  assert.equal(selectionScopeCount(all), 4213);
  assert.equal(isInSelectionScope(all, 'INC-1'), true);
  const less = setInSelectionScope(all, ['INC-1', 'INC-2'], false);
  assert.deepEqual(less.excludedIds, ['INC-1', 'INC-2']);
  assert.equal(selectionScopeCount(less), 4211);
  assert.equal(isInSelectionScope(less, 'INC-1'), false);
  assert.equal(less.query, query, 'the query is kept as given');
  const back = toggleInSelectionScope(less, 'INC-1');
  assert.deepEqual(back.excludedIds, ['INC-2']);
  assert.equal(setInSelectionScope(back, ['INC-3'], true), back, 'ticking a row that is in is no change');
  assert.equal(setInSelectionScope(back, ['INC-2'], false), back, 'unticking an excluded row is no change');
  // the cap is for ids: a query scope already chose its rows
  assert.equal(selectionScopeCount(setInSelectionScope(less, ['INC-1'], true, 1)), 4212);
});

test('query: excluding every matching record leaves nothing selected', () => {
  const two = selectAllMatching(query, 2);
  assert.deepEqual(setInSelectionScope(two, ['a', 'b'], false), EMPTY_SELECTION_SCOPE);
  assert.equal(selectionScopeCount({ kind: 'query', query, excludedIds: ['a', 'b', 'c'], total: 2 }), 0, 'never negative');
  assert.equal(selectAllMatching(query, -3).total, 0);
  assert.equal(selectAllMatching(query, 9.7).total, 9);
});

test('a scope round-trips through JSON for the bulk endpoint', () => {
  const scope = setInSelectionScope(selectAllMatching(query, 4213), ['INC-7'], false);
  assert.deepEqual(JSON.parse(JSON.stringify(scope)), { kind: 'query', query, excludedIds: ['INC-7'], total: 4213 });
});

test('the matcher agrees with isInSelectionScope for both kinds', () => {
  const ids = ['a', 'b', 'c', 'd'];
  for (const scope of [
    EMPTY_SELECTION_SCOPE,
    { kind: 'ids', ids: ['b', 'd'] },
    selectAllMatching(query, 10),
    { kind: 'query', query, excludedIds: ['c'], total: 10 },
  ]) {
    const has = selectionScopeMatcher(scope);
    assert.deepEqual(ids.map(has), ids.map((id) => isInSelectionScope(scope, id)), JSON.stringify(scope));
  }
});

test('the query key ignores key order and undefined members, and tells queries apart', () => {
  assert.equal(selectionQueryKey({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: undefined } }), selectionQueryKey({ a: { d: [1, { x: 1, y: 2 }] }, b: 1 }));
  assert.notEqual(selectionQueryKey({ search: 'disk' }), selectionQueryKey({ search: 'disks' }));
  assert.notEqual(selectionQueryKey({ filters: { a: 1 } }), selectionQueryKey({ filters: {} }));
  assert.equal(selectionQueryKey('open'), '"open"');
  assert.equal(selectionQueryKey(undefined), '');
});
