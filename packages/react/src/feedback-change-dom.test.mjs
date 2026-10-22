/* HAR-2583, HAR-2585, HAR-2587 — showing that something changed (motion standard §2.5, §2.6,
 * §2.8): ChangeHighlight / useChangeHighlight flash only on a change after mount and restart on
 * the next one, and say what changed from a region that is not inert; Count ticks once per
 * change in its direction; useOptimisticValue shows a change at once and puts it back visibly
 * when the save fails. The look is measured in Chromium by tests/a11y/feedback-kit.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first. */
import test, { before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
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
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});
afterEach(() => mock.timers.reset());

const drain = () => new Promise((r) => setImmediate(r));
function mount() {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  return {
    host,
    render: (el) => act(async () => root.render(el)),
    unmount: async () => { await act(async () => root.unmount()); host.remove(); },
  };
}
const animationEnd = (el, target = el) => target.dispatchEvent(new window.Event('animationend', { bubbles: true }));

test('ChangeHighlight: never on the first render; a change flashes, the same value does not, a second change restarts', async () => {
  const { host, render, unmount } = mount();
  await render(h(ui.ChangeHighlight, { value: 'Open', 'data-testid': 'pill' }, 'Open'));
  const el = host.querySelector('.uix-change-highlight');
  assert.equal(el.tagName, 'SPAN');
  assert.equal(el.hasAttribute('data-uix-changed'), false, 'flashed on the first render');

  await render(h(ui.ChangeHighlight, { value: 'Open', 'data-testid': 'pill' }, 'Open'));
  assert.equal(el.hasAttribute('data-uix-changed'), false, 're-rendering the same value flashed');

  await render(h(ui.ChangeHighlight, { value: 'Resolved', 'data-testid': 'pill' }, 'Resolved'));
  assert.equal(el.hasAttribute('data-uix-changed'), true);
  assert.equal(host.querySelector('.uix-change-highlight'), el, 'the element was re-created');

  // a re-render with a new className keeps the flash (React never renders the attribute)
  await render(h(ui.ChangeHighlight, { value: 'Resolved', className: 'x' }, 'Resolved'));
  assert.equal(el.hasAttribute('data-uix-changed'), true);
  animationEnd(el);
  assert.equal(el.hasAttribute('data-uix-changed'), false, 'the flash outlived its animation');

  await render(h(ui.ChangeHighlight, { value: 'Closed', disabled: true }, 'Closed'));
  assert.equal(el.hasAttribute('data-uix-changed'), false, 'disabled still flashed');
  await unmount();
});

test('ChangeHighlight as a row tints its cells and clears when a cell animation ends; variant ring', async () => {
  const { host, render, unmount } = mount();
  const row = (value) => h('table', null, h('tbody', null, h(ui.ChangeHighlight, { as: 'tr', value }, h('td', null, value), h('td', null, 'P1'))));
  await render(row('Open'));
  await render(row('Resolved'));
  const tr = host.querySelector('tr');
  assert.ok(tr.classList.contains('uix-change-highlight'));
  assert.equal(tr.hasAttribute('data-uix-changed'), true);
  animationEnd(tr, tr.querySelector('td'));
  assert.equal(tr.hasAttribute('data-uix-changed'), false);
  await unmount();
  assert.match(renderToStaticMarkup(h(ui.ChangeHighlight, { value: 1, variant: 'ring' }, '1')), /class="uix-change-highlight uix-change-highlight--ring"/);
});

test('ChangeHighlight announce: said politely from the page, or from inside an open dialog', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const { host, render, unmount } = mount();
  await render(h('div', null,
    h(ui.ChangeHighlight, { value: 'Open', announce: 'Status changed to Open' }, 'Open'),
    h('dialog', { open: true }, h(ui.ChangeHighlight, { value: 1, announce: 'Priority changed to 1' }, '1'))));
  await render(h('div', null,
    h(ui.ChangeHighlight, { value: 'Resolved', announce: 'Status changed to Resolved by A. Novak' }, 'Resolved'),
    h('dialog', { open: true }, h(ui.ChangeHighlight, { value: 2, announce: 'Priority changed to 2' }, '2'))));
  const page = document.body.querySelector(':scope > [data-uix-announcer]');
  const inDialog = host.querySelector('dialog > [data-uix-announcer]');
  assert.equal(page.getAttribute('role'), 'status');
  assert.equal(page.textContent, '', 'filled at once: an unchanged region is not re-announced');
  mock.timers.tick(1);
  assert.equal(page.textContent, 'Status changed to Resolved by A. Novak');
  assert.equal(inDialog.textContent, 'Priority changed to 2', 'the dialog change was said from the inert body');
  ui.announcePolite('Status changed to Resolved by A. Novak');
  assert.equal(page.textContent, '', 'the same words again must clear first');
  mock.timers.tick(1);
  assert.equal(page.textContent, 'Status changed to Resolved by A. Novak');
  await unmount();
});

test('Count: no tick on the first render; one tick per change, in its direction; formatted', async () => {
  const { host, render, unmount } = mount();
  await render(h(ui.Count, { value: 9 }));
  const el = host.querySelector('.uix-count');
  assert.equal(el.textContent, '9');
  assert.equal(el.getAttribute('data-uix-tick'), null);
  await render(h(ui.Count, { value: 12 }));
  assert.equal(el.getAttribute('data-uix-tick'), 'up');
  el.dispatchEvent(new window.Event('animationend', { bubbles: true }));
  assert.equal(el.getAttribute('data-uix-tick'), null);
  await render(h(ui.Count, { value: 3 }));
  assert.equal(el.getAttribute('data-uix-tick'), 'down');
  await render(h(ui.Count, { value: 3 }));
  assert.equal(el.getAttribute('data-uix-tick'), 'down', 'a re-render without a change re-ticked');
  await render(h(ui.Count, { value: 120, format: (n) => (n > 99 ? '99+' : String(n)) }));
  assert.equal(el.textContent, '99+');
  await unmount();
});

function Optimistic({ server, commit, onRollback, expose: out }) {
  const opt = ui.useOptimisticValue(server, commit, { onRollback });
  out.current = opt;
  return h('output', null, String(opt.value));
}

test('useOptimisticValue: shows at once; keeps a saved change until the server moves; a failure comes back visibly', async () => {
  const { host, render, unmount } = mount();
  const out = { current: null };
  const rollbacks = [];
  let settle;
  const commit = () => new Promise((resolve, reject) => { settle = { resolve, reject }; });
  const tree = (server) => h(Optimistic, { server, commit, onRollback: (r) => rollbacks.push(r), expose: out });
  const shown = () => host.querySelector('output').textContent;

  await render(tree(false));
  let done;
  await act(async () => { done = out.current.set(true); });
  assert.equal(shown(), 'true', 'not shown at once');
  assert.equal(out.current.pending, true);
  await act(async () => { settle.resolve(); await done; });
  assert.equal(out.current.pending, false);
  assert.equal(shown(), 'true', 'flipped back to the stale server value after saving');
  assert.equal(out.current.rollbacks, 0);
  await render(tree(true));
  assert.equal(shown(), 'true');

  await act(async () => { done = out.current.set(false); });
  assert.equal(shown(), 'false');
  await act(async () => { settle.reject(new Error('offline')); await done; });
  assert.equal(shown(), 'true', 'the failed change stayed on screen');
  assert.equal(out.current.rollbacks, 1);
  assert.deepEqual({ ...out.current.rollback, error: out.current.rollback.error.message }, { attempted: false, restored: true, error: 'offline' });
  assert.equal(rollbacks.length, 1);
  await unmount();
});

test('useOptimisticValue: overlapping changes — only the latest outcome counts; a failure restores the latest server value', async () => {
  const { host, render, unmount } = mount();
  const out = { current: null };
  const calls = [];
  const commit = (next) => new Promise((resolve, reject) => { calls.push({ next, resolve, reject }); });
  const tree = (server) => h(Optimistic, { server, commit, expose: out });
  const shown = () => host.querySelector('output').textContent;

  await render(tree(1));
  let first;
  let second;
  await act(async () => { first = out.current.set(2); });
  await act(async () => { second = out.current.set(3); });
  await act(async () => { calls[1].resolve(); await second; });
  await act(async () => { calls[0].reject(new Error('late')); await first; });
  assert.equal(shown(), '3', 'an older failure overrode a newer success');
  assert.equal(out.current.rollbacks, 0);

  // the server moves while a change is in flight; the change fails: the newest server value returns
  let third;
  await act(async () => { third = out.current.set(4); });
  await render(tree(7));
  assert.equal(shown(), '4', 'a server update overwrote the pending change');
  await act(async () => { calls[2].reject(new Error('no')); await third; });
  assert.equal(shown(), '7');
  assert.equal(out.current.rollbacks, 1);
  await drain();
  await unmount();
});
