/* HAR-1832 (TENSOR HAR-1484 `table-filter-editor.tsx`) — FilterEditor and its model, in jsdom:
 *   1. a free-text `tags` kind: Enter or a comma adds a tag, a chip per tag removes it, a paste of
 *      "a, b" adds both, Backspace on an empty field takes the last back, Apply takes a tag still
 *      being typed;
 *   2. a `date` kind with on / before / after / between that survives a save (between [a, a]
 *      stays between), its summary, and `dateFilterBounds` for the query;
 *   3. labels for reference ids restored from a saved view (`resolveLabels`, `resolveFilterLabels`);
 *   4. Enter applies in every kind; the reference search runs once per query, not per render;
 *   plus German labels through `UixLabelsProvider` `filterEditor`.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState, StrictMode } from 'react';

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
  return { host, root, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const type = (el, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, text);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const key = (el, k) => {
  let notPrevented;
  act(() => { notPrevented = el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
  return notPrevented;
};
const settle = (ms = 10) => act(() => new Promise((r) => setTimeout(r, ms)));

/** Records every value the editor emits and every apply with the value it was given. */
const Harness = ({ field, initial, log, labels }) => {
  const [value, setValue] = useState(initial);
  return h(ui.FilterEditor, { field, value, labels, searchDelay: 0, onValueChange: (v) => { log.push(v); setValue(v); }, onApply: (v) => log.push({ apply: v }), onClear: () => log.push('clear') });
};
const applied = (log) => log.filter((e) => e.apply).map((e) => e.apply);

const host = { id: 'host', label: 'Host', kind: 'tags' };

test('1: tags — Enter and comma add, chips remove, paste splits, Backspace takes the last back', () => {
  const log = [];
  const t = mount(h(Harness, { field: host, initial: undefined, log }));
  const input = () => t.host.querySelector('.uix-taginput__field');
  assert.equal(input().getAttribute('aria-label'), 'Add a value');
  type(input(), ' db-01 ');
  assert.equal(key(input(), 'Enter'), false, 'Enter with text adds a tag, it does not apply');
  assert.deepEqual(log.at(-1), { kind: 'tags', values: ['db-01'] });
  assert.equal(input().value, '');
  type(input(), 'db-02');
  key(input(), ',');
  type(input(), 'db-01');
  key(input(), 'Enter');
  assert.deepEqual(log.at(-1), { kind: 'tags', values: ['db-01', 'db-02'] }, 'a repeat is ignored');
  act(() => {
    const paste = new window.Event('paste', { bubbles: true, cancelable: true });
    paste.clipboardData = { getData: () => 'web-01, web-02\nweb-03' };
    input().dispatchEvent(paste);
  });
  assert.deepEqual(log.at(-1).values, ['db-01', 'db-02', 'web-01', 'web-02', 'web-03']);
  const chips = [...t.host.querySelectorAll('.uix-tag')];
  assert.deepEqual(chips.map((c) => c.firstChild.textContent), ['db-01', 'db-02', 'web-01', 'web-02', 'web-03']);
  click(chips[1].querySelector('button[aria-label="Remove db-02"]'));
  assert.deepEqual(log.at(-1).values, ['db-01', 'web-01', 'web-02', 'web-03']);
  key(input(), 'Backspace');
  assert.deepEqual(log.at(-1).values, ['db-01', 'web-01', 'web-02']);
  // Enter on an empty field applies; Apply takes a tag still being typed along.
  key(input(), 'Enter');
  assert.deepEqual(applied(log).at(-1), { kind: 'tags', values: ['db-01', 'web-01', 'web-02'] });
  type(input(), 'mail-01');
  click([...t.host.querySelectorAll('button')].find((b) => b.textContent === 'Apply'));
  assert.deepEqual(applied(log).at(-1), { kind: 'tags', values: ['db-01', 'web-01', 'web-02', 'mail-01'] });
  t.unmount();

  assert.equal(ui.summarizeFilter(host, { kind: 'tags', values: ['db-01', 'db-02', 'web-01'] }), 'Host: db-01, db-02 +1');
  assert.equal(ui.isFilterEmpty({ kind: 'tags', values: [] }), true);
  assert.deepEqual(ui.emptyFilterValue('tags'), { kind: 'tags', values: [] });
});

const created = { id: 'created', label: 'Created', kind: 'date' };

test('2: dates — on / before / after / between, kept as chosen; summary and query bounds', () => {
  const log = [];
  const t = mount(h(Harness, { field: created, initial: { kind: 'date', operator: 'between', from: '2026-10-05', to: '2026-10-05' }, log }));
  const select = t.host.querySelector('select');
  assert.deepEqual([...select.options].map((o) => [o.value, o.textContent]), [['on', 'on'], ['before', 'before'], ['after', 'after'], ['between', 'between']]);
  assert.equal(select.value, 'between', 'a saved between of one day comes back as between, not on');
  assert.equal(t.host.querySelectorAll('input[type="date"]').length, 2);
  act(() => { select.value = 'before'; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
  assert.deepEqual(log.at(-1), { kind: 'date', operator: 'before', from: '2026-10-05', to: undefined });
  assert.equal(t.host.querySelectorAll('input[type="date"]').length, 1);
  assert.equal(t.host.querySelector('.uix-filter-editor__date span').textContent, 'Date');
  key(t.host.querySelector('input[type="date"]'), 'Enter');
  assert.deepEqual(applied(log).at(-1), { kind: 'date', operator: 'before', from: '2026-10-05', to: undefined }, 'Enter in a date field applies');
  t.unmount();

  const only = mount(h(Harness, { field: { ...created, dateOperators: ['before', 'after'] }, initial: undefined, log: [] }));
  assert.deepEqual([...only.host.querySelectorAll('option')].map((o) => o.value), ['before', 'after']);
  only.unmount();

  const fmt = { formatDate: (d) => d.split('-').reverse().join('.') };
  assert.equal(ui.summarizeFilter(created, { kind: 'date', operator: 'on', from: '2026-10-05' }, fmt), 'Created: 05.10.2026');
  assert.equal(ui.summarizeFilter(created, { kind: 'date', operator: 'before', from: '2026-10-05' }, fmt), 'Created: before 05.10.2026');
  assert.equal(ui.summarizeFilter(created, { kind: 'date', operator: 'after', from: '2026-10-05' }, { ...fmt, labels: { after: 'nach {date}' } }), 'Created: nach 05.10.2026');
  assert.equal(ui.summarizeFilter(created, { kind: 'date', operator: 'between', from: '2026-10-01', to: '2026-10-05' }, fmt), 'Created: 01.10.2026 – 05.10.2026');
  assert.equal(ui.isFilterEmpty({ kind: 'date', operator: 'between', from: '2026-10-01' }), true, 'between needs both ends');
  assert.deepEqual(ui.emptyFilterValue('date'), { kind: 'date', operator: 'on' });

  // Before is "< day", after is ">= the next day"; the ends of a month and a year roll over.
  assert.deepEqual(ui.dateFilterBounds({ kind: 'date', operator: 'on', from: '2026-10-31' }), { from: '2026-10-31', until: '2026-11-01' });
  assert.deepEqual(ui.dateFilterBounds({ kind: 'date', operator: 'before', from: '2026-10-05' }), { until: '2026-10-05' });
  assert.deepEqual(ui.dateFilterBounds({ kind: 'date', operator: 'after', from: '2026-12-31' }), { from: '2027-01-01' });
  assert.deepEqual(ui.dateFilterBounds({ kind: 'date', operator: 'between', from: '2026-02-27', to: '2026-02-28' }), { from: '2026-02-27', until: '2026-03-01' });
  assert.deepEqual(ui.dateFilterBounds({ kind: 'date-range', to: '2026-10-05' }), { until: '2026-10-06' });
  assert.deepEqual(ui.dateFilterBounds({ kind: 'date', operator: 'between', from: '2026-10-01' }), {}, 'an empty value has no bounds');
});

test('3: reference ids restored from a saved view get their labels', async () => {
  const asked = [];
  const field = {
    id: 'assignee', label: 'Assignee', kind: 'reference',
    onSearch: () => Promise.resolve([]),
    resolveLabels: (ids) => { asked.push([...ids]); return Promise.resolve(ids.filter((id) => id !== 'gone').map((id) => ({ value: id, label: { u1: 'Amra Kovač', u2: 'Jonas Weber' }[id] }))); },
  };
  const restored = { kind: 'reference', values: [{ value: 'u1', label: 'u1' }, { value: 'u2', label: '' }, { value: 'gone', label: 'gone' }, { value: 'u3', label: 'Lejla Hadžić' }] };
  const log = [];
  const t = mount(h(Harness, { field, initial: restored, log }));
  await settle();
  assert.deepEqual(asked, [['u1', 'u2', 'gone']], 'asked once, only for ids without a label');
  assert.deepEqual([...t.host.querySelectorAll('.uix-chip')].map((c) => c.querySelector('.uix-chip__label, span')?.textContent ?? c.textContent), ['Amra Kovač', 'Jonas Weber', 'gone', 'Lejla Hadžić']);
  click(t.host.querySelector('.uix-chip__remove[aria-label="Remove gone"]'));
  assert.deepEqual(log.at(-1).values, [{ value: 'u1', label: 'Amra Kovač' }, { value: 'u2', label: 'Jonas Weber' }, { value: 'u3', label: 'Lejla Hadžić' }], 'a change carries the resolved labels');
  await settle();
  assert.equal(asked.length, 1, 'no second request after the change');
  t.unmount();

  // StrictMode runs the effect twice: the second run reuses the first request, and its answer lands.
  asked.length = 0;
  const strict = mount(h(StrictMode, null, h(Harness, { field, initial: restored, log: [] })));
  await settle();
  assert.deepEqual(asked, [['u1', 'u2', 'gone']]);
  assert.match(strict.host.textContent, /Amra Kovač.*Jonas Weber/);
  strict.unmount();

  // For the chip outside the editor: resolve once, then summarize.
  const value = await ui.resolveFilterLabels(field, restored);
  assert.equal(ui.summarizeFilter(field, value, { maxListed: 4 }), 'Assignee: Amra Kovač, Jonas Weber, gone, Lejla Hadžić');
  assert.equal(await ui.resolveFilterLabels(field, { kind: 'reference', values: [{ value: 'u3', label: 'Lejla Hadžić' }] }).then((v) => v.values[0].label), 'Lejla Hadžić');
  assert.equal(ui.isUnresolvedChoice({ value: 'x', label: 'x' }), true);
});

test('4: Enter applies in every kind; the reference search runs per query, not per render', async () => {
  const state = { id: 'state', label: 'State', kind: 'enum', options: [{ value: 'open', label: 'Open' }] };
  const log = [];
  const e = mount(h(Harness, { field: state, initial: undefined, log }));
  click(e.host.querySelector('.uix-checkbox input'));
  key(e.host.querySelector('.uix-checkbox input'), 'Enter');
  assert.deepEqual(applied(log).at(-1), { kind: 'enum', values: ['open'] }, 'Enter on a checkbox applies');
  const count = applied(log).length;
  key([...e.host.querySelectorAll('button')].find((b) => b.textContent === 'Clear'), 'Enter');
  assert.equal(applied(log).length, count, 'Enter on a button is the button\'s');
  e.unmount();

  const num = mount(h(Harness, { field: { id: 'p', label: 'Priority', kind: 'number' }, initial: { kind: 'number', operator: 'gte', value: 2 }, log }));
  key(num.host.querySelector('input'), 'Enter');
  assert.deepEqual(applied(log).at(-1), { kind: 'number', operator: 'gte', value: 2 });
  num.unmount();

  // A field object rebuilt on every render (not memoized) used to search again each time.
  const calls = [];
  function Unmemoized() {
    const [, setTick] = useState(0);
    const field = { id: 'a', label: 'Assignee', kind: 'reference', onSearch: (q) => { calls.push(q); return Promise.resolve([{ value: 'u1', label: 'Amra Kovač' }]); } };
    return h('div', null, h('button', { type: 'button', className: 'rerender', onClick: () => setTick((n) => n + 1) }, 'rerender'),
      h(ui.FilterEditor, { field, value: undefined, searchDelay: 0, onValueChange() {}, onApply() {}, onClear() {} }));
  }
  const r = mount(h(Unmemoized));
  await settle();
  click(r.host.querySelector('.rerender'));
  click(r.host.querySelector('.rerender'));
  await settle();
  assert.deepEqual(calls, [''], 'one search, though the field object changed twice');
  r.unmount();
});

test('German labels through UixLabelsProvider filterEditor', () => {
  const t = mount(h(ui.UixLabelsProvider, { labels: { filterEditor: { addTag: 'Wert hinzufügen', date: 'Datum', dateOperators: { on: 'am', before: 'vor', after: 'nach', between: 'zwischen' }, remove: '{label} entfernen' } } },
    h('div', null,
      h(ui.FilterEditor, { field: host, value: { kind: 'tags', values: ['db-01'] }, onValueChange() {}, onApply() {}, onClear() {} }),
      h(ui.FilterEditor, { field: created, value: undefined, onValueChange() {}, onApply() {}, onClear() {} }))));
  assert.equal(t.host.querySelector('.uix-taginput__field').getAttribute('aria-label'), 'Wert hinzufügen');
  assert.ok(t.host.querySelector('button[aria-label="db-01 entfernen"]'));
  assert.deepEqual([...t.host.querySelectorAll('option')].map((o) => o.textContent), ['am', 'vor', 'nach', 'zwischen']);
  assert.equal(t.host.querySelector('.uix-filter-editor__date span').textContent, 'Datum');
  t.unmount();
});
