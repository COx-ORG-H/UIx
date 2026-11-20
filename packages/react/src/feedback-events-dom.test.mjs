/* Semantic feedback events (experimental; phone OS study, Tier 3 item 14) in jsdom: feedback()
 * dispatches a bubbling, cancelable `uix-feedback` event; a vibration plays only with
 * <html data-haptics="on">, a `navigator.vibrate`, a visible page and a user activation, and
 * not when a listener cancels it; reduced motion does not silence it. Then the kit's own commit
 * moments: a Button result, a toast swiped away, a rich-text field going over its limit.
 * `navigator.vibrate` is a stub that records its calls: jsdom has none, like iOS Safari.
 * Renders the BUILT dist — run `npm run build` first. */
import test, { before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

let dom;
let createRoot;
let ui;
let rich;
let coarse = false; // (pointer: coarse): a phone's touch screen
const GLOBALS = ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'HTMLTextAreaElement', 'MutationObserver', 'Event', 'CustomEvent',
  'MouseEvent', 'KeyboardEvent', 'FocusEvent', 'InputEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'localStorage', 'getSelection'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  window.matchMedia = (query) => ({ matches: query === '(pointer: coarse)' && coarse, media: query, addEventListener() {}, removeEventListener() {} });
  for (const name of GLOBALS) if (name in window) expose(name, name === 'window' ? window : typeof window[name] === 'function' && /^[a-z]/.test(name) ? window[name].bind(window) : window[name]);
  expose('matchMedia', window.matchMedia);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
  rich = await import('../dist/rich-text.js');
});
after(() => {
  dom.window.close();
  for (const name of [...GLOBALS, 'matchMedia', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

/** A recording `navigator.vibrate` on a touch screen, the way Android Chrome has one. */
function stubVibrate() {
  const calls = [];
  coarse = true;
  Object.defineProperty(window.navigator, 'vibrate', { value: (pattern) => { calls.push(pattern); return true; }, configurable: true, writable: true });
  return calls;
}
const root = () => document.documentElement;
afterEach(() => {
  delete window.navigator.vibrate;
  delete window.navigator.userActivation;
  coarse = false;
  delete document.visibilityState;
  root().removeAttribute('data-haptics');
  root().removeAttribute('data-motion');
  mock.timers.reset();
});

/** Every `uix-feedback` event `document` hears while `run` runs: [kind, target]. */
async function heard(run) {
  const events = [];
  const listen = (event) => events.push([event.detail.kind, event.target]);
  document.addEventListener('uix-feedback', listen);
  try { await run(); } finally { document.removeEventListener('uix-feedback', listen); }
  return events;
}

test('feedback() dispatches a bubbling, cancelable uix-feedback event on its target, haptics or not', async () => {
  assert.equal(ui.FEEDBACK_EVENT, 'uix-feedback');
  const target = document.createElement('div');
  document.body.append(target);
  let seen;
  document.addEventListener('uix-feedback', (event) => { seen = event; }, { once: true });
  assert.equal(ui.feedback('success', target), false, 'no vibration without the opt-in');
  assert.ok(seen, 'the event reaches document');
  assert.equal(seen.target, target);
  assert.deepEqual(seen.detail, { kind: 'success' });
  assert.equal(seen.bubbles, true);
  assert.equal(seen.cancelable, true);
  // with no target it goes to the document itself
  const events = await heard(() => ui.feedback('warning'));
  assert.deepEqual(events, [['warning', document]]);
  // an unknown kind (a typo in untyped code) does nothing at all
  assert.deepEqual(await heard(() => ui.feedback('boom')), []);
  target.remove();
});

test('haptics are off by default: a device that can vibrate stays still until <html data-haptics="on">', () => {
  const calls = stubVibrate();
  assert.equal(ui.hapticsSupported(), true);
  assert.equal(ui.hapticsEnabled(), false);
  for (const kind of ['success', 'warning', 'error', 'selection', 'limit']) ui.feedback(kind);
  assert.deepEqual(calls, []);
  root().setAttribute('data-haptics', 'off');
  ui.feedback('error');
  assert.deepEqual(calls, [], 'only "on" turns it on');
  root().setAttribute('data-haptics', 'on');
  assert.equal(ui.hapticsEnabled(), true);
  assert.equal(ui.feedback('error'), true);
  assert.equal(ui.feedback('selection'), true);
  assert.deepEqual(calls, [[14, 70, 14], [10]]);
});

test('every pattern is restrained: at most two pulses, each 30 ms or less; error is two short pulses', () => {
  const patterns = ui.HAPTIC_PATTERNS;
  assert.deepEqual(Object.keys(patterns).sort(), ['error', 'limit', 'selection', 'success', 'warning']);
  for (const [kind, pattern] of Object.entries(patterns)) {
    const pulses = pattern.filter((_, i) => i % 2 === 0);
    assert.ok(pulses.length <= 2, `${kind}: ${pulses.length} pulses`);
    assert.ok(pulses.every((ms) => ms >= 10 && ms <= 30), `${kind}: ${pattern}`);
    assert.ok(pattern.reduce((a, b) => a + b, 0) <= 100, `${kind} lasts ${pattern} ms`);
    assert.ok(Object.isFrozen(pattern), `${kind} can be changed by a consumer`);
  }
  assert.equal(patterns.error.filter((_, i) => i % 2 === 0).length, 2);
  assert.ok(Object.isFrozen(patterns));
});

test('no vibrate where there is none (iPhone, jsdom): the event still goes out', async () => {
  root().setAttribute('data-haptics', 'on');
  coarse = true;
  assert.equal(ui.hapticsSupported(), false);
  let result;
  const events = await heard(() => { result = ui.feedback('success'); });
  assert.equal(result, false);
  assert.deepEqual(events.map(([kind]) => kind), ['success']);
});

test('desktop Chromium has navigator.vibrate but no motor: without a touch screen it is not supported', () => {
  const calls = stubVibrate();
  coarse = false;
  root().setAttribute('data-haptics', 'on');
  assert.equal(ui.hapticsSupported(), false);
  assert.equal(ui.feedback('success'), false);
  assert.deepEqual(calls, []);
});

test('a listener that cancels the event (a native wrapper playing its own haptic) stops the vibration', () => {
  const calls = stubVibrate();
  root().setAttribute('data-haptics', 'on');
  const cancel = (event) => event.preventDefault();
  document.addEventListener('uix-feedback', cancel);
  try {
    assert.equal(ui.feedback('success'), false);
  } finally {
    document.removeEventListener('uix-feedback', cancel);
  }
  assert.deepEqual(calls, []);
  assert.equal(ui.feedback('success'), true);
  assert.deepEqual(calls, [[14]]);
});

test('a hidden page and a page nobody has tapped yet do not vibrate', () => {
  const calls = stubVibrate();
  root().setAttribute('data-haptics', 'on');
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  assert.equal(ui.feedback('error'), false);
  delete document.visibilityState;
  Object.defineProperty(window.navigator, 'userActivation', { value: { hasBeenActive: false, isActive: false }, configurable: true });
  assert.equal(ui.feedback('error'), false, 'Chrome would block and log it');
  Object.defineProperty(window.navigator, 'userActivation', { value: { hasBeenActive: true, isActive: false }, configurable: true });
  assert.equal(ui.feedback('error'), true);
  assert.deepEqual(calls, [[14, 70, 14]]);
});

test('reduced motion does not silence haptics: they are their own opt-in', () => {
  const calls = stubVibrate();
  root().setAttribute('data-haptics', 'on');
  root().setAttribute('data-motion', 'reduce');
  assert.equal(ui.feedback('success'), true);
  assert.deepEqual(calls, [[14]]);
});

test('a vibrate that throws or refuses is reported as no vibration, never thrown', () => {
  root().setAttribute('data-haptics', 'on');
  Object.defineProperty(window.navigator, 'vibrate', { value: () => { throw new Error('blocked'); }, configurable: true });
  assert.equal(ui.feedback('limit'), false);
  Object.defineProperty(window.navigator, 'vibrate', { value: () => false, configurable: true });
  assert.equal(ui.feedback('limit'), false);
});

// ── the kit's commit moments ─────────────────────────────────────────────────────────────

function mount() {
  const host = document.createElement('div');
  document.body.append(host);
  const r = createRoot(host);
  return {
    host,
    render: (el) => act(async () => r.render(el)),
    unmount: async () => { await act(async () => r.unmount()); host.remove(); },
  };
}
const drain = () => new Promise((r) => setImmediate(r));
const advance = (ms) => act(async () => { await drain(); mock.timers.tick(ms); await drain(); });

test('Button result: success and error each report once, from inside the button, never on the first render', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  const calls = stubVibrate();
  root().setAttribute('data-haptics', 'on');
  const { host, render, unmount } = mount();
  const btn = (loading, result) => h(ui.Button, { loading, result }, 'Assign');
  const events = await heard(async () => {
    await render(btn(false, 'success'));
    await render(btn(true, null));
    await advance(120);
    await render(btn(false, 'success'));
    await advance(1500);
    await render(btn(true, null));
    await advance(120);
    await render(btn(false, 'error'));
  });
  const button = host.querySelector('button');
  assert.deepEqual(events.map(([kind]) => kind), ['success', 'error'], 'the first-render result stayed quiet');
  assert.ok(events.every(([, target]) => button.contains(target)), 'a product can tell which button it came from');
  assert.equal(button.querySelector('.uix-btn__face').getAttribute('data-result'), 'error', 'the visible result is there at the same moment');
  assert.deepEqual(calls, [[14], [14, 70, 14]]);
  await unmount();
});

/** A pointer event jsdom can dispatch (it has no PointerEvent): a MouseEvent carrying the pointer fields. */
function pointer(type, target, { x = 0, y = 0, id = 1, t } = {}) {
  const ev = new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  if (t !== undefined) Object.defineProperty(ev, 'timeStamp', { value: t });
  Object.defineProperty(ev, 'pointerType', { value: 'touch' });
  Object.defineProperty(ev, 'pointerId', { value: id });
  Object.defineProperty(ev, 'isPrimary', { value: true });
  return act(async () => { target.dispatchEvent(ev); });
}

test('a toast swiped away reports selection as it snaps off; one that snaps back reports nothing', async () => {
  const calls = stubVibrate();
  root().setAttribute('data-haptics', 'on');
  const { host, render, unmount } = mount();
  let closed = 0;
  await render(h(ui.Toast, { title: 'Saved', onClose: () => { closed += 1; } }));
  const toast = host.querySelector('.uix-toast');
  Object.defineProperty(toast, 'offsetWidth', { value: 300, configurable: true });
  // slow: 200 ms between moves, so the release is no fling
  const drag = async (dx, id, t0) => {
    await pointer('pointerdown', toast, { x: 100, y: 100, id, t: t0 });
    for (const [i, step] of [10, 20, 40, dx].entries()) await pointer('pointermove', toast, { x: 100 + step, y: 100, id, t: t0 + 200 * (i + 1) });
    await pointer('pointerup', toast, { x: 100 + dx, y: 100, id, t: t0 + 1000 });
  };
  const back = await heard(() => drag(50, 1, 10_000));
  assert.equal(closed, 0);
  assert.deepEqual(back, [], 'a toast that snaps back did not commit anything');
  const away = await heard(() => drag(200, 2, 20_000));
  assert.equal(closed, 1);
  assert.deepEqual(away, [['selection', toast]]);
  assert.deepEqual(calls, [[10]]);
  // the close button is the keyboard path: its own visible change, no swipe feedback
  const viaButton = await heard(() => act(async () => host.querySelector('.uix-toast__close').click()));
  assert.deepEqual(viaButton, []);
  await unmount();
});

/** Type into a controlled textarea the way a person does: the native value, then an input event. */
const typeInto = (input, value) => act(async () => {
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});

/** A controlled fallback field; `set` changes the value from outside, as a product loading a draft. */
function FallbackHost({ initial, expose: give }) {
  const [value, setValue] = useState(initial);
  give(setValue);
  return h(rich.RichTextEditorFallback, { value, onChange: setValue, maxLength: 5, 'aria-label': 'Note' });
}

test('a rich-text field reports limit once per typed crossing of maxLength (the counter turns red), never for a loaded draft', async () => {
  const { host, render, unmount } = mount();
  let set;
  const events = await heard(async () => {
    await render(h(FallbackHost, { initial: 'abc', expose: (fn) => { set = fn; } }));
    const area = host.querySelector('textarea');
    await typeInto(area, 'abcde');
    await typeInto(area, 'abcdef');
    await typeInto(area, 'abcdefg');
    await typeInto(area, 'abc');
    await typeInto(area, 'abcdefgh');
  });
  const counter = host.querySelector('.uix-rich-text__counter');
  assert.deepEqual(events.map(([kind]) => kind), ['limit', 'limit'], 'once per crossing, not per keystroke over it');
  assert.ok(events.every(([, target]) => target === counter));
  assert.ok(counter.hasAttribute('data-over'));
  // the product clears the field, then loads a long saved draft into it: nobody typed
  const loaded = await heard(async () => {
    await act(async () => set(''));
    await act(async () => set('a saved draft, too long'));
  });
  assert.deepEqual(loaded, []);
  assert.ok(counter.hasAttribute('data-over'));
  await unmount();
  // a field that is already over when it mounts stays quiet too
  const again = mount();
  const quiet = await heard(() => again.render(h(FallbackHost, { initial: 'abcdefgh', expose() {} })));
  assert.deepEqual(quiet, []);
  await again.unmount();
});

test('inside a shadow root the limit event starts at the counter, so the shadow root hears it', async () => {
  const outer = document.createElement('div');
  document.body.append(outer);
  const shadow = outer.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  shadow.append(container);
  const r = createRoot(container);
  const inside = [];
  shadow.addEventListener('uix-feedback', (event) => inside.push([event.detail.kind, event.target]));
  await act(async () => r.render(h(FallbackHost, { initial: 'abc', expose() {} })));
  await typeInto(shadow.querySelector('textarea'), 'abcdefg');
  assert.deepEqual(inside, [['limit', shadow.querySelector('.uix-rich-text__counter')]]);
  await act(async () => r.unmount());
  outer.remove();
});
