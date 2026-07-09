/* Unit tests for the framework-agnostic tree model (UIX-FIX-05). Zero deps; Node strips the TS
 * types on import (Node >= 22.18 / 24). Run: node --test (from packages/react).
 *
 * These lock the flatten + keyboard-nav logic the plain and virtualized <Tree> render paths both
 * delegate to, so nav works identically — including for rows scrolled out of the virtual window. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flattenTree, treeNav } from './tree-model.ts';

const TREE = [
  { id: 'a', children: [{ id: 'a1' }, { id: 'a2' }] },
  { id: 'b', children: [{ id: 'b1', children: [{ id: 'b1x' }] }] },
  { id: 'c' },
];

test('flattenTree: only expanded branches appear, in reading order', () => {
  assert.deepEqual(flattenTree(TREE, new Set()).map((f) => f.node.id), ['a', 'b', 'c']);
  assert.deepEqual(flattenTree(TREE, new Set(['a'])).map((f) => f.node.id), ['a', 'a1', 'a2', 'b', 'c']);
  assert.deepEqual(
    flattenTree(TREE, new Set(['b', 'b1'])).map((f) => f.node.id),
    ['a', 'b', 'b1', 'b1x', 'c'], // nested expansion descends
  );
});

test('flattenTree: computes level, setsize, posinset, hasChildren, isExpanded', () => {
  const flat = flattenTree(TREE, new Set(['a']));
  const byId = Object.fromEntries(flat.map((f) => [f.node.id, f]));
  assert.deepEqual(
    { level: byId.a.level, setsize: byId.a.setsize, posinset: byId.a.posinset, hasChildren: byId.a.hasChildren, isExpanded: byId.a.isExpanded },
    { level: 1, setsize: 3, posinset: 1, hasChildren: true, isExpanded: true }, // 3 roots, first, expanded
  );
  assert.deepEqual(
    { level: byId.a2.level, setsize: byId.a2.setsize, posinset: byId.a2.posinset, hasChildren: byId.a2.hasChildren },
    { level: 2, setsize: 2, posinset: 2, hasChildren: false }, // 2nd of a's 2 children, a leaf
  );
  assert.equal(byId.b.isExpanded, false); // has children but collapsed here
});

test('treeNav: Down/Up move by visible row and clamp at the ends', () => {
  const flat = flattenTree(TREE, new Set(['a'])); // a, a1, a2, b, c
  assert.deepEqual(treeNav(flat, 'a', 'ArrowDown'), { focusId: 'a1' });
  assert.deepEqual(treeNav(flat, 'a2', 'ArrowUp'), { focusId: 'a1' });
  assert.deepEqual(treeNav(flat, 'c', 'ArrowDown'), { focusId: 'c' });  // clamp at end
  assert.deepEqual(treeNav(flat, 'a', 'ArrowUp'), { focusId: 'a' });    // clamp at start
  assert.deepEqual(treeNav(flat, 'a', 'Home'), { focusId: 'a' });
  assert.deepEqual(treeNav(flat, 'a', 'End'), { focusId: 'c' });
});

test('treeNav: Right expands a collapsed parent, then descends into the first child', () => {
  assert.deepEqual(treeNav(flattenTree(TREE, new Set()), 'a', 'ArrowRight'), { toggleId: 'a' }); // collapsed → expand
  assert.deepEqual(treeNav(flattenTree(TREE, new Set(['a'])), 'a', 'ArrowRight'), { focusId: 'a1' }); // expanded → first child
  assert.deepEqual(treeNav(flattenTree(TREE, new Set(['a'])), 'a1', 'ArrowRight'), {}); // leaf → nothing
});

test('treeNav: Left collapses an expanded parent, else moves to the parent', () => {
  assert.deepEqual(treeNav(flattenTree(TREE, new Set(['a'])), 'a', 'ArrowLeft'), { toggleId: 'a' }); // expanded → collapse
  assert.deepEqual(treeNav(flattenTree(TREE, new Set(['a'])), 'a2', 'ArrowLeft'), { focusId: 'a' }); // child → parent
  assert.deepEqual(
    treeNav(flattenTree(TREE, new Set(['b', 'b1'])), 'b1x', 'ArrowLeft'),
    { focusId: 'b1' }, // nested child → its immediate parent, not the root
  );
  assert.deepEqual(treeNav(flattenTree(TREE, new Set()), 'c', 'ArrowLeft'), {}); // top-level leaf → nothing
});

test('treeNav: Enter/Space select, and also toggle a parent', () => {
  const flat = flattenTree(TREE, new Set(['a']));
  assert.deepEqual(treeNav(flat, 'a1', 'Enter'), { selectId: 'a1' });                 // leaf: select only
  assert.deepEqual(treeNav(flat, 'a', ' '), { toggleId: 'a', selectId: 'a' });        // parent: toggle + select
});

test('treeNav: unknown key or unknown current id yields an empty action', () => {
  const flat = flattenTree(TREE, new Set());
  assert.deepEqual(treeNav(flat, 'a', 'Tab'), {});
  assert.deepEqual(treeNav(flat, 'does-not-exist', 'ArrowDown'), {});
});
