/* ViewMenu column rows (TENSOR HAR-666: the columns-menu anatomy upstreamed from
 * TENSOR's TableViewControl) in jsdom.
 *
 * - the panel is its own surface (`.uix-view-menu`), sections are titled, and a
 *   section only renders when its props are given;
 * - a column row is grip · checkbox · name · ⋯; a required column has no checkbox;
 * - `onReorder(orderedIds)` gets the FULL id list, from the grip's arrow keys, a
 *   pointer drag, or Move up / Move down in the row's ⋯ menu;
 * - the ⋯ menu is an APG menu button: roving focus, Escape returns focus to it.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

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

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return {
    host,
    rerender: (next) => act(() => root.render(next)),
    unmount: () => { act(() => root.unmount()); host.remove(); },
  };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, button: 0 })));
const key = (el, k) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true })));
const pointer = (el, type, clientY) => act(() => el.dispatchEvent(new window.MouseEvent(type, { bubbles: true, button: 0, clientY })));
const rowIds = (scope) => [...scope.querySelectorAll('.uix-view-menu__col')].map((row) => row.dataset.columnId);
const row = (scope, id) => scope.querySelector(`.uix-view-menu__col[data-column-id="${id}"]`);
const trigger = (scope, id) => row(scope, id).querySelector('[aria-haspopup="menu"]');
const menuItems = (scope) => [...scope.querySelectorAll('[role="menu"] [role="menuitem"]')];

const COLS = [
  { id: 'natural_id', label: 'ID', visible: true, required: true },
  { id: 'title', label: 'Title', visible: true },
  { id: 'state', label: 'State', visible: true },
  { id: 'severity', label: 'Severity', visible: false },
];
const PRESENTATION = {
  density: 'standard',
  densityLabel: 'Row spacing',
  densityOptions: [{ value: 'compact', label: 'Compact' }, { value: 'standard', label: 'Standard' }],
  onDensityChange: () => {},
  displayLabel: 'Display',
  zebra: { checked: true, label: 'Alternating rows', onChange: () => {} },
};

test('the panel is its own surface with titled sections', () => {
  const { host, unmount } = mount(h(ui.ViewMenu, { ...PRESENTATION, columns: COLS, columnsLabel: 'Columns', onColumnVisibilityChange: () => {} }));
  const menu = host.querySelector('.uix-view-menu');
  assert.ok(menu, 'renders .uix-view-menu');
  assert.deepEqual([...menu.querySelectorAll('.uix-view-menu__label')].map((t) => t.textContent), ['Row spacing', 'Display', 'Columns']);
  const list = menu.querySelector('ul.uix-view-menu__cols');
  assert.equal(document.getElementById(list.getAttribute('aria-labelledby'))?.textContent, 'Columns', 'the column list is labelled by its title');
  unmount();
});

test('without density props only the columns section renders', () => {
  const { host, unmount } = mount(h(ui.ViewMenu, { columns: COLS, columnsLabel: 'Columns', onColumnVisibilityChange: () => {} }));
  assert.deepEqual([...host.querySelectorAll('.uix-view-menu__label')].map((t) => t.textContent), ['Columns']);
  assert.equal(host.querySelector('.uix-segmented'), null);
  unmount();
});

test('a row per column carries its id and visibility; the checkbox reports the change', () => {
  const changes = [];
  const { host, unmount } = mount(h(ui.ViewMenu, { columns: COLS, onColumnVisibilityChange: (id, visible) => changes.push([id, visible]) }));
  assert.deepEqual(rowIds(host), ['natural_id', 'title', 'state', 'severity']);
  assert.deepEqual([...host.querySelectorAll('.uix-view-menu__col')].map((r) => r.dataset.visible), ['true', 'true', 'true', 'false']);
  const box = row(host, 'severity').querySelector('input[type="checkbox"]');
  assert.equal(box.checked, false);
  click(box);
  assert.deepEqual(changes, [['severity', true]]);
  unmount();
});

test('a required column has no checkbox, only its name with the required hint', () => {
  const { host, unmount } = mount(h(ui.ViewMenu, { columns: COLS, onColumnVisibilityChange: () => {}, columnLabels: { required: 'Always shown' } }));
  const required = row(host, 'natural_id');
  assert.equal(required.dataset.required, 'true');
  assert.equal(required.querySelector('input'), null);
  const name = required.querySelector('.uix-view-menu__col-name');
  assert.equal(name.textContent, 'ID');
  assert.equal(name.closest('[title]')?.getAttribute('title'), 'Always shown');
  unmount();
});

test('without onReorder there is no grip and no row menu', () => {
  const { host, unmount } = mount(h(ui.ViewMenu, { columns: COLS, onColumnVisibilityChange: () => {} }));
  assert.equal(host.querySelector('.uix-view-menu__grip'), null);
  assert.equal(host.querySelector('[aria-haspopup="menu"]'), null);
  unmount();
});

test('with onReorder each row gets a pointer grip and a named ⋯ menu button', () => {
  const { host, unmount } = mount(h(ui.ViewMenu, { columns: COLS, onColumnVisibilityChange: () => {}, onReorder: () => {} }));
  const grip = row(host, 'title').querySelector('.uix-view-menu__grip');
  assert.equal(grip.getAttribute('aria-label'), 'Drag to reorder: Title');
  // The ⋯ menu is the keyboard path, so the grip stays out of the tab order.
  assert.equal(grip.getAttribute('tabindex'), '-1');
  const button = trigger(host, 'title');
  assert.equal(button.getAttribute('aria-label'), 'Column actions: Title');
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.ok(button.closest('.uix-view-menu__actions'), 'the trigger sits in the quiet actions slot');
  unmount();
});

test('the ⋯ menu offers Move up · Move down · Hide/Show; boundaries disable a move', () => {
  const { host, unmount } = mount(h(ui.ViewMenu, { columns: COLS, onColumnVisibilityChange: () => {}, onReorder: () => {} }));
  click(trigger(host, 'title'));
  const menu = host.querySelector('[role="menu"]');
  assert.equal(menu.getAttribute('aria-label'), 'Column actions: Title');
  assert.equal(trigger(host, 'title').getAttribute('aria-expanded'), 'true');
  assert.equal(trigger(host, 'title').getAttribute('aria-controls'), menu.id);
  assert.deepEqual(menuItems(host).map((i) => i.textContent), ['Move up', 'Move down', 'Hide']);
  assert.equal(document.activeElement, menuItems(host)[0], 'focus moves into the menu');
  key(menuItems(host)[0], 'Escape');
  assert.equal(host.querySelector('[role="menu"]'), null);

  click(trigger(host, 'severity'));
  assert.deepEqual(menuItems(host).map((i) => i.textContent), ['Move up', 'Move down', 'Show']);
  assert.equal(menuItems(host)[1].disabled, true, 'Move down is disabled on the last row');
  key(menuItems(host)[0], 'Escape');

  click(trigger(host, 'natural_id'));
  assert.deepEqual(menuItems(host).map((i) => i.textContent), ['Move up', 'Move down'], 'a required column only moves');
  assert.equal(menuItems(host)[0].disabled, true, 'Move up is disabled on the first row');
  assert.equal(document.activeElement, menuItems(host)[1], 'focus skips the disabled item');
  unmount();
});

test('Hide / Show in the ⋯ menu report the visibility change', () => {
  const changes = [];
  const { host, unmount } = mount(h(ui.ViewMenu, { columns: COLS, onColumnVisibilityChange: (id, visible) => changes.push([id, visible]), onReorder: () => {} }));
  click(trigger(host, 'title'));
  click(menuItems(host)[2]);
  click(trigger(host, 'severity'));
  click(menuItems(host)[2]);
  assert.deepEqual(changes, [['title', false], ['severity', true]]);
  unmount();
});

test('Move down fires onReorder with the full list, closes the menu, and keeps focus on the row', () => {
  const orders = [];
  const { host, unmount } = mount(h(ui.ViewMenu, { columns: COLS, onColumnVisibilityChange: () => {}, onReorder: (ids) => orders.push(ids) }));
  click(trigger(host, 'title'));
  click(menuItems(host)[1]);
  assert.deepEqual(orders, [['natural_id', 'state', 'title', 'severity']]);
  assert.deepEqual(rowIds(host), ['natural_id', 'state', 'title', 'severity']);
  assert.equal(host.querySelector('[role="menu"]'), null, 'menu closed');
  assert.equal(document.activeElement, trigger(host, 'title'), 'focus returns to the moved row\'s ⋯');
  assert.equal(host.querySelector('[role="status"]').textContent, 'Title moved to position 3 of 4');
  unmount();
});

test('menu keyboard: arrows rove over enabled items, Home/End jump, Tab closes', () => {
  const { host, unmount } = mount(h(ui.ViewMenu, { columns: COLS, onColumnVisibilityChange: () => {}, onReorder: () => {} }));
  click(trigger(host, 'title'));
  const [up, down, hide] = menuItems(host);
  key(up, 'ArrowDown');
  assert.equal(document.activeElement, down);
  key(down, 'End');
  assert.equal(document.activeElement, hide);
  key(hide, 'ArrowDown');
  assert.equal(document.activeElement, up, 'wraps');
  key(up, 'ArrowUp');
  assert.equal(document.activeElement, hide, 'wraps backwards');
  key(hide, 'Home');
  assert.equal(document.activeElement, up);
  key(up, 'Tab');
  assert.equal(host.querySelector('[role="menu"]'), null);
  unmount();
});

test('Escape anywhere closes an open row menu and returns focus to its button', () => {
  const { host, unmount } = mount(h(ui.ViewMenu, { columns: COLS, onColumnVisibilityChange: () => {}, onReorder: () => {} }));
  click(trigger(host, 'state'));
  key(document.body, 'Escape');
  assert.equal(host.querySelector('[role="menu"]'), null);
  assert.equal(document.activeElement, trigger(host, 'state'));
  unmount();
});

test('ArrowUp / ArrowDown on the grip move the row and report the full order', () => {
  const orders = [];
  const { host, unmount } = mount(h(ui.ViewMenu, { columns: COLS, onColumnVisibilityChange: () => {}, onReorder: (ids) => orders.push(ids) }));
  const grip = () => row(host, 'state').querySelector('.uix-view-menu__grip');
  key(grip(), 'ArrowUp');
  key(grip(), 'ArrowUp');
  key(grip(), 'ArrowUp'); // already first: nothing fires
  assert.deepEqual(orders, [['natural_id', 'state', 'title', 'severity'], ['state', 'natural_id', 'title', 'severity']]);
  assert.deepEqual(rowIds(host), ['state', 'natural_id', 'title', 'severity']);
  unmount();
});

test('dragging the grip reorders live and persists once on drop', () => {
  const orders = [];
  const { host, unmount } = mount(h(ui.ViewMenu, { columns: COLS, onColumnVisibilityChange: () => {}, onReorder: (ids) => orders.push(ids) }));
  host.querySelectorAll('.uix-view-menu__col').forEach((r, i) => {
    r.getBoundingClientRect = () => ({ top: i * 32, height: 32, bottom: i * 32 + 32 });
  });
  const grip = row(host, 'title').querySelector('.uix-view-menu__grip');
  pointer(grip, 'pointerdown', 40);
  assert.equal(host.querySelector('.uix-view-menu').dataset.dragging, '');
  pointer(grip, 'pointermove', 3 * 32 + 20);
  assert.deepEqual(rowIds(host), ['natural_id', 'state', 'severity', 'title']);
  assert.deepEqual(orders, [], 'nothing persists mid-drag');
  pointer(grip, 'pointerup', 3 * 32 + 20);
  assert.deepEqual(orders, [['natural_id', 'state', 'severity', 'title']]);
  assert.equal(host.querySelector('.uix-view-menu').dataset.dragging, undefined);
  unmount();
});

test('the consumer order wins once it changes', () => {
  const props = { onColumnVisibilityChange: () => {}, onReorder: () => {} };
  const { host, rerender, unmount } = mount(h(ui.ViewMenu, { ...props, columns: COLS }));
  key(row(host, 'severity').querySelector('.uix-view-menu__grip'), 'ArrowUp');
  assert.deepEqual(rowIds(host), ['natural_id', 'title', 'severity', 'state']);
  rerender(h(ui.ViewMenu, { ...props, columns: [...COLS].reverse() }));
  assert.deepEqual(rowIds(host), ['severity', 'state', 'title', 'natural_id']);
  unmount();
});

test('the footer renders inside the panel after the columns', () => {
  const { host, unmount } = mount(h(ui.ViewMenu, {
    columns: COLS, onColumnVisibilityChange: () => {},
    footer: h('button', { type: 'button', className: 'uix-menu__item' }, 'Reset sort'),
  }));
  const footer = host.querySelector('.uix-view-menu > .uix-view-menu__footer');
  assert.equal(footer?.textContent, 'Reset sort');
  assert.equal(footer, host.querySelector('.uix-view-menu').lastElementChild);
  unmount();
});

test('every label is replaceable (localised names)', () => {
  const { host, unmount } = mount(h(ui.ViewMenu, {
    columns: COLS, onColumnVisibilityChange: () => {}, onReorder: () => {},
    columnLabels: {
      rowActions: 'Aktionen für Spalte {label}', reorder: '{label} ziehen', moveUp: 'Nach oben', moveDown: 'Nach unten',
      hide: 'Ausblenden', show: 'Anzeigen', required: 'Immer sichtbar', moved: '{label}: Position {position} von {count}',
    },
  }));
  assert.equal(row(host, 'title').querySelector('.uix-view-menu__grip').getAttribute('aria-label'), 'Title ziehen');
  click(trigger(host, 'title'));
  assert.deepEqual(menuItems(host).map((i) => i.textContent), ['Nach oben', 'Nach unten', 'Ausblenden']);
  click(menuItems(host)[0]);
  assert.equal(host.querySelector('[role="status"]').textContent, 'Title: Position 1 von 4');
  unmount();
});

test('a node label uses textLabel in the accessible names', () => {
  const { host, unmount } = mount(h(ui.ViewMenu, {
    columns: [{ id: 'a', label: h('b', null, 'Assignee'), textLabel: 'Assignee', visible: true }, { id: 'b', label: 'B', visible: true }],
    onColumnVisibilityChange: () => {}, onReorder: () => {},
  }));
  assert.equal(trigger(host, 'a').getAttribute('aria-label'), 'Column actions: Assignee');
  unmount();
});
