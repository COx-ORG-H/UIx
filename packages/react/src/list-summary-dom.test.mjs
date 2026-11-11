/* HAR-3069 — ListSummary: a long list of names reads as a count, the first few names and the
 * words for the rest; one button shows the whole list in place and hides it again. A list only
 * one name longer than `max` is shown whole, and an empty list shows `empty`.
 * Renders the BUILT dist — run `npm run build` first. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

async function mount(element) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  return { host, unmount: async () => { await act(async () => root.unmount()); host.remove(); } };
}

const names = (n) => Array.from({ length: n }, (_, i) => `Role ${i + 1}`);

test('a long list shows the count, the first names, the rest in words and a collapsed toggle', async () => {
  const { host, unmount } = await mount(h(ui.ListSummary, { items: names(16), count: (n) => `${n} roles` }));
  assert.equal(host.querySelector('.uix-list-summary__count').textContent, '16 roles');
  const list = host.querySelector('.uix-list-summary__items > span');
  assert.equal(list.textContent, 'Role 1, Role 2, Role 3 and 13 more');
  const toggle = host.querySelector('button.uix-list-summary__toggle');
  assert.equal(toggle.type, 'button');
  assert.equal(toggle.textContent, 'Show all');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(toggle.getAttribute('aria-controls'), list.id);
  await unmount();
});

test('the toggle shows the whole list in place and hides it again', async () => {
  const { host, unmount } = await mount(h(ui.ListSummary, { items: names(16) }));
  const toggle = host.querySelector('button.uix-list-summary__toggle');
  await act(async () => toggle.click());
  assert.equal(host.querySelector('.uix-list-summary__items > span').textContent, names(16).join(', '));
  assert.equal(toggle.textContent, 'Show less');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  await act(async () => toggle.click());
  assert.equal(host.querySelector('.uix-list-summary__items > span').textContent, 'Role 1, Role 2, Role 3 and 13 more');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  await unmount();
});

test('every word is a prop', async () => {
  const { host, unmount } = await mount(h(ui.ListSummary, {
    items: names(6),
    max: 2,
    separator: ' · ',
    more: (n) => `und ${n} weitere`,
    expandLabel: 'Alle anzeigen',
    collapseLabel: 'Weniger anzeigen',
  }));
  assert.equal(host.querySelector('.uix-list-summary__items > span').textContent, 'Role 1 · Role 2 und 4 weitere');
  const toggle = host.querySelector('button.uix-list-summary__toggle');
  assert.equal(toggle.textContent, 'Alle anzeigen');
  await act(async () => toggle.click());
  assert.equal(toggle.textContent, 'Weniger anzeigen');
  await unmount();
});

test('a list one name longer than max is shown whole, without a toggle', async () => {
  const { host, unmount } = await mount(h(ui.ListSummary, { items: names(4), max: 3 }));
  assert.equal(host.querySelector('.uix-list-summary__items').textContent, 'Role 1, Role 2, Role 3, Role 4');
  assert.equal(host.querySelector('button'), null);
  await unmount();
});

test('an empty list shows empty, without a count or a toggle', async () => {
  const { host, unmount } = await mount(h(ui.ListSummary, { items: [], count: (n) => `${n} roles`, empty: 'No role' }));
  assert.equal(host.querySelector('.uix-list-summary__items').textContent, 'No role');
  assert.equal(host.querySelector('.uix-list-summary__count'), null);
  assert.equal(host.querySelector('button'), null);
  await unmount();
});

test('defaultExpanded starts with the whole list shown', async () => {
  const { host, unmount } = await mount(h(ui.ListSummary, { items: names(8), defaultExpanded: true }));
  assert.equal(host.querySelector('.uix-list-summary__items > span').textContent, names(8).join(', '));
  assert.equal(host.querySelector('button').getAttribute('aria-expanded'), 'true');
  await unmount();
});
