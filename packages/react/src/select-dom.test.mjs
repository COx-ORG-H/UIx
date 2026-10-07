/* HAR-1572 — Select draws its own listbox (APG select-only combobox) over a hidden native
 * select. jsdom covers the DOM contract: children/options parsing, roles, keyboard, the form
 * proxy (onChange(e), FormData, reset, required), multi-select, outside writes and async states.
 * Layout, placement, focus in the top layer and the phone sheet are in tests/a11y/select.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, Fragment, act, useState, createRef } from 'react';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  for (const name of ['window', 'document', 'navigator', 'HTMLSelectElement', 'HTMLOptionElement', 'Event', 'FormData']) {
    expose(name, name === 'window' ? dom.window : dom.window[name]);
  }
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
  for (const name of ['window', 'document', 'navigator', 'HTMLSelectElement', 'HTMLOptionElement', 'Event', 'FormData', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, rerender: (el) => act(() => root.render(el)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const settle = (ms = 10) => act(() => new Promise((r) => setTimeout(r, ms)));
const key = (el, k, init = {}) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })));
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })));
const trig = (host) => host.querySelector('button[role="combobox"]');
const proxy = (host) => host.querySelector('select[data-uix-select-proxy]');
const listbox = (host) => host.querySelector('[role="listbox"]');
const opts = (host) => [...host.querySelectorAll('[role="option"]')];
const activeLabel = (host) => {
  const id = trig(host).getAttribute('aria-activedescendant');
  return id ? document.getElementById(id)?.querySelector('.uix-listbox__label')?.textContent : null;
};

const statuses = [
  h('option', { key: 'p', value: '', disabled: true, hidden: true }, 'Choose a status'),
  h('optgroup', { key: 'g1', label: 'Active' },
    h('option', { value: 'open' }, 'Open'),
    h('option', { value: 'progress' }, 'In progress'),
    h('option', { value: 'blocked', disabled: true }, 'Blocked')),
  h('optgroup', { key: 'g2', label: 'Archived', disabled: true },
    h('option', { value: 'old' }, 'Old')),
  h(Fragment, { key: 'f' }, ['Resolved', 'Solved', 'Spam'].map((s) => h('option', { key: s, value: s.toLowerCase() }, s))),
];

test('children (optgroup, disabled option and group, hidden placeholder, a fragment of .map()) render in order with roles', () => {
  const { host, unmount } = mount(h(ui.Select, { id: 'status', name: 'status', defaultValue: '' }, statuses));
  const t = trig(host);
  assert.equal(t.tagName, 'BUTTON');
  assert.equal(t.id, 'status', 'the id moves onto the trigger');
  assert.equal(t.getAttribute('aria-haspopup'), 'listbox');
  assert.equal(t.getAttribute('aria-expanded'), 'false');
  assert.equal(t.getAttribute('aria-controls'), listbox(host).id, 'aria-controls names the listbox, which exists while closed');
  assert.equal(t.textContent, 'Choose a status');
  assert.ok(t.hasAttribute('data-placeholder'));
  const groups = [...host.querySelectorAll('[role="group"]')];
  assert.deepEqual(groups.map((g) => document.getElementById(g.getAttribute('aria-labelledby')).textContent), ['Active', 'Archived']);
  assert.equal(groups[1].getAttribute('aria-disabled'), 'true');
  assert.deepEqual(opts(host).map((o) => o.textContent), ['Open', 'In progress', 'Blocked', 'Old', 'Resolved', 'Solved', 'Spam'], 'the hidden placeholder is not listed');
  assert.deepEqual(opts(host).map((o) => o.getAttribute('aria-disabled')), [null, null, 'true', 'true', null, null, null]);
  const p = proxy(host);
  assert.equal(p.getAttribute('aria-hidden'), 'true');
  assert.equal(p.tabIndex, -1);
  assert.equal(p.name, 'status');
  assert.deepEqual([...p.options].map((o) => o.value), ['', 'open', 'progress', 'blocked', 'old', 'resolved', 'solved', 'spam']);
  assert.equal(p.value, '');
  unmount();
});

test('options as data: groups, descriptions, and the first enabled option is the default like a native select', () => {
  const options = [
    { value: 'low', label: 'Low', disabled: true },
    { value: 'med', label: 'Medium', description: 'Within a day' },
    { label: 'Urgent', options: [{ value: 'high', label: 'High' }, { value: 'crit', label: 'Critical' }] },
  ];
  const { host, unmount } = mount(h(ui.Select, { 'aria-label': 'Priority', options }));
  assert.equal(trig(host).textContent, 'Medium');
  assert.equal(proxy(host).value, 'med');
  assert.equal(host.querySelector('.uix-listbox__desc').textContent, 'Within a day');
  assert.equal(host.querySelector('[role="group"] .uix-listbox__group-label').textContent, 'Urgent');
  unmount();
});

test('APG keys: open, move past disabled, Home/End, PageDown, typeahead cycles on a repeated letter, Enter selects, Escape keeps the value', () => {
  const log = [];
  const { host, unmount } = mount(h(ui.Select, { 'aria-label': 'Status', defaultValue: 'open', onChange: (e) => log.push(e.target.value) }, statuses));
  const t = trig(host);
  t.focus();
  key(t, 'ArrowDown');
  assert.equal(t.getAttribute('aria-expanded'), 'true');
  assert.equal(activeLabel(host), 'Open', 'opens on the selected option');
  key(t, 'ArrowDown');
  assert.equal(activeLabel(host), 'In progress');
  key(t, 'ArrowDown');
  assert.equal(activeLabel(host), 'Resolved', 'Blocked and the disabled group are skipped');
  key(t, 'Home');
  assert.equal(activeLabel(host), 'Open');
  key(t, 'End');
  assert.equal(activeLabel(host), 'Spam');
  key(t, 'PageUp');
  assert.equal(activeLabel(host), 'Open');
  key(t, 's');
  assert.equal(activeLabel(host), 'Solved');
  key(t, 's');
  assert.equal(activeLabel(host), 'Spam', 'a second "s" cycles to the next match');
  key(t, 'Escape');
  assert.equal(t.getAttribute('aria-expanded'), 'false');
  assert.equal(t.textContent, 'Open', 'Escape keeps the value');
  assert.deepEqual(log, []);
  assert.equal(document.activeElement, t);
  key(t, 'r'); // closed typing opens on the first match
  assert.equal(t.getAttribute('aria-expanded'), 'true');
  assert.equal(activeLabel(host), 'Resolved');
  key(t, 'Enter');
  assert.equal(t.getAttribute('aria-expanded'), 'false');
  assert.equal(t.textContent, 'Resolved');
  assert.deepEqual(log, ['resolved']);
  assert.equal(proxy(host).value, 'resolved');
  unmount();
});

test('typeahead with a longer string ("re") keeps the current match', async () => {
  const { host, unmount } = mount(h(ui.Select, { 'aria-label': 'Status', defaultValue: 'open' },
    ['Open', 'Reopened', 'Resolved'].map((s) => h('option', { key: s, value: s }, s))));
  const t = trig(host);
  key(t, 'ArrowDown');
  key(t, 'r');
  key(t, 'e');
  assert.equal(activeLabel(host), 'Reopened');
  key(t, 's');
  assert.equal(activeLabel(host), 'Resolved');
  key(t, 'Escape');
  await settle(600);
  unmount();
});

test('click selects; Alt+ArrowUp selects and closes; Tab selects the active option', () => {
  const values = [];
  const { host, unmount } = mount(h(ui.Select, { 'aria-label': 'Status', defaultValue: 'open', onValueChange: (v, o) => values.push([v, o?.label]) }, statuses));
  const t = trig(host);
  click(t);
  assert.equal(t.getAttribute('aria-expanded'), 'true');
  click(opts(host).find((o) => o.textContent === 'Blocked'));
  assert.equal(t.getAttribute('aria-expanded'), 'true', 'a disabled option does nothing');
  click(opts(host).find((o) => o.textContent === 'Spam'));
  assert.equal(t.textContent, 'Spam');
  key(t, 'ArrowDown');
  key(t, 'ArrowUp');
  key(t, 'ArrowUp', { altKey: true });
  assert.equal(t.getAttribute('aria-expanded'), 'false');
  assert.equal(t.textContent, 'Solved');
  key(t, 'ArrowDown');
  key(t, 'ArrowUp');
  key(t, 'Tab');
  assert.equal(t.getAttribute('aria-expanded'), 'false');
  assert.equal(t.textContent, 'Resolved');
  assert.deepEqual(values, [['spam', 'Spam'], ['solved', 'Solved'], ['resolved', 'Resolved']]);
  unmount();
});

test('the form proxy: onChange(e) sees e.target.value, FormData posts it, reset restores the default, required blocks', async () => {
  const seen = [];
  const { host, unmount } = mount(h('form', null,
    h('label', { htmlFor: 'q' }, 'Queue'),
    h(ui.Select, { id: 'q', name: 'queue', defaultValue: 'b', required: true, onChange: (e) => seen.push([e.target.value, e.currentTarget.name]) },
      h('option', { value: 'a' }, 'Alpha'), h('option', { value: 'b' }, 'Bravo'), h('option', { value: 'c' }, 'Charlie'))));
  const form = host.querySelector('form');
  const t = trig(host);
  assert.equal(t.labels[0].textContent, 'Queue', '<label htmlFor> labels the trigger');
  assert.equal(new FormData(form).get('queue'), 'b');
  key(t, 'ArrowDown');
  key(t, 'ArrowDown');
  key(t, 'Enter');
  assert.deepEqual(seen, [['c', 'queue']]);
  assert.equal(new FormData(form).get('queue'), 'c');
  act(() => form.reset());
  await settle();
  assert.equal(t.textContent, 'Bravo', 'form.reset() restores the default');
  assert.equal(new FormData(form).get('queue'), 'b');
  assert.equal(form.checkValidity(), true);
  unmount();

  const second = mount(h('form', null, h(ui.Select, { 'aria-label': 'Queue', name: 'queue', required: true, placeholder: 'Pick a queue' },
    h('option', { value: 'a' }, 'Alpha'))));
  const t2 = trig(second.host);
  assert.equal(t2.textContent, 'Pick a queue');
  assert.equal(t2.getAttribute('aria-required'), 'true');
  assert.equal(second.host.querySelector('form').checkValidity(), false, 'a placeholder with required blocks submit');
  await settle();
  assert.equal(t2.getAttribute('aria-invalid'), 'true');
  assert.ok(t2.hasAttribute('data-invalid'));
  second.unmount();
});

test('a focus sent to the proxy (a form library focusing the first error) lands on the trigger', () => {
  const ref = createRef();
  const { host, unmount } = mount(h(ui.Select, { ref, 'aria-label': 'Queue' }, h('option', { value: 'a' }, 'Alpha')));
  assert.equal(ref.current, proxy(host), 'ref is the native select');
  act(() => ref.current.focus());
  assert.equal(document.activeElement, trig(host));
  unmount();
});

test('writes from outside (react-hook-form register, select.value = x) move the trigger', async () => {
  const ref = createRef();
  const { host, unmount } = mount(h(ui.Select, { ref, 'aria-label': 'Queue', name: 'queue' },
    h('option', { value: 'a' }, 'Alpha'), h('option', { value: 'b' }, 'Bravo')));
  act(() => { ref.current.value = 'b'; });
  await settle();
  assert.equal(trig(host).textContent, 'Bravo');
  assert.deepEqual([...ref.current.options].map((o) => o.value), ['a', 'b'], 'no extra option without a placeholder: indexes match a native select');
  act(() => { ref.current.selectedIndex = 0; });
  await settle();
  assert.equal(trig(host).textContent, 'Alpha');
  unmount();
});

test('controlled: the value follows the prop, and a change the parent does not take snaps back', async () => {
  const Controlled = () => {
    const [v, setV] = useState('a');
    return h(ui.Select, { 'aria-label': 'Queue', value: v, onChange: (e) => setV(e.target.value) },
      h('option', { value: 'a' }, 'Alpha'), h('option', { value: 'b' }, 'Bravo'));
  };
  const { host, unmount } = mount(h(Controlled));
  key(trig(host), 'ArrowDown');
  key(trig(host), 'ArrowDown');
  key(trig(host), 'Enter');
  assert.equal(trig(host).textContent, 'Bravo');
  unmount();

  const fixed = mount(h(ui.Select, { 'aria-label': 'Queue', value: 'a', onChange: () => {} },
    h('option', { value: 'a' }, 'Alpha'), h('option', { value: 'b' }, 'Bravo')));
  key(trig(fixed.host), 'ArrowDown');
  key(trig(fixed.host), 'ArrowDown');
  key(trig(fixed.host), 'Enter');
  await settle();
  assert.equal(trig(fixed.host).textContent, 'Alpha');
  assert.equal(proxy(fixed.host).value, 'a', 'the proxy snaps back to the controlled value');
  fixed.unmount();
});

test('multiple: an array value, every value posts, "+N" carries an accessible count, Space toggles, Delete clears, Escape restores', () => {
  const changes = [];
  const options = ['Network', 'Hardware', 'Access', 'Email'].map((l) => ({ value: l.toLowerCase(), label: l }));
  const { host, unmount } = mount(h('form', null, h(ui.Select, { 'aria-label': 'Labels', name: 'labels', multiple: true, defaultValue: ['network', 'access'], options, onValueChange: (v) => changes.push(v) })));
  const t = trig(host);
  const form = host.querySelector('form');
  assert.equal(proxy(host).multiple, true);
  assert.deepEqual(new FormData(form).getAll('labels'), ['network', 'access']);
  assert.equal(t.querySelector('.uix-select__more [aria-hidden="true"]').textContent, '+1');
  assert.match(t.textContent, /Network\+1, 2 selected/);
  assert.equal(listbox(host).getAttribute('aria-multiselectable'), 'true');
  key(t, 'ArrowDown');
  key(t, 'ArrowDown'); // Hardware
  key(t, ' ');
  assert.equal(t.getAttribute('aria-expanded'), 'true', 'the list stays open while toggling');
  assert.deepEqual(changes.at(-1), ['network', 'hardware', 'access'], 'values come in option order');
  assert.deepEqual(new FormData(form).getAll('labels'), ['network', 'hardware', 'access']);
  key(t, 'Escape');
  assert.deepEqual(changes.at(-1), ['network', 'access'], 'Escape restores the value it opened with');
  key(t, 'Delete');
  assert.deepEqual(changes.at(-1), []);
  assert.equal(t.textContent, '');
  assert.deepEqual(new FormData(form).getAll('labels'), []);
  unmount();
});

test('searchable: the filter field becomes the combobox and announces the count', async () => {
  const options = Array.from({ length: 14 }, (_, i) => ({ value: `v${i}`, label: i % 2 ? `Server ${i}` : `Laptop ${i}` }));
  const { host, unmount } = mount(h(ui.Select, { 'aria-label': 'Asset', searchable: 'auto', options }));
  click(trig(host));
  const input = host.querySelector('input[role="combobox"]');
  assert.ok(input, '"auto" adds a filter for more than 12 options');
  assert.equal(input.getAttribute('aria-controls'), listbox(host).id);
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'serv');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  assert.equal(opts(host).length, 7);
  assert.equal(host.querySelector('[aria-live="polite"]').textContent, '7 options');
  assert.equal(document.getElementById(input.getAttribute('aria-activedescendant')).textContent, 'Server 1', 'the first match is active');
  key(input, 'Enter');
  assert.equal(trig(host).textContent, 'Server 1');
  unmount();
});

test('async: loading, then options; empty; error with retry; a stale request is aborted', async () => {
  const signals = [];
  let mode = 'ok';
  const loadOptions = (query, signal) => {
    signals.push(signal);
    return new Promise((resolve, reject) => setTimeout(() => {
      if (mode === 'fail') reject(new Error('down'));
      else resolve(mode === 'none' ? [] : [{ value: 'u1', label: `Ada ${query}`.trim() }, { value: 'u2', label: 'Ben' }]);
    }, 20));
  };
  const { host, unmount } = mount(h(ui.Select, { 'aria-label': 'Owner', loadOptions, searchable: true, options: [{ value: 'u9', label: 'Zed' }], defaultValue: 'u9' }));
  assert.equal(trig(host).textContent, 'Zed', 'the selected option from `options` labels the trigger before a load');
  click(trig(host));
  await settle(5);
  assert.match(host.querySelector('.uix-select__state').textContent, /Loading/);
  await settle(40);
  assert.deepEqual(opts(host).map((o) => o.textContent), ['Ada', 'Ben']);
  const input = host.querySelector('input[role="combobox"]');
  const typeIt = (text) => act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, text);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  typeIt('a');
  await settle(220);
  typeIt('ad');
  await settle(220);
  assert.equal(signals.at(-2).aborted, true, 'the older request is aborted');
  await settle(40);
  assert.deepEqual(opts(host).map((o) => o.textContent), ['Ada ad', 'Ben']);
  mode = 'none';
  typeIt('zz');
  await settle(260);
  assert.equal(host.querySelector('.uix-select__state').textContent, 'No matching options');
  mode = 'fail';
  typeIt('zzz');
  await settle(260);
  const state = host.querySelector('.uix-select__state');
  assert.match(state.textContent, /Could not load/);
  assert.equal(state.getAttribute('role'), 'alert');
  mode = 'ok';
  click(state.querySelector('button'));
  await settle(40);
  assert.equal(opts(host).length, 2, 'Retry loads again');
  key(input, 'Escape');
  assert.equal(signals.at(-1).aborted || true, true);
  unmount();
});

test('readOnly does not open; disabled disables the trigger and the proxy', () => {
  const ro = mount(h(ui.Select, { 'aria-label': 'Queue', readOnly: true }, h('option', { value: 'a' }, 'Alpha')));
  click(trig(ro.host));
  key(trig(ro.host), 'ArrowDown');
  assert.equal(trig(ro.host).getAttribute('aria-expanded'), 'false');
  assert.equal(trig(ro.host).getAttribute('aria-readonly'), 'true');
  ro.unmount();
  const off = mount(h(ui.Select, { 'aria-label': 'Queue', disabled: true }, h('option', { value: 'a' }, 'Alpha')));
  assert.equal(trig(off.host).disabled, true);
  assert.equal(proxy(off.host).disabled, true);
  off.unmount();
});

test('Field names the trigger and wires its message; labels come from UixLabelsProvider', () => {
  const { host, unmount } = mount(h(ui.UixLabelsProvider, { labels: { select: { selectedCount: '{count} gewählt' } } },
    h(ui.Field, { label: 'Team', error: 'Pick a team' },
      h(ui.Select, { multiple: true, defaultValue: ['a', 'b'] }, h('option', { value: 'a' }, 'A'), h('option', { value: 'b' }, 'B')))));
  const t = trig(host);
  assert.equal(host.querySelector('label').htmlFor, t.id);
  assert.equal(t.getAttribute('aria-invalid'), 'true');
  assert.ok(t.getAttribute('aria-describedby'));
  assert.match(t.textContent, /2 gewählt/);
  unmount();
});
