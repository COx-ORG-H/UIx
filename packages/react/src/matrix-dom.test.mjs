/* HAR-2752, HAR-2753 — MatrixInput and MatrixHeatmap in jsdom: where a key goes, one tab stop that
 * survives a change of rows, a choice reaching onChange, moving redrawing nothing, the states of a
 * cell, and no words of the kit's own.
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
  const { window } = dom;
  expose('window', window);
  expose('document', window.document);
  expose('navigator', window.navigator);
  expose('getComputedStyle', window.getComputedStyle.bind(window));
  expose('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  expose('cancelAnimationFrame', window.cancelAnimationFrame.bind(window));
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  // Select writes to a real select and dispatches a change on it: these must be jsdom's own.
  for (const name of ['HTMLElement', 'HTMLSelectElement', 'HTMLOptionElement', 'Event']) expose(name, window[name]);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.HTMLElement.prototype.showPopover = function showPopover() {};
  window.HTMLElement.prototype.hidePopover = function hidePopover() {};
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => dom.window.close());

const roots = [];
const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  roots.push(root);
  return host;
};
test.afterEach(() => {
  act(() => roots.splice(0).forEach((root) => root.unmount()));
  document.body.textContent = '';
});

const key = (el, name, init = {}) => act(() => {
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }));
});
const cell = (host, row, column) => host.querySelector(`[data-uix-matrix-cell][data-row="${row}"][data-column="${column}"]`);
const focused = () => [document.activeElement.dataset.row, document.activeElement.dataset.column].join(',');

const ROWS = [{ id: 'a', label: 'Finance' }, { id: 'b', label: 'Reputation' }];
const COLUMNS = [{ id: 'x', label: '4 h' }, { id: 'y', label: '1 d' }, { id: 'z', label: '3 d' }];
const OPTIONS = [
  { value: 'na', label: 'Not rated', unrated: true },
  { value: 'low', label: 'Low', tone: 'success' },
  { value: 'high', label: 'High', tone: 'danger' },
];

const Input = (props) => {
  const [value, setValue] = useState(props.initial ?? {});
  return h(ui.MatrixInput, {
    'aria-label': 'Impact',
    rows: ROWS,
    columns: COLUMNS,
    options: OPTIONS,
    rowAxisLabel: 'Criterion',
    labels: { empty: 'Choose' },
    value,
    onChange: (next, change) => { setValue(next); props.onChange?.(next, change); },
    ...props.extra,
  });
};

test('keys: the grid has edges, modified keys are not its own, and right to left the row runs the other way', () => {
  const host = mount(h(Input));
  act(() => cell(host, 0, 0).focus());
  key(document.activeElement, 'ArrowUp');
  key(document.activeElement, 'ArrowLeft');
  assert.equal(focused(), '0,0', 'a move past an edge stays');
  for (const init of [{ altKey: true }, { shiftKey: true }, { ctrlKey: true }, { metaKey: true }]) {
    const event = new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true, ...init });
    act(() => { document.activeElement.dispatchEvent(event); });
    assert.equal(focused(), '0,0', JSON.stringify(init));
    assert.equal(event.defaultPrevented, false, JSON.stringify(init));
  }
  key(document.activeElement, 'End', { ctrlKey: true });
  assert.equal(focused(), '1,2', 'Ctrl+End is the grid\'s');

  host.querySelector('.uix-matrix').style.direction = 'rtl';
  key(document.activeElement, 'ArrowLeft');
  assert.equal(focused(), '1,2', 'at the end of the row, right to left');
  key(document.activeElement, 'ArrowRight');
  assert.equal(focused(), '1,1');
});

test('the tab stop survives a change of rows: exactly one, on a cell that exists', () => {
  const Rows = ({ rows }) => h(ui.MatrixInput, {
    'aria-label': 'Impact', rows, columns: COLUMNS, options: OPTIONS, value: {}, rowAxisLabel: 'Criterion', labels: { empty: 'Choose' }, onChange: () => {},
  });
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(h(Rows, { rows: ROWS })));
  act(() => cell(host, 1, 2).focus());
  assert.equal(cell(host, 1, 2).tabIndex, 0);
  act(() => root.render(h(Rows, { rows: ROWS.slice(0, 1) })));
  const stops = host.querySelectorAll('[data-uix-matrix-cell][tabindex="0"]');
  assert.equal(stops.length, 1);
  assert.equal(stops[0].dataset.row, '0');
  act(() => root.render(h(Rows, { rows: [{ id: 'new', label: 'New' }, ...ROWS] })));
  assert.equal(host.querySelectorAll('[data-uix-matrix-cell][tabindex="0"]').length, 1);
  act(() => root.render(h(Rows, { rows: [] })));
  assert.equal(host.querySelectorAll('[data-uix-matrix-cell]').length, 0);
});

test('MatrixInput: a grid with one tab stop, each cell named by its row and column', () => {
  const host = mount(h(Input));
  const grid = host.querySelector('[role="grid"]');
  assert.equal(grid.getAttribute('aria-label'), 'Impact');
  assert.equal(host.querySelectorAll('[role="gridcell"]').length, 6);
  assert.equal(host.querySelectorAll('[data-uix-matrix-cell][tabindex="0"]').length, 1);
  assert.equal(cell(host, 0, 0).tabIndex, 0);
  assert.equal(cell(host, 1, 2).getAttribute('aria-label'), 'Reputation, 3 d');
  assert.equal(host.querySelector('thead th').textContent, 'Criterion');
});

test('MatrixInput: arrow keys move the focus and the tab stop, and do not open the list', () => {
  const host = mount(h(Input));
  act(() => cell(host, 0, 0).focus());
  key(document.activeElement, 'ArrowRight');
  assert.equal(focused(), '0,1');
  key(document.activeElement, 'ArrowDown');
  assert.equal(focused(), '1,1');
  assert.equal(document.activeElement.getAttribute('aria-expanded'), 'false');
  assert.equal(cell(host, 1, 1).tabIndex, 0, 'the tab stop follows');
  assert.equal(cell(host, 0, 0).tabIndex, -1);
  key(document.activeElement, 'End');
  assert.equal(focused(), '1,2');
  key(document.activeElement, 'Home', { ctrlKey: true });
  assert.equal(focused(), '0,0');
});

test('MatrixInput: Enter opens the choice; while it is open the arrows are the list\'s; a pick reports the whole value and the cell', () => {
  const changes = [];
  const host = mount(h(Input, { initial: { b: { x: 'low' } }, onChange: (next, change) => changes.push([next, change]) }));
  const first = cell(host, 0, 0);
  act(() => first.focus());
  key(first, 'Enter');
  assert.equal(first.getAttribute('aria-expanded'), 'true');
  key(first, 'ArrowDown');
  assert.equal(document.activeElement, first, 'the grid leaves an open list alone');
  key(first, 'ArrowDown');
  key(first, 'Enter');
  assert.equal(first.getAttribute('aria-expanded'), 'false');
  assert.equal(changes.length, 1);
  assert.deepEqual(changes[0][1], { rowId: 'a', columnId: 'x', value: 'high' });
  assert.deepEqual(changes[0][0], { b: { x: 'low' }, a: { x: 'high' } });
  assert.match(first.textContent, /High/);
  assert.equal(first.dataset.tone, 'danger');
});

test('MatrixInput: an empty cell, "not rated" and a level are three different things', () => {
  const host = mount(h(Input, { initial: { a: { x: 'na', y: 'low' } } }));
  const [unrated, level, empty] = [cell(host, 0, 0), cell(host, 0, 1), cell(host, 0, 2)];
  assert.ok(unrated.hasAttribute('data-unrated'));
  assert.match(unrated.textContent, /Not rated/);
  assert.equal(level.dataset.tone, 'success');
  assert.ok(!level.hasAttribute('data-unrated'));
  assert.ok(empty.hasAttribute('data-placeholder'));
  assert.match(empty.textContent, /Choose/);
});

test('MatrixInput: help, an error, and locked cells that can still be reached', () => {
  const getCell = (row, column) => {
    if (row === 'a' && column === 'x') return { help: 'Direct costs only' };
    if (row === 'a' && column === 'y') return { error: 'Pick a level' };
    if (row === 'a' && column === 'z') return { disabled: true };
    if (row === 'b' && column === 'x') return { readOnly: true };
    return undefined;
  };
  const host = mount(h(Input, { extra: { getCell } }));
  const help = host.querySelector('.uix-matrix__help');
  assert.equal(help.getAttribute('aria-hidden'), 'true');
  assert.equal(help.textContent, '');
  act(() => cell(host, 0, 0).focus());
  assert.equal(help.textContent, 'Direct costs only', 'focus shows the cell\'s help');
  assert.equal(document.getElementById(cell(host, 0, 0).getAttribute('aria-describedby')).textContent, 'Direct costs only');
  key(document.activeElement, 'ArrowDown');
  assert.equal(help.textContent, '', 'a cell without help clears it');

  const invalid = cell(host, 0, 1);
  assert.equal(invalid.getAttribute('aria-invalid'), 'true');
  assert.equal(invalid.closest('td').getAttribute('aria-invalid'), 'true');
  assert.equal(document.getElementById(invalid.getAttribute('aria-describedby')).textContent, 'Pick a level');

  const disabled = cell(host, 0, 2);
  assert.equal(disabled.disabled, false, 'a disabled cell stays reachable');
  assert.equal(disabled.getAttribute('aria-disabled'), 'true');
  assert.equal(disabled.getAttribute('aria-readonly'), 'true');
  act(() => disabled.focus());
  key(disabled, 'Enter');
  assert.equal(disabled.getAttribute('aria-expanded'), 'false', 'and does not open');
  key(disabled, 'ArrowLeft');
  assert.equal(focused(), '0,1', 'and the keys still move on from it');

  assert.equal(cell(host, 1, 0).closest('td').getAttribute('aria-readonly'), 'true');
});

test('MatrixInput: the whole grid disabled or read-only; without help there is no help line', () => {
  const locked = mount(h(Input, { extra: { readOnly: true } }));
  assert.equal(locked.querySelector('[role="grid"]').getAttribute('aria-readonly'), 'true');
  assert.equal(locked.querySelector('.uix-matrix__help'), null);
  const off = mount(h(Input, { extra: { disabled: true } }));
  assert.equal(off.querySelectorAll('[data-uix-matrix-cell][aria-disabled="true"]').length, 6);
});

test('MatrixInput: moving through the grid redraws nothing', () => {
  // getCell runs on every render of the grid, so it counts them.
  let renders = 0;
  const getCell = () => { renders += 1; return undefined; };
  const host = mount(h(Input, { extra: { getCell } }));
  const settled = renders;
  assert.ok(settled > 0);
  act(() => cell(host, 0, 0).focus());
  key(document.activeElement, 'ArrowRight');
  key(document.activeElement, 'ArrowDown');
  assert.equal(focused(), '1,1');
  assert.equal(renders, settled);
});

const HEAT_CELLS = [
  { rowId: 'a', columnId: 'x', count: 12, band: { label: 'Critical', tone: 'danger' } },
  { rowId: 'a', columnId: 'y', count: 0, band: { label: 'Low', tone: 'success' } },
  { rowId: 'a', columnId: 'z', count: 0, band: { label: 'None', tone: 'neutral' }, hideCount: true },
  { rowId: 'b', columnId: 'x', count: 3, band: { label: 'High', tone: 'attention' }, href: '/risks?cell=b-x' },
];
const heatmap = (props) => h(ui.MatrixHeatmap, {
  'aria-label': 'Risks',
  rows: ROWS,
  columns: COLUMNS,
  cells: HEAT_CELLS,
  rowAxisLabel: 'Impact',
  columnAxisLabel: 'Likelihood',
  labels: { empty: 'No data' },
  ...props,
});

test('MatrixHeatmap: each cell is one control, named by its two axes, its band and its count', () => {
  const host = mount(heatmap());
  assert.equal(host.querySelectorAll('[role="gridcell"]').length, 6);
  assert.equal(host.querySelectorAll('[data-uix-matrix-cell]').length, 6);
  assert.equal(host.querySelectorAll('[data-uix-matrix-cell][tabindex="0"]').length, 1);
  assert.equal(host.querySelector('[role="grid"]').getAttribute('aria-readonly'), 'true');
  assert.equal(cell(host, 1, 1).getAttribute('aria-disabled'), 'true', 'without onOpenCell a button cell opens nothing, and says so');
  assert.equal(cell(host, 1, 0).hasAttribute('aria-disabled'), false, 'a link still opens');
  assert.equal(cell(host, 0, 0).getAttribute('aria-label'), 'Finance, 4 h: Critical, 12');
  assert.equal(cell(host, 0, 0).textContent, '12Critical');
  assert.equal(host.querySelector('thead th').textContent, 'LikelihoodImpact');
});

test('MatrixHeatmap: a shown zero, a hidden zero and an empty cell stay apart', () => {
  const host = mount(heatmap());
  const [zero, hidden, empty] = [cell(host, 0, 1), cell(host, 0, 2), cell(host, 1, 1)];
  assert.equal(zero.textContent, '0Low');
  assert.equal(zero.getAttribute('aria-label'), 'Finance, 1 d: Low, 0');
  assert.equal(hidden.textContent, 'None');
  assert.equal(hidden.getAttribute('aria-label'), 'Finance, 3 d: None');
  assert.ok(!hidden.hasAttribute('data-empty'));
  assert.equal(empty.textContent, 'No data');
  assert.equal(empty.getAttribute('aria-label'), 'Reputation, 1 d: No data');
  assert.ok(empty.hasAttribute('data-empty'));
});

test('MatrixHeatmap: a cell with neither a figure nor a band is empty, not a blank tile', () => {
  const host = mount(heatmap({ cells: [{ rowId: 'a', columnId: 'x', hideCount: true }] }));
  assert.equal(cell(host, 0, 0).textContent, 'No data');
  assert.ok(cell(host, 0, 0).hasAttribute('data-empty'));
});

test('MatrixHeatmap: the keyboard reaches and opens every cell', () => {
  const opened = [];
  const cells = HEAT_CELLS.map(({ href, ...rest }) => rest);
  const host = mount(heatmap({ cells, onOpenCell: (c) => opened.push(`${c.rowId}/${c.columnId}`) }));
  act(() => cell(host, 0, 0).focus());
  for (let row = 0; row < ROWS.length; row += 1) {
    for (let column = 0; column < COLUMNS.length; column += 1) {
      assert.equal(focused(), `${row},${column}`);
      act(() => document.activeElement.click());
      key(document.activeElement, 'ArrowRight');
    }
    key(document.activeElement, 'ArrowDown');
    key(document.activeElement, 'Home');
  }
  assert.deepEqual(opened, ['a/x', 'a/y', 'a/z', 'b/x', 'b/y', 'b/z']);
});

test('MatrixHeatmap: a cell with an href is a link through renderLink, and it joins the same grid', () => {
  const seen = [];
  const renderLink = (props) => { seen.push(props.href); return h('a', { ...props, 'data-router': '' }); };
  const host = mount(heatmap({ renderLink }));
  const link = cell(host, 1, 0);
  assert.equal(link.tagName, 'A');
  assert.equal(link.getAttribute('href'), '/risks?cell=b-x');
  assert.ok(link.hasAttribute('data-router'));
  assert.ok(seen.includes('/risks?cell=b-x'));
  const opened = [];
  const withOpen = mount(heatmap({ renderLink, onOpenCell: (c) => opened.push(c.columnId) }));
  act(() => cell(withOpen, 1, 0).dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })));
  assert.deepEqual(opened, [], 'a link navigates, and does not fire the drill-through as well');
  act(() => link.focus());
  key(link, 'ArrowUp');
  assert.equal(focused(), '0,0');
  assert.equal(cell(host, 0, 0).tagName, 'BUTTON');
});
