/* HAR-1366 (TENSOR B28/C5, MOTUS B-P10) — EntityPicker in jsdom: search, choose, the value
 * display, clear, Escape back to the value, error with a keyboard-reachable Retry row (the bug
 * of TENSOR HAR-1336), the hidden form value and Field wiring.
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
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const settle = (ms = 15) => act(() => new Promise((r) => setTimeout(r, ms)));
const type = (el, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, text);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const key = (el, k) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })));
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

const people = [
  { id: 'u1', title: 'Ada Lovelace', meta: ['IT', 'Service desk'] },
  { id: 'u2', title: 'Ben Ali', meta: ['Facilities'] },
];

const Harness = ({ initial = null, search, log }) => {
  const [value, setValue] = useState(initial);
  return h('form', null, h(ui.Field, { label: 'Assignee', htmlFor: 'assignee', hint: 'Who works on it' },
    h(ui.EntityPicker, { id: 'assignee', name: 'assignee_id', label: 'Assignee', value, delay: 0, onSearch: search, onValueChange: (v) => { log.push(v?.id ?? null); setValue(v); } })));
};

test('search, choose with the keyboard, then the value shows with a named clear button', async () => {
  const log = [];
  const calls = [];
  const search = (q) => { calls.push(q); return Promise.resolve(people.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()))); };
  const { host, unmount } = mount(h(Harness, { search, log }));
  const input = host.querySelector('input[role="combobox"]');
  assert.equal(input.id, 'assignee', 'Field label points at the input');
  assert.equal(host.querySelector('label[for="assignee"]').textContent, 'Assignee');
  input.focus();
  type(input, 'ben');
  await settle();
  assert.deepEqual(calls.at(-1), 'ben');
  key(input, 'ArrowDown');
  key(input, 'Enter');
  await settle();
  assert.deepEqual(log, ['u2']);
  const valueButton = host.querySelector('.uix-entity-picker__value');
  assert.equal(valueButton.id, 'assignee');
  assert.equal(valueButton.getAttribute('aria-label'), 'Assignee: Ben Ali. Change');
  assert.match(valueButton.textContent, /Ben Ali.*Facilities/);
  assert.equal(document.activeElement, valueButton, 'focus returns to the field after choosing');
  assert.equal(host.querySelector('input[type="hidden"][name="assignee_id"]').value, 'u2');
  const clear = host.querySelector('.uix-entity-picker__clear');
  assert.equal(clear.getAttribute('aria-label'), 'Clear Ben Ali');
  click(clear);
  await settle();
  assert.deepEqual(log, ['u2', null]);
  assert.equal(document.activeElement, host.querySelector('input[role="combobox"]'), 'clearing goes back to the search');
  assert.equal(host.querySelector('input[type="hidden"]').value, '');
  unmount();
});

test('choosing again starts a fresh search; Escape with an empty query goes back to the value', async () => {
  const { host, unmount } = mount(h(Harness, { initial: people[0], search: () => Promise.resolve(people), log: [] }));
  click(host.querySelector('.uix-entity-picker__value'));
  await settle();
  const input = host.querySelector('input[role="combobox"]');
  assert.equal(input.value, '');
  assert.equal(document.activeElement, input);
  key(input, 'Escape');
  key(input, 'Escape');
  await settle();
  assert.ok(host.querySelector('.uix-entity-picker__value'), 'back to the chosen record');
  assert.equal(document.activeElement, host.querySelector('.uix-entity-picker__value'));
  unmount();
});

test('a failed search shows the error and a Retry row the arrow keys reach', async () => {
  let fail = true;
  const log = [];
  const { host, unmount } = mount(h(Harness, { search: () => (fail ? Promise.reject(new Error('down')) : Promise.resolve(people)), log }));
  const input = host.querySelector('input[role="combobox"]');
  input.focus();
  await settle();
  assert.match(host.querySelector('.uix-search-suggest').textContent, /Search failed\./);
  const retry = [...host.querySelectorAll('[role="option"]')].find((o) => o.textContent === 'Try again');
  assert.ok(retry, 'Retry is an option in the list');
  fail = false;
  key(input, 'ArrowDown');
  assert.equal(input.getAttribute('aria-activedescendant'), retry.id, 'the keyboard reaches Retry');
  key(input, 'Enter');
  await settle();
  input.focus();
  await settle();
  assert.deepEqual([...host.querySelectorAll('[role="option"]')].map((o) => o.textContent.replace(/\s+/g, ' ').trim()).filter((t) => t.startsWith('Ada') || t.startsWith('Ben')).length, 2);
  unmount();
});

// ── HAR-1648: a "more matches" line, an idle hint, labels from UixLabelsProvider ────────────────
const picker = (props) => h(ui.EntityPicker, { id: 'p', label: 'Assignee', value: null, delay: 0, onValueChange() {}, ...props });
const popup = (host) => host.querySelector('.uix-search-suggest__popup, [role="listbox"]')?.closest('.uix-search-suggest') ?? host;

test('has-more: the list ends with a line that is not an option, arrow keys skip it, and the status says so', async () => {
  const chosen = [];
  const search = () => Promise.resolve({ options: people, hasMore: true });
  const { host, unmount } = mount(picker({ onSearch: search, onValueChange: (v) => chosen.push(v?.id ?? null) }));
  const input = host.querySelector('input[role="combobox"]');
  input.focus();
  type(input, 'a');
  await settle();
  const options = [...host.querySelectorAll('[role="option"]')];
  assert.deepEqual(options.map((o) => o.querySelector('.uix-search-suggest__title').textContent), ['Ada Lovelace', 'Ben Ali']);
  const note = host.querySelector('.uix-search-suggest__note');
  assert.equal(note.textContent, 'More matches. Keep typing to narrow the search.');
  assert.equal(note.getAttribute('role'), null, 'it is not an option');
  assert.equal(note.closest('[role="listbox"]'), null, 'and not inside the listbox');
  assert.equal(host.querySelector('[role="status"]').textContent, '2 results shown, more match. Keep typing to narrow the search.');

  // the arrow keys walk the two options and wrap; nothing ever lands on the note
  const activeOf = () => document.getElementById(input.getAttribute('aria-activedescendant') ?? '')?.textContent ?? null;
  key(input, 'ArrowDown');
  assert.match(activeOf(), /Ada Lovelace/);
  key(input, 'ArrowDown');
  assert.match(activeOf(), /Ben Ali/);
  key(input, 'ArrowDown');
  assert.doesNotMatch(activeOf() ?? '', /More matches/);
  click(note);
  assert.deepEqual(chosen, [], 'a click on the note chooses nothing');
  unmount();
});

test('has-more is off for a plain array, for hasMore false, and when nothing was found', async () => {
  for (const result of [people, { options: people }, { options: people, hasMore: false }, { options: [], hasMore: true }]) {
    const { host, unmount } = mount(picker({ onSearch: () => Promise.resolve(result) }));
    const input = host.querySelector('input[role="combobox"]');
    input.focus();
    type(input, 'a');
    await settle();
    assert.equal(host.querySelector('.uix-search-suggest__note'), null);
    const count = Array.isArray(result) ? result.length : result.options.length;
    assert.equal(host.querySelector('[role="status"]').textContent, `${count} results`);
    unmount();
  }
});

test('idle hint: below minQueryLength the open list says how much to type, and no search runs', async () => {
  const calls = [];
  const search = (q) => { calls.push(q); return Promise.resolve(people); };
  const { host, unmount } = mount(picker({ onSearch: search, minQueryLength: 2 }));
  const input = host.querySelector('input[role="combobox"]');
  input.focus();
  await settle();
  const hint = () => [...host.querySelectorAll('.uix-search-suggest__state')].map((el) => el.textContent);
  assert.deepEqual(hint(), ['Type at least 2 characters.'], 'shown as soon as the field has focus');
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  type(input, 'a');
  await settle();
  assert.deepEqual(hint(), ['Type at least 2 characters.'], 'one character is still too short');
  assert.deepEqual(calls, [], 'no search below the minimum');
  type(input, 'ad');
  await settle();
  assert.deepEqual(calls, ['ad']);
  assert.deepEqual(hint(), [], 'the hint is gone once the search runs');
  assert.equal(host.querySelectorAll('[role="option"]').length, 2);
  unmount();

  // minQueryLength 1 reads better without a number; 0 (the default) has no hint at all
  const one = mount(picker({ onSearch: search, minQueryLength: 1 }));
  one.host.querySelector('input').focus();
  await settle();
  assert.equal(one.host.querySelector('.uix-search-suggest__state').textContent, 'Type to search.');
  one.unmount();
  const zero = mount(picker({ onSearch: () => new Promise(() => {}) }));
  zero.host.querySelector('input').focus();
  await settle();
  assert.equal([...zero.host.querySelectorAll('.uix-search-suggest__state')].some((el) => /Type/.test(el.textContent)), false);
  zero.unmount();
});

test('EntityPicker reads UixLabelsProvider entityPicker; a labels prop still wins per word', async () => {
  const german = { more: 'Weitere Treffer. Tippen Sie weiter.', tooShort: 'Mindestens {count} Zeichen eingeben.', resultsMore: '{count} Treffer angezeigt, es gibt weitere.', none: 'Auswählen…' };
  const { host, unmount } = mount(h(ui.UixLabelsProvider, { labels: { entityPicker: german } },
    picker({ onSearch: () => Promise.resolve({ options: people, hasMore: true }), minQueryLength: 2, labels: { more: 'Mehr vorhanden.' } })));
  const input = host.querySelector('input[role="combobox"]');
  assert.equal(input.getAttribute('placeholder'), 'Auswählen…');
  input.focus();
  await settle();
  assert.equal(host.querySelector('.uix-search-suggest__state').textContent, 'Mindestens 2 Zeichen eingeben.');
  type(input, 'ad');
  await settle();
  assert.equal(host.querySelector('.uix-search-suggest__note').textContent, 'Mehr vorhanden.', 'the prop wins');
  assert.equal(host.querySelector('[role="status"]').textContent, '2 Treffer angezeigt, es gibt weitere.');
  unmount();
});

// ── HAR-1647: CommandPalette's result count is translatable ──────────────────────────────────
const palette = (props, items) => h(ui.CommandPalette, props, items.map((label) => h(ui.CommandItem, { key: label }, label)));
const announced = (host) => host.querySelector('.uix-cmdk [role="status"]').textContent;

test('CommandPalette: the result count is English by default, from UixLabelsProvider when set, and a prop wins', async () => {
  const english = mount(palette({}, ['Open', 'Close', 'Assign']));
  await settle(200);
  assert.equal(announced(english.host), '3 results', 'unchanged');
  english.unmount();
  const single = mount(palette({}, ['Open']));
  await settle(200);
  assert.equal(announced(single.host), '1 result');
  single.unmount();

  const labels = { commandPalette: { resultsOne: '{count} Ergebnis', resultsMany: '{count} Ergebnisse' } };
  const three = mount(h(ui.UixLabelsProvider, { labels }, palette({}, ['Öffnen', 'Schließen', 'Zuweisen'])));
  await settle(200);
  assert.equal(announced(three.host), '3 Ergebnisse');
  three.unmount();
  const oneGerman = mount(h(ui.UixLabelsProvider, { labels }, palette({}, ['Öffnen'])));
  await settle(200);
  assert.equal(announced(oneGerman.host), '1 Ergebnis');
  oneGerman.unmount();
  const none = mount(h(ui.UixLabelsProvider, { labels }, palette({}, [])));
  await settle(200);
  assert.equal(announced(none.host), '0 Ergebnisse');
  none.unmount();

  const own = mount(h(ui.UixLabelsProvider, { labels }, palette({ resultsLabel: (n) => `${n} gefunden` }, ['a', 'b'])));
  await settle(200);
  assert.equal(announced(own.host), '2 gefunden', 'the prop wins over the provider');
  assert.equal(own.host.querySelector('.uix-cmdk').hasAttribute('resultslabel'), false, 'the prop does not leak to the DOM');
  own.unmount();
});
