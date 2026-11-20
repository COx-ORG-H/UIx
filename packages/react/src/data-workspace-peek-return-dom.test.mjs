/* Experiment (phone-OS motion study, Tier 3 item 12) — the way back from a Peek: with `peekRowId`,
 * DataWorkspace gives focus back to the row whose record the Peek showed and plays the arrival cue
 * ([data-uix-arrival], arrival.css) on it once. Covers: the row that opened it, the row the Peek
 * moved to with ↑ / ↓, a row that left the list while the Peek was open (the row now in its place
 * takes focus, no cue), focus left alone outside the table, the id control without rowNavigation,
 * the cue ending on its own animationend, and no change without `peekRowId`.
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
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const proto = dom.window.HTMLElement.prototype;
  proto.togglePopover = function () { this.toggleAttribute('data-open'); };
  proto.showPopover = function () { this.setAttribute('data-open', ''); };
  proto.hidePopover = function () { this.removeAttribute('data-open'); };
  const matches = dom.window.Element.prototype.matches;
  dom.window.Element.prototype.matches = function (selector) { return selector === ':popover-open' ? this.hasAttribute('data-open') : matches.call(this, selector); };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const ROWS = Array.from({ length: 5 }, (_, i) => ({ id: `INC-${100 + i}`, title: `Vorfall ${i + 1}` }));
const COLUMNS = [{ id: 'title', header: 'Title', cell: (r) => r.title }];

/** A workspace whose props the test sets again (rows, peekRowId), like a product re-rendering. */
const mount = (props) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let current = { rows: ROWS, ...props };
  const render = () => act(() => root.render(h(ui.DataWorkspace, {
    label: 'Incidents', columns: COLUMNS, getRowId: (r) => r.id,
    idColumn: { header: 'ID', text: (r) => r.id, onPeek: () => {} },
    ...current,
  })));
  render();
  return {
    host,
    set: (next) => { current = { ...current, ...next }; render(); },
    unmount: () => { act(() => root.unmount()); host.remove(); },
  };
};
/** Focus inside act: the row's focus handler sets state. */
const focus = (el) => act(() => el.focus());
const row = (host, id) => host.querySelector(`tbody tr[data-uix-row-id="${id}"]`);
const cued = (host) => [...host.querySelectorAll('[data-uix-arrival]')].map((el) => el.getAttribute('data-uix-row-id'));

test('closing the Peek focuses the row it showed and plays the arrival cue once', () => {
  const ws = mount({ rowNavigation: true, peekRowId: null });
  ws.set({ peekRowId: 'INC-102' });
  assert.deepEqual(cued(ws.host), [], 'no cue while the Peek is open');
  // the Peek's dialog closed and gave focus back to <body> (or to its opener)
  focus(document.body);
  ws.set({ peekRowId: null });
  assert.equal(document.activeElement, row(ws.host, 'INC-102'));
  assert.deepEqual(cued(ws.host), ['INC-102']);
  // the cue removes itself when its own animation ends, not when a child's does
  const el = row(ws.host, 'INC-102');
  act(() => el.querySelector('td').dispatchEvent(Object.assign(new window.Event('animationend', { bubbles: true }), { animationName: 'uix-arrival-row' })));
  assert.deepEqual(cued(ws.host), ['INC-102'], "a cell's animationend does not end the row's cue");
  act(() => el.dispatchEvent(Object.assign(new window.Event('animationend', { bubbles: true }), { animationName: 'uix-arrival-row' })));
  assert.deepEqual(cued(ws.host), []);
  ws.unmount();
});

test('after ↑ / ↓ in the Peek, the way back is to the record it showed last', () => {
  const ws = mount({ rowNavigation: true, peekRowId: 'INC-100' });
  ws.set({ peekRowId: 'INC-101' });
  ws.set({ peekRowId: 'INC-103' });
  // focus came back to the opener, the first row's id button: still in the table, so it moves
  focus(row(ws.host, 'INC-100').querySelector('.uix-id-cell__btn'));
  ws.set({ peekRowId: null });
  assert.equal(document.activeElement, row(ws.host, 'INC-103'));
  assert.deepEqual(cued(ws.host), ['INC-103']);
  ws.unmount();
});

test('a row that left the list while the Peek was open hands focus to the row in its place, without a cue', () => {
  const ws = mount({ rowNavigation: true, peekRowId: 'INC-102' });
  // resolved in the Peek: the refetch drops it, then the product closes the Peek
  ws.set({ rows: ROWS.filter((r) => r.id !== 'INC-102') });
  focus(document.body);
  ws.set({ peekRowId: null });
  assert.equal(document.activeElement, row(ws.host, 'INC-103'), 'the row now at its place');
  assert.deepEqual(cued(ws.host), []);
  ws.unmount();
});

test('the last row leaving hands focus to the new last row; an empty list takes nothing', () => {
  const ws = mount({ rowNavigation: true, peekRowId: 'INC-104' });
  ws.set({ rows: ROWS.slice(0, 4) });
  focus(document.body);
  ws.set({ peekRowId: null });
  assert.equal(document.activeElement, row(ws.host, 'INC-103'));
  ws.set({ peekRowId: 'INC-103' });
  ws.set({ rows: [] });
  focus(document.body);
  assert.doesNotThrow(() => ws.set({ peekRowId: null }));
  assert.equal(document.activeElement, document.body);
  ws.unmount();
});

test('focus somewhere else on the page stays there; the row still gets the cue', () => {
  const ws = mount({ rowNavigation: true, peekRowId: 'INC-101' });
  const search = document.createElement('input');
  document.body.append(search);
  focus(search);
  ws.set({ peekRowId: null });
  assert.equal(document.activeElement, search);
  assert.deepEqual(cued(ws.host), ['INC-101']);
  search.remove();
  ws.unmount();
});

test('without rowNavigation the row\'s id control takes focus', () => {
  const ws = mount({ peekRowId: 'INC-101' });
  focus(document.body);
  ws.set({ peekRowId: null });
  assert.equal(document.activeElement, row(ws.host, 'INC-101').querySelector('.uix-id-cell__btn'));
  assert.deepEqual(cued(ws.host), ['INC-101']);
  ws.unmount();
});

test('reopening and closing again replays the cue on the same row', () => {
  const ws = mount({ rowNavigation: true, peekRowId: 'INC-101' });
  ws.set({ peekRowId: null });
  ws.set({ peekRowId: 'INC-101' });
  ws.set({ peekRowId: null });
  assert.deepEqual(cued(ws.host), ['INC-101']);
  ws.unmount();
});

test('without peekRowId nothing moves and nothing is cued', () => {
  const ws = mount({ rowNavigation: true });
  focus(document.body);
  ws.set({ rows: ROWS.slice(1) });
  assert.equal(document.activeElement, document.body);
  assert.deepEqual(cued(ws.host), []);
  ws.unmount();
});
