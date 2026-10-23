/* RelationshipGraph at CMDB size must read, not just render (HAR-1387, review of PR #166). At 300
 * nodes 197 of 200 drawn labels said "depends on", a hub's 53 edges stacked into a black fan, a
 * hub's description ran to 2,890 characters and its list button's name to thousands. Here, in
 * jsdom:
 *   - a column that takes many forward edges says their common relation once, in its header, and
 *     only the edges that differ keep a label;
 *   - hover/focus labels follow the real focus, not the roving tab stop the root holds on load;
 *   - a busy node's fan-out is a bus: every edge shares one trunk, no curves;
 *   - a hub's description names five relationships and points to the list;
 *   - the list names a node in its button and its neighbours in a list of their own, eight until
 *     "Show all N";
 *   - an item flagged "cycle" says so to the CSS, which keeps its name clear of the flag.
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

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

async function mount(props) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(h(RelationshipGraph, { layout: 'layered', clusterThreshold: 0, ...props })); await settle(); });
  return { host, unmount: () => act(async () => root.unmount()) };
}

/** A hub with 20 applications that each run on a host; one application is "owned by" instead. */
function hub() {
  const nodes = [{ id: 'svc', label: 'Checkout service', type: 'Business Service' }];
  const edges = [];
  for (let i = 1; i <= 20; i += 1) {
    nodes.push({ id: `app${i}`, label: `Application ${i}`, type: 'Application' });
    edges.push({ id: `svc-app${i}`, source: 'svc', target: `app${i}`, label: i === 7 ? 'owned by' : 'depends on' });
    nodes.push({ id: `host${i}`, label: `Host ${i}`, type: 'Host' });
    edges.push({ id: `app${i}-host${i}`, source: `app${i}`, target: `host${i}`, label: 'runs on' });
  }
  return { nodes, edges };
}

const drawnLabels = (host) => [...host.querySelectorAll('.uix-relationship-graph__edge-label text')].map((text) => text.textContent);

test('a busy column says its common relation once; only the edges that differ keep a label', async () => {
  const { host, unmount } = await mount({ rootId: 'svc', ...hub() });
  const labels = drawnLabels(host);
  assert.equal(labels.filter((text) => text === 'depends on').length, 0, `drawn: ${labels.join(' | ')}`);
  assert.equal(labels.filter((text) => text === 'runs on').length, 0);
  assert.ok(labels.includes('owned by'), 'the one relation that differs is drawn');
  const headers = [...host.querySelectorAll('.uix-relationship-graph__column')].map((column) => column.textContent);
  assert.match(headers[1], /depends on$/);
  assert.match(headers[2], /runs on$/);
  await unmount();
});

test('hover and focus labels follow the real focus, not the roving tab stop', async () => {
  const nodes = [
    { id: 'svc', label: 'Service' },
    { id: 'app', label: 'App' },
    { id: 'db', label: 'Database', depth: 2 },
  ];
  const edges = [
    { id: 'svc-app', source: 'svc', target: 'app', label: 'calls' },
    { id: 'svc-db', source: 'svc', target: 'db', label: 'monitors' },
    { id: 'app-db', source: 'app', target: 'db', label: 'reads' },
  ];
  const { host, unmount } = await mount({ rootId: 'svc', nodes, edges });
  const root = host.querySelector('[data-node-id="svc"]');
  assert.equal(root.tabIndex, 0, 'the root holds the tab stop');
  assert.ok(!drawnLabels(host).includes('monitors'), 'no focus yet: the skip edge is unlabelled');
  await act(async () => { root.focus(); await settle(); });
  assert.ok(drawnLabels(host).includes('monitors'), 'focused: its skip edge is labelled');
  await act(async () => { root.blur(); await settle(); });
  assert.ok(!drawnLabels(host).includes('monitors'), 'blurred: the label goes again');
  await unmount();
});

test('a busy node fans out along one trunk, not twenty curves', async () => {
  const { host, unmount } = await mount({ rootId: 'svc', ...hub() });
  const fan = [...host.querySelectorAll('.uix-relationship-graph__link')].filter((link) => {
    const d = link.querySelector('path').getAttribute('d');
    return d.startsWith(host.querySelector('.uix-relationship-graph__link path').getAttribute('d').split(' H')[0]);
  });
  assert.equal(fan.length, 20);
  const trunks = new Set();
  for (const link of fan) {
    assert.ok(link.hasAttribute('data-bus'));
    const d = link.querySelector('path').getAttribute('d');
    assert.doesNotMatch(d, /C/, d);
    const trunk = /V/.test(d) ? /Q([\d.]+) /.exec(d)[1] : 'straight';
    trunks.add(trunk);
  }
  trunks.delete('straight');
  assert.equal(trunks.size, 1, `one trunk: ${[...trunks].join(', ')}`);
  await unmount();
});

test('a hub names five relationships and points to the list', async () => {
  const { host, unmount } = await mount({ rootId: 'svc', ...hub() });
  const svc = host.querySelector('[data-node-id="svc"]');
  const description = document.getElementById(svc.getAttribute('aria-describedby')).textContent;
  assert.equal(description.split('; ').length, 6, description);
  assert.match(description, /and 15 more, listed in the relationship list$/);
  await unmount();
});

test('the list keeps neighbours out of the button name, eight until "Show all"', async () => {
  const { host, unmount } = await mount({ rootId: 'svc', ...hub() });
  const row = [...host.querySelectorAll('.uix-relationship-graph__list > ul > li')].find((li) => li.textContent.startsWith('Checkout service'));
  const button = row.querySelector('button[aria-pressed]');
  assert.equal(button.textContent, 'Checkout serviceBusiness Service');
  const list = row.querySelector('ul');
  assert.equal(document.getElementById(list.getAttribute('aria-labelledby')).textContent, 'Connected to');
  assert.equal(list.querySelectorAll('li').length, 8);
  const more = row.querySelector('.uix-relationship-graph__list-more');
  assert.equal(more.textContent, 'Show all 20');
  assert.equal(more.getAttribute('aria-expanded'), 'false');
  await act(async () => { more.click(); await settle(); });
  assert.equal(list.querySelectorAll('li').length, 20);
  assert.equal(more.getAttribute('aria-expanded'), 'true');
  assert.equal(more.textContent, 'Show fewer');
  await unmount();
});

test('a translated connectedTo still heads the neighbour list', async () => {
  const { host, unmount } = await mount({ rootId: 'svc', ...hub(), labels: { connectedTo: (names) => `Verbunden mit ${names}` } });
  const heading = host.querySelector('.uix-relationship-graph__list-relations > span');
  assert.equal(heading.textContent, 'Verbunden mit');
  await unmount();
});

test('an item in a cycle is flagged for the CSS that keeps its name clear of the flag', async () => {
  const nodes = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }];
  const edges = [
    { id: 'ab', source: 'a', target: 'b' },
    { id: 'bc', source: 'b', target: 'c' },
    { id: 'ca', source: 'c', target: 'a' },
  ];
  const { host, unmount } = await mount({ rootId: 'a', nodes, edges });
  const flagged = [...host.querySelectorAll('.uix-relationship-graph__item[data-flag]')].map((item) => item.dataset.nodeId).sort();
  const withFlag = [...host.querySelectorAll('.uix-relationship-graph__item-flag')].map((flag) => flag.closest('[data-node-id]').dataset.nodeId).sort();
  assert.deepEqual(flagged, withFlag);
  assert.ok(flagged.length > 0);
  await unmount();
});
