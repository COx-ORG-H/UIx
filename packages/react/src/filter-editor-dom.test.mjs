/* HAR-1365 (TENSOR C6, MOTUS C-1) — the typed filter model and FilterEditor in jsdom.
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

test('summaries and emptiness for every kind', () => {
  const s = ui.summarizeFilter;
  assert.equal(s(state, { kind: 'enum', values: ['open', 'pending'] }), 'State: Open, Pending');
  assert.equal(s(state, { kind: 'enum', values: ['open', 'pending', 'closed'] }), 'State: Open, Pending +1');
  assert.equal(s({ id: 't', label: 'Title', kind: 'text' }, { kind: 'text', operator: 'contains', text: ' vpn ' }), 'Title contains “vpn”');
  assert.equal(s({ id: 'p', label: 'Age', kind: 'number', unit: 'days' }, { kind: 'number', operator: 'gte', value: 3 }), 'Age ≥ 3 days');
  assert.equal(s({ id: 'p', label: 'Age', kind: 'number' }, { kind: 'number', operator: 'between', value: 1, to: 5 }), 'Age: 1 – 5');
  assert.equal(s({ id: 'c', label: 'Created', kind: 'date-range' }, { kind: 'date-range', from: '2026-10-01', to: '2026-10-05' }, { formatDate: (d) => d.split('-').reverse().join('.') }), 'Created: 01.10.2026 – 05.10.2026');
  assert.equal(s({ id: 'c', label: 'Created', kind: 'date-range' }, { kind: 'date-range', to: '2026-10-05' }), 'Created: until 2026-10-05');
  assert.equal(s({ id: 'e', label: 'Escalated', kind: 'boolean', falseLabel: 'Not escalated' }, { kind: 'boolean', value: false }), 'Escalated: Not escalated');
  assert.equal(s({ id: 'a', label: 'Assignee', kind: 'reference' }, { kind: 'reference', values: [{ value: 'u1', label: 'Ada' }] }), 'Assignee: Ada');
  assert.equal(s(state, { kind: 'enum', values: [] }), '');
  assert.equal(ui.isFilterEmpty({ kind: 'number', operator: 'between', value: 1 }), true, 'a half-filled range filters nothing');
  assert.equal(ui.isFilterEmpty(undefined), true);
  assert.deepEqual(ui.emptyFilterValue('text'), { kind: 'text', operator: 'contains', text: '' });
});

test('enum: toggles, select all / clear, count, apply and clear', () => {
  const log = [];
  const { host, unmount } = mount(h(Harness, { field: state, initial: undefined, log }));
  assert.equal(host.querySelector('.uix-filter-editor').getAttribute('data-kind'), 'enum');
  assert.equal(host.querySelector('[role="group"]').getAttribute('aria-labelledby') && host.querySelector('.uix-filter-editor__label').textContent, 'State');
  const boxes = [...host.querySelectorAll('input[type="checkbox"]')];
  click(boxes[1]);
  assert.deepEqual(log.at(-1), { kind: 'enum', values: ['pending'] });
  assert.equal(host.querySelector('.uix-filter-editor__count').textContent, '1 selected');
  click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Select all'));
  assert.deepEqual(log.at(-1).values.sort(), ['closed', 'open', 'pending']);
  click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Clear selection'));
  assert.deepEqual(log.at(-1), { kind: 'enum', values: [] });
  click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Apply'));
  click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Clear'));
  assert.deepEqual(log.slice(-2), ['apply', 'clear']);
  assert.equal(host.querySelector('input[type="search"]'), null, 'three options need no search box');
  unmount();
});

test('enum with many options gets a diacritic-insensitive search', () => {
  const many = { ...state, options: ['Sarajevo', 'Zenica', 'Tuzla', 'Banja Luka', 'Mostar', 'Bihać', 'Brčko', 'Travnik', 'Goražde'].map((c) => ({ value: c, label: c })) };
  const { host, unmount } = mount(h(Harness, { field: many, initial: undefined, log: [] }));
  type(host.querySelector('input[type="search"]'), 'brc');
  assert.deepEqual([...host.querySelectorAll('.uix-checkbox')].map((l) => l.textContent), ['Brčko']);
  unmount();
});

test('text and number: operators, between, unit', () => {
  const log = [];
  const t = mount(h(Harness, { field: { id: 't', label: 'Title', kind: 'text', operators: ['contains', 'is'] }, initial: undefined, log }));
  assert.deepEqual([...t.host.querySelectorAll('option')].map((o) => o.textContent), ['contains', 'is']);
  type(t.host.querySelector('input:not([type])'), 'vpn');
  assert.deepEqual(log.at(-1), { kind: 'text', operator: 'contains', text: 'vpn' });
  act(() => t.host.querySelector('input:not([type])').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  assert.equal(log.at(-1), 'apply', 'Enter applies a text filter');
  t.unmount();

  const nlog = [];
  const n = mount(h(Harness, { field: { id: 'a', label: 'Age', kind: 'number', unit: 'days' }, initial: { kind: 'number', operator: 'between' }, log: nlog }));
  const [from, to] = n.host.querySelectorAll('input[type="number"]');
  assert.equal(from.getAttribute('aria-label'), 'From');
  type(from, '2');
  type(to, '7');
  assert.deepEqual(nlog.at(-1), { kind: 'number', operator: 'between', value: 2, to: 7 });
  assert.equal(n.host.querySelector('.uix-filter-editor__unit').textContent, 'days');
  type(to, '');
  assert.equal(nlog.at(-1).to, undefined, 'an empty field is undefined, not 0');
  n.unmount();
});

test('date range bounds each other; boolean has Any / Yes / No', () => {
  const log = [];
  const d = mount(h(Harness, { field: { id: 'c', label: 'Created', kind: 'date-range' }, initial: { kind: 'date-range', from: '2026-10-01' }, log }));
  const [from, to] = d.host.querySelectorAll('input[type="date"]');
  assert.equal(to.min, '2026-10-01');
  type(to, '2026-10-05');
  assert.deepEqual(log.at(-1), { kind: 'date-range', from: '2026-10-01', to: '2026-10-05' });
  assert.equal(from.closest('label').textContent.startsWith('From'), true);
  d.unmount();

  const blog = [];
  const b = mount(h(Harness, { field: { id: 'e', label: 'Escalated', kind: 'boolean', trueLabel: 'Escalated' }, initial: undefined, log: blog }));
  const radios = [...b.host.querySelectorAll('input[type="radio"]')];
  assert.deepEqual([...b.host.querySelectorAll('.uix-radio')].map((r) => r.textContent), ['Any', 'Escalated', 'No']);
  assert.equal(radios[0].checked, true);
  click(radios[1]);
  assert.deepEqual(blog.at(-1), { kind: 'boolean', value: true });
  b.unmount();
});

test('reference: async search, pick and remove, error with retry, stale results ignored', async () => {
  let fail = true;
  const calls = [];
  const people = [{ value: 'u1', label: 'Ada Lovelace' }, { value: 'u2', label: 'Ben Ali' }];
  const field = {
    id: 'a', label: 'Assignee', kind: 'reference',
    onSearch: (q) => { calls.push(q); return fail ? Promise.reject(new Error('down')) : Promise.resolve(people.filter((p) => p.label.toLowerCase().includes(q.toLowerCase()))); },
  };
  const log = [];
  const { host, unmount } = mount(h(Harness, { field, initial: undefined, log }));
  await settle();
  assert.equal(host.querySelector('[role="alert"]').textContent.startsWith('Search failed.'), true);
  fail = false;
  click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Try again'));
  await settle();
  assert.deepEqual([...host.querySelectorAll('.uix-checkbox')].map((l) => l.textContent), ['Ada Lovelace', 'Ben Ali']);
  type(host.querySelector('input[type="search"]'), 'ben');
  await settle();
  assert.deepEqual([...host.querySelectorAll('.uix-checkbox')].map((l) => l.textContent), ['Ben Ali']);
  click(host.querySelector('.uix-checkbox input'));
  assert.deepEqual(log.at(-1), { kind: 'reference', values: [{ value: 'u2', label: 'Ben Ali' }] });
  const remove = host.querySelector('.uix-chip__remove');
  assert.equal(remove.getAttribute('aria-label'), 'Remove Ben Ali');
  click(remove);
  assert.deepEqual(log.at(-1), { kind: 'reference', values: [] });
  assert.deepEqual(calls, ['', '', 'ben']);
  unmount();
});
