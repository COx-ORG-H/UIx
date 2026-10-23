/* QrScanner (HAR-1254) in jsdom, with a stub camera and a stub decoder.
 *
 * - every state: unsupported (no camera API), idle (explainer + start), asking (the browser's
 *   prompt), scanning, denied (with how to allow it), no camera, no picture; the manual entry is
 *   rendered in each;
 * - the permission the browser already knows decides the first state (granted starts, denied
 *   says so without prompting);
 * - frames go to the injected decoder only: the component makes no network request; a result is
 *   reported once (the same text again within `repeatAfter` is not) and said once in a status;
 * - the camera is released on Stop, on unmount and when no picture arrives.
 *
 * tests/a11y/qr-scanner.spec.mjs runs it in Chromium with a fake camera. Renders the BUILT dist —
 * run `npm run build` first; CI does.
 */
import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, StrictMode } from 'react';

let dom;
let createRoot;
let ui;
const network = [];

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  // any request is recorded: the scanner must make none
  expose('fetch', (...args) => { network.push(['fetch', ...args]); return Promise.reject(new Error('no network')); });
  dom.window.XMLHttpRequest.prototype.open = function open(...args) { network.push(['xhr', ...args]); };
  // jsdom has no canvas: a 2D context that hands back a frame of the right size
  dom.window.HTMLCanvasElement.prototype.getContext = function getContext() {
    const canvas = this;
    return { drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(canvas.width * canvas.height * 4), width: canvas.width, height: canvas.height }) };
  };
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT', 'fetch']) delete globalThis[name];
});

/** A fake camera: getUserMedia resolves (or rejects) when the test says. */
function camera({ permission, fail, torch = false } = {}) {
  const calls = [];
  const track = { stopped: false, stop() { this.stopped = true; }, addEventListener() {}, getCapabilities: () => ({ torch }), applyConstraints: async () => {} };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  let settle;
  const mediaDevices = {
    getUserMedia: (constraints) => { calls.push(constraints); return new Promise((resolve, reject) => { settle = () => (fail ? reject(Object.assign(new Error(fail), { name: fail })) : resolve(stream)); }); },
  };
  Object.defineProperty(dom.window.navigator, 'mediaDevices', { configurable: true, value: mediaDevices });
  Object.defineProperty(dom.window.navigator, 'permissions', { configurable: true, value: permission ? { query: async () => ({ state: permission }) } : undefined });
  return { calls, track, settle: () => act(async () => { settle(); await Promise.resolve(); await Promise.resolve(); }) };
}
const noCamera = () => {
  Object.defineProperty(dom.window.navigator, 'mediaDevices', { configurable: true, value: undefined });
  Object.defineProperty(dom.window.navigator, 'permissions', { configurable: true, value: undefined });
};
/** The video starts sending frames. */
const frames = (host) => {
  const video = host.querySelector('video');
  Object.defineProperty(video, 'videoWidth', { configurable: true, value: 1280 });
  Object.defineProperty(video, 'videoHeight', { configurable: true, value: 720 });
  Object.defineProperty(video, 'readyState', { configurable: true, value: 4 });
};

const mount = (props) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const statuses = [];
  // StrictMode: effects and state updaters run twice; onStatusChange must still run once per change
  act(() => root.render(h(StrictMode, null, h(ui.QrScanner, {
    decode: () => null, onResult: () => {}, onStatusChange: (s) => statuses.push(s),
    explainer: h('p', null, 'The camera reads the voucher; nothing leaves this device.'),
    manualEntry: h('label', null, 'Code ', h('input', { name: 'code' })),
    ...props,
  }))));
  return { host, statuses, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const flush = () => act(async () => { for (let i = 0; i < 4; i += 1) await Promise.resolve(); });
const state = (host) => host.querySelector('.uix-qr-scanner').dataset.status;

test('unsupported: no camera API says so, and the manual entry is there', () => {
  noCamera();
  const { host, unmount } = mount({});
  assert.equal(state(host), 'unsupported');
  assert.match(host.textContent, /This browser cannot use the camera here/);
  assert.ok(host.querySelector('.uix-qr-scanner__manual input'));
  assert.equal(host.querySelector('button'), null, 'no start button that cannot work');
  unmount();
});

test('idle → asking → scanning: the explainer first, the browser prompt after a click', async () => {
  const cam = camera();
  const { host, statuses, unmount } = mount({ autoStart: false });
  await flush();
  assert.equal(state(host), 'idle');
  assert.match(host.querySelector('.uix-qr-scanner__explainer').textContent, /nothing leaves this device/);
  const start = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Use the camera');
  await act(async () => { start.click(); });
  assert.equal(state(host), 'asking');
  assert.equal(host.querySelector('.uix-btn[aria-busy="true"]').textContent, 'Use the camera');
  assert.deepEqual(cam.calls, [{ video: { facingMode: { ideal: 'environment' } }, audio: false }]);
  await cam.settle();
  assert.equal(state(host), 'scanning');
  assert.equal(host.querySelector('video').hidden, false);
  assert.ok(host.querySelector('.uix-qr-scanner__manual input'));
  assert.deepEqual(statuses, ['asking', 'scanning']);
  // Stop releases the camera
  const stop = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Stop the camera');
  await act(async () => { stop.click(); });
  assert.equal(cam.track.stopped, true);
  assert.equal(state(host), 'idle');
  unmount();
});

test('denied: says how to allow the camera, keeps the explainer and offers to try again', async () => {
  const cam = camera({ fail: 'NotAllowedError' });
  const { host, unmount } = mount({ autoStart: false });
  await flush();
  await act(async () => { [...host.querySelectorAll('button')].find((b) => b.textContent === 'Use the camera').click(); });
  await cam.settle();
  assert.equal(state(host), 'denied');
  assert.match(host.textContent, /The camera is blocked/);
  assert.match(host.textContent, /site settings/);
  assert.ok(host.querySelector('.uix-qr-scanner__explainer'));
  assert.ok([...host.querySelectorAll('button')].some((b) => b.textContent === 'Try again'));
  assert.equal(host.querySelector('[role="status"]').textContent, 'The camera is blocked');
  unmount();
});

test('no camera: NotFoundError and NotReadableError', async () => {
  for (const fail of ['NotFoundError', 'NotReadableError']) {
    const cam = camera({ fail });
    const { host, unmount } = mount({ autoStart: false });
    await flush();
    await act(async () => { [...host.querySelectorAll('button')].find((b) => b.textContent === 'Use the camera').click(); });
    await cam.settle();
    assert.equal(state(host), 'no-camera', fail);
    unmount();
  }
});

test('the browser’s known permission decides: granted starts at once, denied never prompts', async () => {
  const granted = camera({ permission: 'granted' });
  const a = mount({});
  await flush();
  assert.equal(state(a.host), 'asking');
  assert.equal(granted.calls.length, 1);
  a.unmount();
  const refused = camera({ permission: 'denied' });
  const b = mount({});
  await flush();
  assert.equal(state(b.host), 'denied');
  assert.equal(refused.calls.length, 0, 'no prompt the browser would refuse anyway');
  b.unmount();
});

test('frames go to the decoder only; a result is reported once and said once; no network', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  try {
    const cam = camera();
    const results = [];
    const seen = [];
    const { host, unmount } = mount({ autoStart: false, repeatAfter: 3000, decode: (frame) => { seen.push([frame.imageData.width, frame.imageData.height, frame.video.tagName]); return 'VOUCHER-0042'; }, onResult: (value) => results.push(value) });
    await flush();
    await act(async () => { [...host.querySelectorAll('button')].find((b) => b.textContent === 'Use the camera').click(); });
    await cam.settle();
    frames(host);
    for (let i = 0; i < 6; i += 1) { await act(async () => { mock.timers.tick(200); }); await flush(); }
    assert.ok(seen.length >= 3, 'the decoder was called with frames');
    assert.deepEqual(seen[0], [640, 360, 'VIDEO'], 'a frame scaled to maxFrameSize on its long side');
    assert.deepEqual(results, ['VOUCHER-0042'], 'the same text within repeatAfter is reported once');
    assert.equal(host.querySelector('[role="status"]').textContent, 'Code read: VOUCHER-0042');
    assert.equal(host.querySelector('.uix-qr-scanner__frame').hasAttribute('data-read'), true, 'the frame says "read" for a moment');
    await act(async () => { mock.timers.tick(1300); });
    assert.equal(host.querySelector('.uix-qr-scanner__frame').hasAttribute('data-read'), false, '…and stops saying it');
    await act(async () => { mock.timers.tick(2000); }); await flush();
    for (let i = 0; i < 2; i += 1) { await act(async () => { mock.timers.tick(200); }); await flush(); }
    assert.deepEqual(results, ['VOUCHER-0042', 'VOUCHER-0042'], 'after repeatAfter the same code counts again');
    assert.deepEqual(network, []);
    unmount();
    assert.equal(cam.track.stopped, true, 'unmount releases the camera');
  } finally {
    mock.timers.reset();
  }
});

test('no picture: the camera is released and the state says so', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  try {
    const cam = camera();
    const { host, unmount } = mount({ autoStart: false, frameTimeout: 1000 });
    await flush();
    await act(async () => { [...host.querySelectorAll('button')].find((b) => b.textContent === 'Use the camera').click(); });
    await cam.settle();
    for (let i = 0; i < 8; i += 1) { await act(async () => { mock.timers.tick(200); }); await flush(); }
    assert.equal(state(host), 'no-frame');
    assert.equal(cam.track.stopped, true);
    assert.match(host.textContent, /The camera sends no picture/);
    unmount();
  } finally {
    mock.timers.reset();
  }
});

test('a hint after frames with no code; words from UixLabelsProvider qrScanner', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  try {
    const cam = camera();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(h(ui.UixLabelsProvider, { labels: { qrScanner: { start: 'Uključi kameru', unreadable: 'Još ništa. Držite kod mirno.' } } },
      h(ui.QrScanner, { autoStart: false, hintAfter: 600, decode: () => null, onResult: () => {} }))));
    await flush();
    await act(async () => { [...host.querySelectorAll('button')].find((b) => b.textContent === 'Uključi kameru').click(); });
    await cam.settle();
    frames(host);
    for (let i = 0; i < 6; i += 1) { await act(async () => { mock.timers.tick(200); }); await flush(); }
    assert.equal(host.querySelector('.uix-qr-scanner__message').textContent, 'Još ništa. Držite kod mirno.');
    act(() => root.unmount());
    host.remove();
  } finally {
    mock.timers.reset();
  }
});

/* Review of PR #166: hydration, a camera switch while scanning, and the status region after a read. */

test('the first render is "idle" on the server and in the browser: no hydration mismatch', async () => {
  noCamera();
  const { renderToString } = await import('react-dom/server');
  const html = renderToString(h(ui.QrScanner, { decode: () => null, onResult: () => {} }));
  assert.match(html, /data-status="idle"/, 'the server cannot know about cameras: it renders idle');
  const { host, unmount } = mount({});
  assert.equal(state(host), 'unsupported', 'the browser finds out after mount');
  unmount();
});

test('a new facingMode while scanning switches the camera instead of leaving a black frame', async () => {
  const cam = camera();
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const props = { decode: () => null, onResult: () => {}, autoStart: false };
  act(() => root.render(h(ui.QrScanner, { ...props, facingMode: 'environment' })));
  await flush();
  await act(async () => { [...host.querySelectorAll('button')].find((b) => b.textContent === 'Use the camera').click(); });
  await cam.settle();
  assert.equal(state(host), 'scanning');
  act(() => root.render(h(ui.QrScanner, { ...props, facingMode: 'user' })));
  await flush();
  assert.equal(cam.track.stopped, true, 'the old camera is released');
  assert.deepEqual(cam.calls.at(-1), { video: { facingMode: { ideal: 'user' } }, audio: false }, 'the other camera is asked for');
  await cam.settle();
  assert.equal(state(host), 'scanning');
  assert.ok(host.querySelector('video').srcObject, 'the new stream is attached');
  act(() => root.unmount());
  host.remove();
});

test('after a read, a refused camera is said in the status region, not the old code', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  try {
    let cam = camera();
    const { host, unmount } = mount({ autoStart: false, decode: () => 'VOUCHER-0042' });
    await flush();
    await act(async () => { [...host.querySelectorAll('button')].find((b) => b.textContent === 'Use the camera').click(); });
    await cam.settle();
    frames(host);
    for (let i = 0; i < 2; i += 1) { await act(async () => { mock.timers.tick(200); }); await flush(); }
    assert.equal(host.querySelector('[role="status"]').textContent, 'Code read: VOUCHER-0042');
    await act(async () => { [...host.querySelectorAll('button')].find((b) => b.textContent === 'Stop the camera').click(); });
    cam = camera({ fail: 'NotAllowedError' });
    await act(async () => { [...host.querySelectorAll('button')].find((b) => b.textContent === 'Use the camera').click(); });
    await cam.settle();
    assert.equal(state(host), 'denied');
    assert.equal(host.querySelector('[role="status"]').textContent, host.querySelector('.uix-qr-scanner__title').textContent);
    unmount();
  } finally {
    mock.timers.reset();
  }
});
