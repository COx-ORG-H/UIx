/* HAR-1527 (U6 AC8, FG-REC-4) — `List roving`: one tab stop, arrow keys between items, Home
 * and End, and focus that stays on the same item across re-renders with the same keys.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does. */
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
  return { host, root, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const key = (el, name) => {
  const event = new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(event); });
  return event;
};
const list = (ids, props = {}, onPick) => h(ui.List, { roving: true, 'aria-label': 'Items of the day', ...props },
  ids.map((id) => h(ui.ListItem, { key: id, title: `Item ${id}`, 'data-id': id, onClick: onPick ? () => onPick(id) : undefined })));
const ten = Array.from({ length: 10 }, (_, i) => String(i + 1));
const items = (host) => [...host.querySelectorAll('.uix-list__item')];
const stops = (host) => items(host).filter((el) => el.tabIndex === 0).map((el) => el.getAttribute('data-id'));
const focused = () => document.activeElement?.getAttribute('data-id') ?? null;

test('AC8: a roving list of ten items is one tab stop', () => {
  const { host, unmount } = mount(list(ten));
  assert.equal(items(host).length, 10);
  assert.deepEqual(stops(host), ['1']);
  assert.equal(items(host).filter((el) => el.tabIndex === -1).length, 9);
  assert.equal(host.querySelector('.uix-list').getAttribute('role'), 'list');
  for (const el of items(host)) assert.equal(el.getAttribute('role'), 'listitem');
  unmount();
});

test('AC8: ArrowDown three times from the first item focuses the fourth; Home and End go to the ends', () => {
  const { host, unmount } = mount(list(ten));
  act(() => items(host)[0].focus());
  for (let i = 0; i < 3; i++) key(document.activeElement, 'ArrowDown');
  assert.equal(focused(), '4');
  assert.deepEqual(stops(host), ['4'], 'the tab stop moved with the focus');
  key(document.activeElement, 'ArrowUp');
  assert.equal(focused(), '3');
  key(document.activeElement, 'End');
  assert.equal(focused(), '10');
  key(document.activeElement, 'ArrowDown');
  assert.equal(focused(), '10', 'no wrap at the end');
  key(document.activeElement, 'Home');
  assert.equal(focused(), '1');
  key(document.activeElement, 'ArrowUp');
  assert.equal(focused(), '1', 'no wrap at the start');
  unmount();
});

test('AC8: after a re-render with the same keys, focus and the tab stop stay on the same item', () => {
  const { host, root, unmount } = mount(list(ten));
  act(() => items(host)[0].focus());
  for (let i = 0; i < 4; i++) key(document.activeElement, 'ArrowDown');
  const before = document.activeElement;
  act(() => root.render(list(ten, { 'aria-label': 'Items of the day, updated' })));
  assert.equal(document.activeElement, before, 'the same element still has focus');
  assert.equal(focused(), '5');
  assert.deepEqual(stops(host), ['5']);
  // New items around it: the stop stays on the item, not on its old position.
  act(() => root.render(list(['0', ...ten, '11'])));
  assert.equal(focused(), '5');
  assert.deepEqual(stops(host), ['5']);
  unmount();
});

test('when the item with the tab stop is removed, the stop moves to the item now in its place', () => {
  const { host, root, unmount } = mount(list(ten));
  act(() => items(host)[9].focus());
  assert.deepEqual(stops(host), ['10']);
  act(() => root.render(list(ten.slice(0, 6))));
  assert.deepEqual(stops(host), ['6'], 'still exactly one tab stop, on the last item left');
  act(() => root.render(list([])));
  assert.equal(items(host).length, 0);
  act(() => root.render(list(['a', 'b'])));
  assert.deepEqual(stops(host), ['a']);
  unmount();
});

test('Enter and Space activate the focused item; a click on another item moves the tab stop there', () => {
  const picked = [];
  const { host, unmount } = mount(list(ten, {}, (id) => picked.push(id)));
  act(() => items(host)[2].focus());
  const enter = key(document.activeElement, 'Enter');
  key(document.activeElement, ' ');
  assert.deepEqual(picked, ['3', '3']);
  assert.equal(enter.defaultPrevented, true);
  act(() => items(host)[6].focus());
  assert.deepEqual(stops(host), ['7']);
  unmount();
});

test('a control inside an item keeps its own keys, and a consumer onKeyDown that prevents default wins', () => {
  const seen = [];
  const { host, unmount } = mount(h(ui.List, { roving: true, onKeyDown: (event) => { seen.push(event.key); if (event.key === 'End') event.preventDefault(); } },
    h(ui.ListItem, { key: 'a', title: 'A', 'data-id': 'a' }, h('button', { type: 'button', id: 'inner' }, 'Open')),
    h(ui.ListItem, { key: 'b', title: 'B', 'data-id': 'b' })));
  const inner = host.querySelector('#inner');
  act(() => inner.focus());
  const arrow = key(inner, 'ArrowDown');
  assert.equal(arrow.defaultPrevented, false, 'the list does not take a key pressed inside a control');
  assert.equal(document.activeElement, inner);
  act(() => items(host)[0].focus());
  key(document.activeElement, 'End');
  assert.equal(focused(), 'a', 'the consumer prevented End');
  assert.deepEqual(seen, ['ArrowDown', 'End']);
  unmount();
});

test('without roving the list is what it was: no roles, no tab stops, no key handling', () => {
  const { host, unmount } = mount(h(ui.List, null, ten.slice(0, 3).map((id) => h(ui.ListItem, { key: id, title: id, 'data-id': id }))));
  assert.equal(host.querySelector('.uix-list').hasAttribute('role'), false);
  assert.equal(host.querySelector('.uix-list').classList.contains('uix-list--roving'), false);
  for (const el of items(host)) { assert.equal(el.hasAttribute('tabindex'), false); assert.equal(el.hasAttribute('role'), false); }
  unmount();
});
