/* HAR-1388 (UIx ADR-0004; TENSOR data-table, MOTUS UixDataWorkspace) — DataWorkspace in jsdom: the
 * toolbar order, Ctrl/⌘ + / to the search, filter chips and "+ Filter" over FilterEditor, sorting
 * through the headers, selection kept by id with Shift-click ranges and select-all, the bulk bar,
 * the record-id cell (peek and ↗), the frozen row-actions column, the footer (x–y of N, rows per
 * page, offset and cursor pagers), the states, a refetch that keeps the rows, maximize and Escape,
 * and the words through UixLabelsProvider.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

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

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, root, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el, init = {}) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, ...init })));
const keydown = (target, key, init = {}) => act(() => target.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })));

const ROWS = Array.from({ length: 6 }, (_, i) => ({ id: `INC-${100 + i}`, title: `Vorfall ${i + 1}`, priority: (i % 3) + 1 }));
const COLUMNS = [
  { id: 'title', header: 'Title', cell: (r) => r.title, sortable: true },
  { id: 'priority', header: 'Priority', cell: (r) => `P${r.priority}`, align: 'end' },
];
const FIELDS = [{ id: 'state', label: 'State', kind: 'enum', options: [{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }] }, { id: 'title', label: 'Title', kind: 'text' }];

function Workspace({ log, extra = {} }) {
  const [selection, setSelection] = useState(new Set());
  const [sort, setSort] = useState(null);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const [maximized, setMaximized] = useState(false);
  return h(ui.DataWorkspace, {
    label: 'Incidents', rows: ROWS, getRowId: (r) => r.id, columns: COLUMNS,
    idColumn: { header: 'ID', text: (r) => r.id, onPeek: (r) => log.push(`peek ${r.id}`), href: (r) => `/incidents/${r.id}` },
    sort, onSortChange: (s) => { log.push(['sort', s]); setSort(s); },
    selection, onSelectionChange: (s) => { log.push(['selection', [...s]]); setSelection(s); },
    bulkActions: (ids) => h('button', { type: 'button', className: 'bulk' }, `Assign ${ids.length}`),
    rowActions: (r) => h('button', { type: 'button', className: 'rowact', 'aria-label': `Actions for ${r.id}` }, '⋯'),
    search: { value: search, onChange: (v) => { log.push(['search', v]); setSearch(v); } },
    filters: { fields: FIELDS, values: filters, onChange: (id, v) => { log.push(['filter', id, v]); setFilters((f) => ({ ...f, [id]: v })); } },
    viewChanged: Object.values(filters).some(Boolean), onSaveView: () => log.push('save'), onSaveViewAs: () => log.push('save-as'),
    maximized, onMaximizedChange: (m) => { log.push(['maximized', m]); setMaximized(m); },
    toolbarEnd: h('button', { type: 'button', className: 'new' }, 'New'),
    pagination: { mode: 'offset', page: 2, pageSize: 6, total: 20, onPageChange: (p) => log.push(['page', p]), pageSizes: [6, 12], onPageSizeChange: (n) => log.push(['size', n]) },
    ...extra,
  });
}

test('the table: id cell (peek and ↗), sortable headers, the frozen actions column, selection by id with Shift ranges', () => {
  const log = [];
  const t = mount(h(Workspace, { log }));
  const table = t.host.querySelector('table');
  assert.equal(table.getAttribute('aria-label'), 'Incidents');
  assert.ok(table.classList.contains('uix-table--pinned-actions'));
  const idCell = t.host.querySelector('tbody tr .uix-id-cell');
  click(idCell.querySelector('button.uix-id-cell__btn'));
  assert.deepEqual(log.at(-1), 'peek INC-100');
  assert.equal(idCell.querySelector('a').getAttribute('href'), '/incidents/INC-100');
  assert.equal(idCell.querySelector('a').getAttribute('aria-label'), 'Open INC-100');
  // sort cycles ascending → descending → none
  const sortTitle = [...t.host.querySelectorAll('th button.uix-th__sortbtn')].find((b) => b.textContent === 'Title');
  click(sortTitle);
  assert.deepEqual(log.at(-1), ['sort', { columnId: 'title', direction: 'ascending' }]);
  click(sortTitle);
  click(sortTitle);
  assert.deepEqual(log.at(-1), ['sort', null]);
  assert.equal(t.host.querySelector('th.uix-col--num').textContent, 'Priority');
  // selection: click row 2, Shift-click row 5 → rows 2–5; the bulk bar shows
  const boxes = () => [...t.host.querySelectorAll('tbody input[type="checkbox"]')];
  assert.equal(boxes()[1].getAttribute('aria-label'), 'Select INC-101');
  click(boxes()[1]);
  click(boxes()[4], { shiftKey: true });
  assert.deepEqual(log.at(-1), ['selection', ['INC-101', 'INC-102', 'INC-103', 'INC-104']]);
  assert.equal(t.host.querySelector('.uix-bulkbar__count').textContent, '4 selected');
  assert.equal(t.host.querySelector('.uix-bulkbar .bulk').textContent, 'Assign 4');
  const all = t.host.querySelector('thead input[type="checkbox"]');
  assert.equal(all.indeterminate, true);
  click(all);
  assert.equal(log.at(-1)[1].length, 6);
  assert.equal(t.host.querySelectorAll('tbody tr[data-selected]').length, 6);
  t.unmount();
});

test('the toolbar: saved view and save first, filters, search (Ctrl + /), the product\'s actions; maximize and Escape', () => {
  const log = [];
  const t = mount(h(Workspace, { log, extra: { savedViews: { current: 'My open', menu: { items: [{ id: 'mine', label: 'My open', active: true }], onSelect: (id) => log.push(`view ${id}`) } } } }));
  const toolbar = t.host.querySelector('[role="toolbar"]');
  const order = [...toolbar.children].map((el) => el.className || el.tagName);
  assert.match(order[0], /uix-data-workspace__menu/, 'the saved view first');
  assert.ok(order.indexOf('uix-toolbar__spacer') < order.findIndex((c) => /uix-searchbar/.test(c)), 'search after the spacer');
  assert.equal(toolbar.lastElementChild.className, 'new');
  keydown(document.body, '/', { ctrlKey: true });
  assert.equal(document.activeElement, toolbar.querySelector('input[type="search"]'), 'Ctrl + / focuses the search');
  const maximize = toolbar.querySelector('button[aria-label="Maximize"]');
  assert.equal(maximize.getAttribute('aria-pressed'), 'false');
  click(maximize);
  assert.ok(t.host.querySelector('.uix-data-workspace--maximized'));
  keydown(document.body, 'Escape');
  assert.deepEqual(log.at(-1), ['maximized', false]);
  assert.equal(t.host.querySelector('.uix-data-workspace--maximized'), null);
  t.unmount();
});

test('filters: "+ Filter" lists the unset fields; applying makes a chip with a ×; Save changes appears', () => {
  const log = [];
  const t = mount(h(Workspace, { log }));
  const toolbar = () => t.host.querySelector('[role="toolbar"]');
  const add = toolbar().querySelector('button.uix-chip--add');
  assert.equal(add.textContent, 'Filter');
  click(add);
  const item = [...t.host.querySelectorAll('[role="menuitem"]')].find((m) => m.textContent === 'State');
  click(item);
  const pop = [...t.host.querySelectorAll('[popover]')].find((p) => p.hasAttribute('data-open') && p.querySelector('.uix-filter-editor'));
  assert.ok(pop, 'the editor opens for State');
  click([...pop.querySelectorAll('.uix-checkbox input')][0]);
  click([...pop.querySelectorAll('button')].find((b) => b.textContent === 'Apply'));
  assert.deepEqual(log.at(-1), ['filter', 'state', { kind: 'enum', values: ['open'] }]);
  const chip = toolbar().querySelector('.uix-data-workspace__chip');
  assert.match(chip.textContent, /State: Open/);
  assert.ok([...toolbar().querySelectorAll('button')].some((b) => b.textContent === 'Save changes'));
  click(chip.querySelector('.uix-chip__remove'));
  assert.deepEqual(log.at(-1), ['filter', 'state', undefined]);
  t.unmount();
});

test('the footer: x–y of N, rows per page, the offset pager; a cursor pager with no total', () => {
  const html = renderToStaticMarkup(h(Workspace, { log: [] }));
  assert.match(html, /<span class="uix-data-workspace__range">7–12 of 20<\/span>/);
  assert.match(html, /Rows per page/);
  assert.match(html, /aria-current="page"[^>]*>2</);
  const cursor = renderToStaticMarkup(h(Workspace, { log: [], extra: { pagination: { mode: 'cursor', hasPrevious: true, hasNext: false, onPrevious() {}, onNext() {}, summary: '21–26' } } }));
  assert.doesNotMatch(cursor, /uix-data-workspace__range/);
  assert.match(cursor, /21–26/);
});

test('states: first load is the only skeleton; a refetch keeps the rows under TableWrap refreshing; empty and filtered empty; error', () => {
  const render = (extra) => renderToStaticMarkup(h(ui.DataWorkspace, { label: 'Incidents', rows: ROWS, getRowId: (r) => r.id, columns: COLUMNS, ...extra }));
  assert.match(render({ status: 'loading' }), /uix-skeleton/);
  const refetch = render({ refreshing: true });
  assert.match(refetch, /<div class="uix-table-wrap uix-data-workspace__table" aria-busy="true">/);
  assert.equal((refetch.match(/<tr/g) ?? []).length, 7, 'the header and all six rows stay');
  assert.doesNotMatch(refetch, /uix-skeleton/);
  assert.match(render({ rows: [] }), /Nothing here yet/);
  assert.match(render({ rows: [], search: { value: 'x', onChange() {} } }), /Nothing matches[\s\S]*Clear filters/);
  assert.match(render({ status: 'error', onRetry() {} }), /The list could not be loaded[\s\S]*Try again/);
});

test('selection survives a refetch and a new page: it is kept by id', () => {
  const selection = new Set(['INC-102', 'INC-999']);
  const html = renderToStaticMarkup(h(ui.DataWorkspace, { label: 'Incidents', rows: ROWS, getRowId: (r) => r.id, columns: COLUMNS, selection, onSelectionChange() {}, bulkActions: () => 'x', refreshing: true }));
  assert.equal((html.match(/data-selected="true"/g) ?? []).length, 1);
  assert.match(html, /2 selected/, 'a row on another page stays selected');
});

test('German words through UixLabelsProvider', () => {
  const html = renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { dataWorkspace: { range: '{from}–{to} von {total}', addFilter: 'Filter hinzufügen', maximize: 'Maximieren' } } }, h(Workspace, { log: [] })));
  assert.match(html, /7–12 von 20/);
  assert.match(html, /Filter hinzufügen/);
  assert.match(html, /aria-label="Maximieren"/);
});
