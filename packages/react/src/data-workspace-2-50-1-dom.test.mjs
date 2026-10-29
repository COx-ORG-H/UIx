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

/* ── HAR-2632: a row's name without an id column; no empty toolbar ────────────────────────── */

test('HAR-2632 rowLabel names the row checkbox when there is no idColumn.text; idColumn.text still wins; without both, the row id', () => {
  const uuid = (i) => `3f2a9c0e-${i}`;
  const rows = ROWS.map((r, i) => ({ ...r, id: uuid(i) }));
  const named = renderToStaticMarkup(h(ui.DataWorkspace, base({ rows, rowLabel: (r) => r.title, selection: new Set(), onSelectionChange() {} })));
  assert.match(named, /aria-label="Select Book 1"/);
  assert.doesNotMatch(named, /Select 3f2a9c0e/);
  const both = renderToStaticMarkup(h(ui.DataWorkspace, base({ rows, rowLabel: (r) => r.title, idColumn: ID, selection: new Set(), onSelectionChange() {} })));
  assert.match(both, /aria-label="Select 3f2a9c0e-0"/, 'idColumn.text (here the id) comes first');
  const bare = renderToStaticMarkup(h(ui.DataWorkspace, base({ rows, selection: new Set(), onSelectionChange() {} })));
  assert.match(bare, /aria-label="Select 3f2a9c0e-0"/, 'unchanged without rowLabel');
});

test('HAR-2632 a workspace with nothing for its toolbar renders no toolbar band; any one part brings it back as before', () => {
  const bare = renderToStaticMarkup(h(ui.DataWorkspace, base()));
  assert.doesNotMatch(bare, /role="toolbar"/);
  assert.match(bare, /^<section class="uix-data-workspace" aria-label="Books"><div class="uix-table-wrap/, 'the table comes first: no empty band, no gap above it');
  const parts = {
    search: { search: { value: '', onChange() {} } },
    filters: { filters: { fields: [], values: {}, onChange() {} } },
    savedViews: { savedViews: { current: 'All', menu: { items: [], onSelect() {} } } },
    viewMenu: { viewMenu: { columns: [], onColumnVisibilityChange() {} } },
    save: { viewChanged: true, onSaveView() {} },
    saveAs: { saveViewAs: 'always', onSaveViewAs() {} },
    maximize: { onMaximizedChange() {} },
    toolbarEnd: { toolbarEnd: h('button', { type: 'button' }, 'New') },
  };
  for (const [name, extra] of Object.entries(parts)) {
    assert.match(renderToStaticMarkup(h(ui.DataWorkspace, base(extra))), /^<section class="uix-data-workspace" aria-label="Books"><div class="uix-toolbar uix-data-workspace__toolbar" role="toolbar" aria-label="Books">/, name);
  }
  // a state body keeps working without the toolbar
  assert.match(renderToStaticMarkup(h(ui.DataWorkspace, base({ rows: [] }))), /^<section class="uix-data-workspace" aria-label="Books"><div class="uix-busy-region uix-data-workspace__state">/);
});

/* ── HAR-2631 · 2: an excluding enum filter on a DataWorkspace chip ───────────────────────── */

test('HAR-2631 a DataWorkspace chip says "not …" for an is-none-of value, in the words of UixLabelsProvider filterSummary', () => {
  const field = { id: 'state', label: 'Status', kind: 'enum', enumOperators: ['is-any-of', 'is-none-of'], options: [{ value: 'open', label: 'Open' }, { value: 'lost', label: 'Lost' }] };
  const values = { state: { kind: 'enum', values: ['open', 'lost'], operator: 'is-none-of' } };
  const en = renderToStaticMarkup(h(ui.DataWorkspace, base({ filters: { fields: [field], values, onChange() {} } })));
  assert.match(en, /Status: not Open, Lost/);
  const de = renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { filterSummary: { noneOf: 'nicht {values}' } } },
    h(ui.DataWorkspace, base({ filters: { fields: [field], values, onChange() {} } }))));
  assert.match(de, /Status: nicht Open, Lost/);
});

/* ── HAR-2631 · 3: a table that asks for standard holds it ─────────────────────────────────── */

test('HAR-2631 Table density="standard" names itself (data-density), so the standard row height holds; no density follows the page', () => {
  assert.match(renderToStaticMarkup(h(ui.Table, { density: 'standard' })), /<table class="uix-table" data-density="standard">/);
  assert.match(renderToStaticMarkup(h(ui.Table, {})), /<table class="uix-table"><\/table>/, 'no density: no attribute, the page decides');
  assert.match(renderToStaticMarkup(h(ui.DataWorkspace, base({ density: 'standard' }))), /<table class="uix-table" data-density="standard"/);
  assert.match(renderToStaticMarkup(h(ui.DataWorkspace, base())), /<table class="uix-table" aria-label="Books">/);
});

/* ── HAR-2631 · 4: the workspace pager in the provider's words ──────────────────────────────── */

test('HAR-2631 the workspace pager takes UixLabelsProvider pagination; pagination.labels still wins; English without either', () => {
  const pagination = { mode: 'offset', page: 2, pageSize: 6, total: 20, onPageChange() {} };
  const en = renderToStaticMarkup(h(ui.DataWorkspace, base({ pagination })));
  assert.match(en, /<nav aria-label="Pagination" class="uix-pagination"/);
  assert.match(en, /aria-label="Previous page"/);
  const de = renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { pagination: { region: 'Seiten', previous: 'Vorherige Seite', next: 'Nächste Seite' } } },
    h(ui.DataWorkspace, base({ pagination }))));
  assert.match(de, /<nav aria-label="Seiten" class="uix-pagination"/);
  assert.match(de, /aria-label="Vorherige Seite"/);
  assert.match(de, /aria-label="Nächste Seite"/);
  const own = renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { pagination: { region: 'Seiten', next: 'Nächste Seite' } } },
    h(ui.DataWorkspace, base({ pagination: { ...pagination, labels: { region: 'Bücherseiten' } } }))));
  assert.match(own, /<nav aria-label="Bücherseiten" class="uix-pagination"/, 'the prop wins');
  assert.match(own, /aria-label="Nächste Seite"/, 'the provider fills the rest');
  const cursor = renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { pagination: { previous: 'Vorherige Seite' } } },
    h(ui.DataWorkspace, base({ pagination: { mode: 'cursor', hasPrevious: true, hasNext: true, onPrevious() {}, onNext() {} } }))));
  assert.match(cursor, /aria-label="Vorherige Seite"/);
});

/* ── HAR-2632: a fixed-layout workspace with row actions mounts in plain jsdom ─────────────── */

test('HAR-2632 a fixed-layout workspace with row actions mounts in jsdom with no Range shim (no layout, the fallback width)', () => {
  // the JSDOM here exposes no Range layout methods, as in a consumer's test setup
  assert.equal(typeof document.createRange().getBoundingClientRect, 'undefined');
  const columns = [{ id: 'title', header: 'Title', cell: (r) => r.title, className: 'uix-col--truncate uix-col--flex' }];
  let t;
  assert.doesNotThrow(() => { t = mount(h(ui.DataWorkspace, base({ columns, rowActions: () => h('button', { type: 'button' }, 'Renew') }))); });
  assert.ok(t.host.querySelector('table').classList.contains('uix-table--fixed'));
  assert.equal(t.host.querySelector('colgroup col:last-child').style.width, '5.25rem', 'the fallback width');
  t.unmount();
});

/* ── HAR-2634: rowActions knows the ladder's step ──────────────────────────────────────────── */

test('HAR-2634 rowActions gets { ladder, compact }: compact only at the narrowest table step; asked again when the step changes', () => {
  const seen = [];
  const rowActions = (r, context) => { seen.push(context); return context.compact ? h('button', { type: 'button', className: 'peek' }, 'Peek') : h('button', { type: 'button', className: 'renew' }, 'Renew'); };
  workspaceWidth = 1200;
  const t = mount(h(ui.DataWorkspace, base({ mobile: 'priority', rowActions })));
  assert.deepEqual(seen.at(-1), { ladder: null, compact: false });
  assert.equal(t.host.querySelectorAll('tbody .renew').length, 6);
  const observer = observers.find((o) => o.targets.includes(t.host.querySelector('.uix-data-workspace')));
  const calls = seen.length;
  t.render(h(ui.DataWorkspace, base({ mobile: 'priority', rowActions })));
  assert.equal(seen.length, calls, 'the same rows and step: not asked again');
  workspaceWidth = 800;
  act(() => observer.callback([]));
  assert.deepEqual(seen.at(-1), { ladder: 'priority', compact: false });
  workspaceWidth = 500;
  act(() => observer.callback([]));
  assert.deepEqual(seen.at(-1), { ladder: 'priority-mid', compact: true });
  assert.equal(t.host.querySelectorAll('tbody .peek').length, 6, 'the compact set at the narrow step');
  assert.equal(t.host.querySelectorAll('tbody .renew').length, 0);
  t.unmount();
  // cards keep the full set (the actions get their own line)
  workspaceWidth = 390;
  const c = mount(h(ui.DataWorkspace, base({ mobile: 'cards', rowActions })));
  assert.deepEqual(seen.at(-1), { ladder: 'cards', compact: false });
  c.unmount();
  // without mobile: the full table
  workspaceWidth = 390;
  const plain = mount(h(ui.DataWorkspace, base({ rowActions })));
  assert.deepEqual(seen.at(-1), { ladder: null, compact: false });
  plain.unmount();
  workspaceWidth = 0;
});

test('HAR-2634 one-argument rowActions callers are untouched', () => {
  const html = renderToStaticMarkup(h(ui.DataWorkspace, base({ rowActions: (r) => h('button', { type: 'button' }, `Act ${r.id}`) })));
  assert.match(html, /<table class="uix-table uix-table--pinned-actions"/);
  assert.match(html, /<td class="uix-table__actions"><button type="button">Act BK-100<\/button><\/td>/);
});

test('PR #179 review: an inline rowActions does not re-measure the actions on every render', () => {
  const proto = window.HTMLElement.prototype;
  const rect = proto.getBoundingClientRect;
  let reads = 0;
  proto.getBoundingClientRect = function () { if (this.classList?.contains('uix-table__actions')) reads += 1; return rect.call(this); };
  try {
    const view = (n) => h(ui.DataWorkspace, base({ rowActions: (r) => h('button', { type: 'button' }, `Act ${r.id} ${n}`) }));
    const t = mount(view(0));
    const first = reads;
    for (let n = 1; n <= 5; n += 1) t.render(view(n));
    assert.equal(reads, first, `the same rows re-rendered five times: ${reads - first} extra reads`);
    t.render(h(ui.DataWorkspace, base({ rows: ROWS.slice(0, 3), rowActions: (r) => h('button', { type: 'button' }, `Act ${r.id}`) })));
    assert.ok(reads > first, 'a new row set is measured');
    t.unmount();
  } finally {
    proto.getBoundingClientRect = rect;
  }
});
