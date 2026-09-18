/* TabPanel keepMounted (RX-21 / HAR-364; finding LD-16) in jsdom.
 *
 * `TabPanel` unmounted every inactive panel (`if (ctx.value !== value) return null`), so
 * revisiting a tab threw away whatever the panel had done — a loaded list, a half-typed
 * form, a scroll position — and paid for it again. `keepMounted` keeps the node in the DOM
 * with the `hidden` attribute instead, which is what "tabs that keep content" means.
 *
 * DOM, not markup: unmount-on-switch is only observable across renders, so this drives a
 * real root through two switches and watches the same node and its state survive. Default
 * (unmounting) behaviour is asserted alongside it, because keepMounted must stay opt-in —
 * a panel that mounts eagerly by default would change every existing consumer's cost.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 * Run: node --test (from packages/react), or npm test -w @tensor_1/react.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, useState, act } from 'react';

let dom;
let createRoot;
let Tabs;
let Tab;
let TabPanel;

/* `globalThis.navigator` is a getter in Node 22+, so plain assignment throws. */
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ({ Tabs, Tab, TabPanel } = await import('../dist/index.js'));
});

after(() => {
  // a jsdom window left open keeps its timers and this process alive
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

/** A panel body that owns state, so "the node survived" and "its state survived" differ. */
function Counter({ id }) {
  const [n, setN] = useState(0);
  return h('button', { type: 'button', 'data-counter': id, onClick: () => setN((v) => v + 1) }, String(n));
}

/** Mounts a two-tab widget and returns handles plus a `select` that re-renders it. */
function mount({ keepMounted }) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);

  const render = (value) => act(() => {
    root.render(
      h(Tabs, { value, onChange: () => {} },
        h(Tab, { key: 'a', value: 'a' }, 'Alpha'),
        h(Tab, { key: 'b', value: 'b' }, 'Beta'),
        h(TabPanel, { key: 'pa', value: 'a', keepMounted }, h(Counter, { id: 'a' })),
        h(TabPanel, { key: 'pb', value: 'b', keepMounted }, h(Counter, { id: 'b' })),
      ),
    );
  });

  render('a');
  return {
    host,
    select: render,
    panel: (value) => host.querySelector(`[role="tabpanel"][id$="-panel-${value}"]`),
    counter: (id) => host.querySelector(`[data-counter="${id}"]`),
    cleanup: () => act(() => root.unmount()),
  };
}

test('keepMounted: the panel node and its state survive two tab switches, hidden while inactive', () => {
  const ui = mount({ keepMounted: true });

  const panelA = ui.panel('a');
  assert.ok(panelA, 'panel A did not render');
  assert.equal(panelA.hasAttribute('hidden'), false, 'the selected panel must not be hidden');

  // do something a user would not want to lose
  act(() => ui.counter('a').click());
  act(() => ui.counter('a').click());
  assert.equal(ui.counter('a').textContent, '2');

  // switch away — the node stays, hidden, and is not exposed to assistive tech
  ui.select('b');
  assert.equal(ui.panel('a'), panelA, 'panel A was replaced instead of kept');
  assert.equal(panelA.hasAttribute('hidden'), true, 'an inactive keepMounted panel must be hidden');
  assert.ok(ui.panel('b'), 'panel B did not render');
  assert.equal(ui.panel('b').hasAttribute('hidden'), false);

  // and back: same node, same state, two switches later
  ui.select('a');
  assert.equal(ui.panel('a'), panelA, 'panel A was remounted on return');
  assert.equal(panelA.hasAttribute('hidden'), false);
  assert.equal(ui.counter('a').textContent, '2', 'the panel lost its state across the switches');
  assert.equal(ui.panel('b').hasAttribute('hidden'), true);

  ui.cleanup();
});

test('keepMounted stays opt-in: by default an inactive panel is not in the DOM at all', () => {
  const ui = mount({ keepMounted: undefined });

  assert.ok(ui.panel('a'), 'panel A did not render');
  assert.equal(ui.panel('b'), null, 'the default must not mount the inactive panel');

  act(() => ui.counter('a').click());
  assert.equal(ui.counter('a').textContent, '1');

  ui.select('b');
  assert.equal(ui.panel('a'), null, 'the default must unmount the panel that was left');
  ui.select('a');
  assert.equal(ui.counter('a').textContent, '0', 'the default remounts, so state is expected to reset');

  ui.cleanup();
});

test('a hidden keepMounted panel is out of the tab order and out of the a11y tree', () => {
  const ui = mount({ keepMounted: true });
  ui.select('b');

  const hidden = ui.panel('a');
  assert.equal(hidden.hasAttribute('hidden'), true);
  // base.css restores `display: none` for [hidden], so the browser takes it out of the tree;
  // the panel's own tabIndex={0} must not remain a tab stop in jsdom's flat DOM either
  assert.equal(hidden.getAttribute('tabindex'), '-1', 'a hidden panel must not be a tab stop');
  assert.equal(ui.panel('b').getAttribute('tabindex'), '0', 'the visible panel keeps its tab stop');

  ui.cleanup();
});
