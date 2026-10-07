/* HAR-1505 (U8; TENSOR R6 state scope, R8 AC4) — FilterEditor enum presets in jsdom.
 * Renders the BUILT dist — run `npm run build:react` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
const settle = (ms = 10) => act(() => new Promise((r) => setTimeout(r, ms)));

const Harness = ({ field, initial, log, labels }) => {
  const [value, setValue] = useState(initial);
  return h(ui.FilterEditor, { field, value, labels, searchDelay: 0, onValueChange: (v) => { log.push(v); setValue(v); }, onApply: () => {}, onClear: () => {} });
};

const field = {
  id: 'status', label: 'Status', kind: 'enum',
  options: [{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }, { value: 'z', label: 'Z' }],
  presets: [{ id: 'a', label: 'A', values: ['x', 'y'] }, { id: 'b', label: 'B', values: ['z'] }],
};

const presetGroup = (host) => host.querySelector('.uix-filter-editor__presets');
const presetButton = (host, label) => [...presetGroup(host).querySelectorAll('button')].find((b) => b.textContent === label);
const pressed = (host) => [...presetGroup(host).querySelectorAll('button')].map((b) => `${b.textContent}:${b.getAttribute('aria-pressed')}`);
const checked = (host) => [...host.querySelectorAll('.uix-filter-editor__list input[type="checkbox"]')].filter((c) => c.checked).map((c) => c.closest('label').textContent);

test('AC1: a preset replaces the selection and is pressed; editing un-presses it; another preset replaces it', () => {
  const log = [];
  const { host, unmount } = mount(h(Harness, { field, initial: { kind: 'enum', values: ['z'] }, log }));
  const group = presetGroup(host);
  assert.ok(group, 'presets render');
  assert.equal(group.getAttribute('role'), 'group');
  assert.equal(group.getAttribute('aria-label'), 'Presets');
  assert.ok(group.classList.contains('uix-chip-group'));
  assert.deepEqual(pressed(host), ['A:false', 'B:true'], 'the preset equal to the current value is pressed');

  click(presetButton(host, 'A'));
  assert.deepEqual([...log.at(-1).values].sort(), ['x', 'y'], 'A selects exactly x and y');
  assert.deepEqual(checked(host), ['X', 'Y']);
  assert.deepEqual(pressed(host), ['A:true', 'B:false']);

  click([...host.querySelectorAll('.uix-filter-editor__list label')].find((l) => l.textContent === 'Z').querySelector('input'));
  assert.deepEqual([...log.at(-1).values].sort(), ['x', 'y', 'z']);
  assert.deepEqual(pressed(host), ['A:false', 'B:false'], 'checking z un-presses A');

  click(presetButton(host, 'B'));
  assert.deepEqual(log.at(-1), { kind: 'enum', values: ['z'] }, 'B selects only z');
  assert.deepEqual(checked(host), ['Z']);
  assert.deepEqual(pressed(host), ['A:false', 'B:true']);

  click(presetButton(host, 'B'));
  assert.deepEqual(log.at(-1), { kind: 'enum', values: ['z'] }, 'pressing a pressed preset keeps its values');
  assert.deepEqual(pressed(host), ['A:false', 'B:true']);
  unmount();
});

test('presets: set equality ignores order; they sit above the search box and the options', () => {
  const many = {
    ...field,
    options: ['p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y'].map((v) => ({ value: v, label: v.toUpperCase() })),
  };
  const { host, unmount } = mount(h(Harness, { field: many, initial: { kind: 'enum', values: ['y', 'x'] }, log: [] }));
  assert.deepEqual(pressed(host), ['A:true', 'B:false']);
  const group = presetGroup(host);
  const search = host.querySelector('input[type="search"]');
  const list = host.querySelector('.uix-filter-editor__list');
  assert.ok(search, 'more than eight options get a search box');
  assert.ok(group.compareDocumentPosition(search) & window.Node.DOCUMENT_POSITION_FOLLOWING, 'presets precede the search box');
  assert.ok(group.compareDocumentPosition(list) & window.Node.DOCUMENT_POSITION_FOLLOWING, 'presets precede the options');
  unmount();
});

test('presets: no presets, no group; the group name comes from labels, the provider, or the prop', () => {
  const plain = mount(h(Harness, { field: { ...field, presets: undefined }, initial: undefined, log: [] }));
  assert.equal(presetGroup(plain.host), null);
  plain.unmount();

  const viaProp = mount(h(Harness, { field, initial: undefined, log: [], labels: { presets: 'Vorlagen' } }));
  assert.equal(presetGroup(viaProp.host).getAttribute('aria-label'), 'Vorlagen');
  viaProp.unmount();

  const viaProvider = mount(h(ui.UixLabelsProvider, { labels: { filterEditor: { presets: 'Schnellauswahl', apply: 'Anwenden' } } },
    h(Harness, { field, initial: undefined, log: [] })));
  assert.equal(presetGroup(viaProvider.host).getAttribute('aria-label'), 'Schnellauswahl');
  assert.ok([...viaProvider.host.querySelectorAll('button')].some((b) => b.textContent === 'Anwenden'), 'the provider reaches every FilterEditor label');
  viaProvider.unmount();

  const both = mount(h(ui.UixLabelsProvider, { labels: { filterEditor: { presets: 'Schnellauswahl' } } },
    h(Harness, { field, initial: undefined, log: [], labels: { presets: 'Vorlagen' } })));
  assert.equal(presetGroup(both.host).getAttribute('aria-label'), 'Vorlagen', 'an explicit prop wins over the provider');
  both.unmount();
  assert.equal(ui.DEFAULT_FILTER_EDITOR_LABELS.presets, 'Presets');
});

test('AC2: summarizeFilter names the preset on set equality, else the default summary', () => {
  const s = ui.summarizeFilter;
  assert.equal(s(field, { kind: 'enum', values: ['y', 'x'] }), 'A');
  assert.equal(s(field, { kind: 'enum', values: ['x', 'y', 'x'] }), 'A', 'duplicates do not break set equality');
  assert.equal(s(field, { kind: 'enum', values: ['z'] }), 'B');
  assert.equal(s(field, { kind: 'enum', values: ['x'] }), 'Status: X');
  assert.equal(s(field, { kind: 'enum', values: ['x', 'y', 'z'] }), 'Status: X, Y +1');
  assert.equal(s(field, { kind: 'enum', values: [] }), '', 'an empty value is still no chip');
  assert.equal(s(field, { kind: 'enum', values: ['x', 'y'] }, { labels: { preset: '{field}: {label}' } }), 'Status: A');
  assert.equal(s({ ...field, presets: undefined }, { kind: 'enum', values: ['x', 'y'] }), 'Status: X, Y');

  const m = ui.matchFilterPreset;
  assert.equal(m(field, { kind: 'enum', values: ['y', 'x'] })?.id, 'a');
  assert.equal(m(field, { kind: 'enum', values: ['x'] }), undefined);
  assert.equal(m(field, undefined), undefined);
  assert.equal(m(field, { kind: 'reference', values: [{ value: 'z', label: 'Z' }] }), undefined, 'presets are enum-only');
  const twin = { ...field, presets: [...field.presets, { id: 'a2', label: 'A again', values: ['x', 'y'] }] };
  assert.equal(m(twin, { kind: 'enum', values: ['x', 'y'] }).id, 'a', 'the first preset in the given order wins');
});

test('AC3 (R8 AC4): the enum and reference bodies, with presets, contain no <select>', async () => {
  const e = mount(h(Harness, { field, initial: { kind: 'enum', values: ['x', 'y'] }, log: [] }));
  assert.ok(presetGroup(e.host));
  assert.equal(e.host.querySelectorAll('select').length, 0);
  e.unmount();

  const reference = { ...field, kind: 'reference', onSearch: async () => [{ value: 'x', label: 'X' }] };
  const r = mount(h(Harness, { field: reference, initial: { kind: 'reference', values: [{ value: 'x', label: 'X' }] }, log: [] }));
  await settle();
  assert.ok(r.host.querySelector('.uix-filter-editor__list .uix-checkbox'), 'the reference body rendered its results');
  assert.equal(r.host.querySelectorAll('select').length, 0);
  r.unmount();
});

test('AC5 (R11 AC6): FilterEditor has no HTML sink and no HTML-string prop', () => {
  for (const file of ['./components/FilterEditor.tsx', './filter-model.ts']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.ok(!source.includes('dangerouslySetInnerHTML'), `${file} uses dangerouslySetInnerHTML`);
    assert.ok(!/\binnerHTML\b|__html/.test(source), `${file} writes HTML`);
    assert.deepEqual(source.match(/^\s*\w*html\w*\??\s*:/gim) ?? [], [], `${file} declares an HTML-string member`);
  }
});

test('defaults carry no change vocabulary', () => {
  const words = JSON.stringify([ui.DEFAULT_FILTER_EDITOR_LABELS, ui.DEFAULT_FILTER_SUMMARY_LABELS]);
  assert.doesNotMatch(words, /\b(CAB|change|blackout|freeze|risk|violation)\b/i);
});
