/* HAR-2586, HAR-2588, HAR-2589 — lists that move visibly, the success outcome, the sliding tab
 * and segment indicator. jsdom has no layout, so these hold the contract: what MotionList keeps,
 * marks and drops; useDeferredReorder's held order; SuccessState's markup and focus; the
 * indicator element and its keyboard rule. Geometry and motion are measured in Chromium by
 * tests/a11y/feedback-kit.spec.mjs. Renders the BUILT dist — run `npm run build` first. */
import test, { before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

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
afterEach(() => mock.timers.reset());

function mount() {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  return {
    host,
    render: (el) => act(async () => root.render(el)),
    unmount: async () => { await act(async () => root.unmount()); host.remove(); },
  };
}
const animationEnd = (target) => target.dispatchEvent(new window.Event('animationend', { bubbles: true }));
const list = (items) => h(ui.MotionList, {
  items, getKey: (item) => item.id, 'aria-label': 'Queue',
  renderItem: (item, { exiting }) => h('li', { 'data-exiting-prop': exiting || undefined }, item.title),
});
const texts = (host) => [...host.querySelectorAll('li')].map((li) => li.textContent);

test('MotionList: nothing enters on the first render; a new item enters; keys and class are on the DOM', async () => {
  const { host, render, unmount } = mount();
  await render(list([{ id: 1, title: 'A' }, { id: 2, title: 'B' }]));
  const ul = host.querySelector('ul.uix-motion-list');
  assert.equal(ul.getAttribute('aria-label'), 'Queue');
  assert.deepEqual([...ul.children].map((li) => li.getAttribute('data-uix-key')), ['1', '2']);
  assert.equal(host.querySelectorAll('[data-uix-entering]').length, 0, 'entered on first render');
  await render(list([{ id: 1, title: 'A' }, { id: 3, title: 'C' }, { id: 2, title: 'B' }]));
  assert.deepEqual(texts(host), ['A', 'C', 'B']);
  assert.equal(host.querySelector('[data-uix-key="3"]').hasAttribute('data-uix-entering'), true);
  assert.equal(host.querySelector('[data-uix-key="1"]').hasAttribute('data-uix-entering'), false);
  await unmount();
});

test('MotionList: a removed item stays in place, hidden and inert, until its exit ends; then it goes', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  const { host, render, unmount } = mount();
  await render(list([{ id: 1, title: 'A' }, { id: 2, title: 'B' }, { id: 3, title: 'C' }]));
  await render(list([{ id: 1, title: 'A' }, { id: 3, title: 'C' }]));
  assert.deepEqual(texts(host), ['A', 'B', 'C'], 'the leaving item was dropped at once (its neighbours would jump)');
  const leaving = host.querySelector('[data-uix-key="2"]');
  assert.ok(leaving.hasAttribute('data-uix-exiting'));
  assert.equal(leaving.getAttribute('aria-hidden'), 'true');
  assert.ok(leaving.hasAttribute('inert'));
  assert.equal(leaving.getAttribute('data-exiting-prop'), 'true', 'renderItem was not told it is leaving');
  await act(async () => animationEnd(leaving));
  assert.deepEqual(texts(host), ['A', 'C']);

  // without an animation end (no CSS, a hidden tab), a fallback drops it
  await render(list([{ id: 3, title: 'C' }]));
  assert.deepEqual(texts(host), ['A', 'C']);
  await act(async () => { mock.timers.tick(1000); });
  assert.deepEqual(texts(host), ['C']);

  // an item that comes back while leaving is simply there again
  await render(list([{ id: 3, title: 'C' }, { id: 4, title: 'D' }]));
  await render(list([{ id: 3, title: 'C' }]));
  await render(list([{ id: 3, title: 'C' }, { id: 4, title: 'D' }]));
  assert.equal(host.querySelector('[data-uix-key="4"]').hasAttribute('data-uix-exiting'), false);
  await unmount();
});

test('MotionList: a reorder keeps the DOM nodes (focus stays on the moved item)', async () => {
  const { host, render, unmount } = mount();
  const tree = (items) => h(ui.MotionList, { items, getKey: (i) => i.id, renderItem: (i) => h('li', null, h('button', { type: 'button' }, i.title)) });
  await render(tree([{ id: 1, title: 'A' }, { id: 2, title: 'B' }, { id: 3, title: 'C' }]));
  // focus item 1: for [1,2,3] → [2,3,1] React moves node 1, the one holding focus
  const button = host.querySelector('[data-uix-key="1"] button');
  button.focus();
  await render(tree([{ id: 2, title: 'B' }, { id: 3, title: 'C' }, { id: 1, title: 'A' }]));
  assert.deepEqual(texts(host), ['B', 'C', 'A']);
  assert.equal(host.querySelector('[data-uix-key="1"] button'), button);
  assert.equal(document.activeElement, button, 'focus was lost when the item moved');
  await unmount();
});

test('MotionList: a live update never pulls focus in from outside the list', async () => {
  const { host, render, unmount } = mount();
  const outside = document.createElement('button');
  document.body.append(outside);
  const tree = (items) => h(ui.MotionList, { items, getKey: (i) => i.id, renderItem: (i) => h('li', null, h('button', { type: 'button' }, i.title)) });
  await render(tree([{ id: 1, title: 'A' }, { id: 2, title: 'B' }]));
  host.querySelector('[data-uix-key="1"] button').focus();
  outside.focus();
  outside.blur(); // focus on the body, the list's button remembered from before
  await render(tree([{ id: 2, title: 'B' }, { id: 1, title: 'A' }]));
  assert.equal(document.activeElement, document.body, 'a live update pulled focus into the list');
  outside.remove();
  await unmount();
});

test('MotionList: when the focused item leaves, focus moves to the next item (inert set on the leaving one)', async () => {
  const { host, render, unmount } = mount();
  const tree = (items) => h(ui.MotionList, { items, getKey: (i) => i.id, renderItem: (i) => h('li', null, h('button', { type: 'button' }, i.title)) });
  await render(tree([{ id: 1, title: 'A' }, { id: 2, title: 'B' }, { id: 3, title: 'C' }]));
  host.querySelector('[data-uix-key="2"] button').focus();
  await render(tree([{ id: 1, title: 'A' }, { id: 3, title: 'C' }]));
  const leaving = host.querySelector('[data-uix-key="2"]');
  assert.ok(leaving.hasAttribute('inert'), 'inert was not set on the DOM element');
  assert.equal(document.activeElement, host.querySelector('[data-uix-key="3"] button'), 'focus fell to the page');
  await unmount();
});

test('MotionList: each leaving item has its own deadline; a later removal does not postpone an earlier one', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  const { host, render, unmount } = mount();
  await render(list([{ id: 1, title: 'A' }, { id: 2, title: 'B' }, { id: 3, title: 'C' }]));
  await render(list([{ id: 2, title: 'B' }, { id: 3, title: 'C' }]));
  await act(async () => { mock.timers.tick(600); });
  await render(list([{ id: 3, title: 'C' }]));
  await act(async () => { mock.timers.tick(400); });
  assert.deepEqual(texts(host), ['B', 'C'], 'the first leaving item waited for the second');
  await act(async () => { mock.timers.tick(600); });
  assert.deepEqual(texts(host), ['C']);
  await unmount();
});

test('MotionList: a new array with the same items does not re-derive or re-render twice', async () => {
  const { render, unmount } = mount();
  const a = { id: 1, title: 'A' };
  let calls = 0;
  const tree = (items) => h(ui.MotionList, { items, getKey: (i) => i.id, renderItem: (i) => { calls += 1; return h('li', null, i.title); } });
  await render(tree([a]));
  calls = 0;
  await render(tree([a]));
  assert.equal(calls, 1, 'renderItem ran more than once for an unchanged list');
  await unmount();
});

function Deferred({ items, out }) {
  const result = ui.useDeferredReorder(items, (i) => i.id);
  out.current = result;
  return h('ul', result.listProps, result.items.map((i) => h('li', { key: i.id }, i.title)));
}

test('useDeferredReorder: while pointed at, the order holds (content updates, new rows at the end); leaving applies it', async () => {
  const { host, render, unmount } = mount();
  const out = { current: null };
  const v1 = [{ id: 1, title: 'A' }, { id: 2, title: 'B' }, { id: 3, title: 'C' }];
  await render(h(Deferred, { items: v1, out }));
  const ul = host.querySelector('ul');
  await act(async () => { out.current.listProps.onPointerEnter({ currentTarget: ul, pointerType: 'mouse' }); });
  await render(h(Deferred, { items: [{ id: 3, title: 'C!' }, { id: 4, title: 'D' }, { id: 1, title: 'A' }], out }));
  assert.deepEqual(texts(host), ['A', 'C!', 'D'], 'the order moved under the pointer');
  assert.equal(out.current.held, true);
  await act(async () => { out.current.listProps.onPointerLeave({ currentTarget: ul }); });
  assert.deepEqual(texts(host), ['C!', 'D', 'A']);
  assert.equal(out.current.held, false);

  // keyboard focus inside holds it too, until focus leaves the list (touch does not hold)
  await act(async () => { out.current.listProps.onPointerEnter({ currentTarget: ul, pointerType: 'touch' }); });
  assert.equal(out.current.held, false);
  // a click's focus (not :focus-visible) does not hold either
  await act(async () => { out.current.listProps.onFocus({ currentTarget: ul, target: { matches: () => false }, relatedTarget: null }); });
  await render(h(Deferred, { items: [{ id: 4, title: 'D' }, { id: 3, title: 'C!' }, { id: 1, title: 'A' }], out }));
  assert.deepEqual(texts(host), ['D', 'C!', 'A'], 'focus from a click held the order');
  await render(h(Deferred, { items: [{ id: 3, title: 'C!' }, { id: 4, title: 'D' }, { id: 1, title: 'A' }], out }));
  ul.firstChild.tabIndex = 0;
  ul.firstChild.focus();
  // keyboard focus (jsdom's :focus-visible depends on earlier input, so the target says so)
  const keyboardFocus = { matches: (selector) => selector === ':focus-visible' };
  await act(async () => { out.current.listProps.onFocus({ currentTarget: ul, target: keyboardFocus, relatedTarget: null }); });
  await render(h(Deferred, { items: [{ id: 1, title: 'A' }, { id: 3, title: 'C!' }, { id: 4, title: 'D' }], out }));
  assert.deepEqual(texts(host), ['C!', 'D', 'A']);
  await act(async () => { out.current.listProps.onBlur({ currentTarget: ul, relatedTarget: ul.firstChild }); });
  assert.deepEqual(texts(host), ['C!', 'D', 'A'], 'focus moving inside the list released it');
  await act(async () => { out.current.listProps.onBlur({ currentTarget: ul, relatedTarget: document.body }); });
  assert.deepEqual(texts(host), ['A', 'C!', 'D']);
  // a held focus whose row went away (no blur in some browsers) lets go on the next update
  await act(async () => { out.current.listProps.onFocus({ currentTarget: ul, target: keyboardFocus, relatedTarget: null }); });
  document.activeElement?.blur();
  await render(h(Deferred, { items: [{ id: 4, title: 'D' }, { id: 1, title: 'A' }], out }));
  assert.equal(out.current.held, false, 'the hold stayed after focus left without a blur');
  await unmount();
});

test('SuccessState: the mark, the focused title, the reference, what happens next and the action', async () => {
  const { host, render, unmount } = mount();
  await render(h(ui.SuccessState, {
    title: 'Request submitted', reference: 'REQ-0233', next: ['We email you a confirmation.', 'An agent picks it up within a working day.'],
    action: h('a', { href: '/requests/233' }, 'View your request'),
  }, h('p', null, 'Thanks — we have your request for a new laptop.')));
  const root = host.querySelector('.uix-success');
  assert.ok(root.classList.contains('uix-empty') && root.classList.contains('uix-empty--page'));
  assert.equal(root.querySelector('.uix-success__mark').getAttribute('aria-hidden'), 'true');
  const title = root.querySelector('h1.uix-success__title');
  assert.equal(title.textContent, 'Request submitted');
  assert.equal(title.getAttribute('tabindex'), '-1');
  assert.equal(document.activeElement, title, 'the outcome did not take focus');
  assert.match(root.querySelector('.uix-success__reference').textContent, /Your reference\s*REQ-0233/);
  assert.equal(root.querySelector('.uix-success__next h2').textContent, 'What happens next');
  assert.equal(root.querySelectorAll('.uix-success__steps > li').length, 2);
  assert.equal(root.querySelector('a').textContent, 'View your request');
  await unmount();

  const html = renderToStaticMarkup(h(ui.SuccessState, { title: 'Sent', headingLevel: 2, focusOnMount: false }));
  assert.match(html, /<h2 class="uix-empty__title uix-success__title" tabindex="-1">Sent<\/h2>/);
  assert.doesNotMatch(html, /uix-success__next|uix-success__reference/, 'empty sections rendered');
});

test('Tabs and Segmented render one hidden, decorative indicator; enclosed tabs have none', () => {
  const tabs = renderToStaticMarkup(h(ui.Tabs, { value: 'a', 'aria-label': 'Views' }, h(ui.Tab, { value: 'a' }, 'All'), h(ui.Tab, { value: 'b' }, 'Mine')));
  assert.match(tabs, /<div aria-label="Views" role="tablist" class="uix-tabs uix-tabs--line"><button type="button" role="tab"/);
  // last, so :nth-child on the tabs keeps counting tabs
  assert.match(tabs, /<span class="uix-tabs__indicator" aria-hidden="true" hidden=""><\/span><\/div>$/);
  const enclosed = renderToStaticMarkup(h(ui.Tabs, { value: 'a', variant: 'enclosed' }, h(ui.Tab, { value: 'a' }, 'All')));
  assert.doesNotMatch(enclosed, /uix-tabs__indicator/);
  const segmented = renderToStaticMarkup(h(ui.Segmented, { value: 'x', 'aria-label': 'Density' }, h(ui.SegmentedOption, { value: 'x' }, 'Compact')));
  assert.match(segmented, /<span class="uix-segmented__indicator" aria-hidden="true" hidden=""><\/span>/);
  assert.doesNotMatch(segmented, /data-uix-indicator/, 'the server HTML must keep the options\' own selected look');
});

test('Tabs: the roving tab stop and keyboard still skip the indicator', async () => {
  const { host, render, unmount } = mount();
  function Controlled() {
    const [value, setValue] = useState('a');
    return h(ui.Tabs, { value, onChange: setValue }, h(ui.Tab, { value: 'a' }, 'All'), h(ui.Tab, { value: 'b' }, 'Mine'));
  }
  await render(h(Controlled));
  const [first, second] = host.querySelectorAll('[role="tab"]');
  first.focus();
  await act(async () => { first.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
  assert.equal(document.activeElement, second);
  assert.equal(second.getAttribute('aria-selected'), 'true');
  assert.equal(host.querySelector('.uix-tabs__indicator').tabIndex, -1);
  await unmount();
});
