/* HAR-2631 · 2 (MOTUS HAR-1441) — an enum filter that excludes: `operator: 'is-none-of'` on the enum
 * FilterValue, `FilterField.enumOperators`, the editor's condition control, the chip summary and the
 * table-engine mapping to `isNoneOf`; without `enumOperators` the editor is 2.50.0's.
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
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const type = (el, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, text);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const settle = (ms = 10) => act(() => new Promise((r) => setTimeout(r, ms)));

/** Controlled harness that records every value the editor emits. */
const Harness = ({ field, initial, log }) => {
  const [value, setValue] = useState(initial);
  return h(ui.FilterEditor, { field, value, searchDelay: 0, onValueChange: (v) => { log.push(v); setValue(v); }, onApply: () => log.push('apply'), onClear: () => log.push('clear') });
};

const state = { id: 'state', label: 'State', kind: 'enum', options: [{ value: 'open', label: 'Open' }, { value: 'pending', label: 'Pending' }, { value: 'closed', label: 'Closed' }] };

const status = { ...state, enumOperators: ['is-any-of', 'is-none-of'] };

test('HAR-2631 without enumOperators the enum editor has no condition control and emits no operator (2.50.0)', () => {
  const log = [];
  const t = mount(h(Harness, { field: state, initial: undefined, log }));
  assert.equal(t.host.querySelector('select'), null);
  click(t.host.querySelector('.uix-checkbox input'));
  assert.deepEqual(log.at(-1), { kind: 'enum', values: ['open'] });
  t.unmount();
});

test('HAR-2631 with both enumOperators the editor offers "is any of / is none of"; the condition stays as values change', () => {
  const log = [];
  const t = mount(h(Harness, { field: status, initial: { kind: 'enum', values: ['closed'] }, log }));
  const select = t.host.querySelector('select');
  assert.deepEqual([...select.options].map((o) => [o.value, o.textContent]), [['is-any-of', 'is any of'], ['is-none-of', 'is none of']]);
  assert.equal(select.value, 'is-any-of', 'absent means is any of');
  act(() => { select.value = 'is-none-of'; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
  assert.deepEqual(log.at(-1), { kind: 'enum', values: ['closed'], operator: 'is-none-of' });
  click(t.host.querySelector('.uix-checkbox input'));
  assert.deepEqual(log.at(-1), { kind: 'enum', values: ['closed', 'open'], operator: 'is-none-of' }, 'a value added keeps the condition');
  const back = t.host.querySelector('select');
  act(() => { back.value = 'is-any-of'; back.dispatchEvent(new window.Event('change', { bubbles: true })); });
  assert.deepEqual(log.at(-1), { kind: 'enum', values: ['closed', 'open'] }, 'is any of is the absent operator again');
  t.unmount();
  // the words through UixLabelsProvider
  const de = mount(h(ui.UixLabelsProvider, { labels: { filterEditor: { enumOperators: { 'is-none-of': 'ist keiner von' } } } }, h(Harness, { field: status, initial: undefined, log: [] })));
  assert.deepEqual([...de.host.querySelector('select').options].map((o) => o.textContent), ['is any of', 'ist keiner von']);
  de.unmount();
});

test('HAR-2631 the chip says "not …" for an excluding value; a preset never matches one', () => {
  const s = ui.summarizeFilter;
  assert.equal(s(status, { kind: 'enum', values: ['open', 'closed'], operator: 'is-none-of' }), 'State: not Open, Closed');
  assert.equal(s(status, { kind: 'enum', values: ['open', 'closed'] }), 'State: Open, Closed', 'unchanged without the operator');
  assert.equal(s(status, { kind: 'enum', values: ['open'], operator: 'is-none-of' }, { labels: { noneOf: 'nicht {values}' } }), 'State: nicht Open');
  const withPreset = { ...status, presets: [{ id: 'open-work', label: 'Open work', values: ['open', 'pending'] }] };
  assert.equal(s(withPreset, { kind: 'enum', values: ['open', 'pending'] }), 'Open work');
  assert.equal(s(withPreset, { kind: 'enum', values: ['open', 'pending'], operator: 'is-none-of' }), 'State: not Open, Pending');
  assert.equal(ui.isFilterEmpty({ kind: 'enum', values: [], operator: 'is-none-of' }), true);
});

test('HAR-2631 the table engine filters an excluding value with isNoneOf', () => {
  const rows = [{ id: 1, state: 'open' }, { id: 2, state: 'closed' }, { id: 3, state: 'pending' }];
  const none = ui.enumColumnFilter('state', { kind: 'enum', values: ['open', 'closed'], operator: 'is-none-of' });
  assert.deepEqual(none, { field: 'state', kind: 'enum', op: 'isNoneOf', value: ['open', 'closed'] });
  assert.deepEqual(ui.applyFilters(rows, [none]).map((r) => r.id), [3]);
  const any = ui.enumColumnFilter('state', { kind: 'enum', values: ['open', 'closed'] });
  assert.equal(any.op, 'isAnyOf');
  assert.deepEqual(ui.applyFilters(rows, [any]).map((r) => r.id), [1, 2]);
});

test('PR #179 review: a preset chosen while "is none of" is set keeps the condition', () => {
  const log = [];
  const field = { ...status, presets: [{ id: 'done', label: 'Done', values: ['closed'] }] };
  const t = mount(h(Harness, { field, initial: { kind: 'enum', values: ['open'], operator: 'is-none-of' }, log }));
  click([...t.host.querySelectorAll('.uix-filter-editor__presets button')].find((b) => b.textContent === 'Done'));
  assert.deepEqual(log.at(-1), { kind: 'enum', values: ['closed'], operator: 'is-none-of' });
  t.unmount();
});

test('PR #179 review: a field that offers only "is none of" applies it with no control; its summary excludes', () => {
  const log = [];
  const only = { ...state, enumOperators: ['is-none-of'] };
  const t = mount(h(Harness, { field: only, initial: undefined, log }));
  assert.equal(t.host.querySelector('select'), null, 'one condition: no control');
  click(t.host.querySelector('.uix-checkbox input'));
  assert.deepEqual(log.at(-1), { kind: 'enum', values: ['open'], operator: 'is-none-of' });
  t.unmount();
  assert.equal(ui.summarizeFilter(only, { kind: 'enum', values: ['open'] }), 'State: not Open', 'a value saved without the operator');
  // only "is any of" stays the 2.50 value: no operator written
  const anyLog = [];
  const a = mount(h(Harness, { field: { ...state, enumOperators: ['is-any-of'] }, initial: undefined, log: anyLog }));
  click(a.host.querySelector('.uix-checkbox input'));
  assert.deepEqual(anyLog.at(-1), { kind: 'enum', values: ['open'] });
  a.unmount();
});
