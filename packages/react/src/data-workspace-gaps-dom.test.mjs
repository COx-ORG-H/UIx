/* HAR-2622..2626 (UIx ADR-0005 addendum; MOTUS HAR-1441, TENSOR HAR-1491) — DataWorkspace's
 * adoption gaps in jsdom, one test (or more) per prop: the responsive ladder, the rich id cell,
 * the product's state bodies and actions, search submit / clear / maxLength, Save as always,
 * clear-all as one change, maxSelection, beforeBody, the saved-view note, multi-column sort,
 * loadingRows, zebra, freezeFirstColumn, column className / minWidth, row groups, windowing and
 * the keyboard row model, and rows that do not re-render on another row's selection.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useMemo, useState } from 'react';
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

/* ── HAR-2622 ─────────────────────────────────────────────────────────────────────────────── */

test('HAR-2622 ladder: mobile="priority" drops low columns below 900 px and mid ones below 600 px of the workspace', () => {
  workspaceWidth = 800;
  const t = mount(h(ui.DataWorkspace, base({ mobile: 'priority', idColumn: ID, selection: new Set(), onSelectionChange() {}, rowActions: () => h('button', { type: 'button' }, '⋯') })));
  const table = () => t.host.querySelector('table');
  assert.ok(table().classList.contains('uix-table--priority'), '800 px: low columns go');
  const firstRow = t.host.querySelector('tbody tr');
  assert.deepEqual([...firstRow.children].map((td) => td.getAttribute('data-col')), ['select', 'id', 'title', 'author', 'year', 'copies', 'actions']);
  assert.deepEqual([...firstRow.children].map((td) => td.getAttribute('data-priority')), [null, null, null, 'mid', 'low', null, null]);
  assert.equal(firstRow.querySelector('[data-col="copies"]').getAttribute('data-label'), 'Copies', 'a ReactNode header takes column.label');
  assert.equal(firstRow.querySelector('[data-col="title"]').getAttribute('data-label'), 'Title', 'a string header is its own label');
  assert.equal(t.host.querySelector('thead th[data-col="year"]').getAttribute('data-priority'), 'low');
  // the workspace narrows: the observer reads the new width
  workspaceWidth = 500;
  const observer = observers.find((o) => o.targets.includes(t.host.querySelector('.uix-data-workspace')));
  assert.ok(observer, 'the workspace itself is observed');
  act(() => observer.callback([]));
  assert.ok(table().classList.contains('uix-table--priority-mid'), '500 px: mid columns go too');
  workspaceWidth = 1200;
  act(() => observer.callback([]));
  assert.ok(!/uix-table--priority/.test(table().className), 'wide: every column');
  t.unmount();
  workspaceWidth = 0;
});

test('HAR-2622 ladder: mobile="cards" turns rows into cards below 768 px; no frozen columns there; no ladder without mobile', () => {
  workspaceWidth = 390;
  const t = mount(h(ui.DataWorkspace, base({ mobile: 'cards', idColumn: ID, selection: new Set(), onSelectionChange() {} })));
  const table = t.host.querySelector('table');
  assert.ok(table.classList.contains('uix-table--cards'));
  assert.deepEqual([...t.host.querySelector('tbody tr').children].map((td) => td.getAttribute('data-col')).filter((c) => ['select', 'id'].includes(c)), ['select', 'id'], 'the checkbox sits before the id');
  assert.ok(!table.classList.contains('uix-table--pinned-col') && !table.classList.contains('uix-data-workspace__grid--pin-id'), 'nothing frozen in a card');
  assert.ok(t.host.querySelector('.uix-table-wrap').classList.contains('uix-data-workspace__table--cards'));
  t.unmount();
  // 800 px with cards: no cards yet, the low columns still go
  workspaceWidth = 800;
  const wide = mount(h(ui.DataWorkspace, base({ mobile: 'cards' })));
  assert.ok(wide.host.querySelector('table').classList.contains('uix-table--priority'));
  wide.unmount();
  // without `mobile`: the markup is as before (no ladder attributes, no class)
  workspaceWidth = 390;
  const plain = mount(h(ui.DataWorkspace, base({ idColumn: ID })));
  assert.equal(plain.host.querySelector('[data-label], [data-col], [data-priority]'), null);
  assert.ok(!/uix-table--(cards|priority)/.test(plain.host.querySelector('table').className));
  plain.unmount();
  workspaceWidth = 0;
});

test('HAR-2622 ladder: no layout (width 0) means no step', () => {
  const t = mount(h(ui.DataWorkspace, base({ mobile: 'cards' })));
  assert.ok(!/uix-table--(cards|priority)/.test(t.host.querySelector('table').className));
  t.unmount();
});

test('HAR-2622 id cell: render puts rich content in the same peek button; text still names the checkbox and the ↗', () => {
  const html = renderToStaticMarkup(h(ui.DataWorkspace, base({
    selection: new Set(), onSelectionChange() {},
    idColumn: { ...ID, render: (r) => h('span', null, h(ui.CellStrong, null, r.title), h(ui.CellSub, null, r.author)) },
  })));
  assert.match(html, /<button type="button" class="uix-id-cell__btn" aria-haspopup="dialog"><span class="uix-data-workspace__id-text"><span><span class="uix-cell-strong">Book 1<\/span><span class="uix-cell-sub">Author 1<\/span><\/span><\/span><\/button>/);
  assert.match(html, /aria-label="Select BK-100"/);
  assert.match(html, /aria-label="Open BK-100"/);
});

test('HAR-2622 id cell: href with linkId and no onPeek makes the whole id the link, the ↗ inside it', () => {
  const html = renderToStaticMarkup(h(ui.DataWorkspace, base({ idColumn: { header: 'ID', text: (r) => r.id, href: (r) => `/books/${r.id}`, linkId: true } })));
  // the id text in its own box (a fixed-width column ends it in an ellipsis), the ↗ inside the link after it
  assert.match(html, /<a href="\/books\/BK-100" class="uix-id-cell__btn uix-data-workspace__id-link"><span class="uix-data-workspace__id-label">BK-100<\/span><svg class="uix-id-cell__arrow"[^>]*>[\s\S]*?<\/svg><\/a>/);
  assert.doesNotMatch(html, /uix-data-workspace__open/, 'no second link');
  // without linkId the id stays text and the ↗ is the link (2.49 behaviour)
  const before = renderToStaticMarkup(h(ui.DataWorkspace, base({ idColumn: { header: 'ID', text: (r) => r.id, href: (r) => `/books/${r.id}` } })));
  assert.match(before, /<span class="uix-cell-strong uix-data-workspace__id-label">BK-100<\/span><a href="\/books\/BK-100" class="uix-data-workspace__open" aria-label="Open BK-100">/);
});

test('HAR-2622 states: emptyAction, filteredEmptyAction beside Clear filters, stateOverride with the toolbar kept and no footer', () => {
  const empty = renderToStaticMarkup(h(ui.DataWorkspace, base({ rows: [], emptyAction: h('a', { href: '/books/new', className: 'first' }, 'Add the first book') })));
  assert.match(empty, /Nothing here yet[\s\S]*<a href="\/books\/new" class="first">Add the first book<\/a>/);
  const filtered = renderToStaticMarkup(h(ui.DataWorkspace, base({ rows: [], search: { value: 'x', onChange() {} }, filteredEmptyAction: h('a', { href: '/books/new' }, 'Add "x"') })));
  assert.match(filtered, /<div class="uix-data-workspace__state-actions"><button[^>]*>Clear filters<\/button><a href="\/books\/new">Add &quot;x&quot;<\/a><\/div>/);
  const pagination = { mode: 'offset', page: 9, pageSize: 6, total: 20, onPageChange() {} };
  const override = h('div', { className: 'out-of-range' }, h('a', { href: '?page=1' }, 'Go to the first page'));
  const out = renderToStaticMarkup(h(ui.DataWorkspace, base({ stateOverride: override, pagination, search: { value: '', onChange() {} }, refreshing: true })));
  assert.match(out, /role="toolbar"/, 'the toolbar stays');
  assert.match(out, /<div class="uix-busy-region uix-data-workspace__state" aria-busy="true">[\s\S]*Go to the first page/, 'busy while a refetch runs');
  assert.doesNotMatch(out, /<table|uix-data-workspace__footer/, 'no rows, no footer');
});

test('HAR-2622 search: onSubmit (Enter), onClear (Escape) and maxLength reach the SearchBar', () => {
  const log = [];
  const t = mount(h(ui.DataWorkspace, base({ search: { value: 'tolkien', onChange: (v) => log.push(['change', v]), onSubmit: (v) => log.push(['submit', v]), onClear: () => log.push(['clear']), maxLength: 120 } })));
  const input = t.host.querySelector('input[type="search"]');
  assert.equal(input.getAttribute('maxlength'), '120');
  keydown(input, 'Enter');
  assert.deepEqual(log.at(-1), ['submit', 'tolkien']);
  keydown(input, 'Escape');
  assert.deepEqual(log.slice(-2), [['change', ''], ['clear']]);
  t.unmount();
});

test('HAR-2622 saveViewAs="always": Save as shows without a change; the default keeps it to a changed view', () => {
  const always = renderToStaticMarkup(h(ui.DataWorkspace, base({ onSaveViewAs() {}, onSaveView() {}, saveViewAs: 'always' })));
  assert.match(always, />Save as…</);
  assert.doesNotMatch(always, />Save changes</, 'Save changes still needs a change');
  assert.doesNotMatch(renderToStaticMarkup(h(ui.DataWorkspace, base({ onSaveViewAs() {} }))), />Save as…</);
});

test('HAR-2622 filters.onClearAll: one call for all filters, from the toolbar and from "Nothing matches" (with the search)', () => {
  const FIELDS = [{ id: 'genre', label: 'Genre', kind: 'enum', options: [{ value: 'f', label: 'Fantasy' }] }, { id: 'title', label: 'Title', kind: 'text' }];
  const values = { genre: { kind: 'enum', values: ['f'] }, title: { kind: 'text', operator: 'contains', text: 'ring' } };
  const log = [];
  const filters = { fields: FIELDS, values, onChange: (...a) => log.push(['change', ...a]), onClearAll: (scope) => log.push(['clearAll', scope]) };
  const t = mount(h(ui.DataWorkspace, base({ filters, search: { value: 'x', onChange: (v) => log.push(['search', v]) } })));
  click([...t.host.querySelectorAll('[role="toolbar"] button')].find((b) => b.textContent === 'Clear filters'));
  assert.deepEqual(log, [['clearAll', { search: false }]]);
  t.render(h(ui.DataWorkspace, base({ rows: [], filters, search: { value: 'x', onChange: (v) => log.push(['search', v]) } })));
  click(t.host.querySelector('.uix-empty button'));
  assert.deepEqual(log, [['clearAll', { search: false }], ['clearAll', { search: true }]], 'no per-field onChange, no search.onChange');
  t.unmount();
});

test('HAR-2622 maxSelection: unchecked boxes are disabled at the cap; Shift ranges and select-all stop there', () => {
  function Capped() {
    const [selection, setSelection] = useState(new Set());
    return h(ui.DataWorkspace, base({ idColumn: ID, selection, onSelectionChange: setSelection, maxSelection: 3 }));
  }
  const t = mount(h(Capped));
  const boxes = () => [...t.host.querySelectorAll('tbody input[type="checkbox"]')];
  click(boxes()[0]);
  click(boxes()[5], { shiftKey: true });
  assert.deepEqual(boxes().map((b) => b.checked), [true, true, true, false, false, false], 'the range stops at 3');
  assert.deepEqual(boxes().map((b) => b.disabled), [false, false, false, true, true, true]);
  click(boxes()[1]);
  assert.equal(boxes()[3].disabled, false, 'under the cap again');
  const all = t.host.querySelector('thead input[type="checkbox"]');
  click(all);
  assert.equal(boxes().filter((b) => b.checked).length, 3, 'select-all fills to the cap');
  click(all);
  assert.equal(boxes().filter((b) => b.checked).length, 0, 'at the cap select-all clears the page');
  t.unmount();
});

test('HAR-2622 beforeBody sits after the bulk bar and before the rows; savedViews.note sits above the saved-view list', () => {
  const html = renderToStaticMarkup(h(ui.DataWorkspace, base({
    selection: new Set(['BK-100']), onSelectionChange() {}, bulkActions: () => 'x', beforeBody: h('p', { className: 'notice' }, 'Showing the first 500'),
    savedViews: { current: 'All', note: 'Saved views could not be loaded', menu: { items: [{ id: 'all', label: 'All', active: true }], onSelect() {} } },
  })));
  assert.match(html, /class="uix-bulkbar"[\s\S]*<div class="uix-data-workspace__before"><p class="notice">Showing the first 500<\/p><\/div><div class="uix-table-wrap/);
  assert.match(html, /<div class="uix-data-workspace__views-note">Saved views could not be loaded<\/div><[^>]*uix-saved-view/);
});

/* ── HAR-2623 ─────────────────────────────────────────────────────────────────────────────── */

function MultiSort({ log, initial = [] }) {
  const [sort, setSort] = useState(initial);
  return h(ui.DataWorkspace, base({ sort, onSortChange: (s) => { log.push(s); setSort(s); } }));
}
const header = (t, name) => [...t.host.querySelectorAll('th button.uix-th__sortbtn')].find((b) => b.firstChild.textContent === name);

test('HAR-2623 multi-sort: Shift + click adds a key, turns it in place, removes it; a plain click sorts by that column alone', () => {
  const log = [];
  const t = mount(h(MultiSort, { log }));
  click(header(t, 'Title'));
  assert.deepEqual(log.at(-1), [{ columnId: 'title', direction: 'ascending' }], 'a list in, a list out');
  assert.equal(t.host.querySelector('th[data-sort-order]'), null, 'one key: no ordinal');
  click(header(t, 'Author'), { shiftKey: true });
  assert.deepEqual(log.at(-1), [{ columnId: 'title', direction: 'ascending' }, { columnId: 'author', direction: 'ascending' }]);
  // one mechanism, Th sortOrder: the drawn ordinal (data-sort-order) and its words inside the button
  const ordinals = [...t.host.querySelectorAll('th[data-sort-order]')];
  assert.deepEqual(ordinals.map((th) => [th.getAttribute('data-sort-order'), th.hasAttribute('data-sort-labelled'), th.querySelector('button .uix-visually-hidden')?.textContent]), [['1', true, ', Sort priority 1'], ['2', true, ', Sort priority 2']]);
  assert.deepEqual([...t.host.querySelectorAll('th[aria-sort]')].map((th) => th.getAttribute('aria-sort')), ['ascending', 'ascending'], 'aria-sort stays on every sorted header');
  click(header(t, 'Title'), { shiftKey: true });
  assert.deepEqual(log.at(-1), [{ columnId: 'title', direction: 'descending' }, { columnId: 'author', direction: 'ascending' }], 'turned in place: still first');
  click(header(t, 'Title'), { shiftKey: true });
  assert.deepEqual(log.at(-1), [{ columnId: 'author', direction: 'ascending' }], 'removed after descending');
  click(header(t, 'Year'), { shiftKey: true });
  click(header(t, 'Title'));
  assert.deepEqual(log.at(-1), [{ columnId: 'title', direction: 'ascending' }], 'a plain click: that column alone');
  t.unmount();
});

test('HAR-2623 multi-sort by keyboard: Shift + Enter (or Space) on a header adds the key; Enter alone does not', () => {
  const log = [];
  const t = mount(h(MultiSort, { log, initial: [{ columnId: 'title', direction: 'ascending' }] }));
  const author = header(t, 'Author');
  // a key press on a button: keydown, then the browser's click with no pointer (detail 0, no Shift on it)
  keydown(author, 'Enter', { shiftKey: true });
  click(author, { detail: 0 });
  assert.deepEqual(log.at(-1), [{ columnId: 'title', direction: 'ascending' }, { columnId: 'author', direction: 'ascending' }]);
  const year = header(t, 'Year');
  keydown(year, ' ', { shiftKey: true });
  click(year, { detail: 0 });
  assert.equal(log.at(-1).length, 3, 'Shift + Space adds too');
  keydown(year, 'Enter');
  click(year, { detail: 0 });
  assert.deepEqual(log.at(-1), [{ columnId: 'year', direction: 'descending' }], 'Enter alone: that column alone, turned');
  t.unmount();
});

test('HAR-2623 a single sort (not a list) ignores Shift and still hands back one key or null', () => {
  const log = [];
  function Single() {
    const [sort, setSort] = useState(null);
    return h(ui.DataWorkspace, base({ sort, onSortChange: (s) => { log.push(s); setSort(s); } }));
  }
  const t = mount(h(Single));
  click(header(t, 'Title'));
  click(header(t, 'Author'), { shiftKey: true });
  assert.deepEqual(log.at(-1), { columnId: 'author', direction: 'ascending' });
  assert.equal(t.host.querySelector('th[data-sort-order]'), null);
  t.unmount();
});

test('HAR-2623 the priority words come from UixLabelsProvider', () => {
  const html = renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { dataWorkspace: { sortPriority: 'Sortierrang {n}' } } },
    h(ui.DataWorkspace, base({ sort: [{ columnId: 'title', direction: 'ascending' }, { columnId: 'year', direction: 'descending' }], onSortChange() {} }))));
  assert.match(html, /<span class="uix-visually-hidden">, Sortierrang 2<\/span>/);
});

/* ── HAR-2624 ─────────────────────────────────────────────────────────────────────────────── */

test('HAR-2624 the product\'s empty, filtered-empty and error bodies replace the defaults and are busy on a refetch', () => {
  const empty = renderToStaticMarkup(h(ui.DataWorkspace, base({ rows: [], refreshing: false, empty: h('div', { className: 'mine' }, 'No changes yet') })));
  assert.match(empty, /<div class="uix-busy-region uix-data-workspace__state"><span class="uix-busy-bar"[^>]*><\/span><div class="uix-busy-region__content"><div class="mine">No changes yet<\/div>/);
  assert.doesNotMatch(empty, /Nothing here yet/);
  const filtered = renderToStaticMarkup(h(ui.DataWorkspace, base({ rows: [], search: { value: 'x', onChange() {} }, filteredEmpty: h('div', null, 'No change matches') })));
  assert.match(filtered, /No change matches/);
  assert.doesNotMatch(filtered, /Nothing matches/);
  const error = renderToStaticMarkup(h(ui.DataWorkspace, base({ status: 'error', refreshing: true, error: h('div', { role: 'alert' }, 'Forbidden (403 · list.denied)') })));
  assert.match(error, /aria-busy="true"[\s\S]*Forbidden \(403 · list\.denied\)/);
  assert.doesNotMatch(error, /The list could not be loaded/);
});

test('HAR-2624 loadingRows sets the first load skeleton rows (default 6)', () => {
  const count = (html) => (html.match(/class="uix-skeleton[ "]/g) ?? []).length;
  assert.equal(count(renderToStaticMarkup(h(ui.DataWorkspace, base({ status: 'loading' })))), 6);
  assert.equal(count(renderToStaticMarkup(h(ui.DataWorkspace, base({ status: 'loading', loadingRows: 5 })))), 5);
});

test('HAR-2624 zebra passes through; freezeFirstColumn freezes the first column (and the checkbox) without an id column', () => {
  assert.match(renderToStaticMarkup(h(ui.DataWorkspace, base({ zebra: false }))), /class="uix-table uix-table--no-zebra/);
  assert.doesNotMatch(renderToStaticMarkup(h(ui.DataWorkspace, base())), /uix-table--no-zebra/);
  const frozen = renderToStaticMarkup(h(ui.DataWorkspace, base({ freezeFirstColumn: true, selection: new Set(), onSelectionChange() {} })));
  assert.match(frozen, /<table class="uix-table uix-table--pinned-col uix-data-workspace__grid--pin-id"/);
  assert.match(renderToStaticMarkup(h(ui.DataWorkspace, base({ freezeFirstColumn: true }))), /<table class="uix-table uix-table--pinned-col"/);
  assert.match(renderToStaticMarkup(h(ui.DataWorkspace, base())), /<table class="uix-table"/, 'off by default');
});

test('HAR-2624 className or minWidth turns on a fixed layout: a <colgroup>, the floors as the table min-width, no per-cell min-width', () => {
  const columns = [
    { id: 'title', header: 'Title', cell: (r) => r.title, className: 'uix-col--truncate uix-col--flex type-meta', minWidth: '14rem' },
    { id: 'genre', header: 'Genre', cell: (r) => r.author, className: 'uix-col--w-md' },
    { id: 'n', header: 'N', cell: (r) => r.copies, align: 'end', width: '6rem' },
  ];
  const html = renderToStaticMarkup(h(ui.DataWorkspace, base({ columns, selection: new Set(), onSelectionChange() {} })));
  // review blocker 1: auto layout let a truncating column grow to its text (791 px in a 1246 px wrap)
  assert.match(html, /<table class="uix-table uix-table--fixed" style="min-width:calc\(var\(--uix-selcol-w\) \+ 14rem \+ var\(--uix-col-w-md\) \+ 6rem\)"/);
  assert.match(html, /<colgroup><col style="width:var\(--uix-selcol-w\)"\/><col class="uix-col--flex"\/><col class="uix-col--w-md" style="width:var\(--uix-col-w-md\)"\/><col style="width:6rem"\/><\/colgroup>/, 'the flex column takes the slack; the others hold their floor');
  assert.match(html, /<th class="uix-col--truncate uix-col--flex type-meta" scope="col">Title<\/th>/, 'no per-cell min-width: fixed layout ignores it');
  assert.match(html, /<td class="uix-col--truncate uix-col--flex type-meta">Book 1<\/td>/);
  assert.match(html, /<td class="uix-col--num">1<\/td>/);
  // fixed={false} keeps the auto layout; `width` alone (2.49) does not turn it on
  assert.doesNotMatch(renderToStaticMarkup(h(ui.DataWorkspace, base({ columns, fixed: false }))), /uix-table--fixed|<colgroup/);
  const widthOnly = renderToStaticMarkup(h(ui.DataWorkspace, base({ columns: [{ id: 'n', header: 'N', cell: (r) => r.copies, width: '6rem' }] })));
  assert.match(widthOnly, /<th scope="col" style="width:6rem">N<\/th>/);
  assert.doesNotMatch(widthOnly, /uix-table--fixed/);
  // row actions get a column of their own in the colgroup and the floors
  const actions = renderToStaticMarkup(h(ui.DataWorkspace, base({ columns, rowActions: () => h('button', { type: 'button' }, 'Renew') })));
  assert.match(actions, /<col style="width:5.25rem"\/><\/colgroup>/);
  assert.match(actions, /min-width:calc\(14rem \+ var\(--uix-col-w-md\) \+ 6rem \+ 5.25rem\)/);
  // a column the ladder drops has no <col> and no floor
  workspaceWidth = 700;
  const ladder = mount(h(ui.DataWorkspace, base({ mobile: 'priority', columns: [...columns, { id: 'year', header: 'Year', cell: (r) => r.year, priority: 'low', className: 'uix-col--w-sm' }] })));
  assert.equal(ladder.host.querySelectorAll('colgroup col').length, 3);
  assert.doesNotMatch(ladder.host.querySelector('table').getAttribute('style'), /--uix-col-w-sm/);
  ladder.unmount();
  workspaceWidth = 0;
});

/* ── HAR-2625 ─────────────────────────────────────────────────────────────────────────────── */

const GROUPS = [
  { id: 'fantasy', label: 'Fantasy', rows: ROWS.slice(0, 3), aggregates: { copies: '6 copies' } },
  { id: 'crime', label: h('strong', null, 'Crime'), name: 'Crime', rows: ROWS.slice(3, 4), count: 1, aggregates: { copies: '4 copies' } },
  { id: 'poetry', label: 'Poetry', rows: ROWS.slice(4) },
];

test('HAR-2625 groups: a tbody each, a header row with the toggle, the name, the count and aggregates under their columns', () => {
  const html = renderToStaticMarkup(h(ui.DataWorkspace, base({ rows: [], groups: GROUPS, idColumn: ID, selection: new Set(), onSelectionChange() {}, rowActions: () => h('button', { type: 'button' }, '⋯') })));
  assert.equal((html.match(/<tbody class="uix-data-workspace__group"/g) ?? []).length, 3);
  assert.match(html, /<table class="uix-table uix-table--pinned-col uix-table--pinned-actions uix-data-workspace__grid--pin-id uix-data-workspace__grid--grouped"/);
  // id + title + author + year come before the copies aggregate: the label spans 4 columns
  assert.match(html, /<tr class="uix-data-workspace__group-head" data-group-id="fantasy"><td class="uix-table__selcell">[\s\S]*?aria-label="Select group Fantasy"[\s\S]*?<th scope="rowgroup" colSpan="4" class="uix-data-workspace__group-label" aria-labelledby="([^"]+-name) ([^"]+-count)">[\s\S]*?aria-expanded="true" aria-label="Collapse group Fantasy"[\s\S]*?<span class="uix-data-workspace__group-name" id="\1">Fantasy<\/span><span class="uix-data-workspace__group-count" id="\2">3 rows<\/span>[\s\S]*?<\/th><td class="uix-data-workspace__group-agg uix-col--num">6 copies<\/td><td class="uix-table__actions"><\/td><\/tr>/);
  assert.match(html, /aria-label="Collapse group Crime"[\s\S]*?<span class="uix-data-workspace__group-count" id="[^"]+">1 row<\/span>/, 'name for a ReactNode label; one row');
  // without aggregates the label spans every column after the checkbox, actions included
  assert.match(html, /data-group-id="poetry">[\s\S]*?<th scope="rowgroup" colSpan="6"/);
});

test('HAR-2625 groups: collapse and expand (kept here, or by the product), rows gone and back, aria-expanded follows', () => {
  const log = [];
  const t = mount(h(ui.DataWorkspace, base({ rows: [], groups: GROUPS, onCollapsedGroupsChange: (s) => log.push([...s]) })));
  const toggle = () => t.host.querySelector('tr[data-group-id="fantasy"] button.uix-data-workspace__group-toggle');
  const bodyRows = () => t.host.querySelectorAll('tbody tr:not(.uix-data-workspace__group-head)').length;
  assert.equal(bodyRows(), 6);
  click(toggle());
  assert.deepEqual(log.at(-1), ['fantasy']);
  assert.equal(toggle().getAttribute('aria-expanded'), 'false');
  assert.equal(toggle().getAttribute('aria-label'), 'Expand group Fantasy');
  assert.equal(bodyRows(), 3, 'its three rows are gone; the header stays');
  click(toggle());
  assert.equal(bodyRows(), 6);
  t.unmount();
  // controlled
  const ctl = mount(h(ui.DataWorkspace, base({ rows: [], groups: GROUPS, collapsedGroups: new Set(['crime', 'poetry']), onCollapsedGroupsChange: (s) => log.push([...s]) })));
  assert.equal(ctl.host.querySelectorAll('tbody tr:not(.uix-data-workspace__group-head)').length, 3);
  click(ctl.host.querySelector('tr[data-group-id="crime"] button'));
  assert.deepEqual(log.at(-1), ['poetry'], 'the product decides');
  assert.equal(ctl.host.querySelectorAll('tbody tr:not(.uix-data-workspace__group-head)').length, 3, 'nothing changes until it does');
  ctl.unmount();
});

test('HAR-2625 groups: the group checkbox is tri-state and selects its rows; Shift ranges run across groups in visual order', () => {
  const log = [];
  function Grouped() {
    const [selection, setSelection] = useState(new Set());
    const [collapsed, setCollapsed] = useState(new Set(['crime']));
    return h(ui.DataWorkspace, base({ rows: [], groups: GROUPS, collapsedGroups: collapsed, onCollapsedGroupsChange: setCollapsed, selection, onSelectionChange: (s) => { log.push([...s]); setSelection(s); } }));
  }
  const t = mount(h(Grouped));
  const groupBox = (gid) => t.host.querySelector(`tr[data-group-id="${gid}"] input[type="checkbox"]`);
  click(groupBox('fantasy'));
  assert.deepEqual(log.at(-1), ['BK-100', 'BK-101', 'BK-102']);
  assert.equal(groupBox('fantasy').checked, true);
  const rowBox = (rowId) => t.host.querySelector(`tbody input[aria-label="Select ${rowId}"]`);
  click(rowBox('BK-101'));
  assert.equal(groupBox('fantasy').indeterminate, true, 'some of the group');
  // Shift range from BK-102 (fantasy) to BK-104 (poetry): crime is collapsed, BK-103 is not on screen
  click(rowBox('BK-102'));
  click(rowBox('BK-102'));
  click(rowBox('BK-104'), { shiftKey: true });
  assert.deepEqual(log.at(-1).sort(), ['BK-100', 'BK-102', 'BK-104'], 'the hidden row is not in the range');
  t.unmount();
});

test('HAR-2625 groups: words through UixLabelsProvider', () => {
  const html = renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { dataWorkspace: { groupCount: '{count} Zeilen', groupCountOne: '{count} Zeile', collapseGroup: '{name} zuklappen' } } },
    h(ui.DataWorkspace, base({ rows: [], groups: GROUPS }))));
  assert.match(html, /3 Zeilen/);
  assert.match(html, /1 Zeile</);
  assert.match(html, /aria-label="Fantasy zuklappen"/);
});

/* ── HAR-2626 ─────────────────────────────────────────────────────────────────────────────── */

const MANY = Array.from({ length: 500 }, (_, i) => ({ id: `R-${i}`, title: `Row ${i}`, author: 'A', copies: i, year: 2000 }));

test('HAR-2626 virtualize: a bounded window of rows, aria-rowcount / aria-rowindex for the true size, spacers aria-hidden', () => {
  const t = mount(h(ui.DataWorkspace, base({ rows: MANY, virtualize: { maxHeight: 640, overscan: 8 } })));
  const table = t.host.querySelector('table');
  const rows = t.host.querySelectorAll('tbody tr[data-uix-row-id]');
  assert.ok(rows.length > 0 && rows.length <= 30, `${rows.length} rows mounted of 500`);
  assert.equal(table.getAttribute('aria-rowcount'), '501', 'the header row and 500 rows');
  assert.equal(t.host.querySelector('thead tr').getAttribute('aria-rowindex'), '1');
  assert.equal(rows[0].getAttribute('aria-rowindex'), '2');
  const spacers = t.host.querySelectorAll('tbody tr.uix-data-workspace__spacer');
  assert.ok(spacers.length >= 1);
  for (const s of spacers) assert.equal(s.getAttribute('aria-hidden'), 'true');
  assert.ok(t.host.querySelector('.uix-table-wrap').classList.contains('uix-table-wrap--scroll'), 'the body scrolls under its header');
  t.unmount();
});

test('HAR-2626 virtualize: off with pagination, under the threshold, and without the prop', () => {
  const paged = mount(h(ui.DataWorkspace, base({ rows: MANY, virtualize: true, pagination: { mode: 'offset', page: 1, pageSize: 500, total: 500, onPageChange() {} } })));
  assert.equal(paged.host.querySelectorAll('tbody tr').length, 500);
  assert.equal(paged.host.querySelector('table').getAttribute('aria-rowcount'), null);
  paged.unmount();
  const small = mount(h(ui.DataWorkspace, base({ rows: MANY.slice(0, 99), virtualize: true })));
  assert.equal(small.host.querySelectorAll('tbody tr').length, 99, 'under the threshold: every row');
  small.unmount();
  // windowed at the threshold, as TENSOR's virtualizeThreshold
  const at = mount(h(ui.DataWorkspace, base({ rows: MANY.slice(0, 100), virtualize: true })));
  assert.ok(at.host.querySelectorAll('tbody tr[data-uix-row-id]').length < 100, 'exactly the threshold: windowed');
  at.unmount();
  small.unmount();
});

function Roving({ log, rows = ROWS, extra = {} }) {
  const columns = useMemo(() => COLUMNS, []);
  return h(ui.DataWorkspace, base({ rows, columns, idColumn: ID, selection: new Set(), onSelectionChange() {}, onRowActivate: (r) => log.push(['activate', r.id]), onActiveRowChange: (rowId) => log.push(['active', rowId]), ...extra }));
}

test('HAR-2626 keyboard rows: one tab stop; ↑ ↓ Home End move it; Enter and a click on the row activate; a click on a control does not', () => {
  const log = [];
  const t = mount(h(Roving, { log }));
  const rows = () => [...t.host.querySelectorAll('tbody tr')];
  assert.deepEqual(rows().map((r) => r.getAttribute('tabindex')), ['0', '-1', '-1', '-1', '-1', '-1'], 'the first row is the tab stop');
  act(() => rows()[0].focus());
  keydown(rows()[0], 'ArrowDown');
  assert.ok(document.activeElement === rows()[1]);
  assert.equal(rows()[1].getAttribute('tabindex'), '0');
  assert.equal(rows()[0].getAttribute('tabindex'), '-1');
  keydown(rows()[1], 'End');
  assert.ok(document.activeElement === rows()[5]);
  keydown(rows()[5], 'ArrowDown');
  assert.ok(document.activeElement === rows()[5], 'stops at the last row');
  keydown(rows()[5], 'Home');
  assert.ok(document.activeElement === rows()[0]);
  keydown(rows()[0], 'ArrowUp');
  assert.ok(document.activeElement === rows()[0]);
  keydown(rows()[0], 'Enter');
  assert.deepEqual(log.at(-1), ['activate', 'BK-100']);
  click(rows()[2].querySelector('td:nth-child(3)'));
  assert.deepEqual(log.at(-1), ['activate', 'BK-102'], 'a click on a cell');
  const before = log.length;
  click(rows()[3].querySelector('input[type="checkbox"]'));
  click(rows()[3].querySelector('button.uix-id-cell__btn'));
  assert.equal(log.filter((e) => e[0] === 'activate').length, log.slice(0, before).filter((e) => e[0] === 'activate').length, 'the checkbox and the id are their own');
  // a key on a control inside the row is the control's
  const idButton = rows()[3].querySelector('button.uix-id-cell__btn');
  act(() => idButton.focus());
  keydown(idButton, 'ArrowDown');
  assert.ok(document.activeElement === idButton, 'ArrowDown on the id button stays there');
  assert.ok(log.some((e) => e[0] === 'active' && e[1] === 'BK-105'), 'onActiveRowChange follows');
  t.unmount();
});

test('HAR-2626 keyboard rows: focus stays on the row across a refetch; a new page hands it to the first row', () => {
  const log = [];
  const t = mount(h(Roving, { log }));
  const rows = () => [...t.host.querySelectorAll('tbody tr')];
  act(() => rows()[2].focus());
  // a refetch: new row objects, the same ids
  const fresh = ROWS.map((r) => ({ ...r }));
  t.render(h(Roving, { log, rows: fresh, extra: { refreshing: true } }));
  t.render(h(Roving, { log, rows: fresh }));
  assert.ok(document.activeElement === rows()[2], 'the same row keeps focus');
  // the next page: none of these rows are left
  const page2 = ROWS.map((r, i) => ({ ...r, id: `BK-${200 + i}` }));
  t.render(h(Roving, { log, rows: page2 }));
  assert.ok(document.activeElement === rows()[0], 'focus is on the first row, not dropped on the page');
  assert.equal(rows()[0].getAttribute('tabindex'), '0');
  t.unmount();
});

test('HAR-2626 keyboard rows: activeRowId drives the tab stop and focus from the product\'s own shortcut', () => {
  const log = [];
  const t = mount(h(Roving, { log, extra: { activeRowId: 'BK-101' } }));
  const rows = () => [...t.host.querySelectorAll('tbody tr')];
  assert.equal(rows()[1].getAttribute('tabindex'), '0');
  assert.ok(document.activeElement !== rows()[1], 'no focus taken on mount');
  t.render(h(Roving, { log, extra: { activeRowId: 'BK-104' } }));
  assert.ok(document.activeElement === rows()[4], 'j / k: the product moves it, focus follows');
  assert.equal(rows()[4].getAttribute('tabindex'), '0');
  t.unmount();
});

test('HAR-2626 keyboard rows under virtualization: a row outside the window is scrolled in and then focused', () => {
  const log = [];
  const t = mount(h(Roving, { log, rows: MANY, extra: { virtualize: { maxHeight: 640 } } }));
  const wrap = t.host.querySelector('.uix-table-wrap');
  const first = t.host.querySelector('tbody tr[data-uix-row-id]');
  act(() => first.focus());
  keydown(first, 'End');
  assert.ok(wrap.scrollTop > 0, `scrolled to the end (${wrap.scrollTop})`);
  t.unmount();
});

test('HAR-2626 rows are memoised: another row\'s selection does not re-render a row', () => {
  const calls = [];
  const columns = [{ id: 'title', header: 'Title', cell: (r) => { calls.push(r.id); return r.title; } }];
  function Memo() {
    const [selection, setSelection] = useState(new Set());
    const idColumn = useMemo(() => ({ header: 'ID', text: (r) => r.id }), []);
    return h(ui.DataWorkspace, { label: 'Books', rows: ROWS, getRowId: (r) => r.id, columns, idColumn, selection, onSelectionChange: setSelection });
  }
  const t = mount(h(Memo));
  calls.length = 0;
  click(t.host.querySelectorAll('tbody input[type="checkbox"]')[2]);
  assert.deepEqual(calls.filter((c) => c !== 'BK-102'), [], `only the toggled row re-rendered (${calls.join(', ')})`);
  assert.ok(calls.includes('BK-102'));
  t.unmount();
});

test('HAR-2713: RowAction with an href is an <a class="uix-rowact">; renderLink, target and rel pass through; without one it is a button', () => {
  const plain = renderToStaticMarkup(h(ui.RowAction, { href: '/labels/BK-1.pdf', target: '_blank', rel: 'noopener', className: 'x' }, 'Print labels'));
  assert.match(plain, /^<a target="_blank" rel="noopener" href="\/labels\/BK-1.pdf" class="uix-rowact x">Print labels<\/a>$/);
  const routed = renderToStaticMarkup(h(ui.RowAction, { href: '/books/BK-1', renderLink: (p) => h('a', { ...p, 'data-router': 'yes' }) }, 'Open'));
  assert.match(routed, /data-router="yes"/);
  assert.match(routed, /class="uix-rowact"/);
  const button = renderToStaticMarkup(h(ui.RowAction, { 'aria-label': 'Peek' }, 'P'));
  assert.equal(button, '<button type="button" class="uix-rowact" aria-label="Peek">P</button>');
});
