/* EntityPicker / SearchSuggest gaps TENSOR needs closed to adopt the kit picker (HAR-1834):
 *   1. a failure that Retry cannot fix (`{ retryable: false }`, `isRetryable`) shows no Retry;
 *   2. the empty (searching) picker can be disabled and invalid;
 *   3. clear starts a new search: no old query, no old rows, focus in the field;
 *   4. a visible label names the field (no aria-label over it);
 * and, for async search, the last answer stays in view while the next one loads, with the spinner
 * held back for 300 ms (the kit's useDelayedPending). Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

let dom;
let createRoot;
let ui;
const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const settle = (ms = 15) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));
const type = (el, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, text);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const key = (el, k) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })));

const PEOPLE = [{ id: 'u1', title: 'Ada Lovelace' }, { id: 'u2', title: 'Ben Ali' }];

function mount(props = {}, wrap = (el) => el) {
  const log = [];
  function Harness() {
    const [value, setValue] = useState(props.value ?? null);
    return wrap(h(ui.EntityPicker, {
      label: 'Assignee', delay: 0, onSearch: async (q) => PEOPLE.filter((p) => p.title.toLowerCase().includes(q.toLowerCase())),
      ...props, value, onValueChange: (v) => { log.push(v?.id ?? null); setValue(v); },
    }));
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(Harness)));
  return {
    host, log,
    input: () => host.querySelector('input[role="combobox"]'),
    rows: () => [...host.querySelectorAll('[role="option"]')].map((o) => o.textContent),
    text: () => host.querySelector('.uix-search-suggest__popup').textContent,
    unmount: () => { act(() => root.unmount()); host.remove(); },
  };
}

test('1. a rejection with { retryable: false } shows the forbidden words and no Retry; a message wins', async () => {
  const forbidden = mount({ onSearch: () => Promise.reject({ retryable: false }) });
  act(() => forbidden.input().focus());
  await settle();
  assert.match(forbidden.text(), /You do not have access to search these records\./);
  assert.deepEqual(forbidden.rows(), [], 'no Retry row');
  forbidden.unmount();

  const own = mount({ onSearch: () => Promise.reject({ retryable: false, message: 'Ask an admin for identity:user:read.' }) });
  act(() => own.input().focus());
  await settle();
  assert.match(own.text(), /Ask an admin for identity:user:read\./);
  assert.deepEqual(own.rows(), []);
  own.unmount();

  const decided = mount({ onSearch: () => Promise.reject(new Error('403')), isRetryable: (e) => e.message !== '403', labels: { forbidden: 'Keine Berechtigung.' } });
  act(() => decided.input().focus());
  await settle();
  assert.match(decided.text(), /Keine Berechtigung\./);
  assert.deepEqual(decided.rows(), []);
  decided.unmount();

  const transient = mount({ onSearch: () => Promise.reject(new Error('timeout')) });
  act(() => transient.input().focus());
  await settle();
  assert.match(transient.text(), /Search failed\./);
  assert.deepEqual(transient.rows(), ['Try again'], 'an ordinary failure keeps Retry');
  transient.unmount();
});

test('2. the empty picker: disabled cannot be typed in or searched; invalid is announced', async () => {
  let calls = 0;
  const off = mount({ disabled: true, onSearch: async () => { calls += 1; return PEOPLE; } });
  assert.equal(off.input().disabled, true);
  await settle();
  assert.equal(calls, 0, 'no search while disabled');
  off.unmount();
  const bad = mount({ invalid: true });
  assert.equal(bad.input().getAttribute('aria-invalid'), 'true');
  bad.unmount();
});

test('3. clear starts a new search: the old query and rows are gone and the field has focus', async () => {
  const v = mount();
  act(() => v.input().focus());
  type(v.input(), 'ben');
  await settle();
  key(v.input(), 'ArrowDown');
  key(v.input(), 'Enter');
  assert.deepEqual(v.log, ['u2']);
  const clearButton = v.host.querySelector('.uix-entity-picker__clear');
  act(() => clearButton.click());
  await settle();
  assert.deepEqual(v.log, ['u2', null]);
  assert.equal(v.input().value, '', 'the old query is gone');
  assert.equal(document.activeElement, v.input());
  assert.deepEqual(v.rows(), ['Ada Lovelace', 'Ben Ali'], 'a fresh search for the empty query, not the old rows');
  v.unmount();
});

test('4. a visible label names the field: no aria-label with a <label for> or aria-labelledby', () => {
  const field = mount({ id: 'assignee' }, (el) => h(ui.Field, { label: 'Assignee', htmlFor: 'assignee' }, el));
  assert.equal(field.input().hasAttribute('aria-label'), false);
  assert.equal(field.input().labels[0].textContent, 'Assignee');
  field.unmount();
  const by = mount({ 'aria-labelledby': 'external' }, (el) => h('div', null, h('span', { id: 'external' }, 'Owner'), el));
  assert.equal(by.input().getAttribute('aria-labelledby'), 'external');
  assert.equal(by.input().hasAttribute('aria-label'), false);
  by.unmount();
  const bare = mount();
  assert.equal(bare.input().getAttribute('aria-label'), 'Assignee. Search', 'with no visible label the name stays');
  bare.unmount();
});

test('async: the last answer stays in view while the next loads; the spinner waits 300 ms', async () => {
  let release;
  const v = mount({
    onSearch: (q) => (q === 'a' ? Promise.resolve(PEOPLE) : new Promise((resolve) => { release = () => resolve(PEOPLE.filter((p) => p.title.includes('Ada'))); })),
  });
  act(() => v.input().focus());
  type(v.input(), 'a');
  await settle();
  assert.deepEqual(v.rows(), ['Ada Lovelace', 'Ben Ali']);
  type(v.input(), 'ad');
  await settle();
  assert.equal(v.input().getAttribute('aria-busy'), 'true');
  assert.deepEqual(v.rows(), ['Ada Lovelace', 'Ben Ali'], 'the old rows stay while the next search runs');
  assert.equal(v.host.querySelector('.uix-search-suggest__spinner'), null, 'no spinner under 300 ms');
  key(v.input(), 'Enter');
  assert.deepEqual(v.log, [], 'Enter during the search picks nothing');
  await settle(320);
  assert.ok(v.host.querySelector('.uix-search-suggest__spinner'), 'a slow search shows the spinner');
  release();
  await settle();
  assert.deepEqual(v.rows(), ['Ada Lovelace']);
  // the kit's delayed pending keeps a shown spinner 500 ms, so it never flickers off and on
  await settle(520);
  assert.equal(v.host.querySelector('.uix-search-suggest__spinner'), null);
  v.unmount();
});
