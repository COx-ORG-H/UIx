/* PasswordInput and OtpInput (HAR-1376), and InputGroup's trailingAction slot.
 * Geometry, focus and paste in a browser: tests/a11y/form-fields.spec.mjs.
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
  return { host, rerender: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};

/** Set an input's value the way React hears it (the native setter, then an input event). */
const type = (input, value) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});

test('InputGroup trailingAction: a real control inside the group, replacing the decorative icon', () => {
  const { host, unmount } = mount(h(ui.InputGroup, {
    trailingIcon: h('svg', { id: 'deco' }),
    trailingAction: h('button', { type: 'button', className: 'uix-input-group__action', 'aria-label': 'Clear' }),
  }, h(ui.Input, { 'aria-label': 'Query' })));
  const group = host.firstElementChild;
  assert.match(group.className, /uix-input-group--has-trailing/);
  assert.match(group.className, /uix-input-group--has-action/);
  const action = group.querySelector('.uix-input-group__action');
  assert.equal(action.getAttribute('aria-label'), 'Clear');
  assert.equal(action.closest('[aria-hidden]'), null, 'the action is not hidden from assistive tech');
  assert.equal(group.querySelector('#deco'), null);
  unmount();
});

test('PasswordInput: a password field and a pressed-state toggle; Field wiring lands on the input', () => {
  const { host, unmount } = mount(h(ui.Field, { label: 'Password', hint: 'At least 12 characters.', required: true },
    h(ui.PasswordInput, { name: 'pw', autoComplete: 'current-password', defaultValue: 'hunter2' })));
  const input = host.querySelector('input');
  const toggle = host.querySelector('button.uix-input-group__action');
  assert.equal(input.type, 'password');
  assert.equal(input.getAttribute('autocomplete'), 'current-password');
  assert.equal(host.querySelector('label').htmlFor, input.id);
  assert.ok(input.getAttribute('aria-describedby'));
  assert.equal(input.getAttribute('aria-required'), 'true');
  assert.equal(toggle.getAttribute('aria-label'), 'Show password');
  assert.equal(toggle.getAttribute('aria-pressed'), 'false');
  assert.equal(toggle.getAttribute('aria-controls'), input.id);
  act(() => toggle.click());
  assert.equal(input.type, 'text');
  assert.equal(input.value, 'hunter2');
  assert.equal(toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(toggle.getAttribute('aria-label'), 'Show password', 'the name does not flip with the state');
  act(() => toggle.click());
  assert.equal(input.type, 'password');
  unmount();
});

test('PasswordInput: provider words, a prop wins; controlled revealed; disabled disables the toggle', () => {
  const calls = [];
  const { host, unmount } = mount(h(ui.UixLabelsProvider, { labels: { passwordInput: { show: 'Passwort anzeigen' } } },
    h(ui.PasswordInput, { 'aria-label': 'a', revealed: true, onRevealedChange: (v) => calls.push(v) }),
    h(ui.PasswordInput, { 'aria-label': 'b', labels: { show: 'Prikaži lozinku' }, disabled: true })));
  const [first, second] = host.querySelectorAll('button');
  assert.equal(first.getAttribute('aria-label'), 'Passwort anzeigen');
  assert.equal(second.getAttribute('aria-label'), 'Prikaži lozinku');
  assert.equal(second.disabled, true);
  assert.equal(host.querySelector('input').type, 'text');
  act(() => first.click());
  assert.deepEqual(calls, [false]);
  assert.equal(host.querySelector('input').type, 'text', 'controlled: stays until the parent changes it');
  unmount();
});

test('PasswordInput: a submit hides a revealed password', () => {
  const { host, unmount } = mount(h('form', { onSubmit: (e) => e.preventDefault() }, h(ui.PasswordInput, { 'aria-label': 'pw', defaultRevealed: true })));
  const input = host.querySelector('input');
  assert.equal(input.type, 'text');
  act(() => { host.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); });
  assert.equal(input.type, 'password');
  unmount();
});

test('OtpInput: one input with the code attributes, cells hidden from assistive tech', () => {
  const { host, unmount } = mount(h(ui.OtpInput, { 'aria-label': 'Code', name: 'otp', groupSize: 3 }));
  const inputs = host.querySelectorAll('input');
  assert.equal(inputs.length, 1);
  const [input] = inputs;
  assert.equal(input.getAttribute('autocomplete'), 'one-time-code');
  assert.equal(input.getAttribute('inputmode'), 'numeric');
  assert.equal(input.getAttribute('pattern'), '[0-9]{6}');
  assert.equal(input.hasAttribute('maxlength'), false, 'no maxLength: autofill is cleaned, not cut');
  assert.equal(input.name, 'otp');
  const cells = host.querySelectorAll('.uix-otp__cell');
  assert.equal(cells.length, 6);
  for (const cell of cells) assert.equal(cell.getAttribute('aria-hidden'), 'true');
  assert.equal(host.querySelectorAll('.uix-otp__sep').length, 1);
  unmount();
});

test('OtpInput: cleans what is typed, fills cells, completes once per code', () => {
  const log = { values: [], done: [] };
  function Harness() {
    const [value, setValue] = useState('');
    return h(ui.OtpInput, { 'aria-label': 'Code', value, onValueChange: (v) => { log.values.push(v); setValue(v); }, onComplete: (c) => log.done.push(c) });
  }
  const { host, unmount } = mount(h(Harness));
  const input = host.querySelector('input');
  type(input, '12a 3');
  assert.equal(input.value, '123');
  assert.deepEqual([...host.querySelectorAll('.uix-otp__cell')].map((c) => c.textContent), ['1', '2', '3', '', '', '']);
  type(input, '123456');
  assert.deepEqual(log.done, ['123456']);
  type(input, '1234567');
  assert.equal(input.value, '123456');
  assert.deepEqual(log.done, ['123456'], 'the same complete code does not complete twice');
  type(input, '12345');
  type(input, '123450');
  assert.deepEqual(log.done, ['123456', '123450']);
  unmount();
});

test('OtpInput: a selection of the whole code stays (so it can be typed over); a partial one collapses', () => {
  const { host, unmount } = mount(h(ui.OtpInput, { 'aria-label': 'Code', defaultValue: '123456' }));
  const input = host.querySelector('input');
  act(() => input.focus());
  input.setSelectionRange(0, 6);
  act(() => { document.dispatchEvent(new window.Event('selectionchange')); });
  assert.deepEqual([input.selectionStart, input.selectionEnd], [0, 6]);
  input.setSelectionRange(2, 4);
  act(() => { document.dispatchEvent(new window.Event('selectionchange')); });
  assert.deepEqual([input.selectionStart, input.selectionEnd], [6, 6]);
  unmount();
});

test('OtpInput: alphanumeric upper-cases; invalid reaches the input; Field names it', () => {
  const { host, unmount } = mount(h(ui.Field, { label: 'Recovery code', error: 'Wrong code.' },
    h(ui.OtpInput, { mode: 'alphanumeric', length: 8, defaultValue: 'ab-12' })));
  const input = host.querySelector('input');
  assert.equal(input.value, 'AB12');
  assert.equal(input.getAttribute('pattern'), '[0-9A-Za-z]{8}');
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(host.querySelector('label').htmlFor, input.id);
  assert.equal(host.querySelectorAll('.uix-otp__cell').length, 8);
  unmount();
});
