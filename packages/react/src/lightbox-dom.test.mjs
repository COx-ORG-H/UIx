/* HAR-1367 (TENSOR C12, MOTUS C-8) — Lightbox in jsdom: counter, previous/next, ends and
 * looping, keyboard, zoom, video items, close and focus.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body><button id="opener">Open</button></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const proto = dom.window.HTMLDialogElement.prototype;
  proto.showModal = function () { this.setAttribute('open', ''); };
  proto.close = function () { this.removeAttribute('open'); };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const items = [
  { src: '/a.jpg', alt: 'Reading room', caption: 'Opening night' },
  { src: '/b.jpg', alt: 'Children\'s corner' },
  { src: '/c.mp4', alt: 'Author talk', kind: 'video' },
];
const Harness = ({ loop, log }) => {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(true);
  return h(ui.Lightbox, { items, index, onIndexChange: setIndex, open, onClose: () => { log.push('close'); setOpen(false); }, loop, labels: { counter: '{index} / {total}' } });
};
const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const key = (el, k) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })));

test('counter, caption, previous/next and the ends', () => {
  document.getElementById('opener').focus();
  const log = [];
  const { host, unmount } = mount(h(Harness, { log }));
  const dialog = host.querySelector('dialog');
  assert.equal(dialog.getAttribute('aria-label'), 'Media viewer');
  assert.equal(host.querySelector('img').getAttribute('alt'), 'Reading room');
  assert.equal(host.querySelector('.uix-lightbox__counter').textContent, '1 / 3');
  assert.equal(host.querySelector('.uix-lightbox__caption').textContent, 'Opening night');
  assert.equal(document.activeElement, host.querySelector('.uix-lightbox__close'), 'focus starts on Close');
  const prev = host.querySelector('.uix-lightbox__nav--prev');
  const next = host.querySelector('.uix-lightbox__nav--next');
  assert.equal(prev.disabled, true);
  click(next);
  assert.equal(host.querySelector('.uix-lightbox__counter').textContent, '2 / 3');
  key(dialog, 'End');
  assert.equal(host.querySelector('video').getAttribute('aria-label'), 'Author talk');
  assert.equal(host.querySelector('.uix-lightbox__tool'), null, 'no zoom for video');
  assert.equal(next.disabled, true);
  key(dialog, 'ArrowLeft');
  key(dialog, 'Home');
  assert.equal(host.querySelector('.uix-lightbox__counter').textContent, '1 / 3');
  click(host.querySelector('.uix-lightbox__close'));
  assert.deepEqual(log, ['close']);
  assert.equal(document.activeElement, document.getElementById('opener'), 'focus returns to the opener');
  unmount();
});

test('loop wraps; zoom toggles actual size and resets on the next item', () => {
  const { host, unmount } = mount(h(Harness, { loop: true, log: [] }));
  const dialog = host.querySelector('dialog');
  assert.equal(host.querySelector('.uix-lightbox__nav--prev').disabled, false);
  key(dialog, 'ArrowLeft');
  assert.equal(host.querySelector('.uix-lightbox__counter').textContent, '3 / 3', 'wraps to the last');
  key(dialog, 'ArrowRight');
  const zoom = host.querySelector('.uix-lightbox__tool');
  assert.equal(zoom.getAttribute('aria-pressed'), 'false');
  assert.equal(zoom.textContent, 'Show actual size');
  click(zoom);
  assert.equal(host.querySelector('.uix-lightbox__stage').hasAttribute('data-zoomed'), true);
  assert.equal(host.querySelector('.uix-lightbox__tool').textContent, 'Fit to screen');
  key(dialog, 'ArrowRight');
  assert.equal(host.querySelector('.uix-lightbox__stage').hasAttribute('data-zoomed'), false);
  unmount();
});
