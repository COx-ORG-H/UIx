/* A dialog that mounts open stays open under StrictMode (TENSOR HAR-882) in jsdom.
 *
 * Browsers QUEUE the `close` event: `dialog.close()` hides the dialog now and fires `close` in a
 * later task. StrictMode runs every effect as mount → cleanup → mount, so useDialog's cleanup
 * calls close() and the re-run calls showModal() and adds a fresh `close` listener before the
 * queued event fires. That stale event then reached the NEW listener, which released the scroll
 * lock and called onClose — a Drawer/Modal/Peek mounted open closed itself ~25 ms later in dev.
 * The same happens whenever `open` goes true → false → true inside one task.
 * - a stale close (its dialog is open again) → no onClose, the dialog stays open, the lock holds;
 * - a genuine close (Escape, or close() on the open dialog) → onClose once, the lock is released.
 *
 * jsdom has no modal API, so the dialog model below queues `close` with setTimeout(0) as the
 * spec does. Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, StrictMode } from 'react';

let dom;
let createRoot;
let ui;
const calls = { showModal: 0, close: 0 };

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window)); // useDialog's scroll lock
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const proto = dom.window.HTMLDialogElement.prototype;
  proto.showModal = function () {
    calls.showModal += 1;
    this.setAttribute('open', '');
  };
  proto.close = function () {
    calls.close += 1;
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    setTimeout(() => this.dispatchEvent(new dom.window.Event('close')), 0); // queued, like a browser
  };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const locked = () => (document.scrollingElement ?? document.documentElement).style.overflow === 'hidden';
const drain = () => act(() => new Promise((resolve) => setTimeout(resolve, 25))); // let queued `close` events fire

const counter = () => {
  const fn = () => { fn.calls += 1; };
  fn.calls = 0;
  return fn;
};

const mountStrict = (Component, props) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(StrictMode, null, h(Component, props))));
  return { dialog: host.querySelector('dialog'), unmount: () => { act(() => root.unmount()); host.remove(); } };
};

for (const [name, Component] of [['Drawer', () => ui.Drawer], ['Modal', () => ui.Modal], ['Peek', () => ui.Peek]]) {
  test(`${name}: mounted open under StrictMode, the stale queued close neither closes it nor unlocks scroll`, async () => {
    calls.showModal = 0;
    calls.close = 0;
    const onClose = counter();
    const { dialog, unmount } = mountStrict(Component(), { open: true, onClose, title: 'Details' });
    // Guard the premise: StrictMode really ran the effect twice (a production React build would
    // not), so the cleanup's close() queued an event that the re-run's listener can receive.
    assert.equal(calls.showModal, 2, 'StrictMode double-invoked the effect');
    assert.equal(calls.close, 1, 'the StrictMode cleanup closed the dialog once');

    await drain();
    assert.equal(onClose.calls, 0, 'the stale close event must not call onClose');
    assert.equal(dialog.open, true, 'the dialog stays open');
    assert.equal(locked(), true, 'the scroll lock stays engaged');

    unmount();
    await drain();
    assert.equal(locked(), false, 'unmount releases the lock');
  });

  test(`${name}: a genuine close (close() on the open dialog) still calls onClose once and unlocks`, async () => {
    const onClose = counter();
    const { dialog, unmount } = mountStrict(Component(), { open: true, onClose, title: 'Details' });
    await drain(); // flush the StrictMode stale event first

    act(() => dialog.close());
    await drain();
    assert.equal(onClose.calls, 1);
    assert.equal(dialog.open, false);
    assert.equal(locked(), false);

    unmount();
    await drain();
    assert.equal(onClose.calls, 1, 'unmount does not re-fire onClose');
    assert.equal(locked(), false);
  });

  test(`${name}: Escape (cancel → close) still calls onClose once and unlocks`, async () => {
    const onClose = counter();
    const { dialog, unmount } = mountStrict(Component(), { open: true, onClose, title: 'Details' });
    await drain();

    // What a browser does on Escape: fire a cancelable `cancel`, then close() unless prevented.
    act(() => {
      if (dialog.dispatchEvent(new window.Event('cancel', { cancelable: true }))) dialog.close();
    });
    await drain();
    assert.equal(onClose.calls, 1);
    assert.equal(dialog.open, false);
    assert.equal(locked(), false);
    unmount();
  });
}

test('Drawer: open toggled true → false → true before the queued close fires stays open', async () => {
  const onClose = counter();
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const render = (open) => root.render(h(ui.Drawer, { open, onClose, title: 'Details' }));
  act(() => render(true));
  const dialog = host.querySelector('dialog');
  act(() => render(false));
  act(() => render(true)); // before the close queued by the `false` render fires
  await drain();
  assert.equal(onClose.calls, 0);
  assert.equal(dialog.open, true);
  assert.equal(locked(), true);

  // The consumer closing through the prop is hook-initiated: it unlocks and never calls onClose.
  act(() => render(false));
  await drain();
  assert.equal(onClose.calls, 0);
  assert.equal(dialog.open, false);
  assert.equal(locked(), false);

  act(() => root.unmount());
  host.remove();
});
