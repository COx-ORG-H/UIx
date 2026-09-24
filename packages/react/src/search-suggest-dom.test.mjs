/* SearchSuggest in jsdom: the ARIA combobox contract and the keyboard model.
 *
 * - focus stays in the field; aria-activedescendant names the active row;
 * - ArrowDown/ArrowUp wrap, and the footer row is reachable;
 * - Enter opens the active row, or the first row when none is active;
 * - Escape closes the list first, then clears the text;
 * - rows expose name + breadcrumb as their name and the context as their description;
 * - loading / empty / error states render; the status text is a polite live region.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

let dom;
let createRoot;
let ui;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
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

const OPTIONS = [
  { id: 'tz', title: 'Time zone', meta: ['Settings', 'Workspace', 'General'], description: 'Used for due dates and SLA clocks.' },
  { id: 'lang', title: 'Language', meta: ['Settings', 'My account', 'Language'], description: 'The language of menus and emails.' },
  { id: 'mfa', title: 'Two-factor sign-in', meta: ['Settings', 'My account', 'Security'] },
];

function Harness({ initial = '', options = OPTIONS, log, ...rest }) {
  const [value, setValue] = useState(initial);
  return h(ui.SearchSuggest, {
    value,
    onValueChange: (next) => { log.values.push(next); setValue(next); },
    options,
    onSelect: (id) => log.picks.push(id),
    label: 'Search settings',
    placeholder: 'Search settings',
    ...rest,
  });
}

const mount = (props = {}) => {
  const log = { picks: [], values: [], footer: 0 };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(Harness, { log, ...props })));
  const input = host.querySelector('input[role="combobox"]');
  return {
    host, log, input,
    rerender: (next) => act(() => root.render(h(Harness, { log, ...props, ...next }))),
    unmount: () => { act(() => root.unmount()); host.remove(); },
  };
};
const key = (el, k) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })));
const focus = (el) => act(() => el.focus());
const popup = (host) => host.querySelector('.uix-search-suggest__popup');
const rows = (host) => [...host.querySelectorAll('[role="option"]')];
const activeRow = (host, input) => {
  const id = input.getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

test('the field is a labelled combobox that controls the listbox', () => {
  const { host, input, unmount } = mount({ initial: 'ti' });
  assert.equal(input.getAttribute('aria-label'), 'Search settings');
  assert.equal(input.getAttribute('aria-autocomplete'), 'list');
  const listbox = host.querySelector('[role="listbox"]');
  assert.equal(input.getAttribute('aria-controls'), listbox.id);
  assert.equal(input.getAttribute('aria-expanded'), 'false', 'closed until focused');
  focus(input);
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  assert.equal(popup(host).hidden, false);
  unmount();
});

test('ArrowDown and ArrowUp wrap, the footer row is reachable, and focus never leaves the field', () => {
  const { host, input, unmount } = mount({ initial: 'ti', footer: { label: 'Show all 3 results', onSelect: () => {} } });
  focus(input);
  assert.equal(input.getAttribute('aria-activedescendant'), null, 'nothing active before the first arrow');
  key(input, 'ArrowDown');
  assert.equal(activeRow(host, input).textContent.startsWith('Time zone'), true);
  key(input, 'ArrowDown'); key(input, 'ArrowDown'); key(input, 'ArrowDown');
  assert.equal(activeRow(host, input).textContent, 'Show all 3 results', 'the footer is the last row');
  key(input, 'ArrowDown');
  assert.ok(activeRow(host, input).textContent.startsWith('Time zone'), 'wraps to the first row');
  key(input, 'ArrowUp');
  assert.equal(activeRow(host, input).textContent, 'Show all 3 results', 'wraps back up');
  assert.equal(document.activeElement, input);
  assert.equal(rows(host).filter((r) => r.getAttribute('aria-selected') === 'true').length, 1);
  unmount();
});

test('Home and End jump within the list only once a row is active', () => {
  const { host, input, unmount } = mount({ initial: 'ti' });
  focus(input);
  key(input, 'End');
  assert.equal(input.getAttribute('aria-activedescendant'), null, 'End moves the caret while no row is active');
  key(input, 'ArrowDown');
  key(input, 'End');
  assert.ok(activeRow(host, input).textContent.startsWith('Two-factor'));
  key(input, 'Home');
  assert.ok(activeRow(host, input).textContent.startsWith('Time zone'));
  unmount();
});

test('Enter opens the active row, or the first row when none is active', () => {
  const first = mount({ initial: 'ti' });
  focus(first.input);
  key(first.input, 'Enter');
  assert.deepEqual(first.log.picks, ['tz']);
  assert.equal(popup(first.host).hidden, true, 'the list closes after a pick');
  first.unmount();

  const second = mount({ initial: 'ti' });
  focus(second.input);
  key(second.input, 'ArrowDown'); key(second.input, 'ArrowDown');
  key(second.input, 'Enter');
  assert.deepEqual(second.log.picks, ['lang']);
  second.unmount();
});

test('Enter on the footer runs its action', () => {
  let shown = 0;
  const { input, log, unmount } = mount({ initial: 'ti', footer: { label: 'Show all', onSelect: () => { shown += 1; } } });
  focus(input);
  key(input, 'ArrowUp');
  key(input, 'Enter');
  assert.equal(shown, 1);
  assert.deepEqual(log.picks, []);
  unmount();
});

test('after Escape closed the list, Enter does not open a row the user can no longer see', () => {
  const { host, input, log, unmount } = mount({ initial: 'time' });
  focus(input);
  key(input, 'Escape');
  assert.equal(popup(host).hidden, true);
  key(input, 'Enter');
  assert.deepEqual(log.picks, []);
  unmount();
});

test('an Enter that confirms an IME composition is left to the composition', () => {
  const { input, log, unmount } = mount({ initial: 'ti' });
  focus(input);
  act(() => input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true })));
  act(() => input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', isComposing: true, bubbles: true, cancelable: true })));
  assert.deepEqual(log.picks, []);
  assert.equal(input.getAttribute('aria-activedescendant'), null);
  unmount();
});

test('when the options shrink without a keystroke, the active row never points past the list', () => {
  const { host, input, rerender, unmount } = mount({ initial: 'ti' });
  focus(input);
  key(input, 'ArrowUp'); // the last of three rows
  assert.ok(activeRow(host, input).textContent.startsWith('Two-factor'));
  rerender({ options: OPTIONS.slice(0, 1) });
  const id = input.getAttribute('aria-activedescendant');
  assert.ok(id === null || document.getElementById(id), 'no dangling aria-activedescendant');
  assert.equal(rows(host).filter((r) => r.getAttribute('aria-selected') === 'true').length <= 1, true);
  unmount();
});

test('Escape closes the list first, then clears the text', () => {
  const { host, input, log, unmount } = mount({ initial: 'time' });
  focus(input);
  key(input, 'Escape');
  assert.equal(popup(host).hidden, true);
  assert.deepEqual(log.values, [], 'the first Escape keeps the text');
  key(input, 'Escape');
  assert.deepEqual(log.values, ['']);
  unmount();
});

test('a row is named by its title and breadcrumb and described by its context', () => {
  const { host, input, unmount } = mount({ initial: 'zone' });
  focus(input);
  const row = rows(host)[0];
  assert.equal(row.getAttribute('aria-label'), 'Time zone, Settings › Workspace › General');
  assert.equal(document.getElementById(row.getAttribute('aria-describedby')).textContent, 'Used for due dates and SLA clocks.');
  assert.deepEqual([...row.querySelectorAll('.uix-search-suggest__match')].map((m) => m.textContent), ['zone']);
  assert.equal(row.querySelector('.uix-search-suggest__meta').getAttribute('title'), 'Settings › Workspace › General', 'the full path is reachable when crumbs truncate');
  assert.equal(rows(host)[2].hasAttribute('aria-describedby'), false, 'no description, no dangling reference');
  unmount();
});

test('empty, loading and error states render in the list', () => {
  const empty = mount({ initial: 'zzq', options: [], empty: 'No settings match' });
  focus(empty.input);
  assert.ok(popup(empty.host).textContent.includes('No settings match'));
  empty.unmount();

  const loading = mount({ initial: 'ti', options: [], loading: true, loadingLabel: 'Searching…' });
  focus(loading.input);
  assert.equal(loading.input.getAttribute('aria-busy'), 'true');
  assert.ok(popup(loading.host).textContent.includes('Searching…'));
  assert.equal(loading.host.querySelectorAll('[role="status"]').length, 2, 'the field spinner and the result live region — the list echo is hidden');
  loading.unmount();

  const failed = mount({ initial: 'ti', options: [], error: 'Search is unavailable', empty: 'No settings match' });
  focus(failed.input);
  assert.ok(popup(failed.host).textContent.includes('Search is unavailable'));
  assert.ok(!popup(failed.host).textContent.includes('No settings match'), 'an error is not an empty result');
  failed.unmount();
});

test('an empty field with a heading shows it, and its action keeps the list open', () => {
  let cleared = 0;
  const { host, input, unmount } = mount({ heading: 'Recently opened', headingAction: { label: 'Clear', onSelect: () => { cleared += 1; } } });
  focus(input);
  const listbox = host.querySelector('[role="listbox"]');
  assert.equal(document.getElementById(listbox.getAttribute('aria-labelledby')).textContent, 'Recently opened');
  act(() => host.querySelector('.uix-search-suggest__header-action').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  assert.equal(cleared, 1);
  unmount();
});

test('the clear button empties the field and returns focus to it', () => {
  const { host, input, log, unmount } = mount({ initial: 'time', clearLabel: 'Clear search' });
  const clear = host.querySelector('button[aria-label="Clear search"]');
  act(() => clear.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  assert.deepEqual(log.values, ['']);
  assert.equal(document.activeElement, input);
  unmount();
});

test('the shortcut hint shows only in an empty, unfocused field', () => {
  const { host, input, unmount } = mount({ shortcutHint: '/' });
  assert.equal(host.querySelector('.uix-kbd')?.textContent, '/');
  focus(input);
  assert.equal(host.querySelector('.uix-kbd'), null);
  unmount();
});

test('the status text is announced politely', () => {
  const { host, unmount } = mount({ initial: 'ti', status: '3 results' });
  const live = host.querySelector('[aria-live="polite"]');
  assert.equal(live.textContent, '3 results');
  unmount();
});
