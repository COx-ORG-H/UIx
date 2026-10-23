/* HAR-2590 — drag affordances: useKeyboardGrab's keyboard path (pick up, move, drop, cancel, said
 * politely), settleDrop's one-shot landing, and the attributes Kanban and SortableList put on a
 * dragged card or row and its drop zone. The look (lift, tint, line, settle) is measured in
 * Chromium by tests/a11y/feedback-kit.spec.mjs. Renders the BUILT dist — run `npm run build`. */
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
const key = (el, k) => act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
const said = () => { mock.timers.tick(1); return document.body.querySelector(':scope > [data-uix-announcer]')?.textContent; };

function Grabbable({ log }) {
  const [pos, setPos] = useState(2);
  const grab = ui.useKeyboardGrab({
    label: 'INC-0412',
    onMove: (dir) => { log.push(dir); setPos((p) => p + (dir === 'down' ? 1 : -1)); return `Position ${pos + (dir === 'down' ? 1 : -1)} of 5`; },
    onDrop: () => log.push('drop'),
    onCancel: () => log.push('cancel'),
  });
  return h('li', { tabIndex: 0, 'data-testid': 'item', ...grab.itemProps }, `INC-0412 (${pos})`, h('button', { type: 'button' }, 'Open'));
}

test('useKeyboardGrab: Space picks up, arrows move one step, Space drops, each said politely', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const { host, render, unmount } = mount();
  const log = [];
  await render(h(Grabbable, { log }));
  const item = host.querySelector('[data-testid="item"]');
  item.focus();
  await key(item, 'ArrowDown');
  assert.deepEqual(log, [], 'an arrow moved an item that was not picked up');
  await key(item, ' ');
  assert.equal(item.getAttribute('data-uix-drag'), 'grabbed');
  assert.match(said(), /INC-0412 picked up\. Use the arrow keys/);
  await key(item, 'ArrowDown');
  assert.equal(said(), 'Position 3 of 5');
  await key(item, 'Enter');
  assert.equal(item.getAttribute('data-uix-drag'), null);
  assert.deepEqual(log, ['down', 'drop']);
  assert.equal(said(), 'INC-0412 dropped.');
  await unmount();
});

test('useKeyboardGrab: Escape and leaving put it back; keys on a control inside are left alone', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const { host, render, unmount } = mount();
  const log = [];
  await render(h(Grabbable, { log }));
  const item = host.querySelector('[data-testid="item"]');
  await key(item.querySelector('button'), ' ');
  assert.equal(item.getAttribute('data-uix-drag'), null, 'Space on the Open button picked the item up');
  await key(item, ' ');
  const escape = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  let reachedOuter = false;
  document.body.addEventListener('keydown', () => { reachedOuter = true; }, { once: true });
  await act(async () => { item.dispatchEvent(escape); });
  assert.equal(reachedOuter, false, 'Escape also reached an outer handler (a dialog would close)');
  assert.deepEqual(log, ['cancel']);
  assert.match(said(), /Move cancelled\. INC-0412 is back/);
  await key(item, ' ');
  await act(async () => { item.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })); });
  assert.deepEqual(log, ['cancel', 'cancel'], 'leaving a picked-up item did not put it back');
  assert.equal(item.getAttribute('data-uix-drag'), null);
  await unmount();
});

test('settleDrop: one landing, restarted by a second drop, cleared when it ends', () => {
  const el = document.createElement('div');
  ui.settleDrop(el);
  assert.ok(el.hasAttribute('data-uix-settle'));
  ui.settleDrop(el);
  assert.ok(el.hasAttribute('data-uix-settle'));
  el.dispatchEvent(new window.Event('animationend'));
  assert.equal(el.hasAttribute('data-uix-settle'), false);
  ui.settleDrop(null);
});

test('Kanban: a dragged card lifts, a column is a drop target, the drop line is decorative', () => {
  const html = renderToStaticMarkup(h(ui.Kanban, null,
    h(ui.KanbanColumn, { title: 'Doing', dropTarget: true },
      h(ui.KanbanCard, { title: 'INC-0412', dragging: true }), h(ui.KanbanDropLine), h(ui.KanbanCard, { title: 'INC-0413' }))));
  assert.match(html, /class="uix-kanban__body" role="list" aria-labelledby="[^"]+" data-uix-drop-target="true"/);
  assert.match(html, /class="uix-kanban__card" data-uix-drag="lifted"/);
  assert.match(html, /<div class="uix-drop-line" aria-hidden="true"><\/div>/);
  const rest = renderToStaticMarkup(h(ui.KanbanColumn, { title: 'Doing' }, h(ui.KanbanCard, { title: 'X' })));
  assert.doesNotMatch(rest, /data-uix-drag|data-uix-drop-target/, 'a card at rest carries drag attributes');
});
