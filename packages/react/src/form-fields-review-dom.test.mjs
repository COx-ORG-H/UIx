/* The independent review of PR #167 (form fields batch): each finding pinned by a test that fails
 * without its fix. Browser-only findings (the caret after the reveal toggle, the lg hit area, RTL
 * digits, the narrow OTP) are in tests/a11y/form-fields.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'MutationObserver', 'HTMLElement', 'HTMLInputElement', 'IS_REACT_ACT_ENVIRONMENT'];
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
  expose('MutationObserver', window.MutationObserver);
  expose('HTMLElement', window.HTMLElement);
  expose('HTMLInputElement', window.HTMLInputElement);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  window.HTMLElement.prototype.showPopover = function showPopover() {};
  window.HTMLElement.prototype.hidePopover = function hidePopover() {};
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
const type = (input, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, text);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const paste = (input, text) => act(() => {
  const event = new window.Event('paste', { bubbles: true, cancelable: true });
  event.clipboardData = { getData: () => text };
  input.dispatchEvent(event);
});
const key = (el, k, init = {}) => act(() => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })); });
const blur = (input) => act(() => { input.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })); });
const settle = (ms = 15) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

function Controlled({ component, initial, props, log }) {
  const [value, setValue] = useState(initial);
  return h(component, { ...props, value, onValueChange: (v) => { log.push(v); setValue(v); } });
}

/* ── S1 TagInput: what can be added is added; the refused piece and the rest stay in the field ── */
test('S1 TagInput: a paste fills up to maxTags and keeps the rest in the field with the reason', () => {
  const log = [];
  const v = render(h(Controlled, { component: ui.TagInput, initial: ['a'], props: { 'aria-label': 'Tags', maxTags: 3 }, log }));
  const input = v.host.querySelector('input');
  paste(input, 'b, c, d, e');
  assert.deepEqual([...v.host.querySelectorAll('.uix-tag')].map((t) => t.textContent), ['a', 'b', 'c']);
  assert.equal(input.value, 'd, e', 'the refused piece and the rest stay');
  assert.equal(v.host.querySelector('.uix-taginput__message').textContent, 'You can add up to 3.');
  v.unmount();
});

test('S1 TagInput: a duplicate in the middle of a paste stops there; the pieces before it are added', () => {
  const log = [];
  const v = render(h(Controlled, { component: ui.TagInput, initial: ['network'], props: { 'aria-label': 'Tags' }, log }));
  const input = v.host.querySelector('input');
  paste(input, 'x, Network, y');
  assert.deepEqual([...v.host.querySelectorAll('.uix-tag')].map((t) => t.textContent), ['network', 'x']);
  assert.equal(input.value, 'Network, y');
  assert.equal(v.host.querySelector('.uix-taginput__message').textContent, 'Network is already added.');
  v.unmount();
});

/* ── N11 TagInput: the chips are a named list; the count is part of the field's description ── */
test('N11 TagInput: the chips are a named list and the field says how many there are', () => {
  const v = render(h(Controlled, { component: ui.TagInput, initial: ['a', 'b'], props: { 'aria-label': 'Tags' }, log: [] }));
  const list = v.host.querySelector('[role="list"]');
  assert.equal(list.getAttribute('aria-label'), 'Tags');
  assert.equal(list.querySelectorAll('[role="listitem"]').length, 2);
  const input = v.host.querySelector('input');
  const described = input.getAttribute('aria-describedby').split(' ').map((id) => document.getElementById(id).textContent);
  assert.ok(described.includes('2 added'));
  v.unmount();
});

/* ── S3 EntityPicker: disabled mid-search is not busy ── */
test('S3 EntityPicker: disabling it while a search runs ends the busy state and the spinner', async () => {
  function Picker() {
    const [disabled, setDisabled] = useState(false);
    globalThis.__disable = () => setDisabled(true);
    return h(ui.EntityPicker, { label: 'Owner', value: null, onValueChange() {}, delay: 0, disabled, onSearch: () => new Promise(() => {}) });
  }
  const v = render(h(Picker));
  const input = v.host.querySelector('input');
  act(() => input.focus());
  type(input, 'ad');
  await settle(20);
  assert.equal(input.getAttribute('aria-busy'), 'true');
  act(() => globalThis.__disable());
  await settle(350);
  assert.equal(input.hasAttribute('aria-busy'), false, 'not busy once disabled');
  assert.equal(v.host.querySelector('.uix-search-suggest__spinner'), null);
  delete globalThis.__disable;
  v.unmount();
});

/* ── S4 / N2 OtpInput: paste inserts at the caret or replaces the whole selected code; junk changes nothing ── */
test('S4 OtpInput: paste inserts at the caret, replaces only a whole selected code, and ignores junk', () => {
  const log = [];
  const v = render(h(Controlled, { component: ui.OtpInput, initial: '12', props: { 'aria-label': 'Code' }, log }));
  const input = v.host.querySelector('input');
  act(() => input.focus());
  input.setSelectionRange(2, 2);
  paste(input, 'abc');
  assert.equal(input.value, '12', 'nothing usable: unchanged');
  paste(input, '34');
  assert.equal(input.value, '1234', 'inserted at the caret, not replacing');
  paste(input, '567890');
  assert.equal(input.value, '123456', 'capped at the length');
  input.setSelectionRange(0, 6);
  paste(input, '９８-７６ ５４');
  assert.equal(input.value, '987654', 'a whole selected code is replaced; full-width digits count');
  assert.equal(input.hasAttribute('maxlength'), false, 'N2: no maxLength to cut an autofilled "ABCD-EFGH"');
  assert.equal(input.getAttribute('dir'), 'ltr', 'S5: the digits run left to right');
  v.unmount();
});

/* ── S6 TimePicker: an IME's Enter and arrows are the composition's; full-width digits parse ── */
test('S6 TimePicker: Enter and arrows during an IME composition do nothing; "１４：３０" is read', () => {
  const log = [];
  const v = render(h(Controlled, { component: ui.TimePicker, initial: '09:00', props: { 'aria-label': 'Start', locale: 'ja' }, log }));
  const input = v.host.querySelector('input.uix-time-picker__input');
  type(input, '１４：３０');
  key(input, 'Enter', { isComposing: true });
  key(input, 'ArrowUp', { isComposing: true });
  assert.deepEqual(log, [], 'the composition keeps its keys');
  key(input, 'Enter');
  assert.deepEqual(log, ['14:30']);
  assert.equal(ui.parseTimeInput('１４：３０'), '14:30');
  v.unmount();
});

/* ── N4 TimePicker: no locale from a prop or provider: the server writes a neutral 14:30 ── */
test('N4 TimePicker: on the server, with no locale, the field and placeholder are a neutral 24-hour time', () => {
  const html = renderToStaticMarkup(h(ui.TimePicker, { value: '14:30', onValueChange() {}, 'aria-label': 'Start' }));
  assert.match(html, /value="14:30"/);
  assert.match(html, /placeholder="14:30"/);
});

/* ── N5 TimePicker: an overnight range wraps midnight ── */
test('N5 TimePicker: min after max is an overnight range — the list, the keys and the check wrap', () => {
  assert.equal(ui.isTimeOutOfRange('23:30', '22:00', '06:00'), false);
  assert.equal(ui.isTimeOutOfRange('03:00', '22:00', '06:00'), false);
  assert.equal(ui.isTimeOutOfRange('12:00', '22:00', '06:00'), true);
  assert.deepEqual(ui.timeSlots(120, '22:00', '06:00'), ['22:00', '00:00', '02:00', '04:00', '06:00']);
  assert.equal(ui.stepTime('23:30', 60, '22:00', '06:00'), '00:30');
  assert.equal(ui.stepTime('05:30', 60, '22:00', '06:00'), '06:00');
  assert.equal(ui.stepTime('22:30', -60, '22:00', '06:00'), '22:00');
  const log = [];
  const v = render(h(Controlled, { component: ui.TimePicker, initial: '23:00', props: { 'aria-label': 'Quiet hours', locale: 'de', min: '22:00', max: '06:00' }, log }));
  const input = v.host.querySelector('input.uix-time-picker__input');
  type(input, '0330');
  blur(input);
  assert.deepEqual(log, ['03:30'], 'after midnight, inside the range');
  type(input, '1200');
  blur(input);
  assert.equal(v.host.querySelector('.uix-date-picker__error').textContent, 'Choose a time from 22:00 to 06:00.');
  v.unmount();
});

/* ── N6 DateTimePicker: hour12 and the Field's description reach the time ── */
test('N6 DateTimePicker: hour12 and the Field hint reach the time part', () => {
  const v = render(h(ui.Field, { label: 'Starts', hint: 'Local time of the site' },
    h(ui.DateTimePicker, { value: '2026-11-22T14:30', onValueChange() {}, locale: 'de', hour12: true, timeZoneLabel: null })));
  const time = v.host.querySelector('input.uix-time-picker__input');
  assert.match(time.value, /^2:30/);
  const described = time.getAttribute('aria-describedby').split(' ').map((id) => document.getElementById(id)?.textContent ?? '');
  assert.ok(described.some((t) => t.includes('Local time of the site')));
  v.unmount();
});

/* ── N12 Combobox: the "no match" status is mounted empty, then filled ── */
test('N12 Combobox: the no-match status region exists empty and gets its words when nothing matches', () => {
  const v = render(h(ui.Combobox, { options: [{ value: 'a', label: 'Alpha' }], label: 'Pick', emptyLabel: 'Nothing matches' }));
  const status = v.host.querySelector('[role="status"]');
  assert.ok(status, 'mounted before anything is typed');
  assert.equal(status.textContent, '');
  const input = v.host.querySelector('input[role="combobox"]');
  act(() => input.focus());
  type(input, 'zzz');
  assert.equal(v.host.querySelector('[role="status"]'), status, 'the same element');
  assert.equal(status.textContent, 'Nothing matches');
  v.unmount();
});
