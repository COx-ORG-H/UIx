/* SearchSuggest freeText (HAR-2465): a text field with suggestions that never replaces what was
 * typed and never submits its form by accident. Each case sits in a <form>. jsdom has no implicit
 * submission, so "no submit" is the Enter keydown's default being prevented (the browser submits
 * only when it is not); tests/a11y/form-fields.spec.mjs presses Enter in a real form with a
 * submit spy. Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
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

const DELL = [{ id: 'dell', title: 'Dell' }, { id: 'dell-tech', title: 'Dell Technologies' }];

function mount({ initial = '', options = DELL, loading = false } = {}) {
  const log = { values: [], picks: [], submits: 0 };
  function Harness() {
    const [value, setValue] = useState(initial);
    return h('form', { onSubmit: (e) => { e.preventDefault(); log.submits += 1; } },
      h(ui.SearchSuggest, {
        freeText: true, value, options, loading, label: 'Manufacturer',
        onValueChange: (v) => { log.values.push(v); setValue(v); },
        onSelect: (id) => log.picks.push(id),
      }));
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(Harness)));
  const input = host.querySelector('input');
  return {
    host, log, input,
    /** Dispatch a keydown; returns whether the browser's default (implicit submission) would run. */
    key: (k) => { let ok = true; act(() => { ok = input.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }); return ok; },
    type: (text) => act(() => {
      input.focus();
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, text);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    }),
    unmount: () => { act(() => root.unmount()); host.remove(); },
  };
}

test('1. no-match Enter: "Dell EMC" typed, "Dell" suggested — the value stays "Dell EMC", nothing submits', () => {
  const v = mount();
  v.type('Dell EMC');
  assert.equal(v.input.getAttribute('aria-expanded'), 'true');
  assert.equal(v.key('Enter'), false, 'the default (form submission) is prevented');
  assert.equal(v.input.value, 'Dell EMC');
  assert.deepEqual(v.log.picks, [], 'row 0 is not picked');
  assert.equal(v.log.values.at(-1), 'Dell EMC');
  assert.equal(v.input.getAttribute('aria-expanded'), 'false', 'the list closes');
  v.unmount();
});

test('2. no-options Enter: "Zyx", no suggestions — nothing submits', () => {
  const v = mount({ options: [] });
  v.type('Zyx');
  assert.equal(v.key('Enter'), false);
  assert.equal(v.input.value, 'Zyx');
  v.unmount();
});

test('3. loading Enter: nothing submits', () => {
  const v = mount({ options: [], loading: true, initial: 'Del' });
  v.type('Dell');
  assert.equal(v.key('Enter'), false);
  assert.equal(v.input.value, 'Dell');
  v.unmount();
});

test('4. ArrowDown + Enter: the suggestion’s text becomes the value; nothing submits', () => {
  const v = mount();
  v.type('Dell');
  v.key('ArrowDown');
  v.key('ArrowDown');
  assert.equal(v.key('Enter'), false);
  assert.equal(v.input.value, 'Dell Technologies');
  assert.deepEqual(v.log.picks, ['dell-tech']);
  assert.equal(v.log.submits, 0);
  v.unmount();
});

test('5. Escape closes the list and keeps the text, also on a second Escape', () => {
  const v = mount();
  v.type('Dell EMC');
  assert.equal(v.key('Escape'), false);
  assert.equal(v.input.getAttribute('aria-expanded'), 'false');
  assert.equal(v.input.value, 'Dell EMC');
  assert.equal(v.key('Escape'), true, 'the second Escape is left to what is around the field');
  assert.equal(v.input.value, 'Dell EMC');
  v.unmount();
});

test('6. blur and Tab keep the text; no magnifier is drawn', () => {
  const v = mount();
  v.type('Dell EM');
  v.key('Tab');
  act(() => { v.input.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: document.body })); });
  assert.equal(v.input.value, 'Dell EM');
  assert.deepEqual(v.log.picks, []);
  assert.equal(v.host.querySelector('.uix-search-suggest__lead'), null);
  assert.ok(v.host.querySelector('.uix-search-suggest--free-text'));
  v.unmount();
});

test('the search mode is unchanged: Enter with text picks the first row', () => {
  const log = [];
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(ui.SearchSuggest, { value: 'Dell', options: DELL, label: 'Search', onValueChange() {}, onSelect: (id) => log.push(id) })));
  const input = host.querySelector('input');
  act(() => input.focus());
  act(() => { input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); });
  assert.deepEqual(log, ['dell']);
  act(() => root.unmount());
  host.remove();
});
