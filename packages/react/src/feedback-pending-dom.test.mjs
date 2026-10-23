/* HAR-2580..2582 — the latency ladder in the kit (motion standard §2.3, §2.5): nothing new for
 * 300 ms, then a pending indicator held at least 500 ms; a Button's result for 1.5 s, announced;
 * a refetch keeps its content under a busy bar. Node's mock clock drives every timer (and Date,
 * which useDelayedPending reads). The look (spinner, crossfade, dim, bar) is measured in
 * Chromium by tests/a11y/feedback-kit.spec.mjs. Renders the BUILT dist — run `npm run build`. */
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

const clock = () => mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
const drain = () => new Promise((r) => setImmediate(r));
const advance = (ms) => act(async () => { await drain(); mock.timers.tick(ms); await drain(); });

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

function Probe({ pending, delay, minVisible }) {
  const shown = ui.useDelayedPending(pending, { delay, minVisible });
  return h('output', null, shown ? 'shown' : 'hidden');
}

test('the timing constants are the latency ladder', () => {
  assert.equal(ui.PENDING_DELAY_MS, 300);
  assert.equal(ui.PENDING_MIN_VISIBLE_MS, 500);
  assert.equal(ui.RESULT_HOLD_MS, 1500);
});

test('useDelayedPending: work under 300 ms never shows; slower work shows at 300 ms and holds to 800 ms', async () => {
  clock();
  const { host, render, unmount } = mount();
  const out = () => host.querySelector('output').textContent;

  await render(h(Probe, { pending: true }));
  assert.equal(out(), 'hidden');
  await advance(250);
  await render(h(Probe, { pending: false }));
  await advance(1000);
  assert.equal(out(), 'hidden', 'a 250 ms action flashed the indicator');

  await render(h(Probe, { pending: true }));
  await advance(299);
  assert.equal(out(), 'hidden');
  await advance(1);
  assert.equal(out(), 'shown', 'shown at 300 ms');
  await advance(100);
  await render(h(Probe, { pending: false }));
  assert.equal(out(), 'shown', 'hidden 100 ms after it appeared');
  await advance(399);
  assert.equal(out(), 'shown');
  await advance(1);
  assert.equal(out(), 'hidden', 'held exactly 500 ms');

  // pending again during the hold keeps it up without a gap
  await render(h(Probe, { pending: true }));
  await advance(400);
  await render(h(Probe, { pending: false }));
  await advance(200);
  await render(h(Probe, { pending: true }));
  await advance(1000);
  assert.equal(out(), 'shown');
  await unmount();
});

test('useDelayedPending: delay 0 shows on the first render; nothing is shown on the server', async () => {
  assert.match(renderToStaticMarkup(h(Probe, { pending: true })), />hidden</);
  assert.match(renderToStaticMarkup(h(Probe, { pending: true, delay: 0 })), />shown</);
});

test('Button loading: blocks presses at once, looks the same for 300 ms, then the spinner holds 500 ms', async () => {
  clock();
  const { host, render, unmount } = mount();
  let clicks = 0;
  const btn = (loading) => h(ui.Button, { variant: 'primary', loading, onClick: () => { clicks += 1; } }, 'Save');
  await render(btn(false));
  const button = host.querySelector('button');
  assert.equal(button.getAttribute('aria-busy'), null);
  assert.equal(button.querySelector('[data-uix-btn-busy]'), null);

  await render(btn(true));
  assert.equal(host.querySelector('button'), button, 'the button element was re-created (focus would be lost)');
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal(button.getAttribute('aria-disabled'), 'true');
  assert.ok(button.hasAttribute('data-pending'));
  assert.equal(button.hasAttribute('data-loading'), false, 'data-loading shows the spinner at once');
  assert.equal(button.querySelector('[data-uix-btn-busy]'), null, 'spinner before 300 ms');
  await act(async () => button.click());
  assert.equal(clicks, 0, 'a press went through while loading');

  await advance(300);
  assert.ok(button.querySelector(':scope > [data-uix-btn-busy]'), 'no spinner marker at 300 ms');
  await render(btn(false));
  assert.ok(button.querySelector('[data-uix-btn-busy]'), 'the spinner dropped before its 500 ms');
  await advance(500);
  assert.equal(button.querySelector('[data-uix-btn-busy]'), null);
  assert.equal(button.textContent, 'Save');
  await unmount();
});

test('Button loadingDelay 0 shows the spinner at once; a Button without loading or result renders as before', async () => {
  clock();
  const { host, render, unmount } = mount();
  await render(h(ui.Button, { loading: true, loadingDelay: 0 }, 'Save'));
  assert.ok(host.querySelector('button > [data-uix-btn-busy]'));
  await unmount();
  assert.equal(renderToStaticMarkup(h(ui.Button, null, 'Save')), '<button class="uix-btn uix-btn--secondary">Save</button>');
});

test('Button result: never on the first render; after an action it crossfades, announces and returns after 1.5 s', async () => {
  clock();
  const { host, render, unmount } = mount();
  const btn = (loading, result, labels) => h(ui.Button, { loading, result, resultLabels: labels }, 'Assign');
  await render(btn(false, 'success'));
  const button = host.querySelector('button');
  const face = () => button.querySelector('.uix-btn__face');
  const status = () => document.body.querySelector(':scope > [role="status"]');
  assert.equal(face().getAttribute('data-result'), null, 'a result showed on the first render');
  assert.ok(status(), 'the live region must exist before it speaks');
  assert.equal(status().textContent, '');
  assert.equal(button.querySelector('[role="status"]'), null, 'a status inside the button becomes part of its name');
  assert.equal(button.textContent.includes('Assign'), true);

  // a fast action: no spinner, the result at once
  await render(btn(true, null));
  await advance(120);
  await render(btn(false, 'success', { success: 'Assigned' }));
  assert.equal(face().getAttribute('data-result'), 'success');
  assert.equal(status().textContent, 'Assigned');
  assert.equal(button.querySelectorAll('.uix-btn__result').length, 2, 'both wordings stay in the grid cell (stable width)');
  await advance(1499);
  assert.equal(face().getAttribute('data-result'), 'success');
  await advance(1);
  assert.equal(face().getAttribute('data-result'), null);
  assert.equal(status().textContent, '');

  // a slow action that fails: the error waits for the spinner's minimum time (tick to the
  // timer, then past it: the mock clock reads the end of a tick inside the timers it runs)
  await render(btn(true, null));
  await advance(300);
  await advance(100);
  await render(btn(false, 'error'));
  assert.equal(face().getAttribute('data-result'), null, 'the result showed over the spinner');
  await advance(400);
  assert.equal(face().getAttribute('data-result'), 'error');
  assert.equal(status().textContent, 'Failed');
  await unmount();
});

test('Button result inside a dialog announces from the dialog, not the inert body', async () => {
  clock();
  const { host, render, unmount } = mount();
  const tree = (result) => h('dialog', { open: true }, h(ui.Button, { result }, 'Save'));
  await render(tree(null));
  await render(tree('success'));
  const dialog = host.querySelector('dialog');
  assert.equal(dialog.querySelector(':scope > [role="status"]')?.textContent, 'Done');
  await unmount();
});

test('Button result labels come from UixLabelsProvider buttonResult', async () => {
  clock();
  const { render, unmount } = mount();
  const tree = (result) => h(ui.UixLabelsProvider, { labels: { buttonResult: { success: 'Gespeichert' } } }, h(ui.Button, { result }, 'Speichern'));
  await render(tree(null));
  await render(tree('success'));
  assert.equal(document.body.querySelector(':scope > [role="status"]').textContent, 'Gespeichert');
  await unmount();
});

test('SaveStatus: a fast save goes straight to Saved; a slow one says Saving… from 300 ms for at least 500 ms', async () => {
  clock();
  const { host, render, unmount } = mount();
  const state = () => host.querySelector('.uix-save-status').getAttribute('data-state');
  const text = () => host.querySelector('[aria-live="polite"]').textContent;
  await render(h(ui.SaveStatus, { state: 'idle' }));
  await render(h(ui.SaveStatus, { state: 'saving' }));
  assert.equal(state(), 'idle');
  await advance(200);
  await render(h(ui.SaveStatus, { state: 'saved' }));
  assert.equal(text(), 'Saved');

  await render(h(ui.SaveStatus, { state: 'saving' }));
  assert.equal(text(), 'Saved', 'an earlier Saved stays through the quiet window');
  await advance(300);
  assert.equal(text(), 'Saving…');
  await advance(50);
  await render(h(ui.SaveStatus, { state: 'failed', onRetry: () => {} }));
  assert.equal(text(), 'Saving…', 'Saving… flickered off');
  await advance(450);
  assert.equal(text(), 'Could not save');
  assert.ok(host.querySelector('.uix-save-status__retry'));

  await render(h(ui.SaveStatus, { state: 'saving', onRetry: () => {} }));
  assert.equal(host.querySelector('.uix-save-status__retry'), null, 'the retry stayed while retrying');
  assert.equal(text(), '');
  await unmount();
});

test('Spinner and LoadingState delay: nothing until 300 ms, then the announced loader', async () => {
  clock();
  const { host, render, unmount } = mount();
  await render(h('div', null, h(ui.Spinner, { delay: true, label: 'Loading queue' }), h(ui.LoadingState, { delay: 300, rows: 2 })));
  assert.equal(host.querySelector('[role="status"]'), null);
  await advance(300);
  const regions = host.querySelectorAll('[role="status"]');
  assert.equal(regions.length, 2);
  assert.equal(regions[0].textContent, 'Loading queue');
  assert.equal(host.querySelectorAll('.uix-skeleton').length, 2);
  await unmount();
  assert.match(renderToStaticMarkup(h(ui.Spinner)), /class="uix-spinner"/, 'a Spinner without delay still renders at once');
});

test('BusyRegion and TableWrap refreshing keep the content, set aria-busy at once and show the bar after 300 ms', async () => {
  clock();
  const { host, render, unmount } = mount();
  const tree = (busy) => h('div', null,
    h(ui.BusyRegion, { busy, 'data-testid': 'region' }, h('ul', null, h('li', null, 'INC-1'))),
    h(ui.TableWrap, { refreshing: busy }, h(ui.Table, null, h('tbody', null, h('tr', null, h('td', null, 'INC-1'))))));
  await render(tree(false));
  const region = host.querySelector('.uix-busy-region');
  const wrap = host.querySelector('.uix-table-wrap');
  assert.equal(region.getAttribute('aria-busy'), null);
  assert.equal(region.querySelector(':scope > .uix-busy-bar').getAttribute('aria-hidden'), 'true');

  await render(tree(true));
  assert.equal(region.getAttribute('aria-busy'), 'true');
  assert.equal(wrap.getAttribute('aria-busy'), 'true');
  assert.equal(region.querySelector('li').textContent, 'INC-1', 'the content was swapped out');
  assert.equal(host.querySelectorAll('.uix-busy-bar[data-shown]').length, 0);
  await advance(300);
  assert.equal(host.querySelectorAll('.uix-busy-bar[data-shown]').length, 2);
  await render(tree(false));
  assert.equal(region.getAttribute('aria-busy'), null);
  await advance(500);
  assert.equal(host.querySelectorAll('.uix-busy-bar[data-shown]').length, 0);
  await unmount();

  assert.doesNotMatch(renderToStaticMarkup(h(ui.TableWrap, null, 'x')), /uix-busy-bar/, 'a TableWrap without refreshing gained a bar');
});
