/* SavedViewMenu row anatomy (upstreamed from TENSOR's saved-views menu) in jsdom.
 *
 * - titled sections render inside ONE .uix-menu, each group labelled by its title;
 * - a row is grip · name · overflow; the selected row carries data-active on the
 *   whole row and aria-current on the name — no check glyph;
 * - onReorder(orderedIds, sectionId) fires within a section, from the grip's
 *   arrow keys and from a pointer drag, and never crosses into another section;
 * - the flat `items` form keeps working (pin, actions, footer).
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
  return { host, rerender: (next) => act(() => root.render(next)), unmount: () => act(() => root.unmount()) };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, button: 0 })));
const key = (el, k) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true })));
const pointer = (el, type, clientY) => act(() => el.dispatchEvent(new window.MouseEvent(type, { bubbles: true, button: 0, clientY })));
const names = (scope) => [...scope.querySelectorAll('.uix-saved-views__name')].map((n) => n.textContent);

const sections = [
  { id: 'custom', label: 'Custom views', items: [{ id: 'mine', label: 'My open work', active: true }, { id: 'team', label: 'Team queue' }, { id: 'p1', label: 'P1 only' }] },
  { id: 'presets', label: 'Presets', items: [{ id: 'all', label: 'All' }, { id: 'recent', label: 'Recently updated' }] },
];

test('sections render as titled groups inside one menu', () => {
  const { host, unmount } = mount(h(ui.SavedViewMenu, { sections, onSelect: () => {} }));
  assert.equal(host.querySelectorAll('.uix-menu').length, 1, 'one menu surface');
  const groups = [...host.querySelectorAll('.uix-saved-views__group')];
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((g) => document.getElementById(g.getAttribute('aria-labelledby'))?.textContent), ['Custom views', 'Presets']);
  assert.deepEqual(names(groups[0]), ['My open work', 'Team queue', 'P1 only']);
  unmount();
});

test('empty sections are hidden; the empty label shows only when every section is empty', () => {
  const { host, rerender, unmount } = mount(h(ui.SavedViewMenu, {
    sections: [{ id: 'custom', label: 'Custom views', items: [] }, sections[1]], emptyLabel: 'No views yet.', onSelect: () => {},
  }));
  assert.equal(host.querySelectorAll('.uix-saved-views__section').length, 1);
  assert.ok(!host.textContent.includes('No views yet.'));
  rerender(h(ui.SavedViewMenu, { sections: [{ id: 'custom', label: 'Custom views', items: [] }], emptyLabel: 'No views yet.', onSelect: () => {} }));
  assert.ok(host.textContent.includes('No views yet.'));
  unmount();
});

test('the selected row is marked on the whole row, with no check glyph', () => {
  const picks = [];
  const { host, unmount } = mount(h(ui.SavedViewMenu, { sections, onSelect: (id) => picks.push(id) }));
  const rows = [...host.querySelectorAll('.uix-saved-views__row')];
  const active = rows.filter((row) => row.hasAttribute('data-active'));
  assert.equal(active.length, 1);
  const name = active[0].querySelector('.uix-menu__item');
  assert.equal(name.getAttribute('aria-current'), 'true');
  assert.equal(name.querySelector('svg'), null, 'no check glyph in the name');
  assert.doesNotMatch(name.textContent, /[✓✔]/);
  assert.equal(name.getAttribute('title'), 'My open work', 'string names carry a tooltip for truncation');
  click(rows[1].querySelector('.uix-menu__item'));
  assert.deepEqual(picks, ['team']);
  unmount();
});

test('the overflow slot wraps what actions returns, and is omitted for null', () => {
  const { host, unmount } = mount(h(ui.SavedViewMenu, {
    sections,
    onSelect: () => {},
    actions: (item) => (item.id === 'all' ? null : h('button', { type: 'button', 'aria-expanded': 'false' }, '⋯')),
  }));
  const rows = [...host.querySelectorAll('.uix-saved-views__row')];
  assert.equal(host.querySelectorAll('.uix-saved-views__actions').length, rows.length - 1);
  const children = [...rows[0].children].map((el) => el.className);
  assert.deepEqual(children, ['uix-menu__item', 'uix-saved-views__actions'], 'name · overflow without reorder');
  unmount();
});

test('without onReorder there is no grip', () => {
  const { host, unmount } = mount(h(ui.SavedViewMenu, { sections, onSelect: () => {} }));
  assert.equal(host.querySelector('.uix-saved-views__grip'), null);
  unmount();
});

test('the grip moves its row with the arrow keys, within its section only', () => {
  const calls = [];
  const { host, unmount } = mount(h(ui.SavedViewMenu, {
    sections, onSelect: () => {}, onReorder: (ids, sectionId) => calls.push([ids, sectionId]), reorderLabel: 'Drag to reorder',
    actions: () => h('button', { type: 'button' }, '⋯'),
  }));
  const row = host.querySelector('.uix-saved-views__row');
  assert.deepEqual([...row.children].map((el) => el.className), ['uix-saved-views__grip', 'uix-menu__item', 'uix-saved-views__actions'], 'grip · name · overflow');
  const grip = row.querySelector('.uix-saved-views__grip');
  assert.equal(grip.getAttribute('aria-label'), 'Drag to reorder');
  assert.equal(document.getElementById(grip.getAttribute('aria-describedby'))?.textContent, 'My open work');

  key(grip, 'ArrowDown');
  assert.deepEqual(calls, [[['team', 'mine', 'p1'], 'custom']]);
  assert.deepEqual(names(host.querySelector('.uix-saved-views__group')), ['Team queue', 'My open work', 'P1 only'], 'optimistic order while the consumer persists');

  const lastCustom = [...host.querySelectorAll('.uix-saved-views__group')[0].querySelectorAll('.uix-saved-views__grip')].at(-1);
  key(lastCustom, 'ArrowDown');
  assert.equal(calls.length, 1, 'the last row of a section does not cross into the next section');

  const firstPreset = host.querySelectorAll('.uix-saved-views__group')[1].querySelector('.uix-saved-views__grip');
  key(firstPreset, 'ArrowUp');
  assert.equal(calls.length, 1, 'the first row of a section does not move up out of it');
  key(firstPreset, 'ArrowDown');
  assert.deepEqual(calls[1], [['recent', 'all'], 'presets']);
  unmount();
});

test('a pointer drag on the grip reorders within the section and reports once on drop', () => {
  const calls = [];
  const { host, unmount } = mount(h(ui.SavedViewMenu, {
    sections, onSelect: () => {}, onReorder: (ids, sectionId) => calls.push([ids, sectionId]), reorderLabel: 'Drag to reorder',
  }));
  const group = host.querySelector('.uix-saved-views__group');
  // jsdom has no layout: stack the custom rows 28px apart from y=0.
  [...group.children].forEach((row, i) => { row.getBoundingClientRect = () => ({ top: i * 28, height: 28 }); });
  const grip = group.querySelector('.uix-saved-views__grip');
  pointer(grip, 'pointerdown', 10);
  assert.ok(group.querySelector('.uix-saved-views__row').hasAttribute('data-dragging'));
  pointer(grip, 'pointermove', 80);
  assert.deepEqual(names(group), ['Team queue', 'P1 only', 'My open work']);
  assert.equal(calls.length, 0, 'nothing persists mid-drag');
  pointer(grip, 'pointerup', 80);
  assert.deepEqual(calls, [[['team', 'p1', 'mine'], 'custom']]);
  assert.equal(host.querySelector('[data-dragging]'), null);
  unmount();
});

test('a drag that ends where it started does not report', () => {
  const calls = [];
  const { host, unmount } = mount(h(ui.SavedViewMenu, {
    sections, onSelect: () => {}, onReorder: (ids) => calls.push(ids), reorderLabel: 'Drag to reorder',
  }));
  const grip = host.querySelector('.uix-saved-views__grip');
  pointer(grip, 'pointerdown', 10);
  pointer(grip, 'pointerup', 10);
  assert.deepEqual(calls, []);
  unmount();
});

test('the consumer order wins once it arrives', () => {
  const { host, rerender, unmount } = mount(h(ui.SavedViewMenu, {
    sections, onSelect: () => {}, onReorder: () => {}, reorderLabel: 'Drag to reorder',
  }));
  key(host.querySelector('.uix-saved-views__grip'), 'ArrowDown');
  const persisted = [{ ...sections[0], items: [sections[0].items[2], sections[0].items[0], sections[0].items[1]] }, sections[1]];
  rerender(h(ui.SavedViewMenu, { sections: persisted, onSelect: () => {}, onReorder: () => {}, reorderLabel: 'Drag to reorder' }));
  assert.deepEqual(names(host.querySelector('.uix-saved-views__group')), ['P1 only', 'My open work', 'Team queue']);
  unmount();
});

test('the flat items form keeps pin, footer, and reports reorders without a section id', () => {
  const pins = [];
  const calls = [];
  const { host, unmount } = mount(h(ui.SavedViewMenu, {
    items: [{ id: 'a', label: 'A', pinned: true }, { id: 'b', label: 'B' }],
    onSelect: () => {},
    onPinChange: (id, pinned) => pins.push([id, pinned]),
    pinLabel: 'Pin',
    unpinLabel: 'Unpin',
    onReorder: (ids, sectionId) => calls.push([ids, sectionId]),
    reorderLabel: 'Drag to reorder',
    footer: h('button', { type: 'button' }, 'Manage views'),
  }));
  assert.equal(host.querySelector('.uix-saved-views__section'), null, 'no section chrome in the flat form');
  click(host.querySelector('.uix-saved-views__pin'));
  assert.deepEqual(pins, [['a', false]]);
  key(host.querySelector('.uix-saved-views__grip'), 'ArrowDown');
  assert.deepEqual(calls, [[['b', 'a'], undefined]]);
  assert.ok(host.querySelector('.uix-saved-views__footer'));
  unmount();
});
