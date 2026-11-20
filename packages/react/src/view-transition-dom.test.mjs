/* useViewTransition in jsdom, against a stand-in View Transitions API: when it animates and when
 * the update simply runs (no API, reduced motion, a key press), the names it gives the parts and
 * takes back, a second start ending the first, an element-scoped start, an unmount mid-morph and
 * an update that throws; then the two surfaces that use it (DataWorkspace's Maximize from the
 * pointer and from Escape, DashboardCanvas's arrow keys). jsdom has no rendering: the morph itself
 * is measured in Chromium, Firefox and WebKit by tests/a11y/view-transition.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useRef, useState } from 'react';
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

/** Every element that carries a view-transition-name right now: [id, name, class]. */
const named = () => [...document.querySelectorAll('[style]')]
  .filter((el) => el.style.getPropertyValue('view-transition-name'))
  .map((el) => [el.id, el.style.getPropertyValue('view-transition-name'), el.style.getPropertyValue('view-transition-class')]);

/**
 * A stand-in for `startViewTransition` on `target`: records the names at the old picture (the
 * call) and at the new one (after the update), runs the update in a microtask like the browser,
 * and ends when the test calls `end()` (or at once with `auto`).
 */
let started = [];
function install(target, { auto = false } = {}) {
  target.startViewTransition = function startViewTransition(update) {
    let finish;
    const finished = new Promise((resolve) => { finish = resolve; });
    const t = {
      on: this, before: named(), after: null, skipped: false, attr: this === document ? document.documentElement.hasAttribute('data-uix-view-transition') : this.hasAttribute('data-uix-view-transition'),
      finished,
      skipTransition() { t.skipped = true; finish(); },
      end: () => finish(),
    };
    t.updateCallbackDone = Promise.resolve().then(() => update()).then(() => { t.after = named(); if (auto) finish(); });
    t.ready = t.updateCallbackDone;
    started.push(t);
    return t;
  };
}
const uninstall = (target) => { delete target.startViewTransition; };
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
const pointerDown = () => document.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
const keyDown = (key = 'Enter') => document.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));

beforeEach(() => {
  started = [];
  uninstall(document);
  document.documentElement.removeAttribute('data-motion');
  document.documentElement.removeAttribute('data-uix-view-transition');
  pointerDown();
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, root, unmount: () => { act(() => root.unmount()); host.remove(); } };
};

/** A list row that opens into its detail: the hook alone, one key across two elements. */
function Records({ api, options = {}, ownName }) {
  const start = ui.useViewTransition();
  const [open, setOpen] = useState(false);
  const row = useRef(null);
  const panel = useRef(null);
  api.go = (next, extra = {}) => start(() => setOpen(next), {
    parts: () => [['record', panel.current ?? row.current]], ...options, ...extra,
  });
  return open
    ? h('div', { ref: (el) => { panel.current = el; if (el && ownName) el.style.setProperty('view-transition-name', ownName); }, id: 'detail' }, 'Detail')
    : h('div', { id: 'list' }, h('div', { ref: row, id: 'row' }, 'Row'));
}

test('exports: the hook, the support check and the two names it writes', () => {
  assert.equal(typeof ui.useViewTransition, 'function');
  assert.equal(typeof ui.viewTransitionSupported, 'function');
  assert.equal(ui.VIEW_TRANSITION_ATTR, 'data-uix-view-transition');
  assert.equal(ui.VIEW_TRANSITION_CLASS, 'uix-morph');
});

test('server render: the hook renders nothing and starts nothing', () => {
  const api = {};
  assert.match(renderToStaticMarkup(h(Records, { api })), /id="row"/);
});

test('no View Transitions API: the update runs at once, nothing is named, the result says so', async () => {
  const api = {};
  const t = mount(h(Records, { api }));
  assert.equal(ui.viewTransitionSupported(), false);
  let result;
  act(() => { result = api.go(true); });
  assert.equal(result.animated, false);
  assert.ok(t.host.querySelector('#detail'), 'the update ran in the same task');
  assert.deepEqual(named().filter(([id]) => id !== 'detail'), []);
  assert.equal(document.documentElement.hasAttribute('data-uix-view-transition'), false);
  await result.updated;
  await result.finished;
  t.unmount();
});

test('a pointer change morphs: the row is named for the old picture, the detail for the new, both are given back', async () => {
  install(document);
  const api = {};
  const t = mount(h(Records, { api, ownName: 'product-own' }));
  assert.equal(ui.viewTransitionSupported(), true);
  pointerDown();
  let result;
  act(() => { result = api.go(true); });
  assert.equal(result.animated, true);
  assert.equal(started.length, 1);
  const [vt] = started;
  assert.equal(vt.on, document, 'a document transition without a scope');
  assert.equal(vt.attr, true, 'the root is marked before the old picture');
  assert.equal(vt.before.length, 1);
  const [id, name, cls] = vt.before[0];
  assert.equal(id, 'row');
  assert.match(name, /^uix-vt-\d+-0$/);
  assert.equal(cls, 'uix-morph');
  assert.equal(t.host.querySelector('#detail'), null, 'the update waits for the old picture');
  await act(async () => { await result.updated; });
  assert.ok(t.host.querySelector('#detail'), 'flushSync committed the update inside the callback');
  assert.deepEqual(vt.after, [['detail', name, 'uix-morph']], 'the same key, the same name, on the new element');
  vt.end();
  await act(async () => { await result.finished; });
  assert.deepEqual(named(), [['detail', 'product-own', '']], 'the product\'s own name comes back');
  assert.equal(document.documentElement.hasAttribute('data-uix-view-transition'), false);
  t.unmount();
});

test('className adds the product\'s own view-transition-class beside uix-morph', async () => {
  install(document, { auto: true });
  const api = {};
  const t = mount(h(Records, { api, options: { className: 'record' } }));
  pointerDown();
  let result;
  act(() => { result = api.go(true); });
  assert.equal(started[0].before[0][2], 'uix-morph record');
  await act(async () => { await result.finished; });
  t.unmount();
});

test('reduced motion (the OS or data-motion="reduce") and a key press run the update at once', async () => {
  install(document);
  const api = {};
  const t = mount(h(Records, { api }));
  document.documentElement.setAttribute('data-motion', 'reduce');
  let result;
  act(() => { result = api.go(true); });
  assert.equal(result.animated, false);
  assert.equal(started.length, 0, 'reduced motion: no transition');
  assert.ok(t.host.querySelector('#detail'));
  document.documentElement.removeAttribute('data-motion');
  const mql = window.matchMedia;
  window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {} });
  expose('matchMedia', window.matchMedia);
  act(() => { result = api.go(false); });
  assert.equal(result.animated, false, 'the OS setting');
  window.matchMedia = mql;
  delete globalThis.matchMedia;
  keyDown('Enter');
  act(() => { result = api.go(true); });
  assert.equal(result.animated, false, 'a key press is the fast path');
  assert.equal(started.length, 0);
  keyDown('Shift');
  pointerDown();
  keyDown('Shift');
  act(() => { result = api.go(false); });
  assert.equal(result.animated, true, 'a lone modifier is not a key press; the pointer was last');
  started[0].end();
  await act(async () => { await result.finished; });
  t.unmount();
});

test('a second start ends the running one: its names go, the new one names the current state', async () => {
  install(document);
  const api = {};
  const t = mount(h(Records, { api }));
  pointerDown();
  let first;
  let second;
  act(() => { first = api.go(true); });
  await act(async () => { await first.updated; });
  act(() => { second = api.go(false); });
  assert.equal(started[0].skipped, true, 'the first transition is skipped');
  assert.equal(started.length, 2);
  assert.deepEqual(started[1].before.map(([id]) => id), ['detail'], 'the detail is the one old picture; no duplicate name');
  assert.equal(document.documentElement.hasAttribute('data-uix-view-transition'), true, 'the root stays marked for the second');
  await act(async () => { await second.updated; });
  assert.ok(t.host.querySelector('#row'));
  started[1].end();
  await act(async () => { await Promise.all([first.finished, second.finished]); });
  assert.deepEqual(named(), []);
  assert.equal(document.documentElement.hasAttribute('data-uix-view-transition'), false);
  t.unmount();
});

test('a start that lands before the first one\'s update still commits both, naming only the newer', async () => {
  install(document);
  const api = {};
  const t = mount(h(Records, { api }));
  pointerDown();
  let first;
  let second;
  act(() => { first = api.go(true); second = api.go(false); });
  await act(async () => { await Promise.all([first.updated, second.updated]); });
  const firstName = started[0].before[0][1];
  assert.ok(![...started[0].after, ...started[1].after].some(([, name]) => name === firstName), 'the ended transition names nothing after its update');
  assert.deepEqual(started[1].after.map(([id, name]) => [id, name]), [['row', started[1].before[0][1]]], 'one part, under the newer name');
  assert.ok(t.host.querySelector('#row'), 'the last update wins');
  started[1].end();
  await act(async () => { await second.finished; });
  assert.deepEqual(named(), []);
  t.unmount();
});

test('scope: an element with its own startViewTransition runs it there and is the one marked', async () => {
  install(document);
  const api = {};
  const t = mount(h(Records, { api }));
  const scope = t.host;
  install(scope, { auto: true });
  pointerDown();
  let result;
  act(() => { result = api.go(true, { scope }); });
  assert.equal(started[0].on, scope);
  assert.equal(started[0].attr, true);
  assert.equal(document.documentElement.hasAttribute('data-uix-view-transition'), false, 'the document is not involved');
  await act(async () => { await result.finished; });
  assert.equal(scope.hasAttribute('data-uix-view-transition'), false);
  uninstall(scope);
  act(() => { result = api.go(false, { scope }); });
  assert.equal(started[1].on, document, 'a scope without the method falls back to the document');
  started[1].end();
  await act(async () => { await result.finished; });
  t.unmount();
});

test('one element under two keys is named once (a duplicate name would abort the transition)', async () => {
  install(document, { auto: true });
  const api = {};
  const t = mount(h(Records, { api }));
  pointerDown();
  let result;
  act(() => { result = api.go(true, { parts: () => [['a', t.host.querySelector('#row')], ['b', t.host.querySelector('#row')], ['c', null]] }); });
  assert.equal(started[0].before.length, 1);
  await act(async () => { await result.finished; });
  t.unmount();
});

test('unmounting mid-morph ends it and gives the names back', async () => {
  install(document);
  const api = {};
  const t = mount(h(Records, { api }));
  pointerDown();
  act(() => { api.go(true); });
  assert.equal(named().length, 1);
  t.unmount();
  assert.equal(started[0].skipped, true);
  assert.deepEqual(named(), []);
  assert.equal(document.documentElement.hasAttribute('data-uix-view-transition'), false);
  await flush();
});

test('an update that throws is reported, not swallowed, and the names still go', async () => {
  install(document);
  const reported = [];
  const before = globalThis.reportError;
  globalThis.reportError = (error) => reported.push(error);
  function Thrower({ api }) {
    const start = ui.useViewTransition();
    const el = useRef(null);
    api.go = () => start(() => { throw new Error('boom'); }, { parts: () => [['x', el.current]] });
    return h('div', { ref: el, id: 'x' });
  }
  const api = {};
  const t = mount(h(Thrower, { api }));
  pointerDown();
  let result;
  act(() => { result = api.go(); });
  await act(async () => { await result.updated; });
  assert.equal(reported.length, 1);
  assert.equal(reported[0].message, 'boom');
  started[0].end();
  await act(async () => { await result.finished; });
  assert.deepEqual(named(), []);
  globalThis.reportError = before;
  t.unmount();
});

test('an engine that refuses the call: the update still runs exactly once, nothing is left marked', async () => {
  function Counter({ api }) {
    const start = ui.useViewTransition();
    const [n, setN] = useState(0);
    const el = useRef(null);
    api.go = () => start(() => { api.calls = (api.calls ?? 0) + 1; setN((v) => v + 1); }, { parts: () => [['c', el.current]] });
    return h('div', { ref: el, id: 'count' }, String(n));
  }
  for (const engine of ['throws before the callback', 'runs the callback, then throws']) {
    document.startViewTransition = (update) => {
      if (engine !== 'throws before the callback') update();
      throw new DOMException('refused', 'InvalidStateError');
    };
    const api = {};
    const t = mount(h(Counter, { api }));
    pointerDown();
    let result;
    act(() => { result = api.go(); });
    assert.equal(api.calls, 1, `${engine}: one update`);
    assert.equal(result.animated, false);
    assert.equal(t.host.querySelector('#count').textContent, '1');
    assert.deepEqual(named(), [], `${engine}: no name left`);
    assert.equal(document.documentElement.hasAttribute('data-uix-view-transition'), false);
    t.unmount();
  }
  uninstall(document);
});

/* ── the surfaces ─────────────────────────────────────────────────────────────────────────── */

const ROWS = [{ id: 'INC-1', title: 'Eins' }, { id: 'INC-2', title: 'Zwei' }];
const COLUMNS = [{ id: 'title', header: 'Title', cell: (r) => r.title }];
function Workspace({ log }) {
  const [maximized, setMaximized] = useState(false);
  return h(ui.DataWorkspace, {
    label: 'Störungen', rows: ROWS, getRowId: (r) => r.id, columns: COLUMNS,
    maximized, onMaximizedChange: (m) => { log.push(m); setMaximized(m); },
  });
}
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })));
const maximizeItem = (host) => {
  click(host.querySelector('.uix-toolbar__more'));
  return [...host.querySelectorAll('[role="menuitemcheckbox"]')].find((el) => el.textContent.trim() === 'Maximize');
};

test('DataWorkspace: Maximize from the pointer morphs the workspace; Escape restores at once', async () => {
  install(document);
  const log = [];
  const t = mount(h(Workspace, { log }));
  pointerDown();
  const item = maximizeItem(t.host);
  pointerDown();
  click(item);
  assert.equal(started.length, 1, 'one transition');
  assert.equal(started[0].before.length, 1);
  assert.ok(started[0].before[0][1].startsWith('uix-vt-'));
  assert.ok(t.host.querySelector('.uix-data-workspace').style.getPropertyValue('view-transition-name'), 'the workspace is the part');
  await act(async () => { await started[0].updateCallbackDone; });
  assert.deepEqual(log, [true]);
  assert.ok(t.host.querySelector('.uix-data-workspace--maximized'));
  assert.equal(started[0].after.length, 1, 'named again for the new picture');
  started[0].end();
  await flush();
  assert.deepEqual(named(), []);
  act(() => keyDown('Escape'));
  assert.deepEqual(log, [true, false], 'Escape restores');
  assert.equal(started.length, 1, 'Escape is instant: no second transition');
  t.unmount();
});

test('DataWorkspace: Maximize picked from the keyboard is instant', () => {
  install(document);
  const log = [];
  const t = mount(h(Workspace, { log }));
  const item = maximizeItem(t.host);
  keyDown('Enter');
  click(item);
  assert.deepEqual(log, [true]);
  assert.equal(started.length, 0);
  t.unmount();
});

test('DashboardCanvas: an arrow-key step never starts a transition', () => {
  install(document);
  install(window.Element.prototype);
  const items = [{ id: 'a', col: 0, row: 0, w: 4, h: 2 }, { id: 'b', col: 4, row: 0, w: 4, h: 2 }];
  const log = [];
  function Canvas() {
    const [layout, setLayout] = useState(items);
    return h(ui.DashboardCanvas, { items: layout, editable: true, renderItem: (i) => h('div', null, i.id), onLayoutChange: (next) => { log.push(next); setLayout(next); } });
  }
  const t = mount(h(Canvas));
  const handle = t.host.querySelector('.uix-dashboard-canvas__move');
  handle.focus();
  act(() => handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })));
  assert.equal(log.length, 1, 'the step landed');
  assert.equal(started.length, 0);
  uninstall(window.Element.prototype);
  t.unmount();
});
