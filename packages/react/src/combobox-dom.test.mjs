/* Combobox at keyboard and structure parity with Select (HAR-1588), in jsdom: the APG keys
 * (↑ ↓ PageUp PageDown, Home End with an option active, disabled options skipped, no wrap), Enter
 * chooses, Escape and blur put the chosen text back, groups are role="group", the no-match row is
 * outside the listbox, aria-labelledby replaces the label. Placement and clipping are measured in a
 * browser: tests/a11y/form-fields.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

let dom;
let createRoot;
let ui;
const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  const { window } = dom;
  expose('window', window);
  expose('document', window.document);
  expose('navigator', window.navigator);
  expose('getComputedStyle', window.getComputedStyle.bind(window));
  expose('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('HTMLElement', window.HTMLElement);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const OPTIONS = [
  { label: 'Hardware', options: [{ value: 'laptop', label: 'Laptop' }, { value: 'monitor', label: 'Monitor', disabled: true }, { value: 'dock', label: 'Docking station' }] },
  { label: 'Software', options: [{ value: 'office', label: 'Office suite' }, { value: 'vpn', label: 'VPN client', keywords: ['remote'] }] },
  { value: 'other', label: 'Other' },
  { value: 'retired', label: 'Retired', disabled: true },
];

function mount(props = {}) {
  const picks = [];
  const outer = [];
  function Harness() {
    const [value, setValue] = useState(props.value ?? 'office');
    return h('div', { onKeyDown: (e) => { if (e.key === 'Escape') outer.push('Escape'); } },
      h('span', { id: 'cat-label' }, 'Category'),
      h(ui.Combobox, { options: OPTIONS, label: 'Category', emptyLabel: 'No matching category', ...props, value, onValueChange: (v) => { picks.push(v); setValue(v); } }),
      h('button', { id: 'after' }, 'after'));
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(Harness)));
  const input = host.querySelector('input[role="combobox"]');
  return {
    host, picks, outer, input,
    active: () => { const id = input.getAttribute('aria-activedescendant'); return id ? document.getElementById(id).textContent : null; },
    key: (k, init = {}) => act(() => { input.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })); }),
    type: (text) => act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, text);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    }),
    focus: () => act(() => { input.focus(); }),
    unmount: () => { act(() => root.unmount()); host.remove(); },
  };
}

test('closed: the chosen label in the field, aria-expanded false, the list in a manual popover', () => {
  const v = mount();
  assert.equal(v.input.value, 'Office suite');
  assert.equal(v.input.getAttribute('aria-expanded'), 'false');
  assert.equal(v.input.getAttribute('aria-label'), 'Category');
  const popup = v.host.querySelector('.uix-combobox__popup');
  assert.equal(popup.getAttribute('popover'), 'manual');
  assert.equal(popup.hidden, true);
  assert.equal(v.input.getAttribute('aria-controls'), v.host.querySelector('[role="listbox"]').id);
  v.unmount();
});

test('the APG keys: open on the chosen option, skip disabled, PageUp/PageDown, Home/End, no wrap', () => {
  const v = mount();
  v.focus();
  assert.equal(v.input.getAttribute('aria-expanded'), 'true');
  assert.equal(v.active(), 'Office suite', 'opens on the chosen option');
  v.key('ArrowUp');
  assert.equal(v.active(), 'Docking station');
  v.key('ArrowUp');
  assert.equal(v.active(), 'Laptop', 'the disabled Monitor is skipped');
  v.key('ArrowUp');
  assert.equal(v.active(), 'Laptop', 'the list does not wrap');
  v.key('End');
  assert.equal(v.active(), 'Other', 'the disabled last option is skipped');
  v.key('Home');
  assert.equal(v.active(), 'Laptop');
  v.key('PageDown');
  assert.equal(v.active(), 'Other');
  v.key('PageUp');
  assert.equal(v.active(), 'Laptop');
  v.key('ArrowDown');
  v.key('Enter');
  assert.deepEqual(v.picks, ['dock']);
  assert.equal(v.input.value, 'Docking station');
  assert.equal(v.input.getAttribute('aria-expanded'), 'false');
  v.unmount();
});

test('typing filters (labels, values, keywords); groups keep their name; no match is outside the listbox', () => {
  const v = mount();
  v.focus();
  v.type('remote');
  const list = v.host.querySelector('[role="listbox"]');
  const groups = list.querySelectorAll('[role="group"]');
  assert.equal(groups.length, 1);
  assert.equal(document.getElementById(groups[0].getAttribute('aria-labelledby')).textContent, 'Software');
  assert.deepEqual([...list.querySelectorAll('[role="option"]')].map((o) => o.textContent), ['VPN client']);
  assert.equal(v.active(), 'VPN client');
  v.type('zzz');
  assert.equal(list.hidden, true, 'an empty listbox is hidden');
  const empty = v.host.querySelector('.uix-select__state');
  assert.equal(empty.textContent, 'No matching category');
  assert.equal(empty.closest('[role="listbox"]'), null, 'the empty row is not inside the listbox');
  assert.equal(v.input.hasAttribute('aria-activedescendant'), false);
  v.unmount();
});

test('Escape closes and puts the chosen text back, and does not reach a dialog around it; blur does the same', () => {
  const v = mount();
  const { outer } = v;
  v.focus();
  v.type('Lap');
  v.key('Escape');
  assert.equal(v.input.value, 'Office suite');
  assert.equal(v.input.getAttribute('aria-expanded'), 'false');
  assert.deepEqual(outer, []);
  v.key('Escape');
  assert.deepEqual(outer, ['Escape'], 'with nothing to undo, Escape is left to what is around the field');
  // reopened from the keys, the chosen label in the field does not filter the list
  v.key('ArrowDown');
  v.key('ArrowDown');
  assert.equal(v.active(), 'VPN client');
  v.key('Escape');
  v.focus();
  v.type('Do');
  act(() => { v.input.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: v.host.querySelector('#after') })); });
  assert.equal(v.input.value, 'Office suite');
  assert.deepEqual(v.picks, []);
  v.unmount();
});

test('aria-labelledby names it instead of label; describedby and invalid land on the input', () => {
  const v = mount({ 'aria-labelledby': 'cat-label', 'aria-describedby': 'hint', 'aria-invalid': true, inputId: 'cat' });
  assert.equal(v.input.getAttribute('aria-labelledby'), 'cat-label');
  assert.equal(v.input.hasAttribute('aria-label'), false);
  assert.equal(v.input.getAttribute('aria-describedby'), 'hint');
  assert.equal(v.input.getAttribute('aria-invalid'), 'true');
  assert.equal(v.input.id, 'cat');
  v.unmount();
});

test('flat options still work, and filterComboboxItems keeps groups that match', () => {
  const v = mount({ options: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }], value: 'a' });
  v.focus();
  v.key('ArrowDown');
  v.key('Enter');
  assert.deepEqual(v.picks, ['b']);
  v.unmount();
  assert.deepEqual(ui.filterComboboxItems(OPTIONS, 'dock').map((i) => i.label), ['Hardware']);
  assert.deepEqual(ui.filterComboboxItems(OPTIONS, 'oth').map((i) => i.label), ['Other']);
});
