/* DataWorkspace selection scope in jsdom (enterprise UX study, roadmap #12): the page banner and
 * its step to "all matching" (a query scope, not ids), the scope in bulkActions and the bulk bar,
 * exclusions, the `clear` and `confirm` answers to a changed query, a shift range, row actions made
 * inert, and the old `selection` path left as it was.
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
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
  expose('cancelAnimationFrame', dom.window.cancelAnimationFrame.bind(dom.window));
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, render: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el, init = {}) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, ...init })));
const text = (el) => el?.textContent.replace(/\s+/g, ' ').trim();
const fmt = (n) => new Intl.NumberFormat().format(n);

const ROWS = Array.from({ length: 5 }, (_, i) => ({ id: `INC-${i + 1}`, title: `Incident ${i + 1}` }));
const COLUMNS = [{ id: 'title', header: 'Title', cell: (r) => r.title }];
const STATUS = { id: 'status', label: 'Status', kind: 'enum', options: [{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }] };

/** A product that keeps the scope in state; `seen` records every scope the kit hands back. */
function Harness({ seen, policy, searchValue = '', total = 40, rowActions, bulk = true }) {
  const [scope, setScope] = useState(ui.EMPTY_SELECTION_SCOPE);
  return h(ui.DataWorkspace, {
    label: 'Incidents', rows: ROWS, getRowId: (r) => r.id, columns: COLUMNS, rowLabel: (r) => r.id,
    search: { value: searchValue, onChange() {} },
    filters: { fields: [STATUS], values: { status: { kind: 'enum', values: ['open'] } }, onChange() {} },
    pagination: { mode: 'offset', page: 1, pageSize: 5, total, onPageChange() {} },
    selectionScope: { value: scope, onChange: (next) => { seen.push(next); setScope(next); }, onQueryChange: policy },
    bulkActions: bulk ? (ids, s) => h('span', { 'data-bulk': JSON.stringify({ ids, kind: s.kind }) }) : undefined,
    rowActions,
  });
}
const head = (host) => host.querySelector('thead .uix-table__selcol input');
const boxes = (host) => [...host.querySelectorAll('tbody .uix-table__selcell input')];
const banner = (host) => host.querySelector('.uix-data-workspace__scope');
const bannerButton = (host, name) => [...(banner(host)?.querySelectorAll('button') ?? [])].find((b) => text(b) === name);

test('the page, then all matching: the scope becomes the query, the bulk bar and banner say so', () => {
  const seen = [];
  const t = mount(h(Harness, { seen }));
  assert.equal(banner(t.host), null, 'no banner before anything is selected');
  click(head(t.host));
  assert.deepEqual(seen.at(-1), { kind: 'ids', ids: ROWS.map((r) => r.id) });
  assert.equal(text(banner(t.host).querySelector('p')), 'All 5 rows on this page are selected.');
  assert.equal(JSON.parse(t.host.querySelector('[data-bulk]').getAttribute('data-bulk')).kind, 'ids');
  const select = bannerButton(t.host, `Select all ${fmt(40)} matching`);
  assert.ok(select);
  click(select);
  assert.deepEqual(seen.at(-1), {
    kind: 'query', query: { search: '', filters: { status: { kind: 'enum', values: ['open'] } } }, excludedIds: [], total: 40,
  });
  assert.equal(text(banner(t.host).querySelector('p')), 'All 40 rows matching Status: Open are selected.');
  assert.equal(text(t.host.querySelector('.uix-bulkbar__count')), '40 selected · all matching Status: Open');
  assert.deepEqual(JSON.parse(t.host.querySelector('[data-bulk]').getAttribute('data-bulk')), { ids: ROWS.map((r) => r.id), kind: 'query' });
  assert.ok(boxes(t.host).every((box) => box.checked));
  // untick one: it is excluded, and the banner counts it
  click(boxes(t.host)[2]);
  assert.deepEqual(seen.at(-1).excludedIds, ['INC-3']);
  assert.equal(text(banner(t.host).querySelector('p')), '39 of 40 rows matching Status: Open are selected.');
  t.unmount();
});

test('no "Select all N matching" when every match is on the page', () => {
  const seen = [];
  const t = mount(h(Harness, { seen, total: 5 }));
  click(head(t.host));
  assert.equal(banner(t.host), null);
  t.unmount();
});

test('clear (default): a changed search drops an all-matching scope and says so', () => {
  const seen = [];
  const t = mount(h(Harness, { seen }));
  click(head(t.host));
  click(bannerButton(t.host, `Select all ${fmt(40)} matching`));
  t.render(h(Harness, { seen, searchValue: 'vpn' }));
  assert.deepEqual(seen.at(-1), { kind: 'ids', ids: [] });
  assert.equal(text(banner(t.host).querySelector('p')), 'Selection cleared: the filter changed.');
  assert.equal(t.host.querySelector('.uix-bulkbar'), null);
  assert.ok(boxes(t.host).every((box) => !box.checked));
  click(bannerButton(t.host, 'Dismiss'));
  assert.equal(banner(t.host), null);
  assert.equal(document.activeElement, head(t.host), 'focus goes to the header checkbox');
  t.unmount();
});

test('confirm: a changed search holds the scope aside, the same query brings it back', () => {
  const seen = [];
  const t = mount(h(Harness, { seen, policy: 'confirm' }));
  click(head(t.host));
  click(bannerButton(t.host, `Select all ${fmt(40)} matching`));
  const calls = seen.length;
  t.render(h(Harness, { seen, policy: 'confirm', searchValue: 'vpn', total: 12 }));
  assert.equal(seen.length, calls, 'nothing is dropped behind the person’s back');
  assert.match(text(banner(t.host).querySelector('p')), /^The filter changed after you selected all 40 matching rows/);
  assert.deepEqual([...banner(t.host).querySelectorAll('button')].map(text), ['Select all 12 matching', 'Clear selection']);
  assert.equal(t.host.querySelector('.uix-bulkbar'), null, 'no bulk action on a stale scope');
  assert.ok(boxes(t.host).every((box) => !box.checked));
  t.render(h(Harness, { seen, policy: 'confirm', searchValue: '' }));
  assert.equal(text(banner(t.host).querySelector('p')), 'All 40 rows matching Status: Open are selected.');
  t.render(h(Harness, { seen, policy: 'confirm', searchValue: 'vpn', total: 12 }));
  click(bannerButton(t.host, 'Select all 12 matching'));
  assert.deepEqual(seen.at(-1), { kind: 'query', query: { search: 'vpn', filters: { status: { kind: 'enum', values: ['open'] } } }, excludedIds: [], total: 12 });
  t.unmount();
});

test('a shift-click selects the range from the anchor; row actions go inert under all matching', () => {
  const seen = [];
  const t = mount(h(Harness, { seen, rowActions: (r) => h('button', { type: 'button' }, `Open ${r.id}`) }));
  click(boxes(t.host)[0]);
  click(boxes(t.host)[3], { shiftKey: true });
  assert.deepEqual(seen.at(-1).ids, ['INC-1', 'INC-2', 'INC-3', 'INC-4']);
  const cells = () => [...t.host.querySelectorAll('tbody td.uix-table__actions')];
  assert.ok(cells().every((td) => !td.hasAttribute('inert')), 'by id, without the opt-in, the row verbs stay');
  click(boxes(t.host)[4]);
  click(bannerButton(t.host, `Select all ${fmt(40)} matching`));
  assert.ok(cells().every((td) => td.hasAttribute('inert') && td.hasAttribute('data-uix-disabled')));
  click(bannerButton(t.host, 'Clear selection'));
  assert.ok(cells().every((td) => !td.hasAttribute('inert')));
  t.unmount();
});

test('the old selection / onSelectionChange path is unchanged: a Set, no banner', () => {
  let got = null;
  const t = mount(h(ui.DataWorkspace, {
    label: 'Incidents', rows: ROWS, getRowId: (r) => r.id, columns: COLUMNS, selection: new Set(), onSelectionChange: (s) => { got = s; },
    pagination: { mode: 'offset', page: 1, pageSize: 5, total: 40, onPageChange() {} }, bulkActions: (ids) => h('span', null, ids.join()),
  }));
  click(head(t.host));
  assert.ok(got instanceof Set);
  assert.deepEqual([...got], ROWS.map((r) => r.id));
  assert.equal(banner(t.host), null);
  t.unmount();
});
