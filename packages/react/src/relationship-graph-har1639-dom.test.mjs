/* RelationshipGraph, what TENSOR's K3 gaps map (HAR-1487 against 2.31.0) needed (HAR-1639):
 *
 *  (1) an edge variant (dashed) and tone, (2) a node tone, matched by the legend,
 *  (3) `revealId` brings a node into view without moving focus,
 *  (4) the toolbar can be hidden (layered since 2.45; radial now too),
 *  (5) no root border unless there is one root,
 *  (6) edge labels never drawn over each other in a dense column,
 *  (7) each node says its relationships (edge descriptions included) to assistive technology,
 *  (8) an edge across columns is neither dashed nor flagged as a cycle.
 *
 * The model halves (6, 8) are unit-tested in relationship-graph-layered.test.mjs; this pins the
 * RENDERED graph. tests/a11y/relationship-graph.spec.mjs measures labels and reveal in Chromium.
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let RelationshipGraph;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  dom.window.ResizeObserver = globalThis.ResizeObserver;
  // jsdom has no layout: a 600 × 300 map
  Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 600; } });
  Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 300; } });
  expose('requestAnimationFrame', (fn) => dom.window.setTimeout(() => fn(Date.now()), 0));
  expose('cancelAnimationFrame', (id) => dom.window.clearTimeout(id));
  ({ createRoot } = await import('react-dom/client'));
  ({ RelationshipGraph } = await import('../dist/index.js'));
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame']) delete globalThis[name];
});

/* The K3 shape: a control, the CIs it covers, an expected relation that is missing. */
const NODES = [
  { id: 'ctl', label: 'Control K3.2', type: 'Control' },
  { id: 'app', label: 'Payments API', type: 'Application', tone: 'success' },
  { id: 'db', label: 'Ledger DB', type: 'Database', tone: 'danger', description: 'no backup evidence' },
  { id: 'log', label: 'Audit log', type: 'Service', depth: 3 },
];
const EDGES = [
  { id: 'ctl-app', source: 'ctl', target: 'app', label: 'covers' },
  { id: 'app-db', source: 'app', target: 'db', label: 'writes to', variant: 'dashed', tone: 'danger', description: 'expected, missing' },
  { id: 'ctl-log', source: 'ctl', target: 'log', label: 'covers' },
];

function mount(props) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const render = (next) => act(() => { root.render(h(RelationshipGraph, { layout: 'layered', nodes: NODES, edges: EDGES, ...next })); });
  render(props);
  return { host, render, cleanup: () => { act(() => root.unmount()); host.remove(); } };
}
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
const item = (host, id) => host.querySelector(`.uix-relationship-graph__item[data-node-id="${id}"]`);
const link = (host, id) => [...host.querySelectorAll('.uix-relationship-graph__link')].find((g) => g.querySelector('text')?.textContent === id || g.dataset.edge === id);

test('(1, 2) edge variant and tone, node tone, and a legend that matches them', () => {
  const ui = mount({ controls: 'none', edgeLabels: 'always', legend: [
    { id: 'missing', label: 'Expected, missing', tone: 'danger', variant: 'dashed' },
    { id: 'ok', label: 'Evidence present', tone: 'success', shape: 'node' },
  ] });
  const links = [...ui.host.querySelectorAll('.uix-relationship-graph__link')];
  const missing = links.find((g) => g.textContent.includes('writes to'));
  assert.equal(missing.dataset.variant, 'dashed');
  assert.equal(missing.dataset.tone, 'danger');
  const covers = links.find((g) => g.textContent.includes('covers'));
  assert.equal(covers.dataset.variant, undefined);
  assert.equal(item(ui.host, 'app').dataset.tone, 'success');
  assert.equal(item(ui.host, 'db').dataset.tone, 'danger');
  assert.equal(item(ui.host, 'ctl').dataset.tone, undefined);
  const legend = [...ui.host.querySelectorAll('.uix-relationship-graph__legend li')];
  assert.deepEqual(legend.map((li) => [li.dataset.tone, li.dataset.variant, li.dataset.shape]), [['danger', 'dashed', undefined], ['success', undefined, 'node']]);
  void link;
  ui.cleanup();
});

test('(3) revealId brings a node into view and leaves focus where it is', async () => {
  // a long column that runs past the 300 px map
  const nodes = [{ id: 'root', label: 'Root' }, ...Array.from({ length: 12 }, (_, i) => ({ id: `n${i}`, label: `Node ${i}` }))];
  const edges = nodes.slice(1).map((node) => ({ id: `e-${node.id}`, source: 'root', target: node.id }));
  const outside = document.createElement('button');
  document.body.append(outside);
  outside.focus();
  const ui = mount({ nodes, edges, rootId: 'root', clusterThreshold: 0, controls: 'none' });
  await flush();
  const before = ui.host.querySelector('.uix-relationship-graph__stage').style.transform;
  ui.render({ nodes, edges, rootId: 'root', clusterThreshold: 0, controls: 'none', revealId: 'n11' });
  await flush();
  const after = ui.host.querySelector('.uix-relationship-graph__stage').style.transform;
  assert.notEqual(after, before, 'the view moved');
  const y = Number(/translate\([-\d.]+px, ([-\d.]+)px\)/.exec(after)[1]);
  assert.ok(y < 0, 'it moved down the column (the stage went up)');
  assert.equal(document.activeElement, outside, 'focus stayed where it was');
  // the same id again does not move the view
  ui.render({ nodes, edges, rootId: 'root', clusterThreshold: 0, controls: 'none', revealId: 'n11', density: 'standard' });
  await flush();
  assert.equal(ui.host.querySelector('.uix-relationship-graph__stage').style.transform, after);
  ui.cleanup();
  outside.remove();
});

test('(4) controls="none" hides the toolbar in the radial layout too', () => {
  const ui = mount({ layout: 'radial', controls: 'none' });
  assert.equal(ui.host.querySelector('.uix-relationship-graph__toolbar'), null);
  ui.cleanup();
  const full = mount({ layout: 'radial' });
  assert.ok(full.host.querySelector('.uix-relationship-graph__toolbar'));
  full.cleanup();
});

test('(5) no root border without a root; rootId or markRoot draws it', () => {
  const none = mount({ controls: 'none' });
  assert.equal(none.host.querySelectorAll('[data-root]').length, 0);
  none.cleanup();
  const rooted = mount({ controls: 'none', rootId: 'ctl' });
  assert.deepEqual([...rooted.host.querySelectorAll('[data-root]')].map((el) => el.dataset.nodeId), ['ctl']);
  rooted.cleanup();
  const off = mount({ controls: 'none', rootId: 'ctl', markRoot: false });
  assert.equal(off.host.querySelectorAll('[data-root]').length, 0);
  off.cleanup();
});

test('(6) labels in a dense column are drawn apart', () => {
  // eight children of one node, every label shown: the label boxes must not overlap
  const nodes = [{ id: 'hub', label: 'Hub' }, ...Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, label: `Child ${i}` }))];
  const edges = nodes.slice(1).map((node, i) => ({ id: `e${i}`, source: 'hub', target: node.id, label: 'depends on' }));
  const ui = mount({ nodes, edges, rootId: 'hub', clusterThreshold: 0, controls: 'none', edgeLabels: 'always', density: 'compact' });
  const ys = [...ui.host.querySelectorAll('.uix-relationship-graph__link text')].map((text) => ({ x: Number(text.getAttribute('x')), y: Number(text.getAttribute('y')) }));
  assert.ok(ys.length >= 2);
  const sorted = ys.filter((label) => Math.abs(label.x - ys[0].x) < 60).sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i += 1) assert.ok(sorted[i].y - sorted[i - 1].y >= 15, `labels ${i - 1} and ${i} are ${sorted[i].y - sorted[i - 1].y} px apart`);
  ui.cleanup();
});

test('(7) each node says its relationships, edge descriptions included', () => {
  const ui = mount({ controls: 'none', rootId: 'ctl' });
  const describe = (id) => document.getElementById(item(ui.host, id).getAttribute('aria-describedby'))?.textContent;
  assert.equal(describe('app'), 'covers, from Control K3.2; writes to Ledger DB (expected, missing)');
  assert.equal(describe('db'), 'writes to, from Payments API (expected, missing)');
  assert.equal(describe('ctl'), 'covers Payments API; covers Audit log');
  assert.ok(ui.host.querySelector('.uix-relationship-graph__edges').getAttribute('aria-hidden'), 'the drawing stays decoration');
  ui.cleanup();
  const words = mount({ controls: 'none', rootId: 'ctl', labels: { relationTo: (r, t) => `${r} → ${t}`, relationFrom: (r, s) => `${s} → ${r}` } });
  assert.equal(document.getElementById(item(words.host, 'db').getAttribute('aria-describedby')).textContent, 'Payments API → writes to (expected, missing)');
  words.cleanup();
});

test('(8) an edge across two columns is solid and nobody is flagged as in a cycle', () => {
  const ui = mount({ controls: 'none', rootId: 'ctl', edgeLabels: 'always' });
  const skip = [...ui.host.querySelectorAll('.uix-relationship-graph__link')].find((g) => g.dataset.kind === 'skip');
  assert.ok(skip, 'ctl → log crosses two columns');
  assert.equal(skip.dataset.variant, undefined);
  assert.equal(ui.host.querySelectorAll('.uix-relationship-graph__item-flag').length, 0, 'no cycle flag');
  ui.cleanup();
});
