/* HAR-1826 (TENSOR C12 capture viewer) — an annotating Lightbox in jsdom: toolbar actions before
 * Close, an overlay over the picture that receives its size, keys the consumer claims (Escape
 * keeps the viewer open while a draft is open, arrows do not page), no swipe from the overlay,
 * and a single item without counter or previous/next.
 * The overlay's measured position and Chromium's close request are checked in a browser:
 * tests/a11y/lightbox-annotate.spec.mjs.
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

const shot = { src: '/capture.png', alt: 'Screenshot of the ticket form', width: 1200, height: 800 };
const pair = [shot, { src: '/second.png', alt: 'Second screenshot' }];

/** A capture viewer: "Hide area" opens a draft; Escape cancels the draft before it closes. */
function Viewer({ items = [shot], log }) {
  const [open, setOpen] = useState(true);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState(false);
  const [areas, setAreas] = useState(1);
  return h(ui.Lightbox, {
    items, index, onIndexChange: setIndex, open,
    onClose: () => { log.push('close'); setOpen(false); },
    actions: [
      h('button', { key: 'hide', type: 'button', className: 'uix-btn uix-btn--secondary', onClick: () => setDraft(true) }, 'Hide area'),
      h('button', { key: 'undo', type: 'button', className: 'uix-btn uix-btn--secondary', disabled: areas === 0, onClick: () => setAreas((n) => n - 1) }, 'Undo'),
    ],
    onKeyDown: (event) => {
      if (!draft) return;
      if (event.key === 'Escape') { event.preventDefault(); log.push('draft cancelled'); setDraft(false); }
      if (event.key.startsWith('Arrow')) { event.preventDefault(); log.push(`draft ${event.key}`); }
    },
    renderOverlay: (ctx) => {
      log.push(`overlay ${ctx.index} ${ctx.item.alt} ${ctx.media?.tagName}`);
      return [
        ...Array.from({ length: areas }, (_, i) => h('div', { key: i, className: 'area', style: { position: 'absolute', left: '10%', top: '10%', width: '20%', height: '10%' } })),
        draft ? h('div', { key: 'draft', className: 'draft' }) : null,
      ];
    },
  });
}

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const key = (el, k) => {
  let notPrevented;
  act(() => { notPrevented = el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
  return notPrevented;
};
/** What a browser does on an Escape nobody cancelled: the dialog closes and `close` is queued. */
const browserCloses = (dialog) => act(() => { dialog.removeAttribute('open'); dialog.dispatchEvent(new window.Event('close')); });

test('actions sit in the toolbar before Close; the overlay gets the item and the media', () => {
  const log = [];
  const { host, unmount } = mount(h(Viewer, { log }));
  const toolbar = host.querySelector('.uix-lightbox__toolbar');
  assert.deepEqual([...toolbar.querySelectorAll('button')].map((b) => b.textContent || b.getAttribute('aria-label')), ['Hide area', 'Undo', 'Close'], 'tab order: actions, then Close');
  assert.ok(host.querySelector('dialog').contains(toolbar), 'inside the dialog, so inside its focus trap');
  const overlay = host.querySelector('.uix-lightbox__stage > .uix-lightbox__overlay');
  assert.ok(overlay, 'the overlay is laid over the stage');
  assert.equal(overlay.querySelectorAll('.area').length, 1);
  assert.ok(log.includes('overlay 0 Screenshot of the ticket form IMG'), `the context names the item and the <img>: ${log.join(' | ')}`);
  click(toolbar.querySelector('button:nth-child(2)'));
  assert.equal(host.querySelectorAll('.area').length, 0, 'Undo removed the hidden area');
  assert.equal(toolbar.querySelector('button:nth-child(2)').disabled, true, 'an action can be disabled');
  unmount();
});

test('a single item shows no counter and no previous / next', () => {
  const { host, unmount } = mount(h(Viewer, { log: [] }));
  assert.equal(host.querySelector('.uix-lightbox__counter'), null);
  assert.equal(host.querySelector('.uix-lightbox__nav'), null);
  unmount();
  const two = mount(h(Viewer, { items: pair, log: [] }));
  assert.equal(two.host.querySelector('.uix-lightbox__counter').textContent, '1 of 2');
  two.unmount();
});

test('Escape with a draft open cancels the draft and keeps the viewer open; the next Escape closes', () => {
  const log = [];
  const { host, unmount } = mount(h(Viewer, { log }));
  const dialog = host.querySelector('dialog');
  click(host.querySelector('.uix-lightbox__toolbar button'));
  assert.ok(host.querySelector('.draft'), 'the draft is open');
  assert.equal(key(dialog, 'Escape'), false, 'the claimed Escape is cancelled');
  // A browser that still sends the close request: the viewer shows itself again, onClose is not called.
  browserCloses(dialog);
  assert.equal(dialog.hasAttribute('open'), true, 'still open');
  assert.equal(host.querySelector('.draft'), null, 'the draft is gone');
  assert.deepEqual(log.filter((l) => !l.startsWith('overlay')), ['draft cancelled']);
  assert.equal(key(dialog, 'Escape'), true, 'no draft: Escape is the viewer\'s');
  browserCloses(dialog);
  assert.deepEqual(log.filter((l) => !l.startsWith('overlay')), ['draft cancelled', 'close']);
  unmount();
});

test('a claim lasts one key press: an Escape pressed with focus outside the dialog still closes', () => {
  const log = [];
  const { host, unmount } = mount(h(Viewer, { log }));
  const dialog = host.querySelector('dialog');
  click(host.querySelector('.uix-lightbox__toolbar button'));
  key(dialog, 'Escape'); // claimed: the draft goes, and Chromium sends no close request
  // The focused draft was removed, so focus fell to <body>: the next key never reaches the dialog.
  key(document.body, 'Escape');
  browserCloses(dialog);
  assert.deepEqual(log.filter((l) => !l.startsWith('overlay')), ['draft cancelled', 'close']);
  unmount();
});

test('onEscapeKeyDown alone can keep the viewer open', () => {
  const log = [];
  function Guarded() {
    const [open, setOpen] = useState(true);
    return h(ui.Lightbox, { items: [shot], index: 0, onIndexChange() {}, open, onClose: () => { log.push('close'); setOpen(false); }, onEscapeKeyDown: (event) => { log.push('escape'); event.preventDefault(); } });
  }
  const { host, unmount } = mount(h(Guarded));
  const dialog = host.querySelector('dialog');
  key(dialog, 'Escape');
  browserCloses(dialog);
  assert.deepEqual(log, ['escape']);
  assert.equal(dialog.hasAttribute('open'), true);
  unmount();
});

test('claimed arrow keys do not page; unclaimed ones do', () => {
  const log = [];
  const { host, unmount } = mount(h(Viewer, { items: pair, log }));
  const dialog = host.querySelector('dialog');
  click(host.querySelector('.uix-lightbox__toolbar button'));
  key(dialog, 'ArrowRight');
  assert.equal(host.querySelector('.uix-lightbox__counter').textContent, '1 of 2', 'the draft moved, not the viewer');
  assert.ok(log.includes('draft ArrowRight'));
  key(dialog, 'Escape');
  key(dialog, 'ArrowRight');
  assert.equal(host.querySelector('.uix-lightbox__counter').textContent, '2 of 2');
  unmount();
});

test('a touch stroke on the overlay never swipes; one on the picture does', () => {
  const { host, unmount } = mount(h(Viewer, { items: pair, log: [] }));
  const stage = host.querySelector('.uix-lightbox__stage');
  const overlay = host.querySelector('.uix-lightbox__overlay');
  const stroke = (target, from, to) => act(() => {
    target.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 3, clientX: from }));
    target.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', pointerId: 3, clientX: to }));
  });
  stroke(overlay, 300, 100);
  assert.equal(host.querySelector('.uix-lightbox__counter').textContent, '1 of 2', 'drawing on the overlay did not page');
  stroke(stage.querySelector('img'), 300, 100);
  assert.equal(host.querySelector('.uix-lightbox__counter').textContent, '2 of 2', 'a swipe on the picture still pages');
  unmount();
});

test('UixLabelsProvider translates the viewer', () => {
  const { host, unmount } = mount(h(ui.UixLabelsProvider, { labels: { lightbox: { close: 'Schließen', counter: '{index} von {total}' } } },
    h(ui.Lightbox, { items: pair, index: 0, onIndexChange() {}, open: true, onClose() {} })));
  assert.equal(host.querySelector('.uix-lightbox__close').getAttribute('aria-label'), 'Schließen');
  assert.equal(host.querySelector('.uix-lightbox__counter').textContent, '1 von 2');
  unmount();
});

test('a stroke that starts on the picture and ends on the backdrop does not close; a click on the backdrop does', () => {
  const log = [];
  const { host, unmount } = mount(h(Viewer, { log }));
  const dialog = host.querySelector('dialog');
  const overlay = host.querySelector('.uix-lightbox__overlay');
  act(() => {
    overlay.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true }));
    dialog.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // the browser targets the common ancestor
  });
  assert.deepEqual(log.filter((l) => l === 'close'), [], 'the draft survives');
  act(() => {
    dialog.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true }));
    dialog.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
  assert.deepEqual(log.filter((l) => l === 'close'), ['close']);
  unmount();
});
