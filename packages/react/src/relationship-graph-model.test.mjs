import test from 'node:test';
import assert from 'node:assert/strict';
import { boundRelationshipGraph, layoutRelationshipGraph, relationshipNeighbors, traverseRelationshipNode } from './relationship-graph-model.ts';

const nodes = ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id.toUpperCase() }));
const edges = [
  { id: 'ab', source: 'a', target: 'b' },
  { id: 'bc', source: 'b', target: 'c' },
  { id: 'cd', source: 'c', target: 'd' },
];

test('bounded graph omits nodes and dangling edges', () => {
  const bounded = boundRelationshipGraph(nodes, edges, 3);
  assert.equal(bounded.omittedNodeCount, 1);
  assert.deepEqual(bounded.edges.map((edge) => edge.id), ['ab', 'bc']);
});

test('layout is deterministic and honors supplied positions', () => {
  const positioned = layoutRelationshipGraph([{ ...nodes[0], x: 12, y: 24 }, ...nodes.slice(1)], edges, 'a');
  assert.deepEqual(positioned[0], { ...nodes[0], x: 12, y: 24, depth: 0 });
  assert.deepEqual(positioned, layoutRelationshipGraph([{ ...nodes[0], x: 12, y: 24 }, ...nodes.slice(1)], edges, 'a'));
  assert.deepEqual(positioned.map((node) => node.depth), [0, 1, 2, 3]);
});

test('neighbor lookup and traversal are stable', () => {
  assert.deepEqual(relationshipNeighbors('b', edges), ['a', 'c']);
  assert.equal(traverseRelationshipNode(nodes, 'd', 1), 'a');
});
