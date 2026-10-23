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

/* PR #168 review */
const base = (extra = {}) => ({ label: 'Incidents', rows: ROWS, getRowId: (r) => r.id, columns: COLUMNS, ...extra });
const filterSet = (values) => ({ fields: FIELDS, values, onChange() {} });

test('review: a refetch with nothing back yet keeps the last body, busy — never "Nothing here yet" in between', () => {
  let t = mount(h(ui.DataWorkspace, base({ rows: [], filters: filterSet({ state: { kind: 'enum', values: ['closed'] } }) })));
  assert.match(t.host.textContent, /Nothing matches/);
  // the person clears the filter: the consumer refetches, the old (empty) rows are all it has
  act(() => t.root.render(h(ui.DataWorkspace, base({ rows: [], filters: filterSet({}), refreshing: true }))));
  assert.match(t.host.textContent, /Nothing matches/, 'the last settled body stays while the rows load');
  assert.doesNotMatch(t.host.textContent, /Nothing here yet/);
  assert.equal(t.host.querySelector('.uix-data-workspace__state').getAttribute('aria-busy'), 'true', 'busy at once');
  act(() => t.root.render(h(ui.DataWorkspace, base({ filters: filterSet({}) }))));
  assert.equal(t.host.querySelectorAll('tbody tr').length, 6, 'the rows arrive');
  t.unmount();

  // A product that turns `refreshing` on one render after the query changed (an effect): the
  // empty result still belongs to the filtered query until new rows arrive.
  const answer = [];
  const lag = mount(h(ui.DataWorkspace, base({ rows: answer, filters: filterSet({ state: { kind: 'enum', values: ['closed'] } }) })));
  act(() => lag.root.render(h(ui.DataWorkspace, base({ rows: answer, filters: filterSet({}) }))));
  assert.match(lag.host.textContent, /Nothing matches/, 'the same (empty) answer, the filter just cleared: not "Nothing here yet"');
  act(() => lag.root.render(h(ui.DataWorkspace, base({ rows: answer, filters: filterSet({}), refreshing: true }))));
  assert.match(lag.host.textContent, /Nothing matches/);
  act(() => lag.root.render(h(ui.DataWorkspace, base({ rows: [], filters: filterSet({}) }))));
  assert.match(lag.host.textContent, /Nothing here yet/, 'a new empty answer for the unfiltered query');
  lag.unmount();
  t = mount(h(ui.DataWorkspace, base({ filters: filterSet({}) })));
  // from rows: a refetch that has nothing yet keeps the rows on show
  act(() => t.root.render(h(ui.DataWorkspace, base({ rows: [], filters: filterSet({}), refreshing: true }))));
  assert.equal(t.host.querySelectorAll('tbody tr').length, 6);
  act(() => t.root.render(h(ui.DataWorkspace, base({ rows: [], filters: filterSet({}) }))));
  assert.match(t.host.textContent, /Nothing here yet/, 'settled empty: now the empty state');
  t.unmount();
});

test('review: Escape that closes a popover or menu inside does not also restore the maximized workspace', () => {
  const log = [];
  const t = mount(h(Workspace, { log, extra: { viewMenu: { columns: [{ id: 'title', label: 'Title', visible: true }], onColumnVisibilityChange() {} } } }));
  click(t.host.querySelector('button[aria-label="Maximize"]'));
  const view = [...t.host.querySelectorAll('[popover]')].find((p) => p.querySelector('.uix-view-menu'));
  keydown(view.querySelector('input, button') ?? view, 'Escape');
  assert.ok(t.host.querySelector('.uix-data-workspace--maximized'), 'Escape in the View popover is the popover\'s');
  const trigger = view.parentElement.querySelector('button[aria-haspopup="dialog"]');
  trigger.setAttribute('aria-expanded', 'true'); // as when the popover is open and focus is on the page
  keydown(document.body, 'Escape');
  assert.ok(t.host.querySelector('.uix-data-workspace--maximized'), 'an open popover takes the first Escape');
  trigger.setAttribute('aria-expanded', 'false');
  keydown(document.body, 'Escape');
  assert.equal(t.host.querySelector('.uix-data-workspace--maximized'), null, 'with nothing open, Escape restores');
  t.unmount();
});

test('review: with selection both the checkbox and the id are frozen; the actions column only when a row has actions, sized to them', () => {
  const t = mount(h(Workspace, { log: [] }));
  const table = t.host.querySelector('table');
  assert.ok(table.classList.contains('uix-table--pinned-col'));
  assert.ok(table.classList.contains('uix-data-workspace__grid--pin-id'), 'the id column is frozen after the checkbox');
  t.unmount();
  const none = renderToStaticMarkup(h(ui.DataWorkspace, base({ rowActions: () => null })));
  assert.doesNotMatch(none, /uix-table__actions|uix-table--pinned-actions/, 'no row has actions: no column');
  const some = renderToStaticMarkup(h(ui.DataWorkspace, base({ rowActions: (r) => (r.priority === 1 ? h('button', { type: 'button' }, '⋯') : null) })));
  assert.match(some, /uix-table--pinned-actions/);
  assert.equal((some.match(/<td class="uix-table__actions">/g) ?? []).length, 6, 'every row keeps its cell');
});

test('review: Save changes is a secondary button', () => {
  const html = renderToStaticMarkup(h(ui.DataWorkspace, base({ viewChanged: true, onSaveView() {} })));
  assert.match(html, /<button[^>]*class="uix-btn uix-btn--secondary[^"]*"[^>]*>Save changes<\/button>/);
});

test('review: a chip names ids restored from a URL (field.resolveLabels); applying the last unset filter focuses its chip', async () => {
  const assignee = { id: 'assignee', label: 'Assignee', kind: 'reference', onSearch: async () => [], resolveLabels: async (ids) => ids.map((id) => ({ value: id, label: id === 'usr_8f3a' ? 'Lea Novak' : id })) };
  const t = mount(h(ui.DataWorkspace, base({ filters: { fields: [assignee], values: { assignee: { kind: 'reference', values: [{ value: 'usr_8f3a', label: 'usr_8f3a' }] } }, onChange() {} } })));
  await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
  assert.match(t.host.querySelector('.uix-data-workspace__chip').textContent, /Assignee: Lea Novak/);
  t.unmount();

  const log = [];
  const w = mount(h(Workspace, { log }));
  const toolbar = () => w.host.querySelector('[role="toolbar"]');
  const apply = (fieldLabel, pick) => {
    click(toolbar().querySelector('button.uix-chip--add'));
    click([...w.host.querySelectorAll('[role="menuitem"]')].find((m) => m.textContent === fieldLabel));
    const pop = [...w.host.querySelectorAll('[popover]')].find((p) => p.hasAttribute('data-open') && p.querySelector('.uix-filter-editor'));
    pick(pop);
    click([...pop.querySelectorAll('button')].find((b) => b.textContent === 'Apply'));
  };
  apply('State', (pop) => click(pop.querySelector('.uix-checkbox input')));
  apply('Title', (pop) => act(() => {
    const input = pop.querySelector('input:not([type="checkbox"])');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Vorfall');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  }));
  assert.equal(toolbar().querySelector('button.uix-chip--add'), null, 'no unset field left');
  const titleChip = [...toolbar().querySelectorAll('.uix-data-workspace__chip')].find((c) => /Title/.test(c.textContent));
  assert.equal(document.activeElement, titleChip.querySelector('button'), 'focus is on the new chip, not dropped on the page');
  w.unmount();
});

test('review: Ctrl/⌘ + / belongs to the workspace it is pressed in, or to the first one from an unfocused page', () => {
  const two = mount(h('div', null,
    h(ui.DataWorkspace, base({ label: 'First', search: { value: '', onChange() {} } })),
    h('input', { className: 'app-field' }),
    h(ui.DataWorkspace, base({ label: 'Second', search: { value: '', onChange() {} }, toolbarEnd: h('button', { type: 'button', className: 'second-new' }, 'New') }))));
  const [first, second] = [...two.host.querySelectorAll('.uix-data-workspace')];
  keydown(document.body, '/', { ctrlKey: true });
  assert.equal(document.activeElement, first.querySelector('input[type="search"]'), 'an unfocused page: the first workspace');
  const inSecond = second.querySelector('.second-new');
  inSecond.focus();
  keydown(inSecond, '/', { ctrlKey: true });
  assert.equal(document.activeElement, second.querySelector('input[type="search"]'), 'inside the second: its own search');
  const app = two.host.querySelector('.app-field');
  app.focus();
  keydown(app, '/', { ctrlKey: true });
  assert.equal(document.activeElement, app, 'an app field outside keeps the key');
  two.unmount();
});

test('review: TableWrap says whether the table overflows, so frozen columns draw dividers only then', () => {
  const observed = [];
  globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; } observe(el) { observed.push(el); } disconnect() {} };
  try {
    const t = mount(h(ui.DataWorkspace, base()));
    const wrap = t.host.querySelector('.uix-table-wrap');
    assert.equal(wrap.getAttribute('data-overflow'), 'false', 'jsdom has no width: nothing overflows');
    assert.ok(observed.includes(wrap) && observed.some((el) => el.tagName === 'TABLE'));
    t.unmount();
  } finally {
    delete globalThis.ResizeObserver;
  }
});
