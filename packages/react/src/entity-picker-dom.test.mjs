/* HAR-1366 (TENSOR B28/C5, MOTUS B-P10) — EntityPicker in jsdom: search, choose, the value
 * display, clear, Escape back to the value, error with a keyboard-reachable Retry row (the bug
 * of TENSOR HAR-1336), the hidden form value and Field wiring.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  if (!dom.window.ResizeObserver) dom.window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  expose('ResizeObserver', dom.window.ResizeObserver);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const settle = (ms = 15) => act(() => new Promise((r) => setTimeout(r, ms)));
const type = (el, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, text);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const key = (el, k) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })));
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

const people = [
  { id: 'u1', title: 'Ada Lovelace', meta: ['IT', 'Service desk'] },
  { id: 'u2', title: 'Ben Ali', meta: ['Facilities'] },
];

const Harness = ({ initial = null, search, log }) => {
  const [value, setValue] = useState(initial);
  return h('form', null, h(ui.Field, { label: 'Assignee', htmlFor: 'assignee', hint: 'Who works on it' },
    h(ui.EntityPicker, { id: 'assignee', name: 'assignee_id', label: 'Assignee', value, delay: 0, onSearch: search, onValueChange: (v) => { log.push(v?.id ?? null); setValue(v); } })));
};

test('search, choose with the keyboard, then the value shows with a named clear button', async () => {
  const log = [];
  const calls = [];
  const search = (q) => { calls.push(q); return Promise.resolve(people.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()))); };
  const { host, unmount } = mount(h(Harness, { search, log }));
  const input = host.querySelector('input[role="combobox"]');
  assert.equal(input.id, 'assignee', 'Field label points at the input');
  assert.equal(host.querySelector('label[for="assignee"]').textContent, 'Assignee');
  input.focus();
  type(input, 'ben');
  await settle();
  assert.deepEqual(calls.at(-1), 'ben');
  key(input, 'ArrowDown');
  key(input, 'Enter');
  await settle();
  assert.deepEqual(log, ['u2']);
  const valueButton = host.querySelector('.uix-entity-picker__value');
  assert.equal(valueButton.id, 'assignee');
  assert.equal(valueButton.getAttribute('aria-label'), 'Assignee: Ben Ali. Change');
  assert.match(valueButton.textContent, /Ben Ali.*Facilities/);
  assert.equal(document.activeElement, valueButton, 'focus returns to the field after choosing');
  assert.equal(host.querySelector('input[type="hidden"][name="assignee_id"]').value, 'u2');
  const clear = host.querySelector('.uix-entity-picker__clear');
  assert.equal(clear.getAttribute('aria-label'), 'Clear Ben Ali');
  click(clear);
  await settle();
  assert.deepEqual(log, ['u2', null]);
  assert.equal(document.activeElement, host.querySelector('input[role="combobox"]'), 'clearing goes back to the search');
  assert.equal(host.querySelector('input[type="hidden"]').value, '');
  unmount();
});

test('choosing again starts a fresh search; Escape with an empty query goes back to the value', async () => {
  const { host, unmount } = mount(h(Harness, { initial: people[0], search: () => Promise.resolve(people), log: [] }));
  click(host.querySelector('.uix-entity-picker__value'));
  await settle();
  const input = host.querySelector('input[role="combobox"]');
  assert.equal(input.value, '');
  assert.equal(document.activeElement, input);
  key(input, 'Escape');
  key(input, 'Escape');
  await settle();
  assert.ok(host.querySelector('.uix-entity-picker__value'), 'back to the chosen record');
  assert.equal(document.activeElement, host.querySelector('.uix-entity-picker__value'));
  unmount();
});

test('a failed search shows the error and a Retry row the arrow keys reach', async () => {
  let fail = true;
  const log = [];
  const { host, unmount } = mount(h(Harness, { search: () => (fail ? Promise.reject(new Error('down')) : Promise.resolve(people)), log }));
  const input = host.querySelector('input[role="combobox"]');
  input.focus();
  await settle();
  assert.match(host.querySelector('.uix-search-suggest').textContent, /Search failed\./);
  const retry = [...host.querySelectorAll('[role="option"]')].find((o) => o.textContent === 'Try again');
  assert.ok(retry, 'Retry is an option in the list');
  fail = false;
  key(input, 'ArrowDown');
  assert.equal(input.getAttribute('aria-activedescendant'), retry.id, 'the keyboard reaches Retry');
  key(input, 'Enter');
  await settle();
  input.focus();
  await settle();
  assert.deepEqual([...host.querySelectorAll('[role="option"]')].map((o) => o.textContent.replace(/\s+/g, ' ').trim()).filter((t) => t.startsWith('Ada') || t.startsWith('Ben')).length, 2);
  unmount();
});
