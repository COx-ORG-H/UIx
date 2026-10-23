/* TimePicker (HAR-1835) in jsdom: the locale's clock, typed times, the arrow keys, the list of
 * times, min / max, the hidden form value, Field wiring and the provider's words.
 * The list's placement and focus in a browser: tests/a11y/form-fields.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const OPEN = 'data-test-popover-open';
const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IntersectionObserver', 'HTMLInputElement', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  expose('window', window);
  expose('document', window.document);
  expose('navigator', window.navigator);
  expose('getComputedStyle', window.getComputedStyle.bind(window));
  expose('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('HTMLInputElement', window.HTMLInputElement);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const el = window.HTMLElement.prototype;
  const toggle = (target, newState) => { const event = new window.Event('toggle'); event.newState = newState; target.dispatchEvent(event); };
  el.showPopover = function showPopover() { if (this.hasAttribute(OPEN)) return; this.setAttribute(OPEN, ''); toggle(this, 'open'); };
  el.hidePopover = function hidePopover() { if (!this.hasAttribute(OPEN)) return; this.removeAttribute(OPEN); toggle(this, 'closed'); };
  const matches = window.Element.prototype.matches;
  window.Element.prototype.matches = function patched(selector) {
    return selector === ':popover-open' ? this.hasAttribute(OPEN) : matches.call(this, selector);
  };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const render = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => {
  el.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
});
const key = (el, k, init = {}) => {
  let notPrevented = true;
  act(() => { notPrevented = el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })); });
  return notPrevented;
};
const type = (input, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, text);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const blur = (input) => act(() => { input.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })); });
const caret = (input, at) => input.setSelectionRange(at, at);

function mountTime(props = {}, wrap = (el) => el) {
  const changes = [];
  const problems = [];
  function Harness() {
    const [value, setValue] = useState(props.value ?? null);
    return wrap(h(ui.TimePicker, {
      locale: 'de', 'aria-label': 'Start', ...props, value,
      onValueChange: (next) => { changes.push(next); setValue(next); },
      onInputProblem: (p) => problems.push(p),
    }));
  }
  const view = render(h(Harness));
  const { host } = view;
  return {
    ...view, changes, problems,
    input: () => host.querySelector('input.uix-time-picker__input'),
    toggle: () => host.querySelector('.uix-date-picker__toggle'),
    popover: () => host.querySelector('.uix-time-picker__popover'),
    list: () => host.querySelector('[role="listbox"]'),
    error: () => host.querySelector('.uix-date-picker__error'),
  };
}

test('the field shows the locale clock: 24 h in German, 12 h in en-US, hour12 overrides', () => {
  const de = mountTime({ value: '14:30' });
  assert.equal(de.input().value, '14:30');
  assert.equal(de.input().type, 'text');
  assert.equal(de.toggle().getAttribute('aria-label'), 'Change time, 14:30');
  assert.equal(de.toggle().getAttribute('aria-haspopup'), 'dialog');
  de.unmount();
  const us = mountTime({ value: '14:30', locale: 'en-US' });
  assert.match(us.input().value, /^2:30\sPM$/);
  us.unmount();
  const forced = mountTime({ value: '14:30', locale: 'en-US', hour12: false });
  assert.equal(forced.input().value, '14:30');
  forced.unmount();
  assert.doesNotMatch(renderToStaticMarkup(h(ui.TimePicker, { value: '09:05', onValueChange() {}, locale: 'de', 'aria-label': 'x' })), /type="time"/);
});

test('typed text is read on blur and on Enter; a bad one says why and keeps the value', () => {
  const v = mountTime({ value: '09:00' });
  type(v.input(), '1430');
  assert.deepEqual(v.changes, [], 'nothing until the text is read');
  blur(v.input());
  assert.deepEqual(v.changes, ['14:30']);
  assert.equal(v.input().value, '14:30');
  type(v.input(), '7.5');
  assert.equal(key(v.input(), 'Enter'), false, 'Enter on a changed draft is the field’s');
  assert.equal(v.error().textContent, 'Enter a time like 14:30.');
  assert.equal(v.input().getAttribute('aria-invalid'), 'true');
  assert.ok(v.input().getAttribute('aria-describedby').includes(v.error().id));
  assert.deepEqual(v.problems, ['format']);
  assert.deepEqual(v.changes, ['14:30']);
  type(v.input(), '');
  blur(v.input());
  assert.equal(v.changes.at(-1), null, 'an emptied field clears the value');
  assert.equal(v.error(), null);
  assert.equal(key(v.input(), 'Enter'), true, 'an unchanged field leaves Enter to the form');
  v.unmount();
});

test('arrows step the part under the caret: hours by 1, minutes by minuteStep; PageUp the hour', () => {
  const v = mountTime({ value: '09:07', minuteStep: 15 });
  caret(v.input(), 5);
  key(v.input(), 'ArrowUp');
  assert.equal(v.changes.at(-1), '09:15', 'snaps to the next step');
  caret(v.input(), 5);
  key(v.input(), 'ArrowDown');
  key(v.input(), 'ArrowDown');
  assert.equal(v.changes.at(-1), '08:45');
  caret(v.input(), 1);
  key(v.input(), 'ArrowUp');
  assert.equal(v.changes.at(-1), '09:45', 'the caret on the hour steps the hour');
  key(v.input(), 'PageDown');
  assert.equal(v.changes.at(-1), '08:45');
  v.unmount();

  const bounded = mountTime({ value: null, min: '08:00', max: '17:00' });
  key(bounded.input(), 'ArrowUp');
  assert.equal(bounded.changes.at(-1), '08:00', 'an empty field starts at min');
  key(bounded.input(), 'PageDown');
  assert.equal(bounded.changes.length, 1, 'already at min: no change');
  bounded.unmount();
});

test('a locale with the day period first (ko): the caret on the hour steps the hour', () => {
  const v = mountTime({ value: '14:30', locale: 'ko', hour12: true });
  const text = v.input().value;
  caret(v.input(), text.indexOf('2') + 1);
  key(v.input(), 'ArrowUp');
  assert.equal(v.changes.at(-1), '15:30', 'the hour, though the text starts with the day period');
  caret(v.input(), v.input().value.length);
  key(v.input(), 'ArrowUp');
  assert.equal(v.changes.at(-1), '15:45');
  v.unmount();
});

test('min / max refuse a typed time outside them', () => {
  const v = mountTime({ value: '09:00', min: '08:00', max: '17:00' });
  type(v.input(), '18:30');
  blur(v.input());
  assert.deepEqual(v.changes, []);
  assert.equal(v.error().textContent, 'Choose 17:00 or earlier.');
  assert.deepEqual(v.problems, ['late']);
  type(v.input(), '7');
  blur(v.input());
  assert.equal(v.error().textContent, 'Choose 08:00 or later.');
  assert.deepEqual(v.problems, ['late', null, 'early'], 'editing the draft clears the problem first');
  v.unmount();
});

test('the list: Alt+ArrowDown or the clock opens it on the chosen time; arrows, Enter choose; focus returns', () => {
  const v = mountTime({ value: '10:00', minuteStep: 30, min: '08:00', max: '12:00' });
  assert.equal(v.list(), null, 'no list while closed');
  click(v.toggle());
  assert.equal(v.popover().hasAttribute(OPEN), true);
  assert.equal(v.popover().getAttribute('aria-label'), 'Times');
  const list = v.list();
  assert.deepEqual([...list.querySelectorAll('[role="option"]')].map((o) => o.textContent), ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00']);
  assert.equal(document.activeElement, list, 'focus moves into the list');
  const active = () => document.getElementById(list.getAttribute('aria-activedescendant')).textContent;
  assert.equal(active(), '10:00');
  assert.equal(list.querySelector('[aria-selected="true"]').textContent, '10:00');
  key(list, 'ArrowDown');
  key(list, 'ArrowDown');
  assert.equal(active(), '11:00');
  key(list, 'End');
  assert.equal(active(), '12:00');
  key(list, 'PageUp');
  assert.equal(active(), '11:00');
  key(list, 'Enter');
  assert.deepEqual(v.changes, ['11:00']);
  assert.equal(v.popover().hasAttribute(OPEN), false);
  assert.equal(document.activeElement, v.input());
  key(v.input(), 'ArrowDown', { altKey: true });
  assert.equal(v.popover().hasAttribute(OPEN), true);
  click(v.list().querySelectorAll('[role="option"]')[1]);
  assert.equal(v.changes.at(-1), '08:30');
  v.unmount();
});

test('Escape closes the list and does not reach a dialog around it', () => {
  const outer = [];
  const v = mountTime({ value: '10:00' }, (el) => h('div', { onKeyDown: (e) => { if (e.key === 'Escape') outer.push('Escape'); } }, el));
  click(v.toggle());
  key(v.list(), 'Escape');
  assert.equal(v.popover().hasAttribute(OPEN), false);
  assert.deepEqual(outer, []);
  assert.equal(document.activeElement, v.input());
  v.unmount();
});

test('Field names it; name submits HH:mm; provider words; disabled locks it', () => {
  const v = mountTime({ value: '14:30', name: 'starts', 'aria-label': undefined },
    (el) => h(ui.UixLabelsProvider, { labels: { timePicker: { open: 'Uhrzeit wählen', openSelected: 'Uhrzeit ändern, {time}' } } },
      h(ui.Field, { label: 'Beginn', hint: 'Ortszeit', required: true }, el)));
  const label = v.host.querySelector('label');
  assert.equal(label.htmlFor, v.input().id);
  assert.equal(v.input().getAttribute('aria-required'), 'true');
  assert.match(document.getElementById(v.input().getAttribute('aria-describedby')).textContent, /Ortszeit/);
  assert.equal(v.host.querySelector('input[type="hidden"]').name, 'starts');
  assert.equal(v.host.querySelector('input[type="hidden"]').value, '14:30');
  assert.equal(v.toggle().getAttribute('aria-label'), 'Uhrzeit ändern, 14:30');
  v.unmount();
  const off = mountTime({ value: '14:30', disabled: true });
  assert.equal(off.input().disabled, true);
  assert.equal(off.toggle().disabled, true);
  key(off.input(), 'ArrowUp');
  assert.deepEqual(off.changes, []);
  off.unmount();
});
