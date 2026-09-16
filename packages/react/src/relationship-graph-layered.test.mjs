/* Unit tests for the layered RelationshipGraph model (ADR-0003). Zero deps; Node strips the TS
 * types on import. Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyLayeredEdges,
  wrapEdgeLabel,
  clusterIdFor,
  layeredNeighbor,
  layoutLayeredGraph,
} from './relationship-graph-model.ts';

const n = (id, extra = {}) => ({ id, label: id.toUpperCase(), ...extra });
const e = (source, target, extra = {}) => ({ id: `${source}-${target}`, source, target, type: 'depends_on', ...extra });

// root → a, b; a → shared; b → shared (diamond); shared → deep; deep → a (cycle)
const DIAMOND_NODES = ['root', 'a', 'b', 'shared', 'deep'].map((id) => n(id));
const DIAMOND_EDGES = [e('root', 'a'), e('root', 'b'), e('a', 'shared'), e('b', 'shared'), e('shared', 'deep'), e('deep', 'a')];

const overlaps = (items) => {
  const byColumn = new Map();
  for (const item of items) byColumn.set(item.depth, [...(byColumn.get(item.depth) ?? []), item]);
  for (const column of byColumn.values()) {
    const sorted = [...column].sort((p, q) => p.y - q.y);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].y < sorted[i - 1].y + sorted[i - 1].height) return true;
    }
  }
  return false;
};

/** Seeded PRNG so the property tests are reproducible. */
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const randomGraph = (seed, size, extraEdges) => {
  const next = rng(seed);
  const nodes = Array.from({ length: size }, (_, i) => n(`n${i}`, { type: next() < 0.5 ? 'server' : 'app' }));
  const edges = [];
  for (let i = 1; i < size; i += 1) edges.push({ id: `t${i}`, source: `n${Math.floor(next() * i)}`, target: `n${i}`, type: 'runs_on' });
  for (let k = 0; k < extraEdges; k += 1) {
    const s = Math.floor(next() * size);
    const t = Math.floor(next() * size);
    edges.push({ id: `x${k}`, source: `n${s}`, target: `n${t}`, type: 'depends_on' });
  }
  return { nodes, edges };
};

test('diamond: the shared node is drawn once and has both parents', () => {
  const layout = layoutLayeredGraph(DIAMOND_NODES, DIAMOND_EDGES, { rootId: 'root' });
  const shared = layout.items.filter((item) => item.id === 'shared');
  assert.equal(shared.length, 1);
  assert.equal(shared[0].depth, 2);
  assert.deepEqual([...shared[0].parents].sort(), ['a', 'b']);
  assert.equal(layout.items.length, 5);
});

test('classification: forward edges step one column; a back edge that closes a loop is a cycle', () => {
  const { depthById, kindById } = classifyLayeredEdges(DIAMOND_NODES, DIAMOND_EDGES, 'root');
  assert.deepEqual(Object.fromEntries(depthById), { root: 0, a: 1, b: 1, shared: 2, deep: 3 });
  assert.equal(kindById.get('a-shared'), 'forward');
  assert.equal(kindById.get('deep-a'), 'cycle');
  const layout = layoutLayeredGraph(DIAMOND_NODES, DIAMOND_EDGES, { rootId: 'root' });
  assert.equal(layout.items.find((item) => item.id === 'deep').inCycle, true);
  assert.equal(layout.edges.find((edge) => edge.id === 'deep-a').autoLabel, false); // cycle labels show on focus; both ends carry the cycle flag
});

test('classification: same-column and non-looping back edges are lateral', () => {
  const nodes = ['r', 'a', 'b', 'c'].map((id) => n(id));
  const edges = [e('r', 'a'), e('r', 'b'), e('a', 'b'), e('b', 'c'), e('c', 'a')];
  const { kindById } = classifyLayeredEdges(nodes, edges, 'r');
  assert.equal(kindById.get('a-b'), 'lateral');
  // c (depth 2) → a (depth 1): a cannot reach c through forward edges (a→b is lateral).
  assert.equal(kindById.get('c-a'), 'lateral');
});

test('supplied depth wins over BFS; unreachable nodes go to a trailing column; self-loops are dropped', () => {
  const nodes = [n('r', { depth: 0 }), n('a', { depth: 2 }), n('island')];
  const edges = [e('r', 'a'), e('a', 'a')];
  const { depthById, kindById } = classifyLayeredEdges(nodes, edges, 'r');
  assert.equal(depthById.get('a'), 2);
  assert.equal(depthById.get('island'), 3);
  assert.equal(kindById.has('a-a'), false);
  assert.equal(kindById.get('r-a'), 'lateral');
});

test('clustering: 5 leaf siblings stay, 6 collapse into one item carrying all members', () => {
  const build = (count) => {
    const nodes = [n('hub'), ...Array.from({ length: count }, (_, i) => n(`vm${i}`, { type: 'server' }))];
    const edges = nodes.slice(1).map((node) => e('hub', node.id, { type: 'runs_on' }));
    return layoutLayeredGraph(nodes, edges, { rootId: 'hub' });
  };
  assert.equal(build(5).clusters.length, 0);
  const six = build(6);
  assert.equal(six.clusters.length, 1);
  const cluster = six.clusters[0];
  assert.equal(cluster.id, clusterIdFor('hub', 'server', 'runs_on'));
  assert.equal(cluster.members.length, 6);
  assert.equal(cluster.edgeLabel, 'runs_on');
  assert.equal(six.items.length, 2);
  assert.equal(six.itemOf.vm3, cluster.id);
  assert.equal(six.columns.find((column) => column.depth === 1).count, 6);
  const edge = six.edges.find((candidate) => candidate.target === cluster.id);
  assert.equal(edge.edgeIds.length, 6);
  assert.equal(edge.autoLabel, false);
});

test('clustering never hides structure: shared, cyclic and parent nodes stay individual', () => {
  const leaves = Array.from({ length: 6 }, (_, i) => n(`l${i}`, { type: 'server' }));
  const nodes = [n('hub'), n('other'), ...leaves, n('child')];
  const edges = [
    e('hub', 'other'),
    ...leaves.map((leaf) => e('hub', leaf.id)),
    e('other', 'l0'), // same-column edge: l0 carries a lateral edge, so it stays individual
    e('l1', 'child'), // l1 has a child
  ];
  const layout = layoutLayeredGraph(nodes, edges, { rootId: 'hub', clusterThreshold: 4 });
  const cluster = layout.clusters[0];
  assert.ok(cluster);
  const ids = cluster.members.map((member) => member.id);
  assert.ok(!ids.includes('l0'));
  assert.ok(!ids.includes('l1'));
  assert.equal(ids.length, 4);
  assert.equal(layoutLayeredGraph(nodes, edges, { rootId: 'hub', clusterThreshold: 0 }).clusters.length, 0);
});

test('expanded clusters render their members contiguously and mark the group leader', () => {
  const nodes = [n('hub'), n('first', { type: 'app' }), ...Array.from({ length: 6 }, (_, i) => n(`vm${i}`, { type: 'server' })), n('last', { type: 'app' })];
  const edges = nodes.slice(1).map((node) => e('hub', node.id));
  const id = clusterIdFor('hub', 'server', 'depends_on');
  const layout = layoutLayeredGraph(nodes, edges, { rootId: 'hub', expandedClusterIds: new Set([id]) });
  assert.equal(layout.clusters.length, 0);
  const column = layout.items.filter((item) => item.depth === 1).map((item) => item.id);
  const first = column.indexOf('vm0');
  assert.deepEqual(column.slice(first, first + 6), ['vm0', 'vm1', 'vm2', 'vm3', 'vm4', 'vm5']);
  const leader = layout.items.find((item) => item.expandedGroup);
  assert.equal(leader.id, 'vm0');
  assert.equal(leader.expandedGroup.id, id);
  assert.equal(overlaps(layout.items), false);
});

test('determinism and no overlaps over seeded random graphs with cycles', () => {
  for (let seed = 1; seed <= 25; seed += 1) {
    const { nodes, edges } = randomGraph(seed, 40 + seed, 25);
    const first = layoutLayeredGraph(nodes, edges, { rootId: 'n0' });
    const second = layoutLayeredGraph(nodes, edges, { rootId: 'n0' });
    assert.deepEqual(first, second, `seed ${seed} not deterministic`);
    assert.equal(overlaps(first.items), false, `seed ${seed} overlaps`);
    for (const item of first.items) assert.equal(item.x, 16 + item.depth * (176 + 96));
    assert.ok(first.width > 0 && first.height > 0);
    const drawn = new Set(first.items.map((item) => item.id));
    for (const edge of first.edges) assert.ok(drawn.has(edge.source) && drawn.has(edge.target));
  }
});

test('barycenter ordering untangles a crossed two-level fan-out', () => {
  const nodes = ['r', 'p1', 'p2', 'c2', 'c1'].map((id) => n(id));
  const edges = [e('r', 'p1'), e('r', 'p2'), e('p1', 'c1'), e('p2', 'c2')];
  const layout = layoutLayeredGraph(nodes, edges, { rootId: 'r', clusterThreshold: 0 });
  const column = layout.items.filter((item) => item.depth === 2).map((item) => item.id);
  assert.deepEqual(column, ['c1', 'c2']);
});

test('arrow placement follows the arrow prop; emphasis forces the label on a wide fan-out', () => {
  const nodes = [n('r'), ...Array.from({ length: 5 }, (_, i) => n(`c${i}`, { type: `t${i}` }))];
  const edges = nodes.slice(1).map((node, i) => e('r', node.id, i === 0 ? { arrow: 'backward', emphasis: true } : {}));
  const layout = layoutLayeredGraph(nodes, edges, { rootId: 'r' });
  const back = layout.edges.find((edge) => edge.id === 'r-c0');
  const root = layout.items.find((item) => item.id === 'r');
  assert.equal(back.arrow, 'backward');
  assert.equal(back.arrowX, root.x + root.width);
  assert.equal(back.autoLabel, true);
  assert.equal(layout.edges.find((edge) => edge.id === 'r-c1').autoLabel, false);
  assert.equal(back.label, 'depends_on');
});

test('keyboard traversal: ←/→ follow forward edges, ↑/↓ stay in the column, Home returns to the root', () => {
  const layout = layoutLayeredGraph(DIAMOND_NODES, DIAMOND_EDGES, { rootId: 'root' });
  assert.equal(layeredNeighbor(layout, 'root', 'ArrowRight'), 'a');
  assert.equal(layeredNeighbor(layout, 'a', 'ArrowDown'), 'b');
  assert.equal(layeredNeighbor(layout, 'b', 'ArrowDown'), undefined);
  assert.equal(layeredNeighbor(layout, 'b', 'ArrowRight'), 'shared');
  assert.equal(layeredNeighbor(layout, 'shared', 'ArrowLeft'), 'a');
  assert.equal(layeredNeighbor(layout, 'deep', 'Home'), 'root');
  assert.equal(layeredNeighbor(layout, 'a', 'End'), 'b');
  assert.equal(layeredNeighbor(layout, 'missing', 'ArrowDown'), 'root');
});

test('tall unclusterable column keeps every node and starts at the top', () => {
  const nodes = [n('r'), ...Array.from({ length: 30 }, (_, i) => n(`k${i}`, { type: 'node' })), ...Array.from({ length: 30 }, (_, i) => n(`p${i}`, { type: 'pod' }))];
  const edges = [...Array.from({ length: 30 }, (_, i) => e('r', `k${i}`)), ...Array.from({ length: 30 }, (_, i) => e(`k${i}`, `p${i}`))];
  const layout = layoutLayeredGraph(nodes, edges, { rootId: 'r' });
  assert.equal(layout.clusters.length, 0);
  assert.equal(layout.items.filter((item) => item.depth === 1).length, 30);
  assert.equal(Math.min(...layout.items.filter((item) => item.depth === 1).map((item) => item.y)), layout.items[0].y);
  assert.equal(overlaps(layout.items), false);
});

test('400 nodes and 1,500 edges lay out in well under 50ms', () => {
  const { nodes, edges } = randomGraph(7, 400, 1101);
  // Best of five: measures the algorithm, not JIT warm-up or a GC pause on a busy runner.
  let best = Number.POSITIVE_INFINITY;
  let layout;
  for (let run = 0; run < 5; run += 1) {
    const started = performance.now();
    layout = layoutLayeredGraph(nodes, edges, { rootId: 'n0' });
    best = Math.min(best, performance.now() - started);
  }
  assert.equal(edges.length, 1500);
  assert.ok(layout.items.length > 0);
  assert.ok(best < 50, `layout took ${best.toFixed(1)}ms at best`);
});

test('compact density shrinks the geometry; an empty graph is empty', () => {
  const layout = layoutLayeredGraph(DIAMOND_NODES, DIAMOND_EDGES, { rootId: 'root', density: 'compact' });
  assert.equal(layout.nodeWidth, 160);
  assert.equal(layout.items.find((item) => item.id === 'a').x, 16 + 160 + 80);
  const none = layoutLayeredGraph([], []);
  assert.deepEqual([none.items.length, none.edges.length, none.width], [0, 0, 0]);
});

test('edge labels wrap into two lines that fit the column gap', () => {
  assert.deepEqual(wrapEdgeLabel('depends on', 88), ['depends on']);
  assert.deepEqual(wrapEdgeLabel('sub outsourced to', 88), ['sub outsourced', 'to']);
  assert.deepEqual(wrapEdgeLabel('bereitgestellt über', 88), ['bereitgestellt', 'über']);
  const long = wrapEdgeLabel('governed by contract with extra words', 88);
  assert.equal(long.length, 2);
  assert.ok(long[1].endsWith('…'));
  assert.ok(long.every((line) => line.length <= 15));
  assert.deepEqual(wrapEdgeLabel('Donaudampfschifffahrtsgesellschaft', 88), ['Donaudampfschi…']);
});

test('siblings from one node with the same relationship show the label once', () => {
  const nodes = [n('r'), n('a', { type: 'x' }), n('b', { type: 'y' }), n('c', { type: 'z' })];
  const edges = [e('r', 'a'), e('r', 'b'), e('r', 'c', { type: 'runs_on' })];
  const layout = layoutLayeredGraph(nodes, edges, { rootId: 'r' });
  const auto = layout.edges.filter((edge) => edge.autoLabel).map((edge) => edge.label).sort();
  assert.deepEqual(auto, ['depends_on', 'runs_on']);
});
