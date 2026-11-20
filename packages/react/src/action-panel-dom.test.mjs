/* The per-row action panel (enterprise UX study, roadmap #10; spec Docs/specs/2026-11-20-action-panel.md)
 * in jsdom: the model's order (primary first, groups, destructive last even when searching), then
 * DataWorkspace getRowActions and ActionPanelScope on the shortcut registry: Enter runs the primary
 * action, Ctrl+K opens the row's panel with each action's keys, a second Ctrl+K (or one off a row)
 * reaches the command palette, the action keys work only in the rows and follow the switch and
 * remaps, a destructive action asks first (or runs when undoable), focus goes back to the row, and
 * the words come from UixLabelsProvider.
 * Focus in a real browser, the anchored <dialog> and axe are in tests/a11y/action-panel.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useCallback, useState } from 'react';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('HTMLElement', dom.window.HTMLElement);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('MutationObserver', dom.window.MutationObserver);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const proto = dom.window.HTMLDialogElement.prototype;
  proto.showModal = function () { this.setAttribute('open', ''); };
  proto.close = function () { this.removeAttribute('open'); };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'getComputedStyle', 'MutationObserver', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mounted = [];
const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  const handle = { host, root, unmount: () => { act(() => root.unmount()); host.remove(); } };
  mounted.push(handle);
  return handle;
};
afterEach(() => { while (mounted.length) { const m = mounted.pop(); if (m.host.isConnected) m.unmount(); } });
const press = (key, init = {}, target = document.activeElement ?? document.body) => {
  let event;
  act(() => {
    event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    (target ?? document.body).dispatchEvent(event);
  });
  return event.defaultPrevented;
};
const type = (input, value) => act(() => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 5)));

// —— the model ——————————————————————————————————————————————————————————————————————————————

const A = (id, extra = {}) => ({ id, label: id, onSelect() {}, ...extra });

test('groupActionPanelActions: primary first, groups where they first appear, destructive last', () => {
  const actions = [
    A('Assign to me', { group: 'Ticket' }),
    A('Delete', { destructive: true }),
    A('Open', { primary: true, group: 'Ticket' }),
    A('Copy link', { group: 'Share' }),
    A('Set priority', { group: 'Ticket' }),
    A('Merge into…', { group: 'Ticket', destructive: true, undoable: true }),
  ];
  const groups = ui.groupActionPanelActions(actions);
  assert.deepEqual(groups.map((g) => [g.label ?? null, g.destructive, g.actions.map((a) => a.id)]), [
    [null, false, ['Open']],
    ['Ticket', false, ['Assign to me', 'Set priority']],
    ['Share', false, ['Copy link']],
    [null, true, ['Delete', 'Merge into…']],
  ]);
  // A query: one flat list, best match first, destructive still last.
  const found = ui.groupActionPanelActions(actions, 'de');
  assert.deepEqual(found.map((g) => [g.destructive, g.actions.map((a) => a.id)]), [[true, ['Delete']]]);
  const mixed = ui.groupActionPanelActions([A('Delete draft', { destructive: true }), A('Draft reply'), A('Redraft')], 'dra');
  assert.deepEqual(mixed.map((g) => g.actions.map((a) => a.id)), [['Draft reply', 'Redraft'], ['Delete draft']], 'Enter on a loose query never reaches Delete first');
  // Diacritics fold as in the palette.
  assert.deepEqual(ui.groupActionPanelActions([A('Zuweisen'), A('Löschen', { destructive: true })], 'losch').flatMap((g) => g.actions.map((a) => a.id)), ['Löschen']);
  // A disabled primary does not lead.
  assert.deepEqual(ui.groupActionPanelActions([A('B'), A('P', { primary: true, disabled: true })]).flatMap((g) => g.actions.map((a) => a.id)), ['B', 'P']);
});

// —— DataWorkspace getRowActions ————————————————————————————————————————————————————————————

const ROWS = [
  { id: 'INC-1', title: 'Mail outage' },
  { id: 'INC-2', title: 'VPN drops' },
  { id: 'INC-3', title: 'Printer' },
];
const COLUMNS = [{ id: 'title', header: 'Title', cell: (r) => r.title }];

function Queue({ log, workspace = {}, preferences, onRowActivate, labels }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(ROWS);
  const getRowActions = useCallback((row) => [
    { id: 'ticket.open', label: 'Open', primary: true, onSelect: () => log.push(`open ${row.id}`) },
    { id: 'ticket.assign', label: 'Assign to me', group: 'Ticket', keys: 'A', onSelect: () => log.push(`assign ${row.id}`) },
    { id: 'ticket.priority', label: 'Set priority', group: 'Ticket', keys: 'P', disabled: row.id === 'INC-3', onSelect: () => log.push(`priority ${row.id}`) },
    { id: 'ticket.delete', label: 'Delete ticket', keys: 'Shift+D', destructive: true, onSelect: () => { log.push(`delete ${row.id}`); setRows((all) => all.filter((r) => r.id !== row.id)); } },
    { id: 'ticket.archive', label: 'Archive', keys: 'E', destructive: true, undoable: true, onSelect: () => log.push(`archive ${row.id}`) },
  ], [log]);
  const workspaceEl = h(ui.DataWorkspace, {
    label: 'Tickets', rows, getRowId: (r) => r.id, columns: COLUMNS,
    idColumn: { header: 'ID', text: (r) => r.id }, getRowActions, onRowActivate, ...workspace,
  });
  const app = h(ui.ShortcutProvider, { storageKey: null, platform: 'other', preferences, onPreferencesChange: preferences ? () => {} : undefined },
    h('button', { type: 'button', id: 'outside' }, 'Outside'),
    workspaceEl,
    h(ui.CommandPalette, { open, onOpenChange: (next) => { log.push(`palette ${next}`); setOpen(next); }, shortcut: 'Mod+K', items: [{ id: 'x', label: 'Something' }] }));
  return labels ? h(ui.UixLabelsProvider, { labels }, app) : app;
}

const rowEl = (host, id) => host.querySelector(`tr[data-uix-row-id="${id}"]`);
const panel = (host) => host.querySelector('dialog.uix-action-panel');
const palette = (host) => host.querySelector('dialog.uix-cmdk-dialog');
const options = (host) => [...panel(host).querySelectorAll('[role="option"]')].map((o) => {
  const label = o.querySelector('.uix-cmdk__label').textContent;
  const keys = o.querySelector('.uix-cmdk__shortcut .uix-visually-hidden')?.textContent;
  return keys ? `${label} [${keys}]` : label;
});
const focusRow = (host, id) => act(() => rowEl(host, id).focus());

test('Ctrl+K on a focused row opens its panel: every action with its keys, the primary first, destructive last', async () => {
  const log = [];
  const t = mount(h(Queue, { log }));
  await flush();
  assert.equal(rowEl(t.host, 'INC-1').getAttribute('tabindex'), '0', 'getRowActions turns on the row model');
  focusRow(t.host, 'INC-1');
  assert.equal(press('k', { ctrlKey: true }), true);
  const dialog = panel(t.host);
  assert.ok(dialog.hasAttribute('open'));
  assert.equal(dialog.getAttribute('aria-label'), 'Actions for INC-1');
  assert.ok(dialog.hasAttribute('data-uix-instant'), 'keyboard-first: no animation');
  assert.equal(palette(t.host).hasAttribute('open'), false, 'the first press is local: the palette stays shut');
  const input = dialog.querySelector('input[role="combobox"]');
  assert.equal(document.activeElement, input);
  assert.equal(input.getAttribute('aria-label'), 'Search actions');
  assert.deepEqual(options(t.host), ['Open [Enter]', 'Assign to me [A]', 'Set priority [P]', 'Delete ticket [Shift+D]', 'Archive [E]']);
  assert.equal(dialog.querySelector('.uix-cmdk__group').textContent, 'Ticket');
  const danger = dialog.querySelector('.uix-action-panel__danger');
  assert.equal(danger.getAttribute('aria-label'), 'Destructive actions');
  assert.equal(danger.querySelectorAll('.uix-action-panel__item--danger').length, 2);
  // The option's aria-keyshortcuts carry its registered keys, never the row's Enter.
  const opts = dialog.querySelectorAll('[role="option"]');
  assert.equal(opts[0].hasAttribute('aria-keyshortcuts'), false);
  assert.equal(opts[1].getAttribute('aria-keyshortcuts'), 'A');
  assert.equal(input.getAttribute('aria-activedescendant'), opts[0].id);
  // ↓ then Enter: Assign runs after the panel closed and focus is back on the row.
  press('ArrowDown', {}, input);
  assert.equal(input.getAttribute('aria-activedescendant'), opts[1].id);
  press('Enter', {}, input);
  assert.equal(panel(t.host).hasAttribute('open'), false);
  assert.equal(document.activeElement, rowEl(t.host, 'INC-1'));
  assert.deepEqual(log, ['assign INC-1']);
});

test('first press local, second press global: Ctrl+K in the open panel closes it, focus goes back, the palette opens', async () => {
  const log = [];
  const t = mount(h(Queue, { log }));
  await flush();
  focusRow(t.host, 'INC-2');
  press('k', { ctrlKey: true });
  assert.ok(panel(t.host).hasAttribute('open'));
  press('k', { ctrlKey: true });
  assert.equal(panel(t.host).hasAttribute('open'), false);
  assert.ok(palette(t.host).hasAttribute('open'), 'the second press reaches the palette');
  assert.deepEqual(log, ['palette true']);
  assert.equal(document.activeElement, palette(t.host).querySelector('input'));
  t.unmount();
  // Off a row (a button outside the rows, a header of the table), the first press is the palette's.
  for (const where of ['outside', 'header']) {
    const u = mount(h(Queue, { log: [] }));
    await flush();
    const target = where === 'outside' ? document.getElementById('outside') : u.host.querySelector('thead th');
    if (where === 'header') target.tabIndex = -1;
    act(() => target.focus());
    assert.equal(document.activeElement, target);
    press('k', { ctrlKey: true });
    assert.equal(panel(u.host).hasAttribute('open'), false, where);
    assert.ok(palette(u.host).hasAttribute('open'), where);
    u.unmount();
  }
});

test('Enter on a row runs its primary action; onRowActivate, when set, is the primary instead', async () => {
  const log = [];
  const t = mount(h(Queue, { log }));
  await flush();
  focusRow(t.host, 'INC-2');
  press('Enter');
  assert.deepEqual(log, ['open INC-2']);
  assert.equal(panel(t.host).hasAttribute('open'), false, 'Enter runs it without the panel');
  t.unmount();
  const log2 = [];
  const u = mount(h(Queue, { log: log2, onRowActivate: (row) => log2.push(`activate ${row.id}`) }));
  await flush();
  focusRow(u.host, 'INC-1');
  press('Enter');
  assert.deepEqual(log2, ['activate INC-1']);
  press('k', { ctrlKey: true });
  assert.equal(options(u.host)[0], 'Open', 'no ↵ on an action Enter does not run');
});

test('action keys work only on a row, follow the single-key switch and remaps; disabled actions do nothing', async () => {
  const log = [];
  const t = mount(h(Queue, { log }));
  await flush();
  act(() => document.getElementById('outside').focus());
  assert.equal(press('a'), false, 'A outside the rows is not a shortcut');
  focusRow(t.host, 'INC-1');
  assert.equal(press('a'), true);
  focusRow(t.host, 'INC-3');
  assert.equal(press('p'), false, 'Set priority is disabled on INC-3');
  assert.deepEqual(log, ['assign INC-1']);
  t.unmount();

  const off = mount(h(Queue, { log, preferences: { characterKeys: 'off', overrides: { 'ticket.priority': 'Alt+P' } } }));
  await flush();
  focusRow(off.host, 'INC-2');
  assert.equal(press('a'), false, 'the switch turns single keys off');
  assert.equal(press('p', { altKey: true }), true, 'a remap with a modifier brings one back');
  assert.deepEqual(log.slice(1), ['priority INC-2']);
  press('k', { ctrlKey: true });
  assert.deepEqual(options(off.host), ['Open [Enter]', 'Assign to me', 'Set priority [Alt+P]', 'Delete ticket', 'Archive'],
    'the panel shows the keys in force: none for a switched-off key (Shift+D is a character key too), the remap for another; the panel is the modifier path to every action');
});

test('the ? sheet lists the row keys under the workspace label while focus is on a row', async () => {
  let api;
  function Api() { api = ui.useShortcuts(); return null; }
  const t = mount(h(ui.ShortcutProvider, { storageKey: null, platform: 'other' },
    h(Queue, { log: [] }), h(Api)));
  await flush();
  focusRow(t.host, 'INC-1');
  const scope = api.active(rowEl(t.host, 'INC-1')).find((group) => group.scope === 'Tickets');
  assert.ok(scope, 'the rows are a scope named by the workspace label');
  assert.deepEqual(scope.shortcuts.map((s) => `${s.label}=${ui.formatShortcut(s.keys)}`),
    ['Show actions=Mod+K', 'Assign to me=A', 'Set priority=P', 'Delete ticket=Shift+D', 'Archive=E']);
  assert.equal(api.active(document.getElementById('outside')).some((group) => group.scope === 'Tickets'), false);
});

test('a destructive action asks first: from its key the panel opens on the confirm step; from the list Escape steps back', async () => {
  const log = [];
  const t = mount(h(Queue, { log }));
  await flush();
  focusRow(t.host, 'INC-1');
  press('D', { shiftKey: true });
  const dialog = panel(t.host);
  assert.ok(dialog.hasAttribute('open'));
  assert.equal(dialog.querySelector('[role="combobox"]'), null, 'no list: the confirm step');
  const group = dialog.querySelector('.uix-action-panel__confirm');
  assert.equal(group.getAttribute('role'), 'group');
  assert.equal(document.getElementById(group.getAttribute('aria-labelledby')).textContent, 'Delete ticket?');
  assert.equal(document.getElementById(group.getAttribute('aria-describedby')).textContent, 'This cannot be undone.');
  assert.equal(document.activeElement.textContent, 'Cancel', 'the safe choice has focus');
  assert.deepEqual(log, []);
  press('Escape');
  assert.equal(panel(t.host).hasAttribute('open'), false, 'from the key, Escape closes');
  assert.equal(document.activeElement, rowEl(t.host, 'INC-1'));
  // From the list: Escape on the confirm step goes back to the list, then the confirm button runs it.
  press('k', { ctrlKey: true });
  const input = panel(t.host).querySelector('input');
  type(input, 'del');
  assert.deepEqual(options(t.host), ['Delete ticket [Shift+D]']);
  press('Enter', {}, input);
  assert.ok(panel(t.host).querySelector('.uix-action-panel__confirm'));
  press('Escape');
  assert.ok(panel(t.host).querySelector('input'), 'back on the list');
  press('Enter', {}, panel(t.host).querySelector('input'));
  const confirm = [...panel(t.host).querySelectorAll('button')].find((b) => b.textContent === 'Delete ticket');
  assert.ok(confirm.className.includes('danger'));
  act(() => confirm.click());
  assert.deepEqual(log, ['delete INC-1']);
  assert.equal(panel(t.host).hasAttribute('open'), false);
  // The row is gone: focus is handed to the row now first, not dropped on <body>.
  await flush();
  assert.equal(rowEl(t.host, 'INC-1'), null);
  assert.equal(document.activeElement, rowEl(t.host, 'INC-2'));
});

test('an undoable destructive action runs at once, from its key or the list', async () => {
  const log = [];
  const t = mount(h(Queue, { log }));
  await flush();
  focusRow(t.host, 'INC-2');
  press('e');
  assert.deepEqual(log, ['archive INC-2']);
  assert.equal(panel(t.host).hasAttribute('open'), false);
});

test('the row ⋯ button opens the panel anchored to it, and focus goes back to the button', async () => {
  const log = [];
  const t = mount(h(Queue, { log }));
  await flush();
  const button = rowEl(t.host, 'INC-2').querySelector('.uix-data-workspace__panel-trigger');
  assert.equal(button.getAttribute('aria-label'), 'Actions for INC-2');
  assert.equal(button.getAttribute('aria-haspopup'), 'dialog');
  act(() => { button.focus(); button.click(); });
  assert.ok(panel(t.host).hasAttribute('open'));
  assert.equal(panel(t.host).getAttribute('aria-label'), 'Actions for INC-2');
  assert.deepEqual(log, [], 'the click is the button\'s, not the row\'s');
  press('Escape');
  assert.equal(panel(t.host).hasAttribute('open'), false);
  assert.equal(document.activeElement, button);
  // A click on an option runs it.
  act(() => button.click());
  const assign = [...panel(t.host).querySelectorAll('[role="option"]')].find((o) => o.textContent.startsWith('Assign'));
  act(() => assign.click());
  assert.deepEqual(log, ['assign INC-2']);
  // No trigger with actionPanelTrigger={false}; disabled-only rows get none either.
  t.unmount();
  const u = mount(h(Queue, { log, workspace: { actionPanelTrigger: false } }));
  await flush();
  assert.equal(u.host.querySelector('.uix-data-workspace__panel-trigger'), null);
});

test('typing filters, an empty result says so; a disabled action is shown and skipped', async () => {
  const t = mount(h(Queue, { log: [] }));
  await flush();
  focusRow(t.host, 'INC-3');
  press('k', { ctrlKey: true });
  const input = panel(t.host).querySelector('input');
  const disabled = [...panel(t.host).querySelectorAll('[role="option"]')].find((o) => o.textContent.startsWith('Set priority'));
  assert.equal(disabled.getAttribute('aria-disabled'), 'true');
  press('End', {}, input);
  press('ArrowUp', {}, input);
  press('ArrowUp', {}, input);
  assert.equal(document.getElementById(input.getAttribute('aria-activedescendant')).textContent.startsWith('Assign'), true, 'the disabled row is skipped');
  type(input, 'zzz');
  assert.equal(panel(t.host).querySelector('[role="listbox"]').hidden, true);
  assert.equal(panel(t.host).querySelector('.uix-cmdk__empty').textContent, 'No matching actions');
  await act(() => new Promise((resolve) => setTimeout(resolve, 200)));
  assert.equal(panel(t.host).querySelector('[role="status"]').textContent, '0 actions');
});

test('the words come from UixLabelsProvider actionPanel', async () => {
  const labels = { actionPanel: { title: 'Aktionen für {name}', search: 'Aktionen suchen', confirmTitle: '{action} wirklich?', confirmBody: 'Das lässt sich nicht rückgängig machen.', cancel: 'Abbrechen', open: 'Aktionen zeigen' } };
  const t = mount(h(Queue, { log: [], labels }));
  await flush();
  assert.equal(rowEl(t.host, 'INC-1').querySelector('.uix-data-workspace__panel-trigger').getAttribute('aria-label'), 'Aktionen für INC-1');
  focusRow(t.host, 'INC-1');
  press('k', { ctrlKey: true });
  assert.equal(panel(t.host).getAttribute('aria-label'), 'Aktionen für INC-1');
  assert.equal(panel(t.host).querySelector('input').getAttribute('placeholder'), 'Aktionen suchen');
  press('Escape');
  press('D', { shiftKey: true });
  assert.match(panel(t.host).textContent, /Delete ticket wirklich\?Das lässt sich nicht rückgängig machen\.Abbrechen/);
});

// —— any item ———————————————————————————————————————————————————————————————————————————————

test('ActionPanelScope: Enter on the item runs its primary action, Ctrl+K opens its panel, its keys work inside it only', async () => {
  const log = [];
  const actions = [
    { id: 'card.open', label: 'Open', primary: true, onSelect: () => log.push('open') },
    { id: 'card.pin', label: 'Pin', keys: 'Shift+P', onSelect: () => log.push('pin') },
  ];
  const t = mount(h(ui.ShortcutProvider, { storageKey: null, platform: 'other' },
    h('button', { type: 'button', id: 'outside' }, 'Outside'),
    h(ui.ActionPanelScope, { actions, name: 'Weekly report', tabIndex: 0, id: 'card' }, h('p', null, 'Weekly report'), h('button', { type: 'button', id: 'inner' }, 'Share'))));
  await flush();
  const card = document.getElementById('card');
  assert.ok(card.hasAttribute('data-uix-shortcut-scope'));
  act(() => card.focus());
  press('Enter');
  assert.deepEqual(log, ['open']);
  // Enter on a control inside the item is the control's.
  act(() => document.getElementById('inner').focus());
  press('Enter');
  assert.deepEqual(log, ['open']);
  assert.equal(press('P', { shiftKey: true }), true, 'its keys work anywhere inside it');
  act(() => document.getElementById('outside').focus());
  assert.equal(press('P', { shiftKey: true }), false);
  assert.deepEqual(log, ['open', 'pin']);
  act(() => card.focus());
  press('k', { ctrlKey: true });
  const dialog = card.querySelector('dialog.uix-action-panel');
  assert.ok(dialog.hasAttribute('open'));
  assert.equal(dialog.getAttribute('aria-label'), 'Actions for Weekly report');
  press('Escape');
  assert.equal(document.activeElement, card);
});
