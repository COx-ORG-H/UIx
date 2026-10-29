/* PR #176 review (HAR-2622..2626): the findings an independent review measured on DataWorkspace 2.50,
 * one test each, each failing without its fix: click activation split from the roving tab stop
 * (rowNavigation, activateOnClick), clicks in the checkbox and actions cells and from portals,
 * focus kept when a product points activeRowId at a row that is not on screen, activeRowId not
 * taking focus from a field, no frozen columns at the narrowest step, the content-box ladder,
 * multiSort, the at-cap boxes, one tree across the cards step, Space on a row, the group header's
 * name. Renders the BUILT dist — run `npm run build` first; CI does. */
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

const activated = (log) => log.filter((e) => e[0] === 'activate').map((e) => e[1]);
const rowsOf = (t) => [...t.host.querySelectorAll('tbody tr[data-uix-row-id]')];

test('review 3: rowNavigation alone is a tab stop without click activation; Enter opens the id; onRowActivate with activateOnClick={false} is Enter only', () => {
  const peeks = [];
  const t = mount(h(ui.DataWorkspace, base({ rowNavigation: true, idColumn: { ...ID, onPeek: (r) => peeks.push(r.id) } })));
  const rows = rowsOf(t);
  assert.deepEqual(rows.map((r) => r.getAttribute('tabindex')), ['0', '-1', '-1', '-1', '-1', '-1']);
  assert.ok(!t.host.querySelector('table').classList.contains('uix-data-workspace__grid--click'), 'no pointer cursor: a click does nothing');
  act(() => rows[1].focus());
  keydown(rows[1], 'Enter');
  assert.deepEqual(peeks, ['BK-101'], 'Enter opens what the row offers: its id');
  t.unmount();
  const log = [];
  const e = mount(h(ui.DataWorkspace, base({ onRowActivate: (r) => log.push(['activate', r.id]), activateOnClick: false })));
  click(rowsOf(e)[2].querySelector('td'));
  assert.deepEqual(activated(log), [], 'no click activation');
  act(() => rowsOf(e)[2].focus());
  keydown(rowsOf(e)[2], 'Enter');
  assert.deepEqual(activated(log), ['BK-102']);
  e.unmount();
});

test('review 5 + 6: a click in the checkbox or actions cell, or from a portalled menu, does not activate the row', () => {
  const log = [];
  const portalHost = document.createElement('div');
  document.body.append(portalHost);
  const t = mount(h(ui.DataWorkspace, base({
    onRowActivate: (r) => log.push(['activate', r.id]), selection: new Set(), onSelectionChange() {},
    rowActions: (r) => h('span', null, h('button', { type: 'button' }, 'Renew'), createPortal(h('div', { role: 'menu', className: `menu-${r.id}` }, h('span', { className: 'item' }, 'Return')), portalHost)),
  })));
  const row = rowsOf(t)[1];
  click(row.querySelector('td.uix-table__selcell'));
  click(row.querySelector('td.uix-table__actions'));
  click(portalHost.querySelector('.menu-BK-101 .item'));
  assert.deepEqual(activated(log), [], 'near misses and portals are not the row');
  click(row.querySelector('td:nth-child(2)'));
  assert.deepEqual(activated(log), ['BK-101'], 'a plain cell still is');
  t.unmount();
  portalHost.remove();
});

test('review 7: activeRowId on a row that is not on screen does not block focus recovery', () => {
  function Paged({ rows, active }) {
    return h(ui.DataWorkspace, base({ rows, onRowActivate: () => {}, activeRowId: active, onActiveRowChange: () => {} }));
  }
  const t = mount(h(Paged, { rows: ROWS, active: 'BK-102' }));
  act(() => rowsOf(t)[2].focus());
  t.render(h(Paged, { rows: ROWS, active: 'BK-999' }));
  const page2 = ROWS.map((r, i) => ({ ...r, id: `BK-${300 + i}` }));
  t.render(h(Paged, { rows: page2, active: 'BK-999' }));
  assert.ok(document.activeElement === rowsOf(t)[0], 'the new page\'s first row has focus, not <body>');
  t.unmount();
});

test('review 8: a product moving activeRowId does not take focus from a field outside the table', () => {
  function Driven({ active }) {
    return h('div', null, h('input', { className: 'field' }), h(ui.DataWorkspace, base({ rowNavigation: true, activeRowId: active })));
  }
  const t = mount(h(Driven, { active: 'BK-100' }));
  const field = t.host.querySelector('.field');
  act(() => field.focus());
  t.render(h(Driven, { active: 'BK-103' }));
  assert.ok(document.activeElement === field, 'the person keeps typing');
  assert.equal(rowsOf(t)[3].getAttribute('tabindex'), '0', 'the tab stop moved');
  act(() => rowsOf(t)[3].focus());
  t.render(h(Driven, { active: 'BK-104' }));
  assert.ok(document.activeElement === rowsOf(t)[4], 'from inside the table, focus follows');
  t.unmount();
});

test('review 9: with mobile, nothing is frozen from the narrowest step (under 600 px)', () => {
  workspaceWidth = 500;
  const t = mount(h(ui.DataWorkspace, base({ mobile: 'priority', idColumn: ID, selection: new Set(), onSelectionChange() {} })));
  const table = t.host.querySelector('table');
  assert.ok(table.classList.contains('uix-table--priority-mid'));
  assert.ok(!table.classList.contains('uix-table--pinned-col') && !table.classList.contains('uix-data-workspace__grid--pin-id'));
  t.unmount();
  workspaceWidth = 800;
  const wide = mount(h(ui.DataWorkspace, base({ mobile: 'priority', idColumn: ID, selection: new Set(), onSelectionChange() {} })));
  assert.ok(wide.host.querySelector('table').classList.contains('uix-table--pinned-col'), 'still frozen one step up');
  wide.unmount();
  workspaceWidth = 0;
});

test('nit: the ladder measures the content box (a maximized workspace has padding)', () => {
  workspaceWidth = 940;
  const t = mount(h(ui.DataWorkspace, base({ mobile: 'priority', style: { padding: '50px' } })));
  assert.ok(t.host.querySelector('table').classList.contains('uix-table--priority'), '940 − 100 px of padding is under 900');
  t.unmount();
  workspaceWidth = 0;
});

test('nit: multiSort is list mode while sort is still null', () => {
  const log = [];
  function Lists() {
    const [sort, setSort] = useState(null);
    return h(ui.DataWorkspace, base({ sort, multiSort: true, onSortChange: (s) => { log.push(s); setSort(s); } }));
  }
  const t = mount(h(Lists));
  const btn = (name) => [...t.host.querySelectorAll('th button.uix-th__sortbtn')].find((b) => b.firstChild.textContent === name);
  click(btn('Title'));
  assert.deepEqual(log.at(-1), [{ columnId: 'title', direction: 'ascending' }]);
  click(btn('Year'), { shiftKey: true });
  assert.deepEqual(log.at(-1), [{ columnId: 'title', direction: 'ascending' }, { columnId: 'year', direction: 'ascending' }]);
  t.unmount();
});

test('nit: at maxSelection, select-all and a group box with nothing selected in their scope are disabled', () => {
  const groups = [{ id: 'a', label: 'A', rows: ROWS.slice(0, 3) }, { id: 'b', label: 'B', rows: ROWS.slice(3) }];
  const html = renderToStaticMarkup(h(ui.DataWorkspace, base({ rows: [], groups, selection: new Set(['X-1', 'BK-100']), onSelectionChange() {}, maxSelection: 2 })));
  assert.match(html, /aria-label="Select group B" disabled=""/);
  assert.doesNotMatch(html, /aria-label="Select group A" disabled=""/, 'A has a selected row: its box can clear it');
  const page = renderToStaticMarkup(h(ui.DataWorkspace, base({ selection: new Set(['X-1', 'X-2']), onSelectionChange() {}, maxSelection: 2 })));
  assert.match(page, /aria-label="Select all rows on this page" disabled=""/);
});

test('nit: crossing the cards step keeps the same rows (one tree), with virtualize on', () => {
  workspaceWidth = 1200;
  const t = mount(h(ui.DataWorkspace, base({ mobile: 'cards', virtualize: true, rowNavigation: true })));
  const before = rowsOf(t)[2];
  act(() => before.focus());
  workspaceWidth = 390;
  const observer = observers.find((o) => o.targets.includes(t.host.querySelector('.uix-data-workspace')));
  act(() => observer.callback([]));
  assert.ok(t.host.querySelector('table').classList.contains('uix-table--cards'));
  assert.ok(rowsOf(t)[2] === before, 'the row element is the same');
  assert.ok(document.activeElement === before, 'and keeps focus');
  t.unmount();
  workspaceWidth = 0;
});

test('nit: Space on a focused row does not scroll the page', () => {
  const t = mount(h(ui.DataWorkspace, base({ rowNavigation: true })));
  const row = rowsOf(t)[0];
  const event = new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  act(() => { row.dispatchEvent(event); });
  assert.equal(event.defaultPrevented, true);
  t.unmount();
});

test('nit: in cards an aggregate cell has no label of its own (the group header says what it is)', () => {
  workspaceWidth = 390;
  const t = mount(h(ui.DataWorkspace, base({ mobile: 'cards', rows: [], groups: [{ id: 'a', label: 'A', rows: ROWS, aggregates: { copies: '21 copies' } }] })));
  const agg = t.host.querySelector('.uix-data-workspace__group-agg');
  assert.equal(agg.textContent, '21 copies');
  assert.equal(agg.hasAttribute('data-label'), false);
  t.unmount();
  workspaceWidth = 0;
});

test('nit: Th sortOrder without sortOrderLabel renders as before; with it, the words sit in the button', () => {
  const plain = renderToStaticMarkup(h('table', null, h('thead', null, h('tr', null, h(ui.Th, { sortable: true, sortDirection: 'ascending', sortOrder: 2, onSort() {} }, 'Year')))));
  assert.match(plain, /<th data-sort="true" data-sort-order="2" aria-sort="ascending"><button type="button" class="uix-th__sortbtn">Year<\/button><\/th>/);
  const named = renderToStaticMarkup(h('table', null, h('thead', null, h('tr', null, h(ui.Th, { sortable: true, sortDirection: 'ascending', sortOrder: 2, sortOrderLabel: 'Sort priority 2', onSort() {} }, 'Year')))));
  assert.match(named, /data-sort-labelled="true"[^>]*><button type="button" class="uix-th__sortbtn">Year<span class="uix-visually-hidden">, Sort priority 2<\/span><\/button>/);
});

test('review flake: a second Escape restores the maximized workspace even before the closed popover toggle event arrives', () => {
  const log = [];
  function Max() {
    const [maximized, setMaximized] = useState(true);
    return h(ui.DataWorkspace, base({ maximized, onMaximizedChange: (m) => { log.push(m); setMaximized(m); }, viewMenu: { columns: [{ id: 'title', label: 'Title', visible: true }], onColumnVisibilityChange() {} } }));
  }
  const t = mount(h(Max));
  const view = [...t.host.querySelectorAll('[popover]')].find((p) => p.querySelector('.uix-view-menu'));
  const trigger = view.parentElement.querySelector('button[aria-haspopup="dialog"]');
  // the popover has closed on the first Escape; its trigger still says expanded (the toggle event is queued)
  view.removeAttribute('data-open');
  trigger.setAttribute('aria-expanded', 'true');
  act(() => trigger.focus());
  keydown(trigger, 'Escape');
  assert.deepEqual(log, [false], 'the stale aria-expanded does not hold the Escape');
  t.unmount();
});
