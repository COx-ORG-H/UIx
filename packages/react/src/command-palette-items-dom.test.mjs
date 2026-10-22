/* HAR-1378 (MOTUS C-10 StaffCommandPalette, TENSOR B2 command-palette.tsx) — CommandPalette items
 * mode in jsdom: the built-in diacritic-folding filter and its ranking, groups, recent items,
 * the active option through aria-activedescendant with ↑ / ↓ / Home / End / Enter, href items,
 * the empty state, translated words (TENSOR HAR-1458: the count must not be English), and the
 * dialog host (open / onOpenChange). Children mode is unchanged (entity-picker tests use it).
 * Focus and Escape in a real <dialog> are in tests/a11y/command-palette-items.spec.mjs.
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
  dom = new JSDOM('<!doctype html><html><body><button id="opener">Open</button></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const proto = dom.window.HTMLDialogElement.prototype;
  proto.showModal = function () { this.setAttribute('open', ''); };
  proto.close = function () { this.removeAttribute('open'); };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, root, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const type = (el, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, text);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const key = (el, k) => {
  let notPrevented;
  act(() => { notPrevented = el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
  return notPrevented;
};
const wait = (ms) => act(() => new Promise((r) => setTimeout(r, ms)));

const run = [];
const ITEMS = [
  { id: 'new-incident', label: 'Neuen Vorfall anlegen', group: 'Aktionen', keywords: ['incident', 'ticket'], shortcut: ['Mod', 'I'], onSelect: () => run.push('new-incident') },
  { id: 'assign', label: 'Mir zuweisen', group: 'Aktionen', onSelect: () => run.push('assign') },
  { id: 'overview', label: 'Übersicht', group: 'Seiten', href: '/de/uebersicht' },
  { id: 'strasse', label: 'Straßenverzeichnis', group: 'Seiten', href: '/de/strassen' },
  { id: 'reports', label: 'Berichte', group: 'Seiten', description: 'Monatsberichte und Exporte', href: '/de/berichte' },
  { id: 'archived', label: 'Archiv (nur Lesen)', group: 'Seiten', disabled: true },
];

test('filterCommandItems folds case and diacritics and ranks prefix, word starts, contains, keywords', () => {
  const ids = (q) => ui.filterCommandItems(ITEMS, q).map((i) => i.id);
  assert.deepEqual(ids(''), ITEMS.map((i) => i.id), 'an empty query finds everything, in order');
  assert.deepEqual(ids('ubersicht'), ['overview']);
  assert.deepEqual(ids('strasse'), ['strasse'], 'ß folds to ss');
  assert.deepEqual(ids('ticket'), ['new-incident'], 'keywords find without being shown');
  const ranked = ui.filterCommandItems([
    { id: 'contains', label: 'Abberichte' }, { id: 'word', label: 'Alle Berichte' }, { id: 'prefix', label: 'Berichte' }, { id: 'kw', label: 'Export', keywords: ['berichte'] },
  ], 'berichte');
  assert.deepEqual(ranked.map((i) => i.id), ['prefix', 'word', 'contains', 'kw']);
  assert.deepEqual(ui.groupCommandItems(ranked.slice(0, 2).map((i, n) => ({ ...i, group: n ? 'B' : 'A' }))).map((g) => g.label), ['A', 'B']);
});

test('groups, the first option active, arrows wrap and skip disabled items, Enter runs it', async () => {
  run.length = 0;
  const chosen = [];
  const t = mount(h(ui.CommandPalette, { items: ITEMS, inputLabel: 'Befehle', onItemSelect: (i) => chosen.push(i.id), onNavigate: (href) => run.push(`nav ${href}`) }));
  const input = t.host.querySelector('input[role="combobox"]');
  const listbox = t.host.querySelector('[role="listbox"]');
  assert.equal(input.getAttribute('aria-controls'), listbox.id);
  assert.deepEqual([...t.host.querySelectorAll('.uix-cmdk__group')].map((g) => g.textContent), ['Aktionen', 'Seiten']);
  const groups = [...listbox.querySelectorAll(':scope > [role="group"]')];
  assert.equal(groups[0].getAttribute('aria-labelledby'), groups[0].querySelector('.uix-cmdk__group').id);
  const active = () => document.getElementById(input.getAttribute('aria-activedescendant'));
  assert.equal(active().textContent.startsWith('Neuen Vorfall anlegen'), true, 'the first option is active');
  assert.equal(active().getAttribute('aria-selected'), 'true');
  assert.equal(active().getAttribute('aria-keyshortcuts'), 'Control+I', 'the shortcut is announced (Windows/Linux in jsdom)');
  key(input, 'ArrowUp');
  assert.equal(active().textContent, 'BerichteMonatsberichte und Exporte', 'wraps to the last enabled option, past the disabled one');
  key(input, 'ArrowDown');
  key(input, 'ArrowDown');
  assert.equal(active().textContent, 'Mir zuweisen');
  assert.equal(key(input, 'Enter'), false);
  assert.deepEqual(run, ['assign']);
  assert.deepEqual(chosen, ['assign']);
  // Home / End jump while the query is empty, and move the caret once there is text.
  key(input, 'End');
  assert.match(active().textContent, /^Berichte/);
  key(input, 'Home');
  assert.match(active().textContent, /^Neuen Vorfall/);
  type(input, 'seite');
  assert.equal(key(input, 'End'), true, 'End is the caret\'s while there is a query');
  t.unmount();
});

test('typing filters, keeps the active option while it is still found, marks the match; href items navigate', async () => {
  run.length = 0;
  const t = mount(h(ui.CommandPalette, { items: ITEMS, onNavigate: (href) => run.push(`nav ${href}`) }));
  const input = t.host.querySelector('input');
  const active = () => document.getElementById(input.getAttribute('aria-activedescendant'));
  key(input, 'ArrowDown');
  type(input, 'r');
  assert.ok(active(), 'an active option at once, in the same render as the new list');
  type(input, 'ubers');
  assert.deepEqual([...t.host.querySelectorAll('[role="option"]')].map((o) => o.textContent), ['Übersicht']);
  assert.equal(t.host.querySelector('.uix-cmdk__mark').textContent, 'Übers', 'the folded match is marked on the original text');
  key(input, 'Enter');
  assert.deepEqual(run, ['nav /de/uebersicht']);
  t.unmount();
});

test('nothing found: the empty state, no active option, the count announced in the given words', async () => {
  const t = mount(h(ui.UixLabelsProvider, { labels: { commandPalette: { empty: 'Keine Treffer', resultsOne: '{count} Ergebnis', resultsMany: '{count} Ergebnisse' } } },
    h(ui.CommandPalette, { items: ITEMS })));
  const input = t.host.querySelector('input');
  await wait(200);
  assert.equal(t.host.querySelector('[role="status"]').textContent, '6 Ergebnisse');
  type(input, 'zzz');
  await wait(200);
  assert.equal(t.host.querySelector('.uix-cmdk__empty').textContent, 'Keine Treffer');
  assert.equal(input.hasAttribute('aria-activedescendant'), false);
  assert.equal(t.host.querySelector('[role="status"]').textContent, '0 Ergebnisse');
  assert.equal(key(input, 'Enter'), true, 'Enter with nothing found does nothing');
  type(input, 'mir');
  await wait(200);
  assert.equal(t.host.querySelector('[role="status"]').textContent, '1 Ergebnis');
  t.unmount();
});

test('recent items lead an empty query under their heading', () => {
  const t = mount(h(ui.CommandPalette, { items: ITEMS, recent: [ITEMS[2]], recentLabel: 'Zuletzt' }));
  assert.deepEqual([...t.host.querySelectorAll('.uix-cmdk__group')].map((g) => g.textContent), ['Zuletzt', 'Aktionen', 'Seiten']);
  const input = t.host.querySelector('input');
  assert.equal(document.getElementById(input.getAttribute('aria-activedescendant')).textContent, 'Übersicht', 'the recent item is first');
  const ids = [...t.host.querySelectorAll('[role="option"]')].map((o) => o.id);
  assert.equal(new Set(ids).size, ids.length, 'the recent copy has its own id');
  type(input, 'ber');
  assert.equal(t.host.querySelector('.uix-cmdk__group').textContent, 'Seiten', 'no recent heading once there is a query');
  t.unmount();
});

test('open / onOpenChange: a dialog; a choice closes it, clears the query and returns focus', () => {
  run.length = 0;
  function Host() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    return h('div', null,
      h('button', { id: 'launch', type: 'button', onClick: () => setOpen(true) }, 'Befehle'),
      h('output', { id: 'q' }, query),
      h(ui.CommandPalette, { items: ITEMS, open, onOpenChange: setOpen, query, onQueryChange: setQuery }));
  }
  const t = mount(h(Host));
  const dialog = t.host.querySelector('dialog');
  assert.equal(dialog.hasAttribute('open'), false);
  assert.equal(dialog.dataset.uixCmdkDialog, '');
  const launch = t.host.querySelector('#launch');
  launch.focus();
  act(() => launch.click());
  assert.equal(dialog.hasAttribute('open'), true);
  const input = dialog.querySelector('input');
  assert.equal(document.activeElement, input, 'focus goes to the field');
  type(input, 'zuweisen');
  assert.equal(t.host.querySelector('#q').textContent, 'zuweisen', 'onQueryChange reports the controlled query');
  key(input, 'Enter');
  assert.deepEqual(run, ['assign']);
  assert.equal(dialog.hasAttribute('open'), false, 'a choice closes it');
  assert.equal(t.host.querySelector('#q').textContent, '', 'closing clears the query');
  assert.equal(document.activeElement, launch, 'focus is back on the opener');
  t.unmount();
});

test('children mode is unchanged', () => {
  const t = mount(h(ui.CommandPalette, { inputProps: { placeholder: 'Search' } }, h(ui.CommandItem, { active: true }, 'One')));
  assert.equal(t.host.querySelector('.uix-cmdk').hasAttribute('data-items'), false);
  assert.equal(t.host.querySelector('[role="option"]').getAttribute('aria-selected'), 'true');
  t.unmount();
});
