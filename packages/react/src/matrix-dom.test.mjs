/* HAR-2752, HAR-2753 — MatrixInput and MatrixHeatmap in jsdom, and matrixStep on its own: where a
 * key goes, one tab stop, a choice reaching onChange, a change redrawing only its own cell, the
 * states of a cell, and no words of the kit's own.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

let dom;
let createRoot;
let ui;
let matrixStep;
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
  ({ matrixStep } = ui);
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

test('matrixStep: the arrows, Home and End along a row, the corners, the edges, right to left', () => {
  const size = { rows: 3, columns: 4 };
  const at = { row: 1, column: 1 };
  assert.deepEqual(matrixStep(at, size, 'ArrowUp'), { row: 0, column: 1 });
  assert.deepEqual(matrixStep(at, size, 'ArrowDown'), { row: 2, column: 1 });
  assert.deepEqual(matrixStep(at, size, 'ArrowLeft'), { row: 1, column: 0 });
  assert.deepEqual(matrixStep(at, size, 'ArrowRight'), { row: 1, column: 2 });
  assert.deepEqual(matrixStep(at, size, 'Home'), { row: 1, column: 0 });
  assert.deepEqual(matrixStep(at, size, 'End'), { row: 1, column: 3 });
  assert.deepEqual(matrixStep(at, size, 'Home', { corner: true }), { row: 0, column: 0 });
  assert.deepEqual(matrixStep(at, size, 'End', { corner: true }), { row: 2, column: 3 });
  assert.deepEqual(matrixStep({ row: 0, column: 0 }, size, 'ArrowUp'), { row: 0, column: 0 }, 'the grid has edges');
  assert.deepEqual(matrixStep({ row: 2, column: 3 }, size, 'ArrowRight'), { row: 2, column: 3 });
  assert.deepEqual(matrixStep(at, size, 'ArrowLeft', { rtl: true }), { row: 1, column: 2 });
  assert.equal(matrixStep(at, size, 'a'), null, 'any other key is not the grid\'s');
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

test('MatrixHeatmap: the keyboard reaches and opens every cell', () => {
  const opened = [];
  const host = mount(heatmap({ onOpenCell: (c) => opened.push(`${c.rowId}/${c.columnId}`) }));
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
  act(() => link.focus());
  key(link, 'ArrowUp');
  assert.equal(focused(), '0,0');
  assert.equal(cell(host, 0, 0).tagName, 'BUTTON');
});
