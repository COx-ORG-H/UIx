/* HAR-1363 — the imperative toast queue (`toast()`, store, timing, action, undo) and the
 * Toaster that renders it, in jsdom with Node's mock timers.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

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

// Timers: Node's mock drives the store's removal delay; jsdom's window timers drive the Toaster's.
const useFakeTimers = () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  const real = { set: dom.window.setTimeout, clear: dom.window.clearTimeout };
  dom.window.setTimeout = (fn, ms) => setTimeout(fn, ms);
  dom.window.clearTimeout = (id) => clearTimeout(id);
  return () => { dom.window.setTimeout = real.set; dom.window.clearTimeout = real.clear; mock.timers.reset(); };
};
const tick = (ms) => act(() => { mock.timers.tick(ms); });

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, button: 0 })));

test('store: kinds get their default durations; an id replaces in place; update restarts and retimes', () => {
  const restore = useFakeTimers();
  try {
    const t = ui.createToastApi(ui.createToastStore());
    t.success('Saved');
    t.error('Failed');
    t.warning('Slow');
    const loading = t.loading('Exporting…');
    t.info('Note', { id: 'n' });
    t.info('Note again', { id: 'n' });
    const snap = t.store.getSnapshot();
    assert.deepEqual(snap.map((r) => [r.kind, r.duration]), [['success', 5000], ['error', null], ['warning', 8000], ['loading', null], ['info', 5000]]);
    assert.equal(snap.at(-1).message, 'Note again', 'same id replaced, not stacked');
    assert.equal(snap.at(-1).version, 1);
    t.update(loading, { kind: 'success', message: 'Exported' });
    const updated = t.store.getSnapshot().find((r) => r.id === loading);
    assert.equal(updated.duration, 5000, 'loading → success takes the success default');
    assert.equal(updated.version, 1);
  } finally { restore(); }
});

test('store: dismiss reports the reason once and removes the record after the leave animation', () => {
  const restore = useFakeTimers();
  try {
    const t = ui.createToastApi(ui.createToastStore());
    const reasons = [];
    const id = t('Hello', { onDismiss: (r) => reasons.push(r) });
    t.dismiss(id);
    t.dismiss(id);
    assert.deepEqual(reasons, ['programmatic'], 'a second dismiss of a leaving toast is a no-op');
    assert.equal(t.store.getSnapshot()[0].leaving, true);
    mock.timers.tick(ui.TOAST_LEAVE_MS);
    assert.equal(t.store.getSnapshot().length, 0);
  } finally { restore(); }
});

test('store: undoable commits when it closes without Undo, and only undoes when Undo is pressed', () => {
  const restore = useFakeTimers();
  try {
    const t = ui.createToastApi(ui.createToastStore());
    const log = [];
    const kept = t.undoable('Ticket closed', { onUndo: () => log.push('undo-1'), onCommit: () => log.push('commit-1') });
    t.store.dismiss(kept, 'timeout');
    const undone = t.undoable('Ticket closed', { onUndo: () => log.push('undo-2'), onCommit: () => log.push('commit-2') });
    const record = t.store.getSnapshot().find((r) => r.id === undone);
    assert.equal(record.action.label, 'Undo');
    assert.equal(record.duration, 6000);
    record.action.onClick();
    t.store.dismiss(undone, 'action');
    assert.deepEqual(log, ['commit-1', 'undo-2']);
  } finally { restore(); }
});

test('store: promise turns the loading toast into success or error', async () => {
  const t = ui.createToastApi(ui.createToastStore());
  await t.promise(Promise.resolve(3), { loading: 'Importing…', success: (n) => `Imported ${n}`, error: 'Import failed' });
  await t.promise(Promise.reject(new Error('x')), { loading: 'Importing…', success: 'ok', error: (e) => `Failed: ${e.message}` }).catch(() => {});
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(t.store.getSnapshot().map((r) => [r.kind, r.message]), [['success', 'Imported 3'], ['error', 'Failed: x']]);
});

test('Toaster renders store toasts with tone, glyph, role and action; children still render', () => {
  const t = ui.createToastApi(ui.createToastStore());
  const { host, unmount } = mount(h(ui.Toaster, { store: t.store }, h(ui.Toast, { title: 'Hand-made' })));
  const copied = [];
  act(() => {
    t.success('Saved', { description: 'Change CHG-1 updated.' });
    t.error('Could not save', { action: { label: 'Copy details', onClick: () => copied.push(1) } });
    t.warning('Running late');
  });
  const toasts = [...host.querySelectorAll('.uix-toast')];
  assert.equal(toasts.length, 4);
  assert.equal(toasts[0].querySelector('.uix-toast__title').textContent, 'Hand-made');
  assert.ok(toasts[1].classList.contains('uix-toast--success'));
  assert.equal(toasts[1].querySelector('.uix-toast__msg').textContent, 'Change CHG-1 updated.');
  assert.ok(toasts[1].querySelector('.uix-toast__icon svg'), 'a tone glyph until the icon set lands');
  assert.equal(toasts[2].getAttribute('role'), 'alert', 'errors interrupt');
  assert.ok(toasts[3].classList.contains('uix-toast--warning'));
  click(toasts[2].querySelector('.uix-toast__action'));
  assert.deepEqual(copied, [1]);
  assert.equal(host.querySelector(`[data-toast-id="${toasts[2].dataset.toastId}"]`).hasAttribute('data-leaving'), true, 'the action closes it');
  unmount();
});

test('Toaster auto-dismisses, pauses while hovered, and shows at most `limit` toasts', () => {
  const restore = useFakeTimers();
  try {
    const t = ui.createToastApi(ui.createToastStore());
    const { host, unmount } = mount(h(ui.Toaster, { store: t.store, limit: 2 }));
    act(() => { t.success('One'); t.success('Two'); t.success('Three'); });
    assert.deepEqual([...host.querySelectorAll('.uix-toast__title')].map((n) => n.textContent), ['Two', 'Three'], 'the newest two');

    const region = host.querySelector('.uix-toaster');
    act(() => region.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })));
    tick(10_000);
    assert.equal(host.querySelectorAll('.uix-toast[data-leaving]').length, 0, 'nothing closes while hovered');
    act(() => region.dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })));
    tick(4_999);
    assert.equal(host.querySelectorAll('.uix-toast[data-leaving]').length, 0);
    tick(1);
    assert.equal(host.querySelectorAll('.uix-toast[data-leaving]').length, 2, 'the visible two time out together');
    tick(ui.TOAST_LEAVE_MS);
    assert.deepEqual([...host.querySelectorAll('.uix-toast__title')].map((n) => n.textContent), ['One'], 'the waiting toast moves up');
    unmount();
  } finally { restore(); }
});

test('Escape dismisses the focused store toast; an error stays until dismissed', () => {
  const restore = useFakeTimers();
  try {
    const t = ui.createToastApi(ui.createToastStore());
    const { host, unmount } = mount(h(ui.Toaster, { store: t.store }));
    act(() => { t.error('Sync failed'); });
    tick(60_000);
    const toastEl = host.querySelector('.uix-toast');
    assert.equal(toastEl.hasAttribute('data-leaving'), false, 'errors persist');
    const close = toastEl.querySelector('.uix-toast__close');
    close.focus();
    act(() => close.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    assert.equal(toastEl.hasAttribute('data-leaving'), true);
    unmount();
  } finally { restore(); }
});

test('Toaster position and the default store behind toast()', () => {
  const { host, unmount } = mount(h(ui.Toaster, { position: 'top-center' }));
  assert.equal(host.querySelector('.uix-toaster').getAttribute('data-position'), 'top-center');
  let id;
  act(() => { id = ui.toast.info('From anywhere'); });
  assert.equal(host.querySelector(`[data-toast-id="${id}"] .uix-toast__title`).textContent, 'From anywhere');
  act(() => ui.toast.dismiss());
  unmount();
});
