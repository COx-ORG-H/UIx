/* RelationshipGraph layered `controls="compact"` and `initialView="fit"` (TENSOR HAR-2501).
 *
 * The CI impact view shipped twice with eight bordered text buttons above a short map —
 * four of them pan buttons, a keyboard fallback promoted to the primary control — and a
 * first view at 75 % that left most CIs off screen. The compact controls are the map
 * convention instead: an icon cluster in the corner with tooltips, the map itself takes
 * the keyboard, a plain wheel says how to zoom, full screen covers the page. This pins
 * what the RENDERED graph does; drag, pinch and Ctrl + wheel are unchanged and covered by
 * relationship-graph-dom.test.mjs and the a11y spec.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 * Run: node --test (from packages/react), or npm test -w @tensor_1/react.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let RelationshipGraph;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  // jsdom has no layout: report a real viewport size so the first view is computed.
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  dom.window.ResizeObserver = globalThis.ResizeObserver;
  Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 800; } });
  Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 400; } });
  expose('requestAnimationFrame', (fn) => dom.window.setTimeout(() => fn(Date.now()), 0));
  expose('cancelAnimationFrame', (id) => dom.window.clearTimeout(id));
  ({ createRoot } = await import('react-dom/client'));
  ({ RelationshipGraph } = await import('../dist/index.js'));
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame']) delete globalThis[name];
});

/** Four columns of five: wider than an 800 px map at 100 %, so "readable" and "fit" differ. */
function fixture() {
  const nodes = [{ id: 'root', label: 'Antragsannahme Bürgschaften', type: 'Business Service' }];
  const edges = [];
  for (let depth = 1; depth <= 4; depth += 1) {
    for (let i = 0; i < 5; i += 1) {
      const id = `d${depth}-${i}`;
      nodes.push({ id, label: `Bestandsverwaltung ${depth}.${i}`, type: 'Application' });
      edges.push({ id: `e-${id}`, source: depth === 1 ? 'root' : `d${depth - 1}-${i}`, target: id, label: 'hängt ab von' });
    }
  }
  return { nodes, edges };
}

function mount(props) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => { root.render(h(RelationshipGraph, { layout: 'layered', rootId: 'root', clusterThreshold: 0, ...fixture(), ...props })); });
  return { host, cleanup: () => act(() => root.unmount()) };
}

const zoomOf = (host) => {
  const transform = host.querySelector('.uix-relationship-graph__stage').style.transform;
  return Number(/scale\(([\d.]+)\)/.exec(transform)?.[1]);
};
const key = (el, k) => act(() => {
  el.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
});

test('compact: an icon cluster in the map, with tooltips, and no row of text buttons', () => {
  const ui = mount({ controls: 'compact' });
  assert.equal(ui.host.querySelector('.uix-relationship-graph__toolbar'), null, 'the eight-button toolbar is still drawn');
  const cluster = ui.host.querySelector('.uix-relationship-graph__viewport .uix-relationship-graph__controls');
  assert.ok(cluster, 'the control cluster is not inside the map');
  const names = Array.from(cluster.querySelectorAll('button'), (b) => b.getAttribute('aria-label'));
  assert.deepEqual(names, ['Zoom in', 'Zoom out', 'Fit', 'Reset view', 'Full screen']);
  for (const button of cluster.querySelectorAll('button')) {
    assert.ok(button.querySelector('svg'), `${button.getAttribute('aria-label')} has no icon`);
    assert.equal(button.textContent.trim(), '', `${button.getAttribute('aria-label')} prints its words beside the icon`);
  }
  assert.match(cluster.textContent, /Zoom \d+%/, 'the zoom level is not shown');
  ui.cleanup();
});

test('full (default): the labelled toolbar is unchanged and the map takes no focus', () => {
  const ui = mount({});
  assert.equal(ui.host.querySelectorAll('.uix-relationship-graph__toolbar button').length, 8);
  assert.equal(ui.host.querySelector('.uix-relationship-graph__controls'), null);
  assert.equal(ui.host.querySelector('.uix-relationship-graph__viewport').getAttribute('tabindex'), null);
  ui.cleanup();
});

test('none: no controls at all (HAR-1639 item 4)', () => {
  const ui = mount({ controls: 'none' });
  assert.equal(ui.host.querySelector('.uix-relationship-graph__toolbar'), null);
  assert.equal(ui.host.querySelector('.uix-relationship-graph__controls'), null);
  ui.cleanup();
});

test('initialView "fit" shows every item on load; "readable" keeps the 75 % floor', () => {
  const fit = mount({ controls: 'compact', initialView: 'fit' });
  const readable = mount({ controls: 'compact' });
  assert.ok(zoomOf(fit.host) < 0.75, `fit opened at ${zoomOf(fit.host)}`);
  assert.equal(zoomOf(readable.host), 0.75);
  fit.cleanup();
  readable.cleanup();
});

test('the map takes the keyboard: + and − zoom, 0 resets, arrows pan only on the map itself', () => {
  const ui = mount({ controls: 'compact', initialView: 'fit' });
  const viewport = ui.host.querySelector('.uix-relationship-graph__viewport');
  assert.equal(viewport.getAttribute('tabindex'), '0');
  assert.ok(viewport.getAttribute('aria-describedby'), 'the map does not describe its keys');
  const start = zoomOf(ui.host);
  key(viewport, '+');
  assert.ok(zoomOf(ui.host) > start, '+ did not zoom in');
  key(viewport, '0');
  assert.equal(zoomOf(ui.host), start, '0 did not return to the first view');
  key(viewport, '-');
  assert.ok(zoomOf(ui.host) < start, '− did not zoom out');

  const before = ui.host.querySelector('.uix-relationship-graph__stage').style.transform;
  key(viewport, 'ArrowLeft');
  assert.notEqual(ui.host.querySelector('.uix-relationship-graph__stage').style.transform, before, 'ArrowLeft on the map did not pan');
  // On an item, arrows still move between items (relationship-graph-dom.test.mjs) and never pan.
  const panned = ui.host.querySelector('.uix-relationship-graph__stage').style.transform;
  key(ui.host.querySelector('[data-node-id="root"]'), 'ArrowLeft');
  assert.equal(ui.host.querySelector('.uix-relationship-graph__stage').style.transform, panned, 'an arrow on an item panned the map');
  ui.cleanup();
});

test('a plain wheel scrolls the page and says how to zoom; Ctrl + wheel zooms', () => {
  const ui = mount({ controls: 'compact' });
  const viewport = ui.host.querySelector('.uix-relationship-graph__viewport');
  const start = zoomOf(ui.host);
  let plain;
  act(() => {
    plain = new dom.window.WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
    viewport.dispatchEvent(plain);
  });
  assert.equal(plain.defaultPrevented, false, 'a plain wheel was taken from the page');
  assert.equal(zoomOf(ui.host), start);
  assert.match(ui.host.querySelector('.uix-relationship-graph__toast')?.textContent ?? '', /Ctrl \+ scroll to zoom|⌘ \+ scroll to zoom/);
  act(() => {
    viewport.dispatchEvent(new dom.window.WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true }));
  });
  assert.ok(zoomOf(ui.host) > start, 'Ctrl + wheel did not zoom');
  ui.cleanup();
});

test('full screen covers the page, a plain wheel zooms there, and Escape leaves it', () => {
  const ui = mount({ controls: 'compact' });
  const section = ui.host.querySelector('.uix-relationship-graph');
  // Each control sits in its own tooltip trigger: pick the toggle by its place in the cluster.
  const toggle = () => Array.from(ui.host.querySelectorAll('.uix-relationship-graph__controls button')).at(-1);
  act(() => { toggle().click(); });
  assert.ok(section.classList.contains('uix-relationship-graph--fullscreen'));
  assert.equal(document.documentElement.style.overflow, 'hidden', 'the page behind still scrolls');
  assert.equal(toggle().getAttribute('aria-label'), 'Exit full screen');

  const viewport = ui.host.querySelector('.uix-relationship-graph__viewport');
  const start = zoomOf(ui.host);
  act(() => {
    viewport.dispatchEvent(new dom.window.WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
  });
  assert.ok(zoomOf(ui.host) > start, 'a plain wheel did not zoom in full screen');

  key(viewport, 'Escape');
  assert.ok(!section.classList.contains('uix-relationship-graph--fullscreen'), 'Escape did not leave full screen');
  assert.equal(document.documentElement.style.overflow, '', 'the page stayed locked');
  ui.cleanup();
});

// Batch follow-up (PR #166 review): Fit and the first view used the whole viewport height, so the
// bottom row went under the footer's band (hint, zoom level, controls). They now leave it free.
test('compact: Fit, the first view and Reset leave the footer band free', () => {
  const BAND = 120;
  const proto = dom.window.HTMLElement.prototype;
  const original = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
  Object.defineProperty(proto, 'offsetHeight', {
    configurable: true,
    get() { return this.classList.contains('uix-relationship-graph__footer') ? BAND : 0; },
  });
  try {
    const bottomOf = (host) => {
      const stage = host.querySelector('.uix-relationship-graph__stage');
      const [, y, zoom] = /translate\([-\d.]+px, ([-\d.]+)px\) scale\(([\d.]+)\)/.exec(stage.style.transform).map(Number);
      return y + parseFloat(stage.style.height) * zoom;
    };
    const fit = mount({ controls: 'compact', initialView: 'fit' });
    assert.ok(bottomOf(fit.host) <= 400 - BAND + 0.5, `the fitted graph ends at ${bottomOf(fit.host)}, under the band from ${400 - BAND}`);
    const viewport = fit.host.querySelector('.uix-relationship-graph__viewport');
    key(viewport, '+');
    key(viewport, '0');
    assert.ok(bottomOf(fit.host) <= 400 - BAND + 0.5, 'Reset returns to a view clear of the band');
    fit.cleanup();
    // the full toolbar has no footer: the whole height is the map's
    const full = mount({ controls: 'full', initialView: 'fit' });
    assert.ok(bottomOf(full.host) > 400 - BAND, 'without a footer nothing is reserved');
    full.cleanup();
  } finally {
    if (original) Object.defineProperty(proto, 'offsetHeight', original);
    else delete proto.offsetHeight;
  }
});
