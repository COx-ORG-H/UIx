/* Roadmap #9 — CommandPalette items mode, the second half: server sources (debounce, abort, rows
 * kept while the next answer loads, a delayed loading row, an error row with Retry, the count once
 * every source answered), the page stack (Escape / Backspace in an empty field step back, the
 * breadcrumb, query and active row restored), aliases shown as "Title (alias)", contextBoost and
 * frecency (rankCommandItems, the frecency model, useCommandFrecency with an injected storage).
 * Real-browser Escape, focus and axe: tests/a11y/command-palette-sources.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, StrictMode, useState } from 'react';

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
  return { host, root, rerender: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const type = (el, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, text);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const key = (el, k, init = {}) => {
  let notPrevented;
  act(() => { notPrevented = el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })); });
  return notPrevented;
};
const wait = (ms) => act(() => new Promise((r) => setTimeout(r, ms)));
const labels = (host) => [...host.querySelectorAll('[role="option"] .uix-cmdk__label')].map((el) => el.textContent);
const activeLabel = (host) => {
  const input = host.querySelector('input[role="combobox"]');
  return document.getElementById(input.getAttribute('aria-activedescendant'))?.querySelector('.uix-cmdk__label')?.textContent ?? null;
};
/** A promise settled from outside, to hold a source's answer until the test lets it go. */
const deferred = () => {
  let resolve; let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

test('rankCommandItems: aliases match and say so, a whole alias ranks like a prefix, keywords stay unseen', () => {
  const items = [
    { id: 'archive', label: 'Mark done', aliases: ['Archive'] },
    { id: 'arch', label: 'Architecture review' },
    { id: 'kw', label: 'Close', keywords: ['archive'] },
  ];
  const ranked = ui.rankCommandItems(items, 'archive');
  assert.deepEqual(ranked.map((r) => [r.item.id, r.alias ?? null]), [['archive', 'Archive'], ['kw', null]], 'the alias is named; the keyword match is not');
  assert.equal(ranked[0].score, 1, 'a whole alias counts like a label prefix');
  const partial = ui.rankCommandItems(items, 'arch');
  assert.deepEqual(partial.map((r) => r.item.id), ['arch', 'archive', 'kw'], 'a label prefix beats an alias prefix');
  assert.equal(partial[1].alias, 'Archive');
  // the label matching as well as the alias: no alias shown
  assert.equal(ui.rankCommandItems([{ id: 'x', label: 'Archive now', aliases: ['Archive'] }], 'archive')[0].alias, undefined);
});

test('rankCommandItems orders exactly as filterCommandItems for plain items, and folds diacritics', () => {
  const items = [
    { id: 'contains', label: 'Abberichte' }, { id: 'word', label: 'Alle Berichte' }, { id: 'prefix', label: 'Berichte' },
    { id: 'kw', label: 'Export', keywords: ['berichte'] }, { id: 'none', label: 'Übersicht' },
  ];
  for (const q of ['berichte', 'be', 'ber ich', '', 'ubersicht', 'x']) {
    assert.deepEqual(ui.rankCommandItems(items, q).map((r) => r.item.id), ui.filterCommandItems(items, q).map((i) => i.id), `query "${q}"`);
  }
});

test('rankCommandItems: contextBoost and frecency reorder but never hide', () => {
  const items = [{ id: 'a', label: 'Reports' }, { id: 'b', label: 'Resolve' }, { id: 'c', label: 'Assign', contextBoost: 1 }];
  assert.deepEqual(ui.rankCommandItems(items, '').map((r) => r.item.id), ['c', 'a', 'b'], 'an empty query puts the boosted command first');
  assert.deepEqual(ui.rankCommandItems(items, 're').map((r) => r.item.id), ['a', 'b'], 'a boost does not find what the query does not');
  const used = ui.rankCommandItems(items, 're', { frecency: (id) => (id === 'b' ? 1 : 0) });
  assert.deepEqual(used.map((r) => r.item.id), ['b', 'a']);
  assert.equal(used[0].score, 1 + ui.FRECENCY_WEIGHT);
  assert.deepEqual(ui.rankCommandItems(items, '', { frecency: () => Number.NaN }).map((r) => r.item.id), ['c', 'a', 'b'], 'a broken score counts as unused');
  assert.deepEqual(ui.rankCommandItems([{ id: 'n', label: 'Neg', contextBoost: -5 }], 'neg').map((r) => r.score), [1], 'a negative boost is no boost');
});

test('the frecency model: decays by half-life, scores 0..1, trims the least used, drops malformed entries', () => {
  const day = 24 * 60 * 60 * 1000;
  let entries = {};
  entries = ui.recordCommandUse(entries, 'a', 0);
  entries = ui.recordCommandUse(entries, 'a', 0);
  assert.equal(entries.a.count, 2);
  assert.equal(ui.decayedFrecency(entries.a, 7 * day), 1, 'two uses a week ago weigh one');
  assert.equal(ui.commandFrecencyScore(entries.a, 0), 2 / 5);
  assert.equal(ui.commandFrecencyScore(undefined, 0), 0);
  entries = ui.recordCommandUse(entries, 'b', 7 * day, { max: 1 });
  assert.deepEqual(Object.keys(entries), ['b'], 'one fresh use outweighs two week-old ones that decayed to one');
  assert.deepEqual(ui.parseCommandFrecency({ ok: { value: 1, last: 2, count: 1 }, bad: { value: 'x' }, also: null }), { ok: { value: 1, last: 2, count: 1 } });
  assert.deepEqual(ui.parseCommandFrecency([1, 2]), {});
});

test('useCommandFrecency: reads the injected storage after mount, records, resets, lists recent; localStorage by default', async () => {
  const writes = [];
  let stored = { old: { value: 4, last: Date.now() - 1000, count: 4 } };
  let notify = null;
  const storage = { read: () => stored, write: (next) => { stored = next; writes.push(next); }, subscribe: (fn) => { notify = fn; return () => { notify = null; }; } };
  let api;
  function Probe({ options }) { api = ui.useCommandFrecency(options); return null; }
  const t = mount(h(StrictMode, null, h(Probe, { options: { storage } })));
  assert.ok(api.score('old') > 0, 'the stored use arrives after mount');
  act(() => api.record('new'));
  assert.equal(writes.length, 1);
  assert.ok(writes[0].new && writes[0].old, 'a record writes every entry');
  const items = [{ id: 'old' }, { id: 'new' }, { id: 'never' }];
  assert.deepEqual(api.recent(items).map((i) => i.id), ['new', 'old'], 'last used first, unused left out');
  act(() => api.reset('old'));
  assert.equal(api.score('old'), 0);
  stored = { other: { value: 1, last: Date.now(), count: 1 } };
  act(() => notify());
  assert.deepEqual(Object.keys(api.entries), ['other'], 'another tab or device changed it');
  act(() => api.reset());
  assert.deepEqual(api.entries, {});
  t.unmount();
  assert.equal(notify, null, 'unsubscribed on unmount');

  window.localStorage.clear();
  const d = mount(h(Probe, { options: {} }));
  act(() => api.record('cmd'));
  assert.ok(JSON.parse(window.localStorage.getItem(ui.COMMAND_FRECENCY_STORAGE_KEY)).cmd, 'the default storage is localStorage');
  d.unmount();
  const again = mount(h(Probe, { options: {} }));
  assert.ok(api.score('cmd') > 0, 'and it is read back');
  again.unmount();
});

test('an alias that matched shows after the label; the palette records chosen commands in frecency', () => {
  const recorded = [];
  const frecency = { score: (id) => (id === 'reports' ? 1 : 0), record: (id) => recorded.push(id) };
  const t = mount(h(ui.CommandPalette, {
    inputLabel: 'Commands', frecency,
    items: [{ id: 'resolve', label: 'Resolve' }, { id: 'reports', label: 'Reports' }, { id: 'done', label: 'Mark done', aliases: ['Archive'] }],
  }));
  const input = t.host.querySelector('input');
  assert.deepEqual(labels(t.host), ['Reports', 'Resolve', 'Mark done'], 'frecency orders the empty query');
  type(input, 'archi');
  assert.deepEqual(labels(t.host), ['Mark done (Archive)']);
  assert.equal(t.host.querySelector('.uix-cmdk__alias mark').textContent, 'Archi', 'the match is marked inside the alias too');
  key(input, 'Enter');
  assert.deepEqual(recorded, ['done']);
  t.unmount();
});

const PEOPLE = ['Ana Kovač', 'Emir Hadžić', 'Lea Novak'];
const peoplePage = (assigned) => ({
  id: 'assign', label: 'Assign to…', placeholder: 'Search people…',
  items: PEOPLE.map((name) => ({ id: `p-${name}`, label: name, onSelect: () => assigned.push(name) })),
});

test('pages: an item opens its page, Backspace in an empty field and Escape step back with the query and row restored', () => {
  const assigned = [];
  const chosen = [];
  const t = mount(h(ui.CommandPalette, {
    inputLabel: 'Commands', onItemSelect: (item) => chosen.push(item.id),
    items: [{ id: 'resolve', label: 'Resolve' }, { id: 'assign', label: 'Assign to…', page: peoplePage(assigned) }, { id: 'archive', label: 'Assign later' }],
  }));
  const input = t.host.querySelector('input');
  type(input, 'assi');
  key(input, 'ArrowDown');
  assert.equal(activeLabel(t.host), 'Assign later');
  key(input, 'ArrowUp');
  assert.equal(activeLabel(t.host), 'Assign to…');
  assert.ok(t.host.querySelector('[role="option"][aria-selected="true"] .uix-cmdk__chevron'), 'a page item ends in a chevron');
  key(input, 'Enter');
  assert.deepEqual(chosen, ['assign'], 'opening a page is a choice too');
  assert.equal(input.value, '', 'the page starts with an empty field');
  assert.equal(input.getAttribute('aria-label'), 'Assign to…');
  assert.equal(input.getAttribute('placeholder'), 'Search people…');
  assert.deepEqual(labels(t.host), PEOPLE);
  const crumbs = t.host.querySelector('nav.uix-cmdk__crumbs');
  assert.equal(crumbs.getAttribute('aria-label'), 'Breadcrumb');
  assert.equal(crumbs.querySelector('button').textContent, 'Commands');
  assert.equal(crumbs.querySelector('[aria-current="page"]').textContent, 'Assign to…');

  assert.equal(key(input, 'Backspace', { repeat: true }), true, 'a held Backspace that emptied the field does not step back');
  assert.equal(input.getAttribute('aria-label'), 'Assign to…');
  assert.equal(key(input, 'Backspace'), false);
  assert.equal(input.value, 'assi', 'back on the top level, its query is back');
  assert.equal(activeLabel(t.host), 'Assign to…', 'and so is the row that opened the page');
  assert.equal(t.host.querySelector('nav.uix-cmdk__crumbs'), null);
  assert.equal(key(input, 'Backspace'), true, 'Backspace on the top level just edits');

  key(input, 'Enter');
  type(input, 'lea');
  assert.equal(key(input, 'Escape'), false, 'Escape on a page is taken: it steps back');
  assert.equal(input.value, 'assi');
  assert.equal(key(input, 'Escape'), true, 'Escape on the top level is left to the dialog');

  key(input, 'Enter');
  act(() => t.host.querySelector('.uix-cmdk__crumb').click());
  assert.equal(input.value, 'assi', 'the root crumb steps back too');
  assert.equal(document.activeElement, input, 'and focus is in the field');
  key(input, 'Enter');
  type(input, 'emir');
  key(input, 'Enter');
  assert.deepEqual(assigned, ['Emir Hadžić']);
  t.unmount();
});

test('pages in the dialog: Escape steps back without closing, closing returns to the top level', () => {
  let setOpenFromTest;
  function Host() {
    const [open, setOpen] = useState(true);
    setOpenFromTest = setOpen;
    return h(ui.CommandPalette, { open, onOpenChange: setOpen, inputLabel: 'Commands', items: [{ id: 'assign', label: 'Assign to…', page: peoplePage([]) }] });
  }
  const t = mount(h(Host));
  const dialog = t.host.querySelector('dialog');
  const input = dialog.querySelector('input');
  key(input, 'Enter');
  assert.equal(input.getAttribute('aria-label'), 'Assign to…');
  key(input, 'Escape');
  const cancel = new window.Event('cancel', { cancelable: true });
  act(() => dialog.dispatchEvent(cancel));
  assert.equal(cancel.defaultPrevented, true, 'a cancel from the same Escape is refused');
  assert.ok(dialog.hasAttribute('open'));
  assert.equal(input.getAttribute('aria-label'), 'Commands');
  key(input, 'Enter');
  assert.equal(input.getAttribute('aria-label'), 'Assign to…');
  act(() => { dialog.removeAttribute('open'); dialog.dispatchEvent(new window.Event('close')); });
  assert.equal(dialog.hasAttribute('open'), false, 'Escape on the top level (the native close) closes');
  act(() => setOpenFromTest(true));
  assert.equal(input.getAttribute('aria-label'), 'Commands', 'reopened on the top level');
  assert.equal(t.host.querySelector('nav.uix-cmdk__crumbs'), null);
  t.unmount();
});

test('sources: debounced, the overtaken search aborted, rows kept (inert) while the next answer loads', async () => {
  const calls = [];
  const source = {
    id: 'tickets', label: 'Tickets', debounce: 20,
    load: (query, signal) => { const d = deferred(); calls.push({ query, signal, d }); return d.promise; },
  };
  const chosen = [];
  const t = mount(h(StrictMode, null, h(ui.CommandPalette, {
    inputLabel: 'Commands', sources: [source], onItemSelect: (item) => chosen.push(item.id),
    items: [{ id: 'new', label: 'New ticket' }],
  })));
  const input = t.host.querySelector('input');
  assert.equal(calls.length, 0, 'an empty query asks nothing');
  type(input, 'in');
  type(input, 'inc');
  await wait(40);
  assert.deepEqual(calls.map((c) => c.query), ['inc'], 'one search, for the settled query');
  assert.equal(input.getAttribute('aria-busy'), 'true');
  await act(async () => calls[0].d.resolve([{ id: 'INC-1', label: 'INC-1 Printer' }, { id: 'INC-2', label: 'INC-2 VPN' }]));
  assert.deepEqual(labels(t.host), ['INC-1 Printer', 'INC-2 VPN']);
  assert.equal(t.host.querySelector('[role="group"] .uix-cmdk__group').textContent, 'Tickets');
  assert.equal(input.hasAttribute('aria-busy'), false);

  type(input, 'inc-');
  const kept = [...t.host.querySelectorAll('[role="option"]')];
  assert.equal(kept.length, 2, 'the last answer stays on screen');
  assert.ok(kept.every((row) => row.getAttribute('aria-disabled') === 'true' && row.hasAttribute('data-stale')), 'but cannot be chosen');
  assert.equal(input.getAttribute('aria-busy'), 'true', 'busy from the keystroke, not from the end of the debounce');
  key(input, 'Enter');
  assert.deepEqual(chosen, [], 'Enter never picks a row of the previous query');
  await wait(40);
  type(input, 'inc-0');
  assert.equal(calls[1].signal.aborted, true, 'the search the next keystroke overtook is aborted');
  await act(async () => calls[1].d.resolve([{ id: 'late', label: 'Late answer' }]));
  assert.ok(!labels(t.host).includes('Late answer'), 'and its late answer is dropped');
  await wait(40);
  await act(async () => calls[2].d.resolve([{ id: 'INC-3', label: 'INC-3 Mail' }]));
  assert.deepEqual(labels(t.host), ['INC-3 Mail']);
  key(input, 'Enter');
  assert.deepEqual(chosen, ['INC-3']);
  type(input, 'inc-09');
  await wait(40);
  await act(async () => calls[3].d.resolve([]));
  assert.equal(t.host.querySelector('.uix-cmdk__group'), null, 'a source that found nothing leaves no empty heading');
  assert.equal(t.host.querySelector('.uix-cmdk__empty').textContent, 'No results');
  t.unmount();
  assert.equal(calls.at(-1).signal.aborted, false, 'a settled search is not aborted after the fact');
});

test('sources: the loading row waits for the pending delay; a failure shows a Retry row that searches again', async () => {
  let attempt = 0;
  let pending = deferred();
  const source = {
    id: 'people', label: 'People', debounce: 0,
    load: () => { attempt += 1; pending = deferred(); return pending.promise; },
  };
  const t = mount(h(ui.CommandPalette, { inputLabel: 'Commands', sources: [source], items: [], emptyLabel: 'Nothing' }));
  const input = t.host.querySelector('input');
  type(input, 'em');
  await wait(0);
  assert.equal(t.host.querySelector('.uix-cmdk__status'), null, 'no loading row at once');
  assert.equal(t.host.querySelector('.uix-cmdk__empty'), null, 'and no "nothing found" while it searches');
  await wait(350);
  assert.equal(t.host.querySelector('.uix-cmdk__status').textContent, 'Searching…');
  await act(async () => pending.reject(new Error('503')));
  assert.equal(t.host.querySelector('.uix-cmdk__status'), null);
  const retryRow = t.host.querySelector('.uix-cmdk__item--retry');
  assert.equal(retryRow.textContent, 'Search failedRetry');
  assert.equal(activeLabel(t.host), 'Search failed', 'Retry is the active row');
  await wait(200);
  assert.equal(t.host.querySelector('.uix-visually-hidden[role="status"]').textContent, '0 results. People: Search failed', 'the failure is announced');
  key(input, 'Enter');
  assert.equal(attempt, 2, 'Enter on the row searches again at once');
  assert.equal(t.host.querySelector('.uix-cmdk__item--retry'), null);
  await act(async () => pending.resolve([{ id: 'p1', label: 'Emir Hadžić' }]));
  assert.deepEqual(labels(t.host), ['Emir Hadžić']);
  await wait(200);
  assert.equal(t.host.querySelector('.uix-visually-hidden[role="status"]').textContent, '1 result');
  // an AbortError is never shown as a failure
  type(input, 'emi');
  await wait(0);
  await act(async () => pending.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  assert.equal(t.host.querySelector('.uix-cmdk__item--retry'), null);
  t.unmount();
});

test('sources: minQueryLength, boosted sources first, commands before results, closing aborts and forgets', async () => {
  const signals = [];
  // 'find' never answers, so closing finds it in flight
  const make = (id, label, extra = {}) => ({
    id, label, debounce: 0, ...extra,
    load: (query, signal) => { signals.push(signal); return query === 'find' ? new Promise(() => {}) : Promise.resolve([{ id: `${id}-${query}`, label: `${label} ${query}` }]); },
  });
  function Host({ open }) {
    return h(ui.CommandPalette, {
      open, onOpenChange: () => {}, inputLabel: 'Commands',
      items: [{ id: 'cmd', label: 'Find anything' }],
      sources: [make('tickets', 'Tickets', { minQueryLength: 3 }), make('people', 'People', { contextBoost: 1 })],
    });
  }
  const t = mount(h(Host, { open: true }));
  const input = t.host.querySelector('input');
  type(input, 'fi');
  await wait(10);
  assert.deepEqual([...t.host.querySelectorAll('.uix-cmdk__group')].map((g) => g.textContent), ['People'], 'too short for Tickets; the command group has no heading');
  assert.deepEqual(labels(t.host), ['Find anything', 'People fi']);
  type(input, 'fin');
  await wait(10);
  assert.deepEqual([...t.host.querySelectorAll('.uix-cmdk__group')].map((g) => g.textContent), ['People', 'Tickets'], 'the boosted source leads the results');
  type(input, 'find');
  const inFlight = signals.slice(-2);
  t.rerender(h(Host, { open: false }));
  assert.ok(inFlight.every((signal) => signal.aborted), 'closing aborts the searches in flight');
  assert.ok(signals.slice(0, -2).every((signal) => !signal.aborted), 'answered searches are left alone');
  t.rerender(h(Host, { open: true }));
  assert.deepEqual(labels(t.host), ['Find anything'], 'reopened, no rows of the last session come back');
  t.unmount();
});
