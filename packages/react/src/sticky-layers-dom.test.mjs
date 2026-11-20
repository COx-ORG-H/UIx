/* Sticky-layer focus offsets (WCAG 2.2 SC 2.4.11, technique C43), in jsdom: the registry, the
 * useStickyLayer hook, and useVirtualRows `scrollToIndex`. jsdom has no layout, so rects, heights
 * and scroll positions are stubbed; the real scrolling is measured in Chromium, Firefox and WebKit by
 * tests/a11y/sticky-focus.spec.mjs. Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useRef, useState } from 'react';

let dom;
let createRoot;
let ui;

const EXPOSED = ['window', 'document', 'navigator', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
const observers = [];
const VIEWPORT = 900;

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
  expose('cancelAnimationFrame', dom.window.cancelAnimationFrame.bind(dom.window));
  // observe / disconnect only, like a product's own stub: the kit must not need unobserve
  expose('ResizeObserver', class {
    constructor(callback) { this.callback = callback; this.targets = new Set(); observers.push(this); }
    observe(el) { this.targets.add(el); }
    disconnect() { this.targets.clear(); }
  });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, get: () => VIEWPORT });
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const frame = () => new Promise((resolve) => setTimeout(resolve, 40));
const property = (name) => document.documentElement.style.getPropertyValue(name);

/** A fixed layer whose box is `rect` (top and height, full width). */
function layer(rect) {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.getBoundingClientRect = () => ({ top: rect.top, bottom: rect.top + rect.height, left: 0, right: 1280, width: 1280, height: rect.height, x: 0, y: rect.top });
  document.body.append(el);
  return { el, rect };
}

test('a fixed bottom layer writes how far it reaches up; a top layer how far down; removing them clears both', async () => {
  const toaster = layer({ top: VIEWPORT - 16 - 200, height: 200 });
  const header = layer({ top: 0, height: 56 });
  const offToaster = ui.registerStickyLayer(toaster.el, 'bottom');
  const offHeader = ui.registerStickyLayer(header.el, 'top');
  assert.equal(property(ui.STICKY_BOTTOM_PROPERTY), '216px');
  assert.equal(property(ui.STICKY_TOP_PROPERTY), '56px');
  assert.deepEqual(ui.stickyInsets(document), { top: 56, bottom: 216 });

  // the stack grows (a third toast): the observer measures it at the next frame
  toaster.rect.top -= 80;
  toaster.rect.height += 80;
  for (const o of observers) if (o.targets.has(toaster.el)) o.callback([]);
  await frame();
  assert.equal(property(ui.STICKY_BOTTOM_PROPERTY), '296px');

  offToaster();
  assert.equal(property(ui.STICKY_BOTTOM_PROPERTY), '');
  offHeader();
  assert.equal(property(ui.STICKY_TOP_PROPERTY), '');
  toaster.el.remove();
  header.el.remove();
});

test('an empty stack, a hidden layer and a layer that is not fixed reach nowhere', () => {
  const empty = layer({ top: VIEWPORT - 16, height: 0 });
  const hidden = layer({ top: 600, height: 284 });
  hidden.el.style.visibility = 'hidden';
  const inFlow = layer({ top: 500, height: 300 });
  inFlow.el.style.position = 'static';
  const offs = [ui.registerStickyLayer(empty.el, 'bottom'), ui.registerStickyLayer(hidden.el, 'bottom'), ui.registerStickyLayer(inFlow.el, 'bottom')];
  assert.equal(property(ui.STICKY_BOTTOM_PROPERTY), '');
  assert.deepEqual(ui.stickyInsets(document), { top: 0, bottom: 0 });
  for (const off of offs) off();
  for (const l of [empty, hidden, inFlow]) l.el.remove();
});

test('useStickyLayer registers an element that mounts after the hook (a portal) and lets it go on unmount', async () => {
  function Late() {
    const ref = useRef(null);
    const [shown, setShown] = useState(false);
    ui.useStickyLayer(ref, { edge: 'bottom' });
    globalThis.__show = () => setShown(true);
    return shown
      ? h('div', {
        ref: (el) => {
          if (el) el.getBoundingClientRect = () => ({ top: 700, bottom: 884, left: 0, right: 400, width: 400, height: 184, x: 0, y: 700 });
          ref.current = el;
        },
        style: { position: 'fixed' },
      })
      : null;
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(Late)));
  assert.equal(property(ui.STICKY_BOTTOM_PROPERTY), '');
  act(() => globalThis.__show());
  assert.equal(property(ui.STICKY_BOTTOM_PROPERTY), '200px');
  act(() => root.unmount());
  assert.equal(property(ui.STICKY_BOTTOM_PROPERTY), '');
  host.remove();
  delete globalThis.__show;
});

/** A scroller of `count` rows of 44 px under a 44 px header, `height` tall, its top at `top` in the viewport. */
function scroller({ count = 2000, height = 640, top = 160 } = {}) {
  const layout = { scrollTop: 0 };
  let api;
  function Rows() {
    const v = ui.useVirtualRows(Array.from({ length: count }, (_, i) => i), { rowHeight: 44, estimatedViewportHeight: height, measureRows: '[data-row]' });
    api = v;
    return h('div', {
      ref: (el) => {
        if (el) {
          Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => height });
          Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => 44 + count * 44 });
          // clamped to the scroll range, as a browser does
          Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => layout.scrollTop, set: (y) => { layout.scrollTop = Math.min(Math.max(0, y), 44 + count * 44 - height); } });
          el.getBoundingClientRect = () => ({ top, bottom: top + height, left: 0, right: 1280, width: 1280, height, x: 0, y: top });
          el.style.scrollPaddingTop = '44px';
        }
        v.containerRef.current = el;
      },
    }, v.rows.map((row, i) => h('div', {
      key: row,
      'data-row': '',
      // the first mounted row sits below the 44 px header, after the rows above the window
      ref: (el) => { if (el && i === 0) el.getBoundingClientRect = () => { const y = top + 44 + (v.startIndex + i) * 44 - layout.scrollTop; return { top: y, bottom: y + 44, left: 0, right: 1280, width: 1280, height: 44, x: 0, y }; }; },
    }, row)));
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(Rows)));
  return { layout, api: () => api, cleanup: () => { act(() => root.unmount()); host.remove(); } };
}

test('scrollToIndex: nearest stops the row inside the scroll padding, below the header; start / end / center place it', () => {
  const t = scroller();
  // row 30 is below the 640 px box: nearest brings its bottom to the box's bottom edge
  act(() => t.api().scrollToIndex(30));
  assert.equal(t.layout.scrollTop, 44 + 31 * 44 - 640);
  // already in view: nothing moves
  const before = t.layout.scrollTop;
  act(() => t.api().scrollToIndex(25));
  assert.equal(t.layout.scrollTop, before);
  // above the box: its top stops under the 44 px header (scroll-padding-top), not behind it
  act(() => t.api().scrollToIndex(5));
  assert.equal(t.layout.scrollTop, 44 + 5 * 44 - 44);
  act(() => t.api().scrollToIndex(100, { align: 'start' }));
  assert.equal(t.layout.scrollTop, 100 * 44);
  act(() => t.api().scrollToIndex(100, { align: 'end' }));
  assert.equal(t.layout.scrollTop, 44 + 101 * 44 - 640);
  act(() => t.api().scrollToIndex(100, { align: 'center' }));
  assert.equal(t.layout.scrollTop, 100 * 44 - (640 - 44 - 44) / 2);
  // clamped to the list
  act(() => t.api().scrollToIndex(5000));
  assert.equal(t.layout.scrollTop, 44 + 2000 * 44 - 640);
  t.cleanup();
});

test('scrollToIndex: a fixed layer over the scroller\'s bottom (toasts) is cleared too', () => {
  // the box runs from 160 to 800; a 300 px stack reaches up to 600 from the viewport's bottom
  const stack = layer({ top: VIEWPORT - 300, height: 284 });
  const off = ui.registerStickyLayer(stack.el, 'bottom');
  const t = scroller();
  act(() => t.api().scrollToIndex(30));
  // the row's bottom stops at 600, not at the box's bottom edge (800): 200 px of padding more
  assert.equal(t.layout.scrollTop, 44 + 31 * 44 - 640 + 200);
  off();
  stack.el.remove();
  t.cleanup();
});
