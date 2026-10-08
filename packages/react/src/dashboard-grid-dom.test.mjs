/* HAR-1555 — DashboardGrid markup: the class contract the CSS reads. The geometry (spans,
 * clamping, full width, no overflow) is measured in Chromium by tests/a11y/dashboard-grid.spec.mjs;
 * jsdom has no layout. Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createElement as h, createRef, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
const css = readFileSync(new URL('../../tokens/styles/components/dashboard-grid.css', import.meta.url), 'utf8');
const defined = new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]));

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const classesOf = (html) => html.match(/class="([^"]*)"/)[1].split(' ');

test('no columns: only the block class, so the CSS defaults apply (1, 2 from sm, 3 from lg)', () => {
  assert.deepEqual(classesOf(renderToStaticMarkup(h(ui.DashboardGrid))), ['uix-dashboard-grid']);
  assert.equal(ui.dashboardGridClassName(), 'uix-dashboard-grid');
});

test('columns per breakpoint: an explicit base (default 1) plus one class per given breakpoint', () => {
  assert.equal(ui.dashboardGridClassName({ base: 1, sm: 2, xl: 3 }), 'uix-dashboard-grid uix-dashboard-grid--cols-1 uix-dashboard-grid--sm-cols-2 uix-dashboard-grid--xl-cols-3');
  assert.equal(ui.dashboardGridClassName({ lg: 4 }), 'uix-dashboard-grid uix-dashboard-grid--cols-1 uix-dashboard-grid--lg-cols-4');
  assert.equal(ui.dashboardGridClassName({ base: 2, md: 3 }), 'uix-dashboard-grid uix-dashboard-grid--cols-2 uix-dashboard-grid--md-cols-3');
  assert.equal(ui.dashboardGridClassName(3), 'uix-dashboard-grid uix-dashboard-grid--cols-3');
  assert.equal(ui.dashboardGridClassName({}), 'uix-dashboard-grid uix-dashboard-grid--cols-1');
});

test('out-of-range column counts from untyped callers clamp to 1–4', () => {
  assert.equal(ui.dashboardGridClassName(0), 'uix-dashboard-grid uix-dashboard-grid--cols-1');
  assert.equal(ui.dashboardGridClassName(9), 'uix-dashboard-grid uix-dashboard-grid--cols-4');
  assert.equal(ui.dashboardGridClassName(2.6), 'uix-dashboard-grid uix-dashboard-grid--cols-3');
  assert.equal(ui.dashboardGridClassName(Number.NaN), 'uix-dashboard-grid uix-dashboard-grid--cols-1');
  assert.equal(ui.dashboardGridClassName({ sm: -1, xl: 12 }), 'uix-dashboard-grid uix-dashboard-grid--cols-1 uix-dashboard-grid--sm-cols-1 uix-dashboard-grid--xl-cols-4');
});

test('gap: md adds nothing, sm and lg add a modifier', () => {
  assert.equal(ui.dashboardGridClassName(undefined, 'md'), 'uix-dashboard-grid');
  assert.equal(ui.dashboardGridClassName(undefined, 'sm'), 'uix-dashboard-grid uix-dashboard-grid--gap-sm');
  assert.equal(ui.dashboardGridClassName(2, 'lg'), 'uix-dashboard-grid uix-dashboard-grid--gap-lg uix-dashboard-grid--cols-2');
});

test('items: span 1 is the plain item, 2 and full add their modifier; Item is the same component', () => {
  assert.equal(ui.DashboardGrid.Item, ui.DashboardGridItem);
  const html = renderToStaticMarkup(h(ui.DashboardGrid, { columns: { base: 1, sm: 2, lg: 3 }, gap: 'lg', className: 'mine', 'data-testid': 'grid' },
    h(ui.DashboardGrid.Item, { id: 'a' }, 'A'),
    h(ui.DashboardGrid.Item, { id: 'b', span: 2, className: 'wide' }, 'B'),
    h(ui.DashboardGridItem, { id: 'c', span: 'full', role: 'listitem' }, 'C')));
  const doc = new JSDOM(html).window.document;
  const grid = doc.querySelector('[data-testid="grid"]');
  assert.deepEqual([...grid.classList], ['uix-dashboard-grid', 'uix-dashboard-grid--gap-lg', 'uix-dashboard-grid--cols-1', 'uix-dashboard-grid--sm-cols-2', 'uix-dashboard-grid--lg-cols-3', 'mine']);
  assert.deepEqual([...doc.getElementById('a').classList], ['uix-dashboard-grid__item']);
  assert.deepEqual([...doc.getElementById('b').classList], ['uix-dashboard-grid__item', 'uix-dashboard-grid__item--span-2', 'wide']);
  assert.deepEqual([...doc.getElementById('c').classList], ['uix-dashboard-grid__item', 'uix-dashboard-grid__item--full']);
  assert.equal(doc.getElementById('c').getAttribute('role'), 'listitem');
  assert.equal(ui.dashboardGridItemClassName(), 'uix-dashboard-grid__item');
});

test('every class the adapter can emit is defined in dashboard-grid.css', () => {
  const emitted = new Set();
  for (const base of [1, 2, 3, 4]) {
    for (const cls of ui.dashboardGridClassName(base).split(' ')) emitted.add(cls);
    for (const bp of ['sm', 'md', 'lg', 'xl']) for (const cls of ui.dashboardGridClassName({ [bp]: base }).split(' ')) emitted.add(cls);
  }
  for (const gap of ['sm', 'md', 'lg']) for (const cls of ui.dashboardGridClassName(undefined, gap).split(' ')) emitted.add(cls);
  for (const span of [1, 2, 'full']) for (const cls of ui.dashboardGridItemClassName(span).split(' ')) emitted.add(cls);
  assert.equal(emitted.size, 1 + 4 + 16 + 2 + 3);
  assert.deepEqual([...emitted].filter((cls) => !defined.has(cls)), []);
});

test('refs reach the grid and item elements (drag-and-drop libraries need the item node)', async () => {
  const gridRef = createRef();
  const itemRef = createRef();
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(h(ui.DashboardGrid, { ref: gridRef }, h(ui.DashboardGrid.Item, { ref: itemRef, span: 'full' }, 'x')));
  });
  assert.ok(gridRef.current.classList.contains('uix-dashboard-grid'));
  assert.ok(itemRef.current.classList.contains('uix-dashboard-grid__item--full'));
  assert.equal(itemRef.current.parentElement, gridRef.current);
  await act(async () => root.unmount());
  host.remove();
});
