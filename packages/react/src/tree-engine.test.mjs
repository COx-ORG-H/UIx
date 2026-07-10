/* Unit tests for the framework-agnostic tree engine. Zero deps; Node strips the TS types
 * on import (Node >= 22.18 / 24). Run: node --test  (from packages/react).
 *
 * flattenVisibleTree turns a tree + expanded-set into the linear, depth-first list of
 * *visible* nodes with aria level/setsize/posinset — the input the Tree virtualizes over
 * (UIX-FIX-05). Collapsed subtrees are omitted so they cost nothing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flattenVisibleTree } from './tree-engine.ts';

const NODES = [
  { id: 'a', label: 'A', children: [
    { id: 'a1', label: 'A1' },
    { id: 'a2', label: 'A2', children: [{ id: 'a2x', label: 'A2X' }] },
  ] },
  { id: 'b', label: 'B' },
  { id: 'c', label: 'C', children: [{ id: 'c1', label: 'C1' }] },
];
const shape = (f) => ({ id: f.node.id, level: f.level, set: f.setSize, pos: f.posInSet, kids: f.hasChildren, open: f.expanded, parent: f.parentId });

test('flattenVisibleTree: nothing expanded yields only the roots, with set/pos', () => {
  const flat = flattenVisibleTree(NODES, new Set());
  assert.deepEqual(flat.map((f) => f.node.id), ['a', 'b', 'c']);
  assert.deepEqual(shape(flat[0]), { id: 'a', level: 1, set: 3, pos: 1, kids: true, open: false, parent: null });
  assert.deepEqual(shape(flat[1]), { id: 'b', level: 1, set: 3, pos: 2, kids: false, open: false, parent: null });
  assert.deepEqual(shape(flat[2]), { id: 'c', level: 1, set: 3, pos: 3, kids: true, open: false, parent: null });
});

test('flattenVisibleTree: expanding a node splices its children in depth-first order', () => {
  const flat = flattenVisibleTree(NODES, new Set(['a']));
  assert.deepEqual(flat.map((f) => f.node.id), ['a', 'a1', 'a2', 'b', 'c']);
  assert.deepEqual(shape(flat[0]), { id: 'a', level: 1, set: 3, pos: 1, kids: true, open: true, parent: null });
  assert.deepEqual(shape(flat[1]), { id: 'a1', level: 2, set: 2, pos: 1, kids: false, open: false, parent: 'a' });
  assert.deepEqual(shape(flat[2]), { id: 'a2', level: 2, set: 2, pos: 2, kids: true, open: false, parent: 'a' });
});

test('flattenVisibleTree: only expanded ancestors reveal deeper levels', () => {
  const flat = flattenVisibleTree(NODES, new Set(['a', 'a2']));
  assert.deepEqual(flat.map((f) => f.node.id), ['a', 'a1', 'a2', 'a2x', 'b', 'c']);
  assert.deepEqual(shape(flat[3]), { id: 'a2x', level: 3, set: 1, pos: 1, kids: false, open: false, parent: 'a2' });
});

test('flattenVisibleTree: a collapsed parent hides its subtree entirely', () => {
  // a2 expanded but its parent a is NOT → a2x stays hidden
  const flat = flattenVisibleTree(NODES, new Set(['a2']));
  assert.deepEqual(flat.map((f) => f.node.id), ['a', 'b', 'c']);
});

test('flattenVisibleTree: sibling groups get independent set/pos; expanding c', () => {
  const flat = flattenVisibleTree(NODES, new Set(['c']));
  assert.deepEqual(flat.map((f) => f.node.id), ['a', 'b', 'c', 'c1']);
  assert.deepEqual(shape(flat[3]), { id: 'c1', level: 2, set: 1, pos: 1, kids: false, open: false, parent: 'c' });
});

test('flattenVisibleTree: empty input yields an empty list', () => {
  assert.deepEqual(flattenVisibleTree([], new Set()), []);
});
