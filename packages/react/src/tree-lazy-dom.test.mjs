/* Tree nodes that load their children on expand (HAR-1382; TENSOR's org chart, B29), in jsdom:
 *   - `hasChildren` makes a node expandable before its children exist;
 *   - `loadChildren(node)` runs the first time it is expanded: the node is aria-busy and shows a
 *     loading row, then its children;
 *   - a rejection shows an error row that the arrow keys reach, and Enter / Space / a click on it
 *     retries; a synthetic row is never the consumer's selection;
 *   - focus that sat on the loading row moves to the node when the row goes away;
 *   - the virtualised tree behaves the same; a tree without lazy nodes renders as before.
 * Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const EXPOSED = ['window', 'document', 'navigator', 'CSS', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  // jsdom has no CSS.escape; the ids here need none
  expose('CSS', { escape: (value) => String(value).replace(/["\\]/g, '\\$&') });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const ORG = [
  { id: 'ceo', label: 'Mira Kovač', hasChildren: true },
  { id: 'cfo', label: 'Jan Novak' },
];
const REPORTS = [{ id: 'cto', label: 'Ana Petrović', hasChildren: true }, { id: 'coo', label: 'Ben Ali' }];

/** A loader the test settles by hand. */
function deferred() {
  const calls = [];
  const load = (node) => new Promise((resolve, reject) => { calls.push({ id: node.id, resolve, reject }); });
  return { calls, load };
}
function mount(props) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const render = (next) => act(() => root.render(h(ui.Tree, { nodes: ORG, 'aria-label': 'Organisation', ...props, ...next })));
  render({});
  const item = (id) => host.querySelector(`[role="treeitem"][data-id="${id}"]`);
  const rows = () => [...host.querySelectorAll('[role="treeitem"]')].map((el) => el.querySelector('.uix-tree__label').textContent);
  return { host, render, item, rows, unmount: () => { act(() => root.unmount()); host.remove(); } };
}
const key = (el, k) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })));
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const settle = (fn) => act(async () => { fn(); await Promise.resolve(); await Promise.resolve(); });

test('hasChildren: the node is expandable and collapsed before any child exists', () => {
  const { load, calls } = deferred();
  const t = mount({ loadChildren: load });
  assert.equal(t.item('ceo').getAttribute('aria-expanded'), 'false');
  assert.equal(t.item('cfo').hasAttribute('aria-expanded'), false, 'a plain leaf stays a leaf');
  assert.ok(t.item('ceo').querySelector('button.uix-tree__toggle'), 'it has a chevron');
  assert.deepEqual(calls, [], 'nothing loads until it is expanded');
  t.unmount();
});

test('expanding loads once: aria-busy and a loading row, then the children', async () => {
  const { load, calls } = deferred();
  const t = mount({ loadChildren: load });
  t.item('ceo').focus();
  key(t.item('ceo'), 'ArrowRight');
  assert.equal(t.item('ceo').getAttribute('aria-expanded'), 'true');
  assert.equal(t.item('ceo').getAttribute('aria-busy'), 'true');
  assert.deepEqual(calls.map((c) => c.id), ['ceo']);
  assert.deepEqual(t.rows(), ['Mira Kovač', 'Loading…', 'Jan Novak']);
  const loadingRow = t.host.querySelectorAll('[role="treeitem"]')[1];
  assert.ok(loadingRow.querySelector('.uix-tree__status .uix-spinner'), 'a spinner in the row');
  assert.equal(loadingRow.getAttribute('aria-level'), '2');

  await settle(() => calls[0].resolve(REPORTS));
  assert.equal(t.item('ceo').hasAttribute('aria-busy'), false);
  assert.deepEqual(t.rows(), ['Mira Kovač', 'Ana Petrović', 'Ben Ali', 'Jan Novak']);
  assert.equal(t.item('cto').getAttribute('aria-expanded'), 'false', 'a loaded child can be lazy too');

  // collapse and expand again: no second request
  key(t.item('ceo'), 'ArrowLeft');
  key(t.item('ceo'), 'ArrowRight');
  assert.equal(calls.length, 1);
  assert.deepEqual(t.rows(), ['Mira Kovač', 'Ana Petrović', 'Ben Ali', 'Jan Novak']);

  // the next level loads the same way
  key(t.item('ceo'), 'ArrowRight');
  assert.equal(document.activeElement, t.item('cto'));
  key(t.item('cto'), 'ArrowRight');
  assert.deepEqual(calls.map((c) => c.id), ['ceo', 'cto']);
  await settle(() => calls[1].resolve([]));
  assert.equal(t.item('cto').hasAttribute('aria-expanded'), false, 'no children came back: it is a leaf now');
  t.unmount();
});

test('focus on the loading row moves to the node when the children arrive', async () => {
  const { load, calls } = deferred();
  const t = mount({ loadChildren: load });
  t.item('ceo').focus();
  key(t.item('ceo'), 'ArrowRight');
  key(t.item('ceo'), 'ArrowDown');
  assert.equal(document.activeElement.querySelector('.uix-tree__label').textContent, 'Loading…', 'the arrow keys reach the loading row');
  await settle(() => calls[0].resolve(REPORTS));
  assert.equal(document.activeElement, t.item('ceo'), 'focus did not fall to the body');
  assert.equal(t.host.querySelectorAll('[role="treeitem"][tabindex="0"]').length, 1, 'the tree keeps one tab stop');
  t.unmount();
});

test('a failed load shows an error row; Enter on it retries, and it is never selected', async () => {
  const { load, calls } = deferred();
  const selected = [];
  const t = mount({ loadChildren: load, onSelect: (id) => selected.push(id) });
  click(t.item('ceo').querySelector('button.uix-tree__toggle'));
  await settle(() => calls[0].reject(new Error('503')));
  assert.equal(t.item('ceo').hasAttribute('aria-busy'), false);
  assert.deepEqual(t.rows(), ['Mira Kovač', 'Could not load. Retry', 'Jan Novak']);
  const errorRow = t.host.querySelectorAll('[role="treeitem"]')[1];
  assert.ok(errorRow.querySelector('.uix-tree__status--error .uix-tree__retry'));
  assert.equal(errorRow.hasAttribute('aria-selected'), false, 'a status row is not selectable');
  assert.equal(calls.length, 1, 'no automatic retry');

  t.item('ceo').focus();
  key(t.item('ceo'), 'ArrowDown');
  assert.equal(document.activeElement, errorRow, 'reachable by keyboard');
  key(errorRow, 'Enter');
  assert.equal(calls.length, 2, 'Enter retries');
  assert.deepEqual(selected, [], 'the consumer is not told about a synthetic row');
  assert.deepEqual(t.rows(), ['Mira Kovač', 'Loading…', 'Jan Novak']);
  assert.equal(t.item('ceo').getAttribute('aria-busy'), 'true');
  await settle(() => calls[1].reject(new Error('503')));
  click(t.host.querySelectorAll('[role="treeitem"]')[1]);
  assert.equal(calls.length, 3, 'a click retries too');
  await settle(() => calls[2].resolve(REPORTS));
  assert.deepEqual(t.rows(), ['Mira Kovač', 'Ana Petrović', 'Ben Ali', 'Jan Novak']);
  // real nodes are still selected as usual
  click(t.item('coo'));
  assert.deepEqual(selected, ['coo']);
  t.unmount();
});

test('labels: the prop, then UixLabelsProvider tree, then English', async () => {
  const { load, calls } = deferred();
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(ui.UixLabelsProvider, { labels: { tree: { loading: 'Wird geladen…', error: 'Laden fehlgeschlagen.', retry: 'Erneut versuchen' } } },
    h(ui.Tree, { nodes: ORG, loadChildren: load, defaultExpanded: new Set(['ceo']), labels: { retry: 'Nochmal' } }))));
  const labels = () => [...host.querySelectorAll('.uix-tree__label')].map((el) => el.textContent);
  assert.deepEqual(calls.map((c) => c.id), ['ceo'], 'defaultExpanded loads at mount');
  assert.deepEqual(labels(), ['Mira Kovač', 'Wird geladen…', 'Jan Novak']);
  await settle(() => calls[0].reject(new Error('x')));
  assert.deepEqual(labels(), ['Mira Kovač', 'Laden fehlgeschlagen. Nochmal', 'Jan Novak']);
  act(() => root.unmount());
  host.remove();
});

test('a controlled expanded set loads too, and node.children given later replace what was loaded', async () => {
  const { load, calls } = deferred();
  const t = mount({ loadChildren: load, expanded: new Set() });
  assert.deepEqual(calls, []);
  t.render({ expanded: new Set(['ceo']) });
  assert.deepEqual(calls.map((c) => c.id), ['ceo']);
  await settle(() => calls[0].resolve(REPORTS));
  assert.deepEqual(t.rows(), ['Mira Kovač', 'Ana Petrović', 'Ben Ali', 'Jan Novak']);
  t.render({ expanded: new Set(['ceo']), nodes: [{ id: 'ceo', label: 'Mira Kovač', children: [{ id: 'x', label: 'From the server' }] }, ORG[1]] });
  assert.deepEqual(t.rows(), ['Mira Kovač', 'From the server', 'Jan Novak']);
  t.unmount();
});

test('the virtualised tree loads, shows the same rows and retries the same way', async () => {
  const { load, calls } = deferred();
  const t = mount({ loadChildren: load, virtualize: true });
  assert.ok(t.host.querySelector('.uix-tree--virtual'));
  t.item('ceo').focus();
  key(t.item('ceo'), 'ArrowRight');
  assert.equal(t.item('ceo').getAttribute('aria-busy'), 'true');
  assert.deepEqual(t.rows(), ['Mira Kovač', 'Loading…', 'Jan Novak']);
  await settle(() => calls[0].reject(new Error('x')));
  assert.deepEqual(t.rows(), ['Mira Kovač', 'Could not load. Retry', 'Jan Novak']);
  key(t.item('ceo'), 'ArrowDown');
  key(document.activeElement, 'Enter');
  assert.equal(calls.length, 2);
  await settle(() => calls[1].resolve(REPORTS));
  assert.deepEqual(t.rows(), ['Mira Kovač', 'Ana Petrović', 'Ben Ali', 'Jan Novak']);
  assert.equal(t.item('cto').getAttribute('aria-level'), '2');
  t.unmount();
});

test('a tree without lazy nodes renders exactly as before', () => {
  const nodes = [{ id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] }, { id: 'b', label: 'B' }];
  const html = renderToStaticMarkup(h(ui.Tree, { nodes, defaultExpanded: new Set(['a']) }));
  assert.doesNotMatch(html, /aria-busy|uix-tree__status/);
  assert.match(html, /^<ul class="uix-tree" role="tree" data-uix-tree="[^"]+">/);
  assert.equal((html.match(/role="treeitem"/g) ?? []).length, 3);
});
