/* Tree: each treeitem is named by its own row, not by its whole subtree (HAR-1828), in jsdom.
 *
 * A treeitem without aria-label / aria-labelledby is named by its content, and its content
 * includes the nested role="group": once expanded, "Grace Hopper" became "Grace Hopper Alice
 * Lovelace Bob Builder", and a query for /Alice Lovelace/ matched the manager too (TENSOR's
 * portal org chart, HAR-1486). Each row is now aria-labelledby its own .uix-tree__label, or
 * aria-label from `ariaLabel` when the label is rich; nested, virtualised, and for the synthetic
 * loading and error rows.
 *
 * jsdom computes no accessible names, so `nameOf` follows the two attributes the way accname
 * does for them; tests/a11y/nav-primitives.spec.mjs asks Chromium for the real names.
 * Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

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
  expose('CSS', { escape: (value) => String(value).replace(/["\\]/g, '\\$&') });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, rerender: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};

/** aria-label, else the text of the aria-labelledby targets, else (what used to happen) all the text. */
const nameOf = (el) => {
  if (el.hasAttribute('aria-label')) return el.getAttribute('aria-label');
  const ids = el.getAttribute('aria-labelledby');
  if (ids) return ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? `#${id}?`).join(' ').trim();
  return el.textContent.trim();
};
const items = (host) => [...host.querySelectorAll('[role="treeitem"]')];
const names = (host) => items(host).map(nameOf);

const ORG = [
  {
    id: 'grace', label: 'Grace Hopper',
    children: [{ id: 'alice', label: 'Alice Lovelace' }, { id: 'bob builder', label: 'Bob Builder' }],
  },
  { id: 'jan', label: 'Jan Novak' },
];

test('an expanded branch is named by its own label; each child by its own', () => {
  const view = mount(h(ui.Tree, { nodes: ORG, defaultExpanded: new Set(['grace']), 'aria-label': 'Org chart' }));
  assert.deepEqual(names(view.host), ['Grace Hopper', 'Alice Lovelace', 'Bob Builder', 'Jan Novak']);
  const grace = items(view.host)[0];
  assert.equal(grace.getAttribute('aria-expanded'), 'true');
  const label = document.getElementById(grace.getAttribute('aria-labelledby'));
  assert.ok(label.classList.contains('uix-tree__label'), 'the name is the row\'s own .uix-tree__label');
  assert.ok(grace.querySelector(':scope > .uix-tree__row').contains(label), 'inside its own row, not the group');
  // An id with a space still makes a single IDREF.
  assert.equal(items(view.host)[2].getAttribute('aria-labelledby').split(' ').length, 1);
  const ids = items(view.host).map((el) => el.getAttribute('aria-labelledby'));
  assert.equal(new Set(ids).size, ids.length, 'one id per row');
  view.unmount();
});

test('two trees on one page never share a label id', () => {
  const view = mount(h('div', null, h(ui.Tree, { nodes: ORG }), h(ui.Tree, { nodes: ORG })));
  const ids = items(view.host).map((el) => el.getAttribute('aria-labelledby'));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(document.querySelectorAll(`[id="${ids[0]}"]`).length, 1);
  view.unmount();
});

test('ariaLabel names a row whose label is rich; only that is spoken', () => {
  const rich = [{
    id: 'grace', ariaLabel: 'Grace Hopper', typeaheadLabel: 'Grace Hopper',
    label: h('span', null, h('span', { className: 'uix-avatar' }, 'GH'), ' Grace Hopper ', h('small', null, 'Rear admiral · 3 reports')),
    children: [{ id: 'alice', label: 'Alice Lovelace' }],
  }];
  const view = mount(h(ui.Tree, { nodes: rich, defaultExpanded: new Set(['grace']) }));
  const [grace, alice] = items(view.host);
  assert.equal(grace.getAttribute('aria-label'), 'Grace Hopper');
  assert.equal(grace.hasAttribute('aria-labelledby'), false);
  assert.equal(nameOf(alice), 'Alice Lovelace');
  view.unmount();
});

test('the virtualised tree names its flat rows the same way', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({
    id: `team ${i}`, label: `Team ${i}`, children: [{ id: `lead ${i}`, label: `Lead ${i}` }],
  }));
  const view = mount(h(ui.Tree, { nodes: many, virtualize: true, defaultExpanded: new Set(['team 0']), maxHeight: 200 }));
  const rendered = names(view.host);
  assert.deepEqual(rendered.slice(0, 3), ['Team 0', 'Lead 0', 'Team 1']);
  assert.ok(items(view.host).every((el) => el.hasAttribute('aria-labelledby')));
  view.unmount();
});

test('the synthetic loading and error rows are named by their own text', async () => {
  let reject;
  const view = mount(h(ui.Tree, {
    nodes: [{ id: 'grace', label: 'Grace Hopper', hasChildren: true }],
    defaultExpanded: new Set(['grace']),
    loadChildren: () => new Promise((_, no) => { reject = no; }),
    labels: { loading: 'Lädt …', error: 'Konnte nicht geladen werden.', retry: 'Erneut versuchen' },
  }));
  assert.deepEqual(names(view.host), ['Grace Hopper', 'Lädt …']);
  await act(async () => { reject(new Error('offline')); });
  assert.deepEqual(names(view.host), ['Grace Hopper', 'Konnte nicht geladen werden. Erneut versuchen']);
  view.unmount();
});
