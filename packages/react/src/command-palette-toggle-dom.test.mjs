/* The CommandPalette open key toggles from the dialog's real state, in jsdom.
 *
 * Escape closes the native <dialog> at once; its `close` event then calls onOpenChange(false),
 * and React renders that a task later. A Mod+K press in that gap read React's stale
 * `open === true` and called onOpenChange(false) again, so the palette stayed shut when the
 * user asked to reopen it.
 * Toggling from `dialog.open` alone is not enough: onOpenChange(true) batched with the pending
 * false leaves `open` unchanged, useDialog's layout effect (deps [open]) never re-runs, and the
 * dialog stays natively closed while React holds it open — no modal layer, no scroll lock. So
 * the press also re-syncs useDialog, which shows the dialog again through the same path as an
 * ordinary open (scroll lock, modal layer, the stale-close guard of HAR-882).
 *
 * Each gap is built inside one act() scope: everything in it runs before React renders, which
 * is what a browser does between the queued `close` event and the next render.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('HTMLElement', dom.window.HTMLElement);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('MutationObserver', dom.window.MutationObserver);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const proto = dom.window.HTMLDialogElement.prototype;
  proto.showModal = function () { this.setAttribute('open', ''); };
  proto.close = function () {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    setTimeout(() => this.dispatchEvent(new dom.window.Event('close')), 0); // queued, like a browser
  };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'getComputedStyle', 'MutationObserver', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mounted = [];
afterEach(() => { while (mounted.length) { const m = mounted.pop(); act(() => m.root.unmount()); m.host.remove(); } });

const locked = () => (document.scrollingElement ?? document.documentElement).style.overflow === 'hidden';
const drain = () => act(() => new Promise((resolve) => setTimeout(resolve, 25))); // let queued `close` events fire
const modK = () => document.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
/** What a browser does on Escape, minus the queued event: `cancel`, then the dialog hides now. */
const escapeHides = (dialog) => {
  dialog.dispatchEvent(new window.Event('cancel', { cancelable: true }));
  dialog.removeAttribute('open');
};
const fireClose = (dialog) => dialog.dispatchEvent(new window.Event('close'));

const mountPalette = () => {
  const changes = [];
  let reactOpen;
  function App() {
    const [open, setOpen] = useState(false);
    reactOpen = open;
    return h(ui.ShortcutProvider, { storageKey: null },
      h(ui.CommandPalette, {
        open, shortcut: 'Mod+K', items: [{ id: 'a', label: 'Assign to me' }],
        onOpenChange: (next) => { changes.push(next); setOpen(next); },
      }));
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(App)));
  mounted.push({ host, root });
  return { dialog: host.querySelector('dialog'), changes, open: () => reactOpen };
};

test('Mod+K after Escape, before React renders the close, reopens the palette', async () => {
  const t = mountPalette();
  act(() => { modK(); });
  assert.equal(t.dialog.open, true, 'Mod+K opens it');
  assert.equal(locked(), true);

  act(() => {
    escapeHides(t.dialog);
    fireClose(t.dialog); // useDialog: onOpenChange(false), rendered after this scope
    modK(); // React still says open
  });
  assert.deepEqual(t.changes, [true, false, true], 'the press asks to open, not to close again');
  assert.equal(t.open(), true, 'React holds it open');
  assert.equal(t.dialog.open, true, 'and the native dialog is shown again, not left closed');
  assert.equal(locked(), true, 'the scroll lock is back');

  await drain();
  assert.equal(t.dialog.open, true, 'nothing queued closes it afterwards');
  assert.equal(t.changes.length, 3);

  act(() => { modK(); });
  assert.equal(t.dialog.open, false, 'the same key closes it');
  assert.equal(t.open(), false);
  await drain();
  assert.equal(locked(), false, 'and the lock is released exactly once');
  assert.deepEqual(t.changes, [true, false, true, false]);
});

test('Mod+K after Escape, before the queued close event, reopens and the late event is stale', async () => {
  const t = mountPalette();
  act(() => { modK(); });
  act(() => {
    escapeHides(t.dialog); // the close event is still queued
    modK();
  });
  assert.equal(t.dialog.open, true, 'shown again');
  assert.equal(t.open(), true);
  assert.equal(locked(), true);

  act(() => { fireClose(t.dialog); }); // the queued event lands on a dialog that is open again
  await drain();
  assert.equal(t.dialog.open, true, 'the stale close neither hides it');
  assert.equal(t.open(), true, 'nor tells the consumer it closed');
  assert.equal(locked(), true, 'nor unlocks scroll');
  assert.deepEqual(t.changes, [true, true]);

  act(() => { modK(); });
  await drain();
  assert.equal(t.dialog.open, false);
  assert.equal(locked(), false);
});

test('the ordinary paths still work: Escape alone closes once, Mod+K reopens after the render', async () => {
  const t = mountPalette();
  act(() => { modK(); });
  act(() => {
    if (t.dialog.dispatchEvent(new window.Event('cancel', { cancelable: true }))) t.dialog.close();
  });
  await drain();
  assert.equal(t.dialog.open, false);
  assert.equal(t.open(), false);
  assert.equal(locked(), false);
  act(() => { modK(); });
  assert.equal(t.dialog.open, true);
  assert.equal(locked(), true);
  assert.deepEqual(t.changes, [true, false, true]);
});
