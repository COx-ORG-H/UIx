/* TagInput (HAR-1377) in jsdom: Enter / comma / paste add; duplicates, validate and maxTags refuse
 * with a reason and keep the text; chips remove by click, Backspace and Delete; the keyboard moves
 * between the field and the chips; suggestions; Field wiring, hidden form values, provider words.
 * Placement of the suggestions and focus in a browser: tests/a11y/form-fields.spec.mjs.
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

function mount(props = {}, wrap = (el) => el) {
  const changes = [];
  function Harness() {
    const [value, setValue] = useState(props.value ?? ['network']);
    return wrap(h(ui.TagInput, { 'aria-label': 'Labels', ...props, value, onValueChange: (v) => { changes.push(v); setValue(v); } }));
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(Harness)));
  const input = () => host.querySelector('input.uix-taginput__field');
  return {
    host, changes, input,
    chips: () => [...host.querySelectorAll('.uix-tag')].map((c) => c.textContent),
    removes: () => [...host.querySelectorAll('.uix-tag__remove')],
    message: () => host.querySelector('.uix-taginput__message')?.textContent ?? null,
    live: () => host.querySelector('[aria-live="polite"]').textContent,
    key: (el, k) => { let ok = true; act(() => { ok = el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }); return ok; },
    type: (text) => act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input(), text);
      input().dispatchEvent(new window.Event('input', { bubbles: true }));
    }),
    unmount: () => { act(() => root.unmount()); host.remove(); },
  };
}

test('Enter and comma add a trimmed tag; the field empties; the change is announced', () => {
  const v = mount();
  v.type('  access ');
  assert.equal(v.key(v.input(), 'Enter'), false);
  assert.deepEqual(v.chips(), ['network', 'access']);
  assert.equal(v.input().value, '');
  assert.equal(v.live(), 'access added.');
  v.type('email,');
  assert.deepEqual(v.chips(), ['network', 'access', 'email']);
  assert.equal(v.input().value, '');
  assert.equal(v.key(v.input(), 'Enter'), true, 'Enter in an empty field is left to the form');
  v.unmount();
});

test('a duplicate (any case or accent), a validate refusal and maxTags keep the text and say why', () => {
  const v = mount({ maxTags: 2, validate: (tag) => (tag.length > 12 ? 'Use at most 12 characters.' : null) });
  v.type('NETWORK');
  v.key(v.input(), 'Enter');
  assert.equal(v.message(), 'NETWORK is already added.');
  assert.equal(v.input().value, 'NETWORK');
  assert.equal(v.input().getAttribute('aria-invalid'), 'true');
  assert.ok(v.input().getAttribute('aria-describedby').includes(v.host.querySelector('.uix-taginput__message').id));
  v.type('a-very-long-label');
  v.key(v.input(), 'Enter');
  assert.equal(v.message(), 'Use at most 12 characters.');
  v.type('hardware');
  v.key(v.input(), 'Enter');
  assert.deepEqual(v.chips(), ['network', 'hardware']);
  assert.equal(v.message(), null, 'an accepted tag clears the reason');
  v.type('more');
  v.key(v.input(), 'Enter');
  assert.equal(v.message(), 'You can add up to 2.');
  assert.deepEqual(v.changes.length, 1);
  v.unmount();
});

test('paste "a, b; c" adds three; the typed text joins the first', () => {
  const v = mount({ value: [] });
  v.type('x');
  act(() => {
    const event = new window.Event('paste', { bubbles: true, cancelable: true });
    event.clipboardData = { getData: () => 'ray, beta;gamma' };
    v.input().dispatchEvent(event);
  });
  assert.deepEqual(v.chips(), ['xray', 'beta', 'gamma']);
  assert.equal(v.input().value, '');
  v.unmount();
});

test('keyboard: Backspace in the empty field reaches the last chip; arrows move; Backspace/Delete remove; focus stays', () => {
  const v = mount({ value: ['one', 'two', 'three'] });
  act(() => v.input().focus());
  v.key(v.input(), 'Backspace');
  assert.equal(document.activeElement, v.removes()[2]);
  assert.equal(document.activeElement.getAttribute('aria-label'), 'Remove three');
  v.key(document.activeElement, 'ArrowLeft');
  assert.equal(document.activeElement, v.removes()[1]);
  v.key(document.activeElement, 'Delete');
  assert.deepEqual(v.chips(), ['one', 'three']);
  assert.equal(document.activeElement, v.removes()[0], 'focus moves to the chip before');
  assert.equal(v.live(), 'two removed.');
  v.key(document.activeElement, 'ArrowRight');
  assert.equal(document.activeElement, v.removes()[1]);
  v.key(document.activeElement, 'ArrowRight');
  assert.equal(document.activeElement, v.input(), 'past the last chip: the field');
  act(() => v.removes()[0].focus());
  v.key(document.activeElement, 'Backspace');
  assert.deepEqual(v.chips(), ['three']);
  assert.equal(document.activeElement, v.input(), 'the first chip removed: the field');
  for (const button of v.removes()) assert.equal(button.tabIndex, -1, 'one tab stop: the field');
  act(() => v.removes()[0].click());
  assert.deepEqual(v.chips(), []);
  v.unmount();
});

test('suggestions: a listbox without the added ones; ArrowDown + Enter adds the active one', () => {
  const v = mount({ value: ['network'], suggestions: ['Network', 'Hardware', 'Access', 'Email'] });
  act(() => v.input().focus());
  v.type('a');
  const list = v.host.querySelector('[role="listbox"]');
  assert.equal(list.getAttribute('aria-label'), 'Suggestions');
  assert.deepEqual([...list.querySelectorAll('[role="option"]')].map((o) => o.textContent), ['Hardware', 'Access', 'Email']);
  assert.equal(v.input().getAttribute('role'), 'combobox');
  assert.equal(v.input().getAttribute('aria-expanded'), 'true');
  v.key(v.input(), 'ArrowDown');
  v.key(v.input(), 'ArrowDown');
  assert.equal(document.getElementById(v.input().getAttribute('aria-activedescendant')).textContent, 'Access');
  v.key(v.input(), 'Enter');
  assert.deepEqual(v.chips(), ['network', 'Access']);
  v.key(v.input(), 'Escape');
  assert.equal(v.input().getAttribute('aria-expanded'), 'false');
  v.unmount();
});

test('Field names the input; name submits each tag; provider words; disabled has no × and no typing', () => {
  const v = mount({ name: 'labels', 'aria-label': undefined }, (el) => h(ui.UixLabelsProvider, { labels: { tagInput: { remove: '{tag} entfernen' } } },
    h(ui.Field, { label: 'Labels', hint: 'Enter adds a label.' }, el)));
  assert.equal(v.host.querySelector('label').htmlFor, v.input().id);
  assert.match(document.getElementById(v.input().getAttribute('aria-describedby')).textContent, /Enter adds a label/);
  assert.deepEqual([...v.host.querySelectorAll('input[type="hidden"][name="labels"]')].map((i) => i.value), ['network']);
  assert.equal(v.removes()[0].getAttribute('aria-label'), 'network entfernen');
  v.unmount();
  const off = mount({ disabled: true });
  assert.equal(off.input().disabled, true);
  assert.equal(off.removes().length, 0);
  off.unmount();
});
