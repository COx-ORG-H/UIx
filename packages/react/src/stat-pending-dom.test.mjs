/* Stat pending (HAR-1753), in jsdom: a pending interactive tile is announced as busy and
 * unavailable, stays focusable, and calls neither onActivate nor the consumer's onClick /
 * onKeyDown until it ends. Read-only and link tiles ignore the prop.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does. The same behaviour with a real
 * pointer and real keys is in tests/a11y/operator-primitives.spec.mjs.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let Stat;

const GLOBALS = ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ({ Stat } = await import('../dist/index.js'));
});

after(() => {
  dom.window.close();
  for (const name of GLOBALS) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, rerender: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })); });
const key = (el, name) => act(() => { el.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })); });

const spies = () => {
  const seen = { activate: 0, click: 0, keydown: 0 };
  return {
    seen,
    handlers: { onClick: () => { seen.click += 1; }, onKeyDown: () => { seen.keydown += 1; } },
    onActivate: () => { seen.activate += 1; },
  };
};

test('a pending tile calls nothing on click or key press, and calls everything again once it ends', () => {
  const { seen, handlers, onActivate } = spies();
  const tile = (pending) => h(Stat, { label: 'State', value: 'Open', onActivate, pending, ...handlers });
  const { host, rerender, unmount } = mount(tile(true));
  const button = host.querySelector('button');

  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal(button.getAttribute('aria-disabled'), 'true');
  assert.equal(button.disabled, false, 'never the native disabled: focus would be lost');
  click(button);
  key(button, 'Enter');
  key(button, ' ');
  assert.deepEqual(seen, { activate: 0, click: 0, keydown: 0 });

  button.focus();
  assert.equal(document.activeElement, button, 'a pending tile keeps focus');

  rerender(tile(false));
  assert.equal(host.querySelector('button'), button, 'the same element, so focus stays on it');
  assert.equal(document.activeElement, button);
  assert.equal(button.hasAttribute('aria-busy'), false);
  assert.equal(button.hasAttribute('aria-disabled'), false);
  click(button);
  key(button, 'Enter');
  assert.deepEqual(seen, { activate: 1, click: 1, keydown: 1 });
  unmount();
});

test('a pending tile does not swallow the event: a listener above it still hears the click', () => {
  let heard = 0;
  const { host, unmount } = mount(h('div', { onClick: () => { heard += 1; } }, h(Stat, { label: 'State', value: 'Open', onActivate() {}, pending: true })));
  click(host.querySelector('button'));
  assert.equal(heard, 1);
  unmount();
});

test('read-only and link tiles ignore pending: their handlers still run, and no state is announced', () => {
  for (const [name, props, selector] of [['read-only', {}, 'div.uix-stat'], ['link', { href: '#open' }, 'a.uix-stat']]) {
    const { seen, handlers } = spies();
    const { host, unmount } = mount(h(Stat, { label: 'Open', value: 12, pending: true, ...props, ...handlers }));
    const tile = host.querySelector(selector);
    assert.ok(tile, `${name} tile`);
    assert.equal(tile.hasAttribute('aria-busy'), false, name);
    assert.equal(tile.hasAttribute('aria-disabled'), false, name);
    assert.equal(tile.hasAttribute('pending'), false, `${name}: the prop must not reach the DOM`);
    click(tile);
    key(tile, 'Enter');
    assert.deepEqual(seen, { activate: 0, click: 1, keydown: 1 }, name);
    unmount();
  }
});

test('a tile that is not pending keeps a consumer\'s own aria-busy', () => {
  const { host, unmount } = mount(h(Stat, { label: 'State', value: 'Open', onActivate() {}, 'aria-busy': true }));
  const button = host.querySelector('button');
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal(button.hasAttribute('aria-disabled'), false);
  unmount();
});
