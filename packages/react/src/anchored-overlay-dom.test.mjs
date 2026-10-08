/* Anchored overlays and the EmojiPicker in jsdom (TENSOR HAR-993: "the emoji card jumps when a
 * category is selected", "slow to follow the page scroll", "close when the editor is gone").
 *
 * - useAnchoredPosition (through Popover): a scroll INSIDE the overlay never re-places it; an open
 *   overlay keeps its side until that side no longer fits and the other does; a size change
 *   (ResizeObserver) re-places it; the next open decides from scratch.
 * - Popover `closeWhenAnchorHidden`: hides when the anchor leaves the view (IntersectionObserver),
 *   is off by default, and a just-opened popover is never left held at its starting frame.
 * - EmojiPicker: the same rows while loading, loaded, searching with no results and failed (so its
 *   size never changes after it was placed); a category click scrolls the grid only and focuses
 *   with preventScroll; the trigger does not get focus back when its view closed the picker.
 *
 * jsdom has no layout, no Popover API and no observers, so rects, sizes and observers are
 * stubbed; the real-browser half (sizes, no page scroll, anchor tracking) is
 * tests/a11y/emoji-picker-placement.spec.mjs. Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, createRef, useRef } from 'react';

let dom;
let createRoot;
let ui;
let emoji;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'localStorage', 'IntersectionObserver', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT'];

/** Every IntersectionObserver / ResizeObserver created, so a test can fire them. */
const intersections = [];
const resizes = [];
class FakeIntersectionObserver {
  constructor(callback) { this.callback = callback; this.targets = new Set(); intersections.push(this); }
  observe(el) { this.targets.add(el); }
  unobserve(el) { this.targets.delete(el); }
  disconnect() { this.targets.clear(); }
  fire(isIntersecting) { this.callback([...this.targets].map((target) => ({ target, isIntersecting })), this); }
}
class FakeResizeObserver {
  constructor(callback) { this.callback = callback; this.targets = new Set(); resizes.push(this); }
  observe(el) { this.targets.add(el); }
  disconnect() { this.targets.clear(); }
  fire() { this.callback([...this.targets].map((target) => ({ target })), this); }
}
const live = (list) => list.filter((o) => o.targets.size > 0);

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'https://app.example.test/' });
  const { window } = dom;
  expose('window', window);
  expose('document', window.document);
  expose('navigator', window.navigator);
  expose('getComputedStyle', window.getComputedStyle.bind(window));
  expose('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  expose('cancelAnimationFrame', window.cancelAnimationFrame.bind(window));
  expose('localStorage', window.localStorage);
  expose('IntersectionObserver', FakeIntersectionObserver);
  expose('ResizeObserver', FakeResizeObserver);
  expose('IS_REACT_ACT_ENVIRONMENT', true);

  // Native Popover API (not in jsdom): beforetoggle, then toggle (synchronously, for the test).
  const open = new WeakSet();
  const toggle = (el, next) => {
    if (open.has(el) === next) return;
    const before = new window.Event('beforetoggle');
    Object.assign(before, { newState: next ? 'open' : 'closed', oldState: next ? 'closed' : 'open' });
    el.dispatchEvent(before);
    if (next) open.add(el); else open.delete(el);
    const after = new window.Event('toggle');
    Object.assign(after, { newState: next ? 'open' : 'closed', oldState: next ? 'closed' : 'open' });
    el.dispatchEvent(after);
  };
  Object.assign(window.HTMLElement.prototype, {
    showPopover() { toggle(this, true); },
    hidePopover() { toggle(this, false); },
  });
  const matches = window.Element.prototype.matches;
  window.Element.prototype.matches = function patched(selector) {
    return selector === ':popover-open' ? open.has(this) : matches.call(this, selector);
  };
  // Any scrollIntoView would also scroll the page when the popover sticks out of it.
  window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {
    throw new Error(`scrollIntoView called on ${this.className}`);
  };

  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
  emoji = await import('../dist/emoji.js');
});

after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const settle = async () => {
  for (let i = 0; i < 3; i += 1) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  }
};
const mount = async (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  return { host, unmount: async () => { await act(async () => root.unmount()); host.remove(); } };
};
const click = (el) => act(async () => {
  el.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
});
const typeInto = (input, value) => act(async () => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});
/** Show a popover and let its open session start (Popover starts it after the toggle task). */
const openPopover = (el) => act(async () => { el.showPopover(); await new Promise((resolve) => setTimeout(resolve, 5)); });
const scrollOn = (target) => act(async () => { target.dispatchEvent(new window.Event('scroll')); });
const rect = (x, y, width, height) => ({ x, y, width, height, left: x, top: y, right: x + width, bottom: y + height, toJSON() {} });

/** A layout for jsdom: the anchor's rect and the floating element's size, both changeable. */
function stubLayout(anchorEl, floatingEl, { anchor, size }) {
  const state = { anchor, size };
  anchorEl.getBoundingClientRect = () => rect(state.anchor.x, state.anchor.y, state.anchor.width, state.anchor.height);
  Object.defineProperty(floatingEl, 'offsetWidth', { configurable: true, get: () => state.size.width });
  Object.defineProperty(floatingEl, 'offsetHeight', { configurable: true, get: () => state.size.height });
  return state;
}

// jsdom's viewport is 1024 × 768.
test('an open anchored popover keeps its side, ignores its own scrolling and re-places on resize', async () => {
  const anchorRef = createRef();
  const view = await mount(h('div', null,
    h('button', { ref: anchorRef, type: 'button' }, 'Open'),
    h(ui.Popover, { id: 'pop', anchor: anchorRef, popover: 'manual' }, h('div', { className: 'inner' }, 'content')),
  ));
  const pop = view.host.querySelector('#pop');
  const layout = stubLayout(anchorRef.current, pop, { anchor: { x: 100, y: 560, width: 80, height: 30 }, size: { width: 200, height: 300 } });

  await openPopover(pop);
  // 172 px free below, 554 above: it opens on top
  assert.equal(pop.dataset.placement, 'top-start');
  assert.equal(pop.style.top, `${560 - 300 - 6}px`);
  assert.equal(pop.hasAttribute('data-uix-placing'), false, 'the held first frame was let go');

  // Now both sides fit. A scroll inside the popover (its own list) never re-places it...
  layout.anchor = { x: 100, y: 330, width: 80, height: 30 };
  await scrollOn(pop.querySelector('.inner'));
  assert.equal(pop.style.top, `${560 - 300 - 6}px`, 'own scroll ignored');
  // ...a page scroll does, but it stays on top (from scratch it would pick the bottom)
  await scrollOn(document);
  assert.equal(pop.dataset.placement, 'top-start');
  assert.equal(pop.style.top, `${330 - 300 - 6}px`);

  // A scroll container that does not hold the anchor cannot move it: ignored too.
  const unrelated = document.createElement('div');
  document.body.append(unrelated);
  layout.anchor = { x: 100, y: 200, width: 80, height: 30 };
  await scrollOn(unrelated);
  assert.equal(pop.style.top, `${330 - 300 - 6}px`);
  unrelated.remove();

  // top no longer fits (194 px) and bottom does: now it flips, once
  await scrollOn(document);
  assert.equal(pop.dataset.placement, 'bottom-start');
  assert.equal(pop.style.top, `${200 + 30 + 6}px`);

  // It grows while open (content arrived): the ResizeObserver re-places it without a scroll.
  layout.anchor = { x: 100, y: 400, width: 80, height: 30 };
  layout.size = { width: 200, height: 200 };
  await scrollOn(document);
  assert.equal(pop.style.top, '436px');
  layout.size = { width: 200, height: 340 };
  const [observer] = live(resizes);
  assert.ok(observer?.targets.has(pop), 'the popover is observed while open');
  await act(async () => observer.fire());
  assert.equal(pop.dataset.placement, 'top-start', 'grew past the room below: moved to the top');
  assert.equal(pop.style.top, `${400 - 340 - 6}px`);

  // Closed and reopened where both sides fit: decided from scratch again (preferred bottom).
  await act(async () => pop.hidePopover());
  assert.equal(live(resizes).length, 0, 'observer disconnected on close');
  layout.anchor = { x: 100, y: 330, width: 80, height: 30 };
  layout.size = { width: 200, height: 300 };
  await openPopover(pop);
  assert.equal(pop.dataset.placement, 'bottom-start');
  assert.equal(pop.style.top, `${330 + 30 + 6}px`);
  await act(async () => pop.hidePopover());
  await view.unmount();
});

test('closeWhenAnchorHidden is opt-in and hides the popover when its anchor leaves the view', async () => {
  const anchorRef = createRef();
  const hidden = [];
  const plain = await mount(h('div', null,
    h('button', { ref: anchorRef, type: 'button' }, 'Open'),
    h(ui.Popover, { id: 'plain', anchor: anchorRef }, 'x'),
  ));
  const before = intersections.length;
  await openPopover(plain.host.querySelector('#plain'));
  assert.equal(intersections.length, before, 'no observer without the prop');
  await act(async () => plain.host.querySelector('#plain').hidePopover());
  await plain.unmount();

  const ref2 = createRef();
  const view = await mount(h('div', null,
    h('button', { ref: ref2, type: 'button' }, 'Open'),
    h(ui.Popover, { id: 'watch', anchor: ref2, closeWhenAnchorHidden: true, onAnchorHidden: () => hidden.push(1) },
      h('input', { 'aria-label': 'inside' })),
  ));
  const pop = view.host.querySelector('#watch');
  await openPopover(pop);
  const [observer] = live(intersections);
  assert.ok(observer?.targets.has(ref2.current), 'watches the anchor while open');
  await act(async () => observer.fire(true));
  assert.ok(pop.matches(':popover-open'), 'still in view: stays open');
  pop.querySelector('input').focus();
  await act(async () => observer.fire(false));
  assert.equal(pop.matches(':popover-open'), false, 'anchor out of view: closed');
  assert.deepEqual(hidden, [1]);
  assert.equal(document.activeElement, document.body, 'focus let go, not sent to the hidden anchor');
  assert.equal(live(intersections).length, 0, 'observer disconnected on close');
  await view.unmount();
});

// ── main-axis shift, height cap, onAnchorHidden on the hook (HAR-1613) ───────
// jsdom's viewport is 1024 × 768 and has no CSS anchor positioning: this is the fixed left/top
// path. The anchored path and real scrolling are tests/a11y/overlay-shift.spec.mjs.
test('a popover that fits neither above nor below stays inside the viewport, also after a scroll', async () => {
  const anchorRef = createRef();
  const view = await mount(h('div', null,
    h('button', { ref: anchorRef, type: 'button' }, 'Columns'),
    h(ui.Popover, { id: 'tall', anchor: anchorRef, popover: 'manual', placement: 'bottom-end' }, 'content'),
  ));
  const pop = view.host.querySelector('#tall');
  // 366 px free above and below, a 500 px panel
  const layout = stubLayout(anchorRef.current, pop, { anchor: { x: 800, y: 366, width: 96, height: 36 }, size: { width: 304, height: 500 } });
  const inside = (label) => {
    const top = parseFloat(pop.style.top);
    assert.ok(top >= 8, `${label}: top ${top} >= 8`);
    assert.ok(top + 500 <= 768 - 8, `${label}: bottom ${top + 500} <= 760`);
  };
  await openPopover(pop);
  inside('at open');
  for (const y of [300, 120, 20, 500, 700]) {
    layout.anchor = { x: 800, y, width: 96, height: 36 };
    await scrollOn(document);
    inside(`anchor at ${y}`);
  }
  // The anchor has left the viewport: the panel goes with it instead of staying behind.
  layout.anchor = { x: 800, y: -80, width: 96, height: 36 };
  await scrollOn(document);
  assert.ok(parseFloat(pop.style.top) < 8, 'follows the anchor out');
  await act(async () => pop.hidePopover());
  await view.unmount();
});

test('capHeight caps the popover to the viewport, keeps a smaller own max-height, and gives both back on close', async () => {
  const anchorRef = createRef();
  const view = await mount(h('div', null,
    h('button', { ref: anchorRef, type: 'button' }, 'Open'),
    h(ui.Popover, { id: 'capped', anchor: anchorRef, popover: 'manual', capHeight: true }, 'content'),
    h(ui.Popover, { id: 'plain', anchor: anchorRef, popover: 'manual' }, 'content'),
    h(ui.Popover, { id: 'own', anchor: anchorRef, popover: 'manual', capHeight: true, style: { maxHeight: '320px', overflowY: 'scroll' } }, 'content'),
  ));
  const [capped, plain, own] = ['capped', 'plain', 'own'].map((id) => view.host.querySelector(`#${id}`));
  for (const pop of [capped, plain, own]) stubLayout(anchorRef.current, pop, { anchor: { x: 100, y: 300, width: 80, height: 30 }, size: { width: 200, height: 752 } });

  await openPopover(capped);
  assert.equal(capped.style.maxHeight, '752px', 'viewport 768 minus 8 px at each edge');
  assert.equal(capped.style.overflowY, 'auto');
  assert.equal(capped.style.top, '8px', 'a panel as tall as the room starts at the padding');
  await act(async () => capped.hidePopover());
  assert.equal(capped.style.maxHeight, '', 'given back on close');
  assert.equal(capped.style.overflowY, '');

  await openPopover(plain);
  assert.equal(plain.style.maxHeight, '', 'off by default');
  await act(async () => plain.hidePopover());

  await openPopover(own);
  // written as min(752px, 320px); jsdom's CSSOM folds that to calc(320px)
  assert.match(own.style.maxHeight, /^(min\(752px, 320px\)|calc\(320px\))$/, 'the smaller of the two applies');
  assert.equal(own.style.overflowY, 'scroll', 'its own overflow is left alone');
  await act(async () => own.hidePopover());
  assert.equal(own.style.maxHeight, '320px');
  await view.unmount();
});

test('useAnchoredPosition onAnchorHidden: a consumer that positions with the hook can close on it', async () => {
  const hidden = [];
  function Own({ open }) {
    const anchorRef = useRef(null);
    const floatingRef = useRef(null);
    ui.useAnchoredPosition(anchorRef, floatingRef, { open, onAnchorHidden: () => hidden.push('hidden') });
    return h('div', null,
      h('button', { ref: anchorRef, type: 'button', id: 'own-anchor' }, 'Anchor'),
      h('div', { ref: floatingRef, id: 'own-floating' }, 'panel'));
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(h(Own, { open: false })));
  assert.equal(live(intersections).length, 0, 'not watched while closed');
  await act(async () => root.render(h(Own, { open: true })));
  const [observer] = live(intersections);
  assert.ok(observer?.targets.has(host.querySelector('#own-anchor')), 'watches the anchor while open');
  await act(async () => observer.fire(true));
  assert.deepEqual(hidden, []);
  await act(async () => observer.fire(false));
  assert.deepEqual(hidden, ['hidden']);
  await act(async () => root.render(h(Own, { open: false })));
  assert.equal(live(intersections).length, 0, 'observer disconnected on close');
  await act(async () => root.unmount());
  host.remove();
});

// ── EmojiPicker ──────────────────────────────────────────────────────────────
const GROUPS = [{ key: 'smileys', name: 'Smileys' }, { key: 'animals', name: 'Animals' }, { key: 'food', name: 'Food' }];
const DATA = (() => {
  const emojis = [];
  GROUPS.forEach((_, group) => {
    for (let i = 0; i < 24; i += 1) {
      const glyph = String.fromCodePoint(0x1F600 + group * 24 + i);
      emojis.push({ emoji: glyph, name: `emoji ${group}-${i}`, tags: [`g${group}`], group });
    }
  });
  return { locale: 'en', groups: GROUPS, emojis, names: new Map(emojis.map((e) => [e.emoji, e.name])) };
})();

/** A loader the test resolves or rejects. */
const deferredLoader = () => {
  const control = {};
  control.load = () => new Promise((resolve, reject) => { control.resolve = resolve; control.reject = reject; });
  return control;
};

const mountPicker = async (props) => {
  const opened = [];
  const view = await mount(h(emoji.EmojiPicker, {
    onSelect() {},
    onOpenChange: (o) => opened.push(o),
    trigger: h('button', { type: 'button', id: 'trigger' }, 'Emoji'),
    ...props,
  }));
  return { ...view, opened, trigger: view.host.querySelector('#trigger'), pop: view.host.querySelector('[role="dialog"]') };
};
/** The picker's rows: the order and presence of each is what keeps its height fixed. */
const rows = (pop) => [...pop.querySelector('.uix-emoji-picker--full').children].map((el) => el.className.split(' ').find((c) => c.startsWith('uix-')));

test('EmojiPicker has the same rows while loading, loaded, searching with no results and failed', async () => {
  const ROWS = ['uix-input', 'uix-emoji-picker__nav', 'uix-emoji-picker__grid'];
  const loader = deferredLoader();
  const picker = await mountPicker({ loadData: loader.load });
  await click(picker.trigger);
  const status = () => picker.pop.querySelector('.uix-emoji-picker__status');

  assert.deepEqual(rows(picker.pop), ROWS, 'loading');
  assert.equal(status().parentElement, picker.pop.querySelector('.uix-emoji-picker__grid'), 'the status line is inside the fixed-height grid');
  assert.equal(status().textContent, 'Loading emoji…');
  assert.equal(picker.pop.querySelector('.uix-emoji-picker__nav').getAttribute('role'), null, 'an empty bar is not announced');

  await act(async () => loader.resolve(DATA));
  assert.deepEqual(rows(picker.pop), ROWS, 'loaded');
  assert.equal(picker.pop.querySelector('.uix-emoji-picker__nav').getAttribute('role'), 'group');
  assert.equal(picker.pop.querySelectorAll('.uix-emoji-picker__nav-btn').length, 3);
  assert.equal(status().textContent, '');

  await typeInto(picker.pop.querySelector('input[type="search"]'), 'nothing matches this');
  assert.deepEqual(rows(picker.pop), ROWS, 'searching, no results');
  assert.equal(status().textContent, 'No emoji found');
  assert.equal(picker.pop.querySelectorAll('.uix-emoji-picker__nav-btn').length, 3, 'the category bar stays while searching');
  await act(async () => picker.pop.hidePopover());
  await picker.unmount();

  const failing = deferredLoader();
  const broken = await mountPicker({ loadData: failing.load });
  await click(broken.trigger);
  await act(async () => failing.reject(new Error('offline')));
  assert.deepEqual(rows(broken.pop), ROWS, 'failed');
  assert.equal(broken.pop.querySelector('.uix-emoji-picker__status').textContent, 'Emoji could not be loaded.');
  await act(async () => broken.pop.hidePopover());
  await broken.unmount();
});

test('EmojiPicker: a category click scrolls only the grid and focuses without scrolling', async () => {
  const picker = await mountPicker({ loadData: async () => DATA });
  await click(picker.trigger);
  await settle();
  const grid = picker.pop.querySelector('.uix-emoji-picker__grid');
  let scrollTop = 0;
  Object.defineProperty(grid, 'scrollTop', { configurable: true, get: () => scrollTop, set: (v) => { scrollTop = v; } });
  // Grid at y=100; each section's heading sits at its content offset minus the grid's scroll.
  const OFFSETS = { smileys: 0, animals: 210, food: 420 };
  const proto = window.Element.prototype;
  const measure = proto.getBoundingClientRect;
  proto.getBoundingClientRect = function stub() {
    if (this === grid) return rect(0, 100, 320, 264);
    const key = this.dataset?.section;
    if (key in OFFSETS) return rect(0, 100 + OFFSETS[key] - scrollTop, 320, 200);
    return measure.call(this);
  };
  const focusOptions = [];
  const focus = window.HTMLElement.prototype.focus;
  window.HTMLElement.prototype.focus = function spy(options) { focusOptions.push(options); return focus.call(this, options); };
  try {
    await click(picker.pop.querySelector('.uix-emoji-picker__nav-btn[aria-label="Food"]')); // scrollIntoView would throw
    assert.equal(scrollTop, 420, 'the grid scrolled to the section heading');
    assert.equal(document.activeElement.dataset.emojiIndex, '48', 'first emoji of the section focused');
    assert.deepEqual(focusOptions.at(-1), { preventScroll: true });

    // During a search, a category ends the search and then shows that category.
    await typeInto(picker.pop.querySelector('input[type="search"]'), 'g1');
    assert.ok(picker.pop.querySelector('[data-section="results"]'), 'searching');
    scrollTop = 0;
    await click(picker.pop.querySelector('.uix-emoji-picker__nav-btn[aria-label="Animals"]'));
    assert.equal(picker.pop.querySelector('input[type="search"]').value, '', 'search cleared');
    assert.equal(scrollTop, 210);
    assert.equal(document.activeElement.dataset.emojiIndex, '24');
    assert.deepEqual(focusOptions.at(-1), { preventScroll: true });
  } finally {
    window.HTMLElement.prototype.focus = focus;
    proto.getBoundingClientRect = measure;
  }
  await act(async () => picker.pop.hidePopover());
  await picker.unmount();
});

test('EmojiPicker closes when its trigger scrolls away, without sending focus back to it', async () => {
  const picker = await mountPicker({ loadData: async () => DATA });
  await click(picker.trigger);
  await settle();
  const search = picker.pop.querySelector('input[type="search"]');
  assert.equal(document.activeElement, search, 'search focused on open');
  const [observer] = live(intersections);
  assert.ok(observer, 'the picker watches its trigger');
  await act(async () => observer.fire(false));
  await settle();
  assert.equal(picker.pop.matches(':popover-open'), false);
  assert.deepEqual(picker.opened, [true, false]);
  assert.notEqual(document.activeElement, picker.trigger, 'focus did not jump back to the scrolled-away trigger');

  // Escape still returns focus to the trigger.
  await click(picker.trigger);
  await settle();
  await act(async () => {
    picker.pop.querySelector('input[type="search"]').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  });
  await settle();
  assert.equal(document.activeElement, picker.trigger);
  await picker.unmount();
});
