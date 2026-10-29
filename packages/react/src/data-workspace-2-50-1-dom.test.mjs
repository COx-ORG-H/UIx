/* 2.50.1 (HAR-2631, HAR-2632): DataWorkspace's id column as a sort key, "is none of" enum filters,
 * rowLabel and no empty toolbar, in jsdom; each test fails without its change, and the default
 * markup stays 2.50.0's. Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

/** Every ResizeObserver made, so a test can say "the workspace resized". */
const observers = [];
class FakeResizeObserver {
  constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
  observe(el) { this.targets.push(el); }
  unobserve() {}
  disconnect() { this.targets = []; }
}
/** The width the workspace reports, for the ladder. */
let workspaceWidth = 0;

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
  expose('cancelAnimationFrame', dom.window.cancelAnimationFrame.bind(dom.window));
  expose('ResizeObserver', FakeResizeObserver);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const proto = dom.window.HTMLElement.prototype;
  proto.togglePopover = function () { this.toggleAttribute('data-open'); };
  proto.showPopover = function () { this.setAttribute('data-open', ''); };
  proto.hidePopover = function () { this.removeAttribute('data-open'); };
  const rect = dom.window.Element.prototype.getBoundingClientRect;
  dom.window.Element.prototype.getBoundingClientRect = function () {
    if (this.classList?.contains('uix-data-workspace')) return { x: 0, y: 0, top: 0, left: 0, right: workspaceWidth, bottom: 400, width: workspaceWidth, height: 400 };
    return rect.call(this);
  };
  const matches = dom.window.Element.prototype.matches;
  dom.window.Element.prototype.matches = function (selector) { return selector === ':popover-open' ? this.hasAttribute('data-open') : matches.call(this, selector); };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, root, render: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el, init = {}) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, ...init })));
const keydown = (target, key, init = {}) => act(() => target.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })));
const text = (el) => el?.textContent.replace(/\s+/g, ' ').trim();

const ROWS = Array.from({ length: 6 }, (_, i) => ({ id: `BK-${100 + i}`, title: `Book ${i + 1}`, author: `Author ${i + 1}`, copies: i + 1, year: 2000 + i }));
const COLUMNS = [
  { id: 'title', header: 'Title', cell: (r) => r.title, sortable: true },
  { id: 'author', header: 'Author', cell: (r) => r.author, sortable: true, priority: 'mid' },
  { id: 'year', header: 'Year', cell: (r) => String(r.year), sortable: true, priority: 'low' },
  { id: 'copies', header: h('span', null, 'Copies'), label: 'Copies', cell: (r) => String(r.copies), align: 'end' },
];
const base = (extra = {}) => ({ label: 'Books', rows: ROWS, getRowId: (r) => r.id, columns: COLUMNS, ...extra });
const ID = { header: 'ID', text: (r) => r.id, onPeek() {}, href: (r) => `/books/${r.id}` };

const rowsOf = (t) => [...t.host.querySelectorAll('tbody tr')];
const SORTABLE_ID = { header: 'Book', id: 'title', sortable: true, text: (r) => r.title, onPeek() {} };
const idButton = (t) => t.host.querySelector('thead th[data-col="id"] button.uix-th__sortbtn, thead tr > th:nth-child(1) button.uix-th__sortbtn');

/* ── HAR-2631 · 1: the id column as a sort key ────────────────────────────────────────────── */

test('HAR-2631 without idColumn.sortable the id header is plain, exactly as in 2.50.0', () => {
  const html = renderToStaticMarkup(h(ui.DataWorkspace, base({ idColumn: ID, sort: null, onSortChange() {} })));
  assert.match(html, /<thead><tr><th scope="col">ID<\/th><th data-sort="true" scope="col">/);
  const multi = renderToStaticMarkup(h(ui.DataWorkspace, base({ idColumn: { ...ID, id: 'id' }, sort: [{ columnId: 'id', direction: 'ascending' }, { columnId: 'title', direction: 'ascending' }], onSortChange() {} })));
  assert.match(multi, /<th scope="col">ID<\/th>/, 'an id key in sort does not mark a header that is not sortable');
});

test('HAR-2631 a sortable id header cycles a single sort under its own key, with aria-sort', () => {
  const log = [];
  function Single() {
    const [sort, setSort] = useState(null);
    return h(ui.DataWorkspace, base({ idColumn: SORTABLE_ID, sort, onSortChange: (s) => { log.push(s); setSort(s); } }));
  }
  const t = mount(h(Single));
  const th = t.host.querySelector('thead th:nth-child(1)');
  assert.equal(th.getAttribute('data-sort'), 'true');
  click(th.querySelector('button.uix-th__sortbtn'));
  assert.deepEqual(log.at(-1), { columnId: 'title', direction: 'ascending' });
  assert.equal(t.host.querySelector('thead th:nth-child(1)').getAttribute('aria-sort'), 'ascending');
  click(t.host.querySelector('thead th:nth-child(1) button'));
  assert.deepEqual(log.at(-1), { columnId: 'title', direction: 'descending' });
  click(t.host.querySelector('thead th:nth-child(1) button'));
  assert.equal(log.at(-1), null);
  assert.equal(t.host.querySelector('thead th:nth-child(1)').hasAttribute('aria-sort'), false);
  // the default key is 'id'
  const plain = renderToStaticMarkup(h(ui.DataWorkspace, base({ idColumn: { ...ID, sortable: true }, sort: { columnId: 'id', direction: 'descending' }, onSortChange() {} })));
  assert.match(plain, /<th data-sort="true" aria-sort="descending" scope="col"><button type="button" class="uix-th__sortbtn">ID<\/button><\/th>/);
  t.unmount();
});

test('HAR-2631 multi-sort: Shift + click adds the id key with its ordinal; Shift + Enter does too', () => {
  const log = [];
  function Multi({ initial }) {
    const [sort, setSort] = useState(initial);
    return h(ui.DataWorkspace, base({ idColumn: SORTABLE_ID, columns: COLUMNS.slice(1), sort, onSortChange: (s) => { log.push(s); setSort(s); } }));
  }
  const t = mount(h(Multi, { initial: [{ columnId: 'author', direction: 'ascending' }] }));
  const idTh = () => t.host.querySelector('thead th:nth-child(1)');
  click(idTh().querySelector('button'), { shiftKey: true });
  assert.deepEqual(log.at(-1), [{ columnId: 'author', direction: 'ascending' }, { columnId: 'title', direction: 'ascending' }]);
  assert.equal(idTh().getAttribute('data-sort-order'), '2');
  assert.equal(idTh().querySelector('button .uix-visually-hidden').textContent, ', Sort priority 2');
  assert.equal(idTh().getAttribute('aria-sort'), 'ascending');
  t.unmount();
  // the keyboard path: Shift + Enter makes a click with no pointer
  const k = mount(h(Multi, { initial: [{ columnId: 'author', direction: 'ascending' }] }));
  const btn = k.host.querySelector('thead th:nth-child(1) button');
  keydown(btn, 'Enter', { shiftKey: true });
  click(btn, { detail: 0 });
  assert.deepEqual(log.at(-1), [{ columnId: 'author', direction: 'ascending' }, { columnId: 'title', direction: 'ascending' }]);
  keydown(btn, 'Enter');
  click(btn, { detail: 0 });
  assert.deepEqual(log.at(-1), [{ columnId: 'title', direction: 'descending' }], 'Enter alone: the id key alone, turned');
  k.unmount();
});

test('HAR-2631 a sortable id header keeps its place in the frozen, fixed and ladder layouts', () => {
  workspaceWidth = 800;
  const t = mount(h(ui.DataWorkspace, base({
    idColumn: { ...SORTABLE_ID, width: '16rem' }, mobile: 'priority', fixed: true, selection: new Set(), onSelectionChange() {},
    sort: [{ columnId: 'title', direction: 'ascending' }], multiSort: true, onSortChange() {},
  })));
  const table = t.host.querySelector('table');
  assert.ok(table.classList.contains('uix-table--pinned-col') && table.classList.contains('uix-data-workspace__grid--pin-id') && table.classList.contains('uix-table--fixed'));
  const idTh = t.host.querySelector('thead th[data-col="id"]');
  assert.equal(idTh, t.host.querySelector('thead tr').children[1], 'still the second header, after the checkbox');
  assert.equal(idTh.getAttribute('aria-sort'), 'ascending');
  t.unmount();
  workspaceWidth = 0;
});
