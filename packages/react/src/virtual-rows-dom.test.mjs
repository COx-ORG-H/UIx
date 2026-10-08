/* useVirtualRows for a product that replaces its own row virtualiser (HAR-1616), in jsdom.
 *
 * TENSOR's data-table trial swap (HAR-1463) turned six tests red on three gaps:
 *   1. until the scroller is measured, and whenever it measures 0, the hook returned EVERY row —
 *      `estimatedViewportHeight` gives it a window to start with;
 *   2. when the row count shrank under a large scrollTop the top spacer was not clamped: at
 *      scrollTop 176,000, 5,000 rows → 150 gave a 175,648 px spacer over a 6,600 px list and no
 *      rows — the window is now clamped to the row count in the same render;
 *   3. there was no way to switch it off — `enabled: false` returns all rows and no spacers.
 * jsdom has no layout, so the scroller's clientHeight / scrollTop are stubbed; that is exactly
 * the "unmeasured scroller" a product's own jsdom tests run in. The pure window maths is in
 * table-engine.test.mjs. Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let ui;

const EXPOSED = ['window', 'document', 'navigator', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
const observers = [];

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
  expose('cancelAnimationFrame', dom.window.cancelAnimationFrame.bind(dom.window));
  expose('ResizeObserver', class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() {}
  });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const ROW = 44;
const rowsOf = (count) => Array.from({ length: count }, (_, i) => i);

/**
 * A table body on the hook. `layout` is the scroller's stubbed clientHeight / scrollTop (jsdom
 * reports 0 for both, i.e. unmeasured); `results` records what every render returned.
 */
function mount(count, options, layout = { height: 0, scrollTop: 0 }) {
  const results = [];
  function Table({ rows, opts }) {
    const v = ui.useVirtualRows(rows, { rowHeight: ROW, ...opts });
    results.push({ rendered: v.rows.length, first: v.rows[0], last: v.rows[v.rows.length - 1], startIndex: v.startIndex, padTop: v.padTop, padBottom: v.padBottom, totalHeight: v.totalHeight, virtualized: v.virtualized });
    return h('div', {
      ref: (el) => {
        if (el) {
          Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => layout.height });
          Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => layout.scrollTop, set: (y) => { layout.scrollTop = y; } });
        }
        v.containerRef.current = el;
      },
      'data-scroller': '',
    }, v.rows.map((row) => h('div', { key: row }, row)));
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const render = (n, opts = options) => act(() => root.render(h(Table, { rows: rowsOf(n), opts })));
  render(count);
  const scroller = host.querySelector('[data-scroller]');
  return {
    host, results, layout, render,
    last: () => results[results.length - 1],
    /** Scroll like a browser: move, fire `scroll`, let the hook's animation frame commit. */
    scrollTo: async (y) => {
      layout.scrollTop = y;
      await act(async () => {
        scroller.dispatchEvent(new window.Event('scroll'));
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
    },
    cleanup: () => { act(() => root.unmount()); host.remove(); },
  };
}

test('unmeasured scroller, no estimate: every row is rendered, as before', () => {
  const t = mount(5000, {});
  assert.equal(t.last().rendered, 5000);
  assert.equal(t.last().virtualized, false);
  assert.equal(t.last().padTop, 0);
  assert.equal(t.last().padBottom, 0);
  t.cleanup();
});

test('estimatedViewportHeight: 5,000 rows mount with the estimated window plus overscan, never all of them', () => {
  const t = mount(5000, { estimatedViewportHeight: 600 });
  const windowRows = Math.ceil(600 / ROW);
  for (const [i, pass] of t.results.entries()) {
    assert.ok(pass.rendered <= windowRows + 2 * 6, `render ${i}: ${pass.rendered} rows`);
  }
  assert.equal(t.last().rendered, windowRows + 12);
  assert.equal(t.last().virtualized, true);
  assert.equal(t.last().first, 0);
  assert.equal(t.last().padTop, 0);
  assert.equal(t.last().padBottom, (5000 - (windowRows + 12)) * ROW);
  assert.equal(t.last().totalHeight, 5000 * ROW);
  assert.equal(t.host.querySelector('[data-scroller]').children.length, windowRows + 12, 'that is all the DOM holds');

  // a custom overscan is counted on both edges
  const tight = mount(5000, { estimatedViewportHeight: 600, overscan: 2 });
  assert.equal(tight.last().rendered, windowRows + 4);
  tight.cleanup();
  t.cleanup();
});

test('a measured height replaces the estimate; a scroller that measures 0 again falls back to it', async () => {
  const t = mount(5000, { estimatedViewportHeight: 600 }, { height: 440, scrollTop: 0 });
  assert.equal(t.last().rendered, 440 / ROW + 12, 'the real height, not the estimate');
  t.layout.height = 0; // e.g. its tab was hidden
  await t.scrollTo(0);
  assert.equal(t.last().rendered, Math.ceil(600 / ROW) + 12);
  assert.equal(t.last().virtualized, true);
  t.cleanup();
});

test('shrinking the row count under a large scrollTop shows rows in the same render, with a spacer inside the list', async () => {
  const t = mount(5000, {}, { height: 600, scrollTop: 0 });
  await t.scrollTo(176000);
  assert.equal(t.last().startIndex, 176000 / ROW - 6);
  assert.equal(t.last().first, 176000 / ROW - 6);

  // The data shrinks (a filter). The browser has not clamped scrollTop yet: no scroll event,
  // no new measurement — the very next render must already be right.
  const before = t.results.length;
  t.render(150);
  const pass = t.results[before];
  assert.ok(pass, 'the shrink rendered');
  assert.ok(pass.rendered > 0, `rows in the same pass (got ${pass.rendered})`);
  assert.equal(pass.last, 149, 'the end of the shorter list');
  assert.ok(pass.padTop <= 150 * ROW, `spacer ${pass.padTop} px is not larger than the ${150 * ROW} px list`);
  assert.equal(pass.padTop + pass.rendered * ROW + pass.padBottom, 150 * ROW, 'spacers + rows = the list');
  assert.equal(pass.padBottom, 0);
  assert.equal(pass.totalHeight, 150 * ROW);
  for (const later of t.results.slice(before)) assert.ok(later.rendered > 0 && later.padTop <= 150 * ROW);

  // shrinking to at or below the threshold renders everything, with no spacers
  t.render(100);
  assert.equal(t.last().rendered, 100);
  assert.equal(t.last().padTop, 0);
  assert.equal(t.last().virtualized, false);
  t.cleanup();
});

test('enabled: false returns all rows and no spacers, whatever the count or scroll position', async () => {
  const t = mount(5000, { enabled: false, estimatedViewportHeight: 600 }, { height: 600, scrollTop: 0 });
  await t.scrollTo(40000);
  assert.equal(t.last().rendered, 5000);
  assert.equal(t.last().startIndex, 0);
  assert.equal(t.last().padTop, 0);
  assert.equal(t.last().padBottom, 0);
  assert.equal(t.last().totalHeight, 5000 * ROW);
  assert.equal(t.last().virtualized, false);

  // switched on while mounted: the window at the current scroll position
  t.render(5000, { enabled: true });
  assert.equal(t.last().virtualized, true);
  assert.equal(t.last().startIndex, Math.floor(40000 / ROW) - 6);
  t.cleanup();
});

test('threshold: windowing starts above it (>), not at it', () => {
  const at = mount(100, { estimatedViewportHeight: 600 });
  assert.equal(at.last().virtualized, false, 'exactly `threshold` rows are rendered whole');
  assert.equal(at.last().rendered, 100);
  at.cleanup();
  const above = mount(101, { estimatedViewportHeight: 600 });
  assert.equal(above.last().virtualized, true);
  above.cleanup();
  const custom = mount(50, { estimatedViewportHeight: 600, threshold: 49 });
  assert.equal(custom.last().virtualized, true);
  custom.cleanup();
});
