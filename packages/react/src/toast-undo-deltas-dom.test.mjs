/* Undo deltas (enterprise UX study, roadmap #23; spec Docs/specs/2026-11-20-undo-deltas.md): the
 * countdown on an undo toast that pauses with the timer, Ctrl/⌘+Z through the shortcut registry,
 * repeats that merge by `group`, the rate limit and quiet mode. jsdom, with Node's mock clock.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test, { before, after, afterEach, mock } from 'node:test';
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

const views = [];
afterEach(() => {
  while (views.length) views.pop()();
  document.documentElement.removeAttribute('data-motion');
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
  const unmount = () => { act(() => root.unmount()); host.remove(); };
  views.push(unmount);
  return { host };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, button: 0 })));
const hover = (el, on) => act(() => el.dispatchEvent(new window.MouseEvent(on ? 'mouseover' : 'mouseout', { bubbles: true, relatedTarget: document.body })));
const ctrlZ = (target = document.body) => {
  const event = new window.KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, bubbles: true, cancelable: true, composed: true });
  act(() => { target.dispatchEvent(event); });
  return event;
};
const titles = (host) => [...host.querySelectorAll('.uix-toast__title')].map((n) => n.textContent);
const status = (host) => host.querySelector('.uix-toaster > [role="status"]').textContent;

// ── the store ────────────────────────────────────────────────────────────────

test('store: an undo window comes from --uix-hold-undo (8 s without a stylesheet) and draws a countdown; duration and countdown are per call', () => {
  const t = ui.createToastApi(ui.createToastStore());
  const id = t.undoable('Ticket closed', { onUndo() {}, onCommit() {} });
  const record = t.store.getSnapshot().find((r) => r.id === id);
  assert.equal(ui.TOAST_UNDO_MS, 8000);
  assert.equal(record.duration, 8000);
  assert.equal(record.countdown, true);
  assert.equal(record.undoable, true);
  assert.equal(record.priority, 'high', 'the undo window is the person’s own: never held');
  const own = t.undoable('Note pinned', { duration: 12_000, countdown: false, onUndo() {}, onCommit() {} });
  assert.deepEqual([own].map((x) => t.store.getSnapshot().find((r) => r.id === x)).map((r) => [r.duration, r.countdown]), [[12_000, false]]);
  t.success('Saved');
  assert.equal(t.store.getSnapshot().at(-1).countdown, undefined, 'other toasts have no countdown unless asked');
});

test('store: toasts with the same group merge into the open one, count up, take groupMessage, and restart their timer', () => {
  const t = ui.createToastApi(ui.createToastStore());
  const closed = [];
  const say = (n) => `Resolved ${n} tickets`;
  const first = t.success('Resolved INC-0412', { group: 'resolve', groupMessage: say, onDismiss: (r) => closed.push(`a:${r}`) });
  const second = t.success('Resolved INC-0413', { group: 'resolve', groupMessage: say, onDismiss: (r) => closed.push(`b:${r}`) });
  const third = t.success('Resolved INC-0414', { group: 'resolve', groupMessage: say });
  t.info('Something else', { group: 'other' });
  assert.equal(second, first);
  assert.equal(third, first);
  const snap = t.store.getSnapshot();
  assert.equal(snap.length, 2);
  assert.deepEqual([snap[0].message, snap[0].count, snap[0].version], ['Resolved 3 tickets', 3, 2]);
  assert.equal(snap[0].message, say(3));
  t.dismiss(first);
  assert.deepEqual(closed, ['a:programmatic', 'b:programmatic'], 'every merged call hears the close once');
  // a closed group starts over
  const fresh = t.success('Resolved INC-0415', { group: 'resolve', groupMessage: say });
  assert.notEqual(fresh, first);
  assert.equal(t.store.getSnapshot().find((r) => r.id === fresh).message, 'Resolved INC-0415', 'one toast shows its own message');
});

test('store: a merged undoable reverts every action newest first (undoGroup "all"), or one at a time ("each")', () => {
  const t = ui.createToastApi(ui.createToastStore());
  const log = [];
  const resolve = (ticket, undoGroup) => t.undoable(`Resolved ${ticket}`, {
    group: `resolve-${undoGroup}`, undoGroup, groupMessage: (n) => `Resolved ${n} tickets`,
    onUndo: () => log.push(`undo ${ticket}`), onCommit: () => log.push(`commit ${ticket}`),
  });
  const all = resolve('A', 'all'); resolve('B', 'all'); resolve('C', 'all');
  assert.equal(t.store.getSnapshot().find((r) => r.id === all).count, 3);
  assert.equal(t.undo(all), true);
  assert.deepEqual(log, ['undo C', 'undo B', 'undo A']);
  assert.ok(t.store.getSnapshot().find((r) => r.id === all).leaving);

  log.length = 0;
  const each = resolve('D', 'each'); resolve('E', 'each'); resolve('F', 'each');
  assert.equal(t.undo(each), true);
  let record = t.store.getSnapshot().find((r) => r.id === each);
  assert.deepEqual([log, record.count, record.message, !!record.leaving], [['undo F'], 2, 'Resolved 2 tickets', false]);
  t.undo(each);
  record = t.store.getSnapshot().find((r) => r.id === each);
  assert.deepEqual([record.count, record.message], [1, 'Resolved D'], 'down to one: its own message again');
  t.dismiss(each);
  assert.deepEqual(log, ['undo F', 'undo E', 'commit D'], 'what is left commits when it closes');
  assert.equal(t.undoLatest(), null, 'nothing left to undo');
});

test('store: undoLatest reaches the newest open undoable toast and reports what it undid', () => {
  const t = ui.createToastApi(ui.createToastStore());
  const log = [];
  t.undoable('Archived INC-1', { onUndo: () => log.push(1), onCommit() {} });
  const newest = t.undoable('Archived INC-2', { onUndo: () => log.push(2), onCommit() {} });
  t.success('Saved');
  assert.deepEqual(t.undoLatest(), { id: newest, message: 'Archived INC-2' });
  assert.deepEqual(t.undoLatest()?.message, 'Archived INC-1');
  assert.equal(t.undoLatest(), null);
  assert.deepEqual(log, [2, 1]);
});

test('store: a replacing id commits the action it replaces', () => {
  const t = ui.createToastApi(ui.createToastStore());
  const log = [];
  t.undoable('Moved to Done', { id: 'move', onUndo: () => log.push('undo-1'), onCommit: () => log.push('commit-1') });
  t.undoable('Moved to Review', { id: 'move', onUndo: () => log.push('undo-2'), onCommit: () => log.push('commit-2') });
  t.undo('move');
  assert.deepEqual(log, ['commit-1', 'undo-2']);
});

test('rate limit: past five normal toasts in ten seconds the rest are held in one summary; errors and undo toasts still show', () => {
  const restore = useFakeTimers();
  try {
    const t = ui.createToastApi(ui.createToastStore());
    const dropped = [];
    for (let i = 1; i <= 7; i += 1) t.info(`Alert ${i}`, { onDismiss: (r) => dropped.push(`${i}:${r}`) });
    t.error('Sync failed');
    t.undoable('Ticket closed', { onUndo() {}, onCommit() {} });
    const shown = t.store.getSnapshot();
    assert.deepEqual(shown.filter((r) => r.held == null).map((r) => r.message), ['Alert 1', 'Alert 2', 'Alert 3', 'Alert 4', 'Alert 5', 'Sync failed', 'Ticket closed']);
    assert.deepEqual(t.store.getHeld().map((r) => r.message), ['Alert 6', 'Alert 7']);
    const summary = shown.find((r) => r.held != null);
    assert.deepEqual([summary.held, summary.duration, summary.priority], [2, null, 'high'], 'the summary stays until the person acts');
    t.info('Alert 8');
    assert.equal(t.store.getSnapshot().filter((r) => r.held != null).length, 1, 'one summary, recounted');
    assert.equal(t.store.getSnapshot().find((r) => r.held != null).held, 3);
    // a window later, toasts show again; the held ones wait in the summary
    mock.timers.tick(10_000);
    t.info('Alert 9');
    assert.equal(t.store.getSnapshot().at(-1).message, 'Alert 9');
    // Show releases them; a second storm can be closed unseen
    t.store.getSnapshot().find((r) => r.held != null).action.onClick();
    assert.deepEqual(t.store.getSnapshot().filter((r) => !r.leaving).slice(-3).map((r) => r.message), ['Alert 6', 'Alert 7', 'Alert 8']);
    assert.equal(t.store.getHeld().length, 0);
    for (let i = 10; i <= 16; i += 1) t.info(`Alert ${i}`, { onDismiss: (r) => dropped.push(`${i}:${r}`) });
    const second = t.store.getSnapshot().find((r) => r.held != null && !r.leaving);
    t.store.dismiss(second.id, 'close');
    assert.deepEqual(dropped, ['14:dropped', '15:dropped', '16:dropped'], 'Alert 9 and 10–13 filled the window');
    // configurable, and off
    t.configure({ rateLimit: false });
    for (let i = 0; i < 20; i += 1) t.info('Flood');
    assert.equal(t.store.getHeld().length, 0);
    t.configure({ rateLimit: { max: 1, per: 1000 } });
    mock.timers.tick(10_000);
    t.info('One'); t.info('Two');
    assert.deepEqual(t.store.getHeld().map((r) => r.message), ['Two']);
    assert.equal(ui.createToastStore({ rateLimit: false }).getHeld().length, 0);
    assert.deepEqual(ui.DEFAULT_TOAST_RATE_LIMIT, { max: 5, per: 10_000 });
  } finally { restore(); }
});

test('quiet mode: normal toasts are held with no summary until it ends; errors and undo toasts still show; a held toast that fails shows at once', () => {
  const t = ui.createToastApi(ui.createToastStore());
  t.setQuiet(true);
  assert.equal(t.isQuiet(), true);
  const saved = t.success('Saved');
  t.info('Comment from Alex', { group: 'comments' });
  t.info('Comment from Ina', { group: 'comments' });
  const exporting = t.info('Export queued');
  t.error('Sync failed');
  t.undoable('Ticket closed', { onUndo() {}, onCommit() {} });
  assert.deepEqual(t.store.getSnapshot().map((r) => r.message), ['Sync failed', 'Ticket closed'], 'no summary while quiet');
  assert.deepEqual(t.store.getHeld().map((r) => [r.message, r.count ?? 1]), [['Saved', 1], ['Comment from Ina', 2], ['Export queued', 1]], 'repeats still merge while held');
  t.update(exporting, { kind: 'error', message: 'Export failed' });
  assert.equal(t.store.getSnapshot().at(-1).message, 'Export failed');
  t.dismiss(saved);
  assert.deepEqual(t.store.getHeld().map((r) => r.message), ['Comment from Ina']);
  t.setQuiet(false);
  const summary = t.store.getSnapshot().at(-1);
  assert.equal(summary.held, 1, 'summarised once quiet ends');
  t.store.releaseHeld();
  assert.equal(t.store.getSnapshot().filter((r) => !r.leaving).at(-1).message, 'Comment from Ina');
});

// ── the Toaster ──────────────────────────────────────────────────────────────

test('Toaster: an undo toast draws a countdown bar sized to its window that pauses with the timer; a fixed timer never pauses', () => {
  const restore = useFakeTimers();
  try {
    const t = ui.createToastApi(ui.createToastStore());
    const { host } = mount(h(ui.Toaster, { store: t.store }));
    act(() => {
      t.undoable('Ticket closed', { onUndo() {}, onCommit() {} });
      t.undoable('Moved', { duration: 5000, pauseOnHover: false, onUndo() {}, onCommit() {} });
      t.success('Saved');
    });
    const [paused, fixed, plain] = host.querySelectorAll('.uix-toast');
    const bar = paused.querySelector('.uix-toast__countdown');
    assert.equal(bar.getAttribute('aria-hidden'), 'true');
    assert.equal(bar.style.getPropertyValue('--uix-toast-countdown'), '8000ms');
    assert.equal(fixed.querySelector('.uix-toast__countdown').style.getPropertyValue('--uix-toast-countdown'), '5000ms');
    assert.equal(plain.querySelector('.uix-toast__countdown'), null);
    assert.equal(paused.hasAttribute('data-paused'), false);
    hover(host.querySelector('.uix-toaster'), true);
    assert.equal(paused.hasAttribute('data-paused'), true, 'hover pauses the bar with the timer');
    assert.equal(fixed.hasAttribute('data-paused'), false);
    hover(host.querySelector('.uix-toaster'), false);
    assert.equal(paused.hasAttribute('data-paused'), false);
    // a hidden tab pauses it too
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    act(() => document.dispatchEvent(new window.Event('visibilitychange')));
    assert.equal(paused.hasAttribute('data-paused'), true);
    delete document.visibilityState;
    act(() => document.dispatchEvent(new window.Event('visibilitychange')));
  } finally { restore(); }
});

test('Toaster: under reduced motion the countdown is the seconds left, beside Undo, and it stops while hovered', () => {
  const restore = useFakeTimers();
  try {
    document.documentElement.setAttribute('data-motion', 'reduce');
    const t = ui.createToastApi(ui.createToastStore());
    const { host } = mount(h(ui.Toaster, { store: t.store }));
    act(() => { t.undoable('Ticket closed', { onUndo() {}, onCommit() {} }); });
    const left = () => host.querySelector('.uix-toast__action-slot .uix-toast__remaining')?.textContent;
    assert.equal(host.querySelector('.uix-toast__countdown'), null, 'no moving bar');
    assert.equal(left(), '8 s');
    tick(1000);
    assert.equal(left(), '7 s');
    hover(host.querySelector('.uix-toaster'), true);
    tick(3000);
    assert.equal(left(), '7 s', 'paused');
    hover(host.querySelector('.uix-toaster'), false);
    tick(2000);
    assert.equal(left(), '5 s');
    assert.equal(host.querySelector('.uix-toast__body').textContent.includes(' s'), false, 'not part of what the toast says');
  } finally { restore(); }
});

test('Toaster: Ctrl+Z undoes the newest undo toast and says so; Undo carries aria-keyshortcuts; never inside a text field; with nothing to undo the key is the page’s', () => {
  const restore = useFakeTimers();
  try {
  const t = ui.createToastApi(ui.createToastStore());
  const log = [];
  const { host } = mount(h(ui.Toaster, { store: t.store }));
  act(() => {
    t.undoable('Archived INC-1', { onUndo: () => log.push('undo 1'), onCommit: () => log.push('commit 1') });
    t.undoable('Archived INC-2', { onUndo: () => log.push('undo 2'), onCommit: () => log.push('commit 2') });
  });
  const buttons = [...host.querySelectorAll('.uix-toast__action')];
  assert.deepEqual(buttons.map((b) => b.getAttribute('aria-keyshortcuts')), [null, 'Control+Z'], 'only the toast Ctrl+Z reaches');

  const field = document.createElement('input');
  document.body.append(field);
  try {
    field.focus();
    const typed = ctrlZ(field);
    assert.equal(typed.defaultPrevented, false, 'the field’s own undo');
    assert.deepEqual(log, []);
  } finally { field.remove(); }

  const first = ctrlZ();
  assert.equal(first.defaultPrevented, true);
  assert.deepEqual(log, ['undo 2']);
  assert.match(status(host), /Undone: Archived INC-2$/);
  ctrlZ();
  assert.deepEqual(log, ['undo 2', 'undo 1']);
  tick(ui.TOAST_LEAVE_MS);
  const none = ctrlZ();
  assert.equal(none.defaultPrevented, false, 'nothing to undo: the key goes on');
  } finally { restore(); }
});

test('Toaster: Ctrl+Z is in the shortcut sheet as "Undo the last action" (translatable), and undoShortcut={false} takes it out', () => {
  let api;
  const Probe = () => { api = ui.useShortcuts(); return null; };
  const t = ui.createToastApi(ui.createToastStore());
  const { host } = mount(h(ui.ShortcutProvider, { storageKey: null, platform: 'other' },
    h(ui.UixLabelsProvider, { labels: { toast: { undoShortcut: 'Letzte Aktion rückgängig machen' } } }, h(ui.Toaster, { store: t.store })),
    h(Probe)));
  const everywhere = api.active(document.body).find((g) => g.scope === null);
  assert.deepEqual(everywhere.shortcuts.find((s) => s.id === ui.TOAST_UNDO_SHORTCUT_ID), {
    id: 'toast.undo', label: 'Letzte Aktion rückgängig machen', group: undefined, keys: [['Mod', 'Z']],
  });
  assert.ok(host.querySelector('.uix-toaster'));
  const off = mount(h(ui.ShortcutProvider, { storageKey: null }, h(ui.Toaster, { store: t.store, undoShortcut: false }), h(Probe)));
  assert.ok(off.host);
  assert.equal(api.active(document.body).flatMap((g) => g.shortcuts).some((s) => s.id === 'toast.undo'), false);
});

test('Toaster: a merged repeat shows its count, speaks again in place of its earlier words, and the held summary is worded and shows the held toasts', () => {
  const restore = useFakeTimers();
  try {
    const t = ui.createToastApi(ui.createToastStore());
    const { host } = mount(h(ui.Toaster, { store: t.store, limit: 3, labels: { held: (n) => `${n} waiting`, showHeld: 'Open' } }));
    act(() => { t.success('Resolved INC-0412', { group: 'resolve' }); });
    assert.equal(status(host), 'Resolved INC-0412');
    act(() => { t.success('Resolved INC-0413', { group: 'resolve' }); t.success('Resolved INC-0414', { group: 'resolve' }); });
    assert.deepEqual(titles(host), ['Resolved INC-0414 ×3']);
    assert.equal(host.querySelector('.uix-toast__count').textContent, '×3');
    assert.equal(status(host), 'Resolved INC-0414 ×3', 'the repeat replaced its earlier words');
    act(() => { t.success('Resolved', { group: 'r2', groupMessage: (n) => `Resolved ${n} tickets` }); t.success('Resolved', { group: 'r2', groupMessage: (n) => `Resolved ${n} tickets` }); });
    assert.equal(titles(host).at(-1), 'Resolved 2 tickets', 'groupMessage words the count itself');

    act(() => { t.setQuiet(true); t.info('Held one'); t.info('Held two'); t.setQuiet(false); });
    const summary = [...host.querySelectorAll('.uix-toast')].at(-1);
    assert.equal(summary.querySelector('.uix-toast__title').textContent, '2 waiting');
    click(summary.querySelector('.uix-toast__action'));
    tick(ui.TOAST_LEAVE_MS);
    assert.deepEqual(titles(host).slice(-2), ['Held one', 'Held two']);
  } finally { restore(); }
});

test('useToastQuiet follows the store', () => {
  const t = ui.createToastApi(ui.createToastStore());
  let quiet;
  const Probe = () => { quiet = ui.useToastQuiet(t.store); return null; };
  mount(h(Probe));
  assert.equal(quiet, false);
  act(() => t.setQuiet(true));
  assert.equal(quiet, true);
});
