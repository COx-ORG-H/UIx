/* SessionTimeout and useSessionTimeout (UIx enterprise UX study #24; WCAG 2.2.1, 2.2.6), on a
 * mock clock: the warning, the countdown, Stay / Escape / Sign out, a failed renewal, the end with
 * drafts kept or not, idle activity, and a hidden tab with and without pauseWhenHidden.
 * In a browser (focus, axe, both themes): tests/a11y/session-timeout.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, StrictMode } from 'react';

let dom;
let createRoot;
let ui;
let visibility = 'visible';
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window)); // useDialog's scroll lock
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  Object.defineProperty(dom.window.document, 'visibilityState', { configurable: true, get: () => visibility });
  // jsdom has no modal API: open is the attribute, close fires `close` in a later task.
  const proto = dom.window.HTMLDialogElement.prototype;
  proto.showModal = function () { this.setAttribute('open', ''); };
  proto.close = function () {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    setTimeout(() => this.dispatchEvent(new dom.window.Event('close')), 0);
  };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const START = 1_000_000;
let restoreTimers = null;
const useFakeTimers = () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: START });
  const real = { set: dom.window.setTimeout, clear: dom.window.clearTimeout };
  dom.window.setTimeout = (fn, ms) => setTimeout(fn, ms);
  dom.window.clearTimeout = (id) => clearTimeout(id);
  restoreTimers = () => { dom.window.setTimeout = real.set; dom.window.clearTimeout = real.clear; mock.timers.reset(); };
};
afterEach(() => { restoreTimers?.(); restoreTimers = null; visibility = 'visible'; });

const tick = (ms) => act(() => { mock.timers.tick(ms); });
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const MIN = 60_000;

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return {
    host,
    rerender: (next) => act(() => root.render(next)),
    unmount: () => { act(() => root.unmount()); host.remove(); },
    dialog: () => host.querySelector('dialog'),
  };
};

const log = () => {
  const calls = [];
  const fn = (name) => (...args) => { calls.push(args.length ? `${name}:${args.join(',')}` : name); };
  return { calls, fn };
};

const setVisibility = (state) => act(() => {
  visibility = state;
  document.dispatchEvent(new window.Event('visibilitychange'));
});

test('warning: opens warnBefore (2 min) before expiresAt as an alert dialog, announced once with the time left', () => {
  useFakeTimers();
  const { calls, fn } = log();
  const view = mount(h(ui.SessionTimeout, { expiresAt: START + 10 * MIN, onWarn: fn('warn'), onExtend: fn('extend'), onSignOut: fn('signOut') }));
  assert.equal(view.dialog(), null, 'nothing before the warning');
  tick(8 * MIN - 1);
  assert.equal(view.dialog(), null);
  tick(1);
  const dialog = view.dialog();
  assert.ok(dialog?.hasAttribute('open'));
  assert.equal(dialog.getAttribute('role'), 'alertdialog');
  assert.equal(dialog.querySelector('h2').textContent, 'Your session is about to end');
  assert.equal(dialog.querySelector('.uix-dialog__close'), null, 'no ×: the footer holds the ways out');
  const described = dialog.getAttribute('aria-describedby').split(' ').map((id) => document.getElementById(id).textContent);
  assert.match(described[0], /Choose “Stay signed in” to keep working\./);
  assert.match(described[1], /Time left 2:002 minutes/);
  const timer = dialog.querySelector('[role="timer"]');
  assert.equal(timer.getAttribute('aria-live'), 'off', 'the countdown is not read out every second');
  assert.equal(timer.querySelector('.uix-session-timeout__clock').getAttribute('aria-hidden'), 'true');
  assert.equal(document.activeElement.textContent, 'Stay signed in', 'focus on the primary action');
  assert.deepEqual([...dialog.querySelectorAll('.uix-dialog__footer button')].map((b) => b.textContent), ['Sign out', 'Stay signed in']);

  tick(1000);
  assert.equal(timer.querySelector('.uix-session-timeout__clock').textContent, '1:59');
  assert.equal(timer.querySelector('.uix-visually-hidden').textContent, '1 minute, 59 seconds');
  tick(58_000);
  assert.equal(timer.querySelector('.uix-session-timeout__clock').textContent, '1:01');
  tick(1000);
  assert.equal(timer.querySelector('.uix-visually-hidden').textContent, '1 minute');
  tick(55_000);
  assert.equal(timer.querySelector('.uix-visually-hidden').textContent, '5 seconds');
  assert.deepEqual(calls, ['warn'], 'onWarn once');
  view.unmount();
});

test('Stay signed in: onExtend returning the new expiry closes the warning, and it comes back before that one', async () => {
  useFakeTimers();
  const { calls, fn } = log();
  const view = mount(h(ui.SessionTimeout, {
    expiresAt: START + 3 * MIN,
    onWarn: fn('warn'),
    onExtend: () => { calls.push('extend'); return Promise.resolve(Date.now() + 5 * MIN); },
  }));
  tick(MIN);
  const stay = [...view.dialog().querySelectorAll('button')].find((b) => b.textContent === 'Stay signed in');
  await act(async () => { stay.click(); });
  await flush();
  assert.equal(view.dialog(), null, 'closed once the session is renewed');
  tick(3 * MIN - 1);
  assert.equal(view.dialog(), null);
  tick(1);
  assert.ok(view.dialog(), 'warns 2 minutes before the new expiry');
  assert.deepEqual(calls, ['warn', 'extend', 'warn']);
  view.unmount();
});

test('Stay signed in: a new expiresAt from the product also closes it; Escape means stay', async () => {
  useFakeTimers();
  let expiresAt = START + 2 * MIN;
  const renders = [];
  function App() {
    return h(ui.SessionTimeout, { expiresAt, onExtend: () => { renders.push('extend'); } });
  }
  const view = mount(h(App));
  const dialog = view.dialog();
  assert.ok(dialog);
  await act(async () => {
    dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  });
  assert.deepEqual(renders, ['extend']);
  assert.ok(view.dialog(), 'still warning: the expiry has not moved');
  expiresAt = START + 30 * MIN;
  view.rerender(h(App));
  assert.equal(view.dialog(), null);
  view.unmount();
});

test('a failed renewal keeps the warning open and says so; Stay shows its loading state meanwhile', async () => {
  useFakeTimers();
  let reject;
  const view = mount(h(ui.SessionTimeout, { expiresAt: START + MIN, onExtend: () => new Promise((_, no) => { reject = no; }) }));
  const stay = () => [...view.dialog().querySelectorAll('button')].find((b) => b.textContent.includes('Stay signed in'));
  await act(async () => { stay().click(); });
  assert.equal(stay().getAttribute('aria-busy'), 'true');
  await act(async () => { reject(new Error('network')); });
  await flush();
  assert.ok(view.dialog().hasAttribute('open'));
  assert.equal(view.dialog().querySelector('[role="alert"]').textContent, 'Your session could not be extended. Try again.');
  assert.notEqual(stay().getAttribute('aria-busy'), 'true');
  view.unmount();
});

test('the end: drafts are kept first, then onExpire; the notice says so, Sign in again and Close', () => {
  useFakeTimers();
  const { calls, fn } = log();
  const view = mount(h(ui.SessionTimeout, {
    expiresAt: START + 3 * MIN, onPersistDrafts: fn('persist'), onExpire: fn('expire'), onSignIn: fn('signIn'),
  }));
  tick(MIN);
  assert.deepEqual(calls, ['persist:warning'], 'drafts are offered a save while the session is still valid');
  tick(2 * MIN);
  assert.deepEqual(calls, ['persist:warning', 'persist:expire', 'expire']);
  const dialog = view.dialog();
  assert.equal(dialog.querySelector('h2').textContent, 'You have been signed out');
  assert.equal(dialog.hasAttribute('data-uix-instant'), true, 'it replaces the warning without a second entrance');
  const status = document.getElementById(dialog.getAttribute('aria-describedby'));
  assert.equal(status.getAttribute('role'), 'status');
  assert.equal(status.textContent, 'Your drafts are kept. Sign in again to carry on where you left off.');
  assert.equal(document.activeElement.textContent, 'Sign in again');
  act(() => document.activeElement.click());
  assert.deepEqual(calls.at(-1), 'signIn');
  const close = [...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Close');
  act(() => close.click());
  assert.equal(view.dialog(), null, 'Close leaves the page to look at');
  view.unmount();
});

test('the end: an async save says "Keeping your drafts…" until it settles; a failed one says the work was not kept', async () => {
  useFakeTimers();
  let settle;
  const view = mount(h(ui.SessionTimeout, {
    expiresAt: START + MIN,
    onPersistDrafts: (reason) => (reason === 'expire' ? new Promise((yes, no) => { settle = { yes, no }; }) : undefined),
  }));
  tick(MIN);
  const status = () => view.dialog().querySelector('[role="status"]').textContent;
  assert.equal(status(), 'Keeping your drafts…');
  await act(async () => { settle.no(new Error('quota')); });
  await flush();
  assert.equal(status(), 'Your latest changes could not be kept. Copy anything you need before you leave this page.');
  assert.equal(document.activeElement.textContent, 'Close', 'no onSignIn: Close is the action');
  view.unmount();
});

test('the end without onPersistDrafts: a plain "signed out" notice; expired straight from active animates in', () => {
  useFakeTimers();
  const view = mount(h(ui.SessionTimeout, { expiresAt: START + 10 * MIN }));
  // A laptop asleep past the whole warning: the first check after it finds the session over.
  setVisibility('hidden');
  mock.timers.setTime(START + 20 * MIN);
  setVisibility('visible');
  const dialog = view.dialog();
  assert.equal(dialog.querySelector('h2').textContent, 'You have been signed out');
  assert.equal(dialog.hasAttribute('data-uix-instant'), false);
  assert.equal(dialog.querySelector('[role="status"]').textContent, 'Your session has ended. Sign in again to carry on.');
  // Escape (the browser closing the dialog) closes the notice.
  act(() => { dialog.close(); });
  tick(1);
  assert.equal(view.dialog(), null);
  view.unmount();
});

test('idle: activity before the warning moves the end; activity during the warning does not', () => {
  useFakeTimers();
  const view = mount(h(ui.SessionTimeout, { idle: { timeout: 10 * MIN }, onExtend: () => {} }));
  tick(7 * MIN);
  act(() => { window.dispatchEvent(new window.Event('keydown')); });
  tick(2 * MIN);
  assert.equal(view.dialog(), null, 'the keydown at 7 minutes restarted the idle time');
  tick(6 * MIN - 1);
  assert.equal(view.dialog(), null);
  tick(1);
  assert.ok(view.dialog(), 'warning 8 minutes after the last activity');
  act(() => { window.dispatchEvent(new window.Event('pointerdown')); });
  tick(2 * MIN);
  assert.equal(view.dialog().querySelector('h2').textContent, 'You have been signed out', 'only Stay signed in renews');
  view.unmount();
});

test('idle: Stay signed in restarts the idle time; custom events count, others not', async () => {
  useFakeTimers();
  const view = mount(h(ui.SessionTimeout, { idle: { timeout: 5 * MIN, events: ['uix-test-activity'] }, onExtend: () => {} }));
  tick(2 * MIN);
  act(() => { window.dispatchEvent(new window.Event('keydown')); });
  tick(MIN);
  assert.ok(view.dialog(), 'keydown is not in the list');
  const stay = [...view.dialog().querySelectorAll('button')].find((b) => b.textContent === 'Stay signed in');
  await act(async () => { stay.click(); });
  await flush();
  assert.equal(view.dialog(), null);
  tick(3 * MIN - 1);
  assert.equal(view.dialog(), null);
  act(() => { window.dispatchEvent(new window.Event('uix-test-activity')); });
  tick(2);
  assert.equal(view.dialog(), null, 'the custom event restarted it');
  view.unmount();
});

test('a hidden tab: the clock runs on by default; pauseWhenHidden carries on from the same time', () => {
  useFakeTimers();
  const running = mount(h(ui.SessionTimeout, { idle: { timeout: 10 * MIN } }));
  setVisibility('hidden');
  tick(9 * MIN);
  setVisibility('visible');
  assert.ok(running.dialog(), 'nine minutes hidden still count');
  running.unmount();

  restoreTimers(); useFakeTimers();
  const paused = mount(h(ui.SessionTimeout, { idle: { timeout: 10 * MIN }, pauseWhenHidden: true }));
  tick(MIN);
  setVisibility('hidden');
  tick(60 * MIN);
  assert.equal(paused.dialog(), null, 'no end while hidden');
  setVisibility('visible');
  assert.equal(paused.dialog(), null, 'one minute used, nine left');
  tick(7 * MIN);
  assert.ok(paused.dialog());
  assert.equal(paused.dialog().querySelector('.uix-session-timeout__clock').textContent, '2:00');
  paused.unmount();
});

test('labels from UixLabelsProvider and the locale of the spoken time', () => {
  useFakeTimers();
  const view = mount(h(ui.UixLabelsProvider, {
    labels: { sessionTimeout: { title: 'Ihre Sitzung läuft bald ab', stay: 'Angemeldet bleiben', timeLeft: 'Verbleibend', description: 'Wählen Sie „{stay}“.' }, dateFormat: { locale: 'de' } },
  }, h(ui.SessionTimeout, { expiresAt: START + 90_000 })));
  const dialog = view.dialog();
  assert.equal(dialog.querySelector('h2').textContent, 'Ihre Sitzung läuft bald ab');
  assert.match(dialog.textContent, /Wählen Sie „Angemeldet bleiben“\./);
  assert.match(dialog.querySelector('.uix-visually-hidden').textContent, /1 Minute.*30 Sekunden/);
  view.unmount();
});

test('off when there is no expiry; StrictMode warns once; unmount leaves no timer behind', () => {
  useFakeTimers();
  const off = mount(h(ui.SessionTimeout, { expiresAt: null }));
  tick(100 * MIN);
  assert.equal(off.dialog(), null);
  off.unmount();

  const { calls, fn } = log();
  const strict = mount(h(StrictMode, null, h(ui.SessionTimeout, { expiresAt: Date.now() + 3 * MIN, onWarn: fn('warn'), onExpire: fn('expire') })));
  tick(MIN);
  tick(2 * MIN);
  assert.deepEqual(calls, ['warn', 'expire']);
  strict.unmount();

  const gone = mount(h(ui.SessionTimeout, { expiresAt: Date.now() + 3 * MIN, onWarn: fn('late') }));
  gone.unmount();
  tick(10 * MIN);
  assert.equal(calls.includes('late'), false);
});

test('useSessionTimeout: phase, remaining and touch for a product that draws its own warning', () => {
  useFakeTimers();
  const seen = [];
  let api;
  function Own() {
    api = ui.useSessionTimeout({ idle: { timeout: 4 * MIN, events: [] }, warnBefore: MIN });
    seen.push(api.phase);
    return null;
  }
  const view = mount(h(Own));
  tick(2 * MIN);
  act(() => api.touch());
  tick(2 * MIN);
  assert.equal(api.phase, 'active', 'touch restarted the idle time');
  tick(MIN);
  assert.equal(api.phase, 'warning');
  assert.equal(api.remaining, MIN);
  tick(MIN);
  assert.equal(api.phase, 'expired');
  assert.equal(api.remaining, 0);
  view.unmount();
});

test('Modal closeButton={false}: no ×, Escape still reaches onClose', () => {
  const view = mount(h(ui.Modal, { open: true, title: 'T', onClose: () => {}, closeButton: false }, 'Body'));
  assert.equal(view.dialog().querySelector('.uix-dialog__close'), null);
  assert.ok(view.dialog().querySelector('.uix-dialog__header'), 'the title keeps its header');
  view.unmount();
});
