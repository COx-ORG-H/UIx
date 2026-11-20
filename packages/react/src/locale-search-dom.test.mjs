/* The locale reaches the kit's search and sort surfaces from UixLabelsProvider (roadmap #15):
 * its `locale` (set by the label packs), then `dateFormat.locale`. In jsdom: Combobox and Select
 * filtering, CommandPalette ranking, useTable search and sort.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

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

function render(element, labels) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(labels ? h(ui.UixLabelsProvider, { labels }, element) : element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
}

const type = (input, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, text);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});

const CITIES = [{ value: 'bg', label: 'Београд' }, { value: 'dj', label: 'Đakovo' }, { value: 'zg', label: 'Zagreb' }];
const optionTexts = (host) => [...host.querySelectorAll('[role="option"]')].map((o) => o.textContent.trim());

test('Combobox: "djakovo" finds "Đakovo" anywhere; Latin finds Cyrillic under a Serbian provider', () => {
  for (const [labels, expected] of [
    [undefined, []],
    [{ locale: 'sr-Latn' }, ['Београд']],
    [{ dateFormat: { locale: 'sr-Latn' } }, ['Београд']],
  ]) {
    const v = render(h(ui.Combobox, { options: CITIES, label: 'City' }), labels);
    const input = v.host.querySelector('input[role="combobox"]');
    act(() => { input.focus(); });
    type(input, 'beograd');
    assert.deepEqual(optionTexts(v.host), expected, JSON.stringify(labels));
    type(input, 'djakovo');
    assert.deepEqual(optionTexts(v.host), ['Đakovo']);
    v.unmount();
  }
});

test('CommandPalette items: the provider locale ranks a Cyrillic label for a Latin query', () => {
  const items = [{ id: 'a', label: 'Ђорђе Балашевић' }, { id: 'b', label: 'Novi Sad' }];
  const v = render(h(ui.CommandPalette, { items, query: 'djordje', onQueryChange: () => {} }), { locale: 'sr-Cyrl' });
  assert.deepEqual(optionTexts(v.host), ['Ђорђе Балашевић']);
  assert.equal(v.host.querySelector('mark')?.textContent, 'Ђорђе', 'the match is marked in the Cyrillic text');
  v.unmount();
});

test('useTable: search folds and sort collates in the provider locale; the option wins', () => {
  const data = [
    { id: '1', name: 'Čolić', ticket: 'INC-10' },
    { id: '2', name: 'Cvitan', ticket: 'INC-2' },
    { id: '3', name: 'Đukić', ticket: 'INC-1' },
  ];
  const seen = {};
  function Probe({ name, options }) {
    seen[name] = ui.useTable(data, options).rows.map((r) => r.name);
    return null;
  }
  const v = render(h('div', null,
    h(Probe, { name: 'hr', options: { initialSort: [{ field: 'name', dir: 'ascending' }] } }),
    h(Probe, { name: 'en', options: { initialSort: [{ field: 'name', dir: 'ascending' }], locale: 'en' } }),
    h(Probe, { name: 'ticket', options: { initialSort: [{ field: 'ticket', dir: 'ascending' }] } }),
    h(Probe, { name: 'search', options: { initialQuery: 'djukic' } }),
  ), { locale: 'hr' });
  assert.deepEqual(seen.hr, ['Cvitan', 'Čolić', 'Đukić'], 'Croatian: č after c');
  assert.deepEqual(seen.en, ['Čolić', 'Cvitan', 'Đukić'], 'English: č among the c\'s');
  assert.deepEqual(seen.ticket, ['Đukić', 'Cvitan', 'Čolić'], 'INC-1, INC-2, INC-10');
  assert.deepEqual(seen.search, ['Đukić']);
  v.unmount();
});
