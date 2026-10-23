/* HAR-1375 (MOTUS C-16 photo order) — SortableList in jsdom: Move up / Move down on every row
 * (disabled at the ends), Alt+↑ / Alt+↓ anywhere in a row, ↑ / ↓ on a focused grip, focus kept on
 * the moved row (handed to the other move button at an end), the polite announcement in the
 * given words, an order the consumer refuses not staying on screen, a drag cancelled by Escape or
 * pointercancel (in ViewMenu and SavedViewMenu too, which share the drag), and `disabled`.
 * Also the shared reorder model (`placeId`) that ViewMenu, SavedViewMenu and NavFavourites use.
 * A pointer drag is measured in Chromium: tests/a11y/sortable-list.spec.mjs.
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

const PHOTOS = [{ id: 'p1', title: 'Lesesaal' }, { id: 'p2', title: 'Kinderecke' }, { id: 'p3', title: 'Lesung' }];

/** A consumer that applies every new order (or, with `late`, ignores them). */
function List({ log, late = false, ...props }) {
  const [items, setItems] = useState(PHOTOS);
  return h(ui.SortableList, {
    'aria-label': 'Fotos', items, getId: (p) => p.id, getLabel: (p) => p.title,
    renderItem: (p, ctx) => h('span', { className: 'title' }, `${ctx.index + 1}/${ctx.count} ${p.title}`),
    onReorder: (ids) => { log.push(ids); if (!late) setItems(ids.map((id) => PHOTOS.find((p) => p.id === id))); },
    ...props,
  });
}
const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const titles = (host) => [...host.querySelectorAll('.uix-sortable__row')].map((r) => r.querySelector('.title').textContent);
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const key = (el, k, init = {}) => {
  let notPrevented;
  act(() => { notPrevented = el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })); });
  return notPrevented;
};

test('placeId moves an id and returns the same array when nothing moves', () => {
  const ids = ['a', 'b', 'c'];
  assert.deepEqual(ui.placeId(ids, 'a', 2), ['b', 'c', 'a']);
  assert.deepEqual(ui.placeId(ids, 'c', -5), ['c', 'a', 'b'], 'clamped');
  assert.equal(ui.placeId(ids, 'b', 1), ids);
  assert.equal(ui.placeId(ids, 'x', 0), ids);
});

test('every row has a grip and Move up / Move down named by the row; the ends are disabled', () => {
  const t = mount(h(List, { log: [] }));
  const rows = [...t.host.querySelectorAll('.uix-sortable__row')];
  assert.equal(t.host.querySelector('ul').getAttribute('aria-label'), 'Fotos');
  assert.deepEqual(rows.map((r) => [...r.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))), [
    ['Drag to reorder: Lesesaal', 'Move Lesesaal up', 'Move Lesesaal down'],
    ['Drag to reorder: Kinderecke', 'Move Kinderecke up', 'Move Kinderecke down'],
    ['Drag to reorder: Lesung', 'Move Lesung up', 'Move Lesung down'],
  ]);
  assert.equal(rows[0].querySelector('.uix-sortable__move--up').disabled, true);
  assert.equal(rows[2].querySelector('.uix-sortable__move--down').disabled, true);
  assert.equal(rows[0].querySelector('.uix-sortable__grip').tabIndex, -1, 'the grip is pointer-first; the buttons are the keyboard path');
  t.unmount();
});

test('Move down keeps focus on the moved row, hands it to Move up at the end, and announces', () => {
  const log = [];
  const t = mount(h(List, { log }));
  const down = () => [...t.host.querySelectorAll('.uix-sortable__row')].find((r) => r.dataset.id === 'p1').querySelector('.uix-sortable__move--down');
  down().focus();
  click(down());
  assert.deepEqual(titles(t.host), ['1/3 Kinderecke', '2/3 Lesesaal', '3/3 Lesung']);
  assert.deepEqual(log, [['p2', 'p1', 'p3']]);
  assert.equal(document.activeElement, down(), 'focus stays on Move down of the moved row');
  assert.equal(t.host.querySelector('[role="status"]').textContent, 'Lesesaal moved to position 2 of 3');
  click(down());
  assert.deepEqual(titles(t.host), ['1/3 Kinderecke', '2/3 Lesung', '3/3 Lesesaal']);
  assert.equal(document.activeElement.getAttribute('aria-label'), 'Move Lesesaal up', 'at the end, Move up takes focus');
  t.unmount();
});

test('Alt+↑ / Alt+↓ anywhere in a row but a text field; ↑ / ↓ on a focused grip; plain arrows elsewhere are left alone', () => {
  const log = [];
  const t = mount(h(List, { log, renderItem: (p) => h('span', null, h('a', { href: `#${p.id}`, className: 'link' }, p.title), h('input', { className: 'title-input', 'aria-label': p.title, defaultValue: p.title })) }));
  const link = () => [...t.host.querySelectorAll('.link')].find((a) => a.textContent === 'Lesung');
  link().focus();
  assert.equal(key(link(), 'ArrowUp', { altKey: true }), false);
  assert.deepEqual(log.at(-1), ['p1', 'p3', 'p2']);
  assert.equal(document.activeElement, link(), 'focus stays on what had it');
  assert.equal(key(link(), 'ArrowUp'), true, 'a plain arrow is left alone');
  const field = t.host.querySelector('input[aria-label="Lesung"]');
  assert.equal(key(field, 'ArrowUp', { altKey: true }), true, 'in a text field Alt/Option + arrow moves the caret (PR #168 review)');
  assert.equal(log.length, 1);
  const grip = [...t.host.querySelectorAll('.uix-sortable__row')][0].querySelector('.uix-sortable__grip');
  grip.focus();
  key(grip, 'ArrowDown');
  assert.deepEqual(log.at(-1), ['p3', 'p1', 'p2']);
  assert.equal(document.activeElement.getAttribute('aria-label'), 'Drag to reorder: Lesesaal');
  t.unmount();
});

test('an order the consumer refuses does not stay on screen (PR #168 review)', () => {
  const log = [];
  const t = mount(h(List, { log, late: true }));
  click(t.host.querySelector('.uix-sortable__move--down'));
  assert.deepEqual(log, [['p2', 'p1', 'p3']], 'asked');
  assert.deepEqual(titles(t.host).map((s) => s.slice(4)), ['Lesesaal', 'Kinderecke', 'Lesung'], 'the consumer\'s order shows');
  t.unmount();
});

/** Press on a grip and move the pointer past every row (jsdom rects are 0 high), then end the drag with `finish`. */
function dragToEnd(host, gripSelector, finish) {
  const grip = host.querySelector(gripSelector);
  act(() => { grip.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 })); });
  act(() => { window.dispatchEvent(new window.PointerEvent('pointermove', { clientY: 100, pointerId: 1 })); });
  act(finish);
}
const pointercancel = () => window.dispatchEvent(new window.PointerEvent('pointercancel', { pointerId: 1 }));
const escape = () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
const pointerup = () => window.dispatchEvent(new window.PointerEvent('pointerup', { pointerId: 1 }));

test('a drag cancelled by pointercancel or Escape puts the rows back and reports nothing; a drop reports once', () => {
  for (const finish of [pointercancel, escape]) {
    const log = [];
    const t = mount(h(List, { log }));
    dragToEnd(t.host, '.uix-sortable__grip', finish);
    assert.deepEqual(log, [], `${finish.name}: nothing reported`);
    assert.deepEqual(titles(t.host).map((s) => s.slice(4)), ['Lesesaal', 'Kinderecke', 'Lesung'], `${finish.name}: the starting order`);
    t.unmount();
  }
  const log = [];
  const t = mount(h(List, { log }));
  dragToEnd(t.host, '.uix-sortable__grip', pointerup);
  assert.deepEqual(log, [['p2', 'p3', 'p1']]);
  t.unmount();
});

test('ViewMenu and SavedViewMenu share the drag: Escape and pointercancel put the rows back there too', () => {
  const cols = [{ id: 'a', label: 'Alpha', visible: true }, { id: 'b', label: 'Beta', visible: true }, { id: 'c', label: 'Gamma', visible: true }];
  for (const finish of [pointercancel, escape]) {
    const calls = [];
    const v = mount(h(ui.ViewMenu, { columns: cols, onColumnVisibilityChange() {}, onReorder: (ids) => calls.push(ids) }));
    dragToEnd(v.host, '.uix-view-menu__grip', finish);
    assert.deepEqual(calls, [], `ViewMenu ${finish.name}`);
    assert.deepEqual([...v.host.querySelectorAll('.uix-view-menu__col')].map((r) => r.dataset.columnId), ['a', 'b', 'c']);
    v.unmount();
    const saved = [];
    const m = mount(h(ui.SavedViewMenu, { items: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }, { id: 'z', label: 'Z' }], onSelect() {}, onReorder: (ids) => saved.push(ids), reorderLabel: 'Drag' }));
    dragToEnd(m.host, '.uix-saved-views__grip', finish);
    assert.deepEqual(saved, [], `SavedViewMenu ${finish.name}`);
    assert.deepEqual([...m.host.querySelectorAll('.uix-saved-views__name')].map((n) => n.textContent), ['X', 'Y', 'Z']);
    m.unmount();
  }
});

test('UixLabelsProvider translates it; disabled shows no controls', () => {
  const t = mount(h(ui.UixLabelsProvider, { labels: { sortableList: { moveUp: '{label} nach oben', moveDown: '{label} nach unten', grip: '{label} ziehen', moved: '{label} ist jetzt an Position {position} von {count}' } } },
    h(List, { log: [] })));
  assert.equal(t.host.querySelector('.uix-sortable__move--up').getAttribute('aria-label'), 'Lesesaal nach oben');
  click(t.host.querySelector('.uix-sortable__move--down'));
  assert.equal(t.host.querySelector('[role="status"]').textContent, 'Lesesaal ist jetzt an Position 2 von 3');
  t.unmount();
  const d = mount(h(List, { log: [], disabled: true }));
  assert.equal(d.host.querySelectorAll('button').length, 0);
  d.unmount();
});

test('NavFavourites moves through the shared model and its announcement is translatable', () => {
  const log = [];
  function Favs() {
    const [items, setItems] = useState([{ id: 'a', label: 'Vorfälle', href: '/a' }, { id: 'b', label: 'Änderungen', href: '/b' }]);
    return h(ui.NavFavourites, {
      items, onRemove() {}, onReorder: (ids) => { log.push(ids); setItems(ids.map((id) => items.find((i) => i.id === id))); },
      labels: { heading: 'Favoriten', empty: 'Keine', moveUp: 'Nach oben', moveDown: 'Nach unten', remove: '{label} entfernen', moved: '{label}: Position {position} von {count}' },
      renderLink: (item) => h('a', { href: item.href }, item.label),
    });
  }
  const t = mount(h(Favs));
  const row = t.host.querySelector('li');
  key(row.querySelector('button, a'), 'ArrowDown', { altKey: true });
  assert.deepEqual(log, [['b', 'a']]);
  assert.equal(t.host.querySelector('[role="status"]').textContent, 'Vorfälle: Position 2 von 2');
  t.unmount();
});
