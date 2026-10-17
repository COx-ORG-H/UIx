/* SearchBar (HAR-2030) in jsdom: one search field look and behaviour over `.uix-searchbar`.
 *
 * - a `search` landmark and a searchbox, both named by `label`; the label is visually hidden;
 * - Enter calls onSubmit with the text and cancels the keydown (never a surrounding form's submit);
 * - Escape on a field with text clears it, calls onClear, keeps focus and is cancelled; on an
 *   empty field Escape is left alone, so it can close the dialog the field sits in;
 * - the clear button exists only while there is text; the submit button only with `submitButton`;
 * - uncontrolled (defaultValue) and controlled both work; md is the default size;
 * - words from UixLabelsProvider `searchBar`, an explicit `labels` wins.
 *
 * tests/a11y/search-bar.spec.mjs measures the field in Chromium. Renders the BUILT dist — run
 * `npm run build` first; CI does.
 */
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

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const key = (target, name) => {
  const event = new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  act(() => { target.dispatchEvent(event); });
  return event;
};
const type = (input, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, text);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const click = (el) => act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })); });

test('a search landmark and a searchbox named by the label; md by default', () => {
  const { host, unmount } = mount(h(ui.SearchBar, { label: 'Dienste durchsuchen', placeholder: 'Was brauchen Sie?' }));
  const root = host.firstElementChild;
  const input = host.querySelector('input');
  assert.equal(root.getAttribute('role'), 'search');
  assert.equal(document.getElementById(root.getAttribute('aria-labelledby')).textContent, 'Dienste durchsuchen');
  assert.equal(input.type, 'search');
  assert.equal(document.querySelector(`label[for="${input.id}"]`).textContent, 'Dienste durchsuchen');
  assert.ok(document.querySelector(`label[for="${input.id}"]`).classList.contains('uix-visually-hidden'));
  assert.equal(root.className, 'uix-searchbar uix-searchbar--md');
  assert.equal(input.placeholder, 'Was brauchen Sie?');
  assert.equal(host.querySelector('.uix-searchbar__clear'), null, 'no clear button while empty');
  assert.equal(host.querySelector('.uix-btn'), null, 'no submit button unless asked');
  unmount();
});

test('uncontrolled: type, Enter submits, Escape clears and keeps focus, the clear button too', () => {
  const submits = [];
  let clears = 0;
  const { host, unmount } = mount(h(ui.SearchBar, { label: 'Search', onSubmit: (v) => submits.push(v), onClear: () => { clears += 1; } }));
  const input = host.querySelector('input');
  act(() => input.focus());
  type(input, 'Drucker');
  assert.ok(host.querySelector('.uix-searchbar__clear'));
  assert.equal(key(input, 'Enter').defaultPrevented, true, 'Enter never submits a surrounding form');
  assert.deepEqual(submits, ['Drucker']);
  assert.equal(key(input, 'Escape').defaultPrevented, true);
  assert.equal(input.value, '');
  assert.equal(document.activeElement, input);
  assert.equal(key(input, 'Escape').defaultPrevented, false, 'an empty field lets Escape through');
  type(input, 'VPN');
  click(host.querySelector('.uix-searchbar__clear'));
  assert.equal(input.value, '');
  assert.equal(document.activeElement, input);
  assert.equal(clears, 2);
  unmount();
});

test('controlled: value and onValueChange; the submit button searches; lg', () => {
  const seen = [];
  function Controlled() {
    const [value, setValue] = useState('Laptop');
    return h(ui.SearchBar, { label: 'Search', size: 'lg', submitButton: true, value, onValueChange: setValue, onSubmit: (v) => seen.push(v) });
  }
  const { host, unmount } = mount(h(Controlled));
  const input = host.querySelector('input');
  assert.equal(input.value, 'Laptop');
  assert.equal(host.firstElementChild.className, 'uix-searchbar');
  type(input, 'Laptop Dock');
  const button = host.querySelector('.uix-btn');
  assert.equal(button.textContent, 'Search');
  assert.ok(button.classList.contains('uix-btn--lg'));
  click(button);
  assert.deepEqual(seen, ['Laptop Dock']);
  unmount();
});

test('Enter inside a form does not submit the form', () => {
  let formSubmits = 0;
  const { host, unmount } = mount(h('form', { onSubmit: (e) => { e.preventDefault(); formSubmits += 1; } },
    h(ui.SearchBar, { label: 'Search', defaultValue: 'x' }), h('button', { type: 'submit' }, 'Save')));
  assert.equal(key(host.querySelector('input'), 'Enter').defaultPrevented, true);
  assert.equal(formSubmits, 0);
  unmount();
});

test('an IME Enter (Safari: keyCode 229 after compositionend) neither submits nor clears', () => {
  const submits = [];
  const { host, unmount } = mount(h(ui.SearchBar, { label: 'Search', defaultValue: 'にほん', onSubmit: (v) => submits.push(v) }));
  const input = host.querySelector('input');
  const ime = new window.KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true });
  act(() => { input.dispatchEvent(ime); });
  assert.deepEqual(submits, []);
  assert.equal(ime.defaultPrevented, false);
  unmount();
});

test('landmark={false}, inputDescribedBy, submitVariant; a callback inputRef is attached once', () => {
  const calls = [];
  const ref = (node) => calls.push(node ? 'node' : 'null');
  function Field() {
    const [value, setValue] = useState('');
    return h(ui.SearchBar, { label: 'Filter rows', landmark: false, inputDescribedBy: 'count', submitButton: true, submitVariant: 'outline', inputRef: ref, value, onValueChange: setValue });
  }
  const { host, unmount } = mount(h(Field));
  const root = host.firstElementChild;
  assert.equal(root.hasAttribute('role'), false);
  assert.equal(root.hasAttribute('aria-labelledby'), false);
  assert.equal(host.querySelector('input').getAttribute('aria-describedby'), 'count');
  assert.ok(host.querySelector('.uix-btn').classList.contains('uix-btn--outline'));
  type(host.querySelector('input'), 'a');
  type(host.querySelector('input'), 'ab');
  assert.deepEqual(calls, ['node'], 'no detach and reattach per keystroke');
  unmount();
});

test('controlled to uncontrolled keeps the last text', () => {
  function Switch() {
    const [value, setValue] = useState('');
    const [controlled, setControlled] = useState(true);
    globalThis.__release = () => setControlled(false);
    return h(ui.SearchBar, { label: 'Search', defaultValue: 'initial', value: controlled ? value : undefined, onValueChange: setValue });
  }
  const { host, unmount } = mount(h(Switch));
  type(host.querySelector('input'), 'typed');
  act(() => globalThis.__release());
  assert.equal(host.querySelector('input').value, 'typed');
  delete globalThis.__release;
  unmount();
});

test('words: UixLabelsProvider searchBar, an explicit labels prop wins; disabled shows no clear', () => {
  const tree = h(ui.UixLabelsProvider, { labels: { searchBar: { clear: 'Suche leeren', submit: 'Suchen' } } },
    h(ui.SearchBar, { label: 'Suche', submitButton: true, defaultValue: 'a', labels: { submit: 'Los' } }));
  const { host, unmount } = mount(tree);
  assert.equal(host.querySelector('.uix-searchbar__clear').getAttribute('aria-label'), 'Suche leeren');
  assert.equal(host.querySelector('.uix-btn').textContent, 'Los');
  unmount();
  const off = mount(h(ui.SearchBar, { label: 'Suche', defaultValue: 'a', disabled: true }));
  assert.equal(off.host.querySelector('.uix-searchbar__clear'), null);
  assert.equal(off.host.querySelector('input').disabled, true);
  off.unmount();
});
