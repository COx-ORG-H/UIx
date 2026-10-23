/* RelationshipGraph at CMDB sizes (HAR-1387): a pan or a zoom moves the stage and rebuilds
 * nothing else. Before, every pointer move re-rendered every item, edge and list row, and dragging
 * a 600-node map ran at a 95th-percentile frame of 450 ms (tests/a11y/relationship-graph-gaps.spec.mjs
 * measures the frames in Chromium). Here: `renderNode` is not called again when the view moves,
 * and is called again when what a node shows changes.
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
  Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 800; } });
  Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 400; } });
  expose('requestAnimationFrame', (fn) => dom.window.setTimeout(() => fn(Date.now()), 0));
  expose('cancelAnimationFrame', (id) => dom.window.clearTimeout(id));
  ({ createRoot } = await import('react-dom/client'));
  ({ RelationshipGraph } = await import('../dist/index.js'));
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame']) delete globalThis[name];
});

function fixture(count) {
  const nodes = [{ id: 'root', label: 'Root service' }];
  const edges = [];
  for (let i = 1; i < count; i += 1) {
    nodes.push({ id: `n${i}`, label: `Host ${i}` });
    edges.push({ id: `e${i}`, source: i < 10 ? 'root' : `n${(i % 9) + 1}`, target: `n${i}` });
  }
  return { nodes, edges };
}

test('a pan re-renders no node; a change to what a node shows does', async () => {
  const { nodes, edges } = fixture(120);
  let calls = 0;
  const renderNode = (node) => { calls += 1; return h('span', null, node.label); };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const props = { layout: 'layered', rootId: 'root', nodes, edges, controls: 'compact', clusterThreshold: 0, renderNode };
  await act(async () => { root.render(h(RelationshipGraph, props)); await new Promise((resolve) => setTimeout(resolve, 5)); });
  const stage = host.querySelector('.uix-relationship-graph__stage');
  const before = stage.style.transform;
  const settled = calls;
  const viewport = host.querySelector('.uix-relationship-graph__viewport');
  for (const key of ['ArrowLeft', 'ArrowUp', '+', '-', 'ArrowRight']) {
    await act(async () => { viewport.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
  }
  assert.notEqual(stage.style.transform, before, 'the view moved');
  assert.equal(calls, settled, `the view moved and ${calls - settled} nodes were rendered again`);
  // selecting a node changes what nodes show: they render again
  await act(async () => { root.render(h(RelationshipGraph, { ...props, selectedId: 'n5' })); });
  assert.ok(calls > settled, 'a selection re-renders the nodes');
  act(() => root.unmount());
  host.remove();
});
