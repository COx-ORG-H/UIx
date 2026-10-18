/* TENSOR HAR-1823 — DashboardCanvas markup and its keyboard path: the class and custom-property
 * contract the CSS reads, handles only in edit mode, arrow keys on the move and resize handles
 * reporting one new layout each, and what the live region says. The pointer drag and the narrow
 * one-column layout need real layout and are measured in Chromium (tests/a11y). Renders the
 * BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
const css = readFileSync(new URL('../../tokens/styles/components/dashboard-canvas.css', import.meta.url), 'utf8');
const defined = new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]));

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

const LAYOUT = [
  { id: 'a', col: 0, row: 0, w: 6, h: 2 },
  { id: 'b', col: 6, row: 0, w: 6, h: 2, maxW: 6 },
];
const NAMES = { a: 'Needs you', b: 'Updates' };

async function mount(props) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const changes = [];
  const render = async (items) => {
    await act(async () => root.render(h(ui.DashboardCanvas, {
      items,
      editable: true,
      itemLabel: (item) => NAMES[item.id],
      renderItem: (item) => h('section', { 'data-widget': item.id }, NAMES[item.id]),
      onLayoutChange: async (next, change) => { changes.push({ next, change }); },
      ...props,
    })));
  };
  await render(LAYOUT);
  return { host, changes, render, unmount: async () => { await act(async () => root.unmount()); host.remove(); } };
}

const key = (el, keyName) => act(async () => {
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }));
});
const handle = (host, id, kind) => host.querySelector(`[data-canvas-id="${id}"] .uix-dashboard-canvas__${kind}`);
const status = (host) => host.querySelector('[role="status"]').textContent;

test('read-only: a named region of placed cells, no handles, and only classes the CSS defines', () => {
  const html = renderToStaticMarkup(h(ui.DashboardCanvas, {
    items: LAYOUT,
    renderItem: (item) => h('p', null, item.id),
    labels: { region: 'Home layout' },
  }));
  const doc = new JSDOM(html).window.document;
  const root = doc.querySelector('.uix-dashboard-canvas');
  assert.equal(root.getAttribute('role'), 'region');
  assert.equal(root.getAttribute('aria-label'), 'Home layout');
  assert.equal(doc.querySelectorAll('.uix-dashboard-canvas__handle').length, 0);
  const b = doc.querySelector('[data-canvas-id="b"]');
  const style = b.getAttribute('style');
  for (const declaration of ['--uix-dashboard-canvas-col:7', '--uix-dashboard-canvas-row-start:1', '--uix-dashboard-canvas-w:6', '--uix-dashboard-canvas-h:2', '--uix-dashboard-canvas-order:1']) {
    assert.ok(style.replace(/\s/g, '').includes(declaration), `${declaration} in ${style}`);
  }
  for (const el of doc.querySelectorAll('[class]')) {
    for (const cls of el.className.split(' ').filter((c) => c.startsWith('uix-dashboard-canvas'))) {
      assert.ok(defined.has(cls), `.${cls} is not defined in dashboard-canvas.css`);
    }
  }
});

test('a stored layout that overlaps renders settled: the later item below the earlier one', () => {
  const html = renderToStaticMarkup(h(ui.DashboardCanvas, {
    items: [{ id: 'a', col: 0, row: 0, w: 6, h: 2 }, { id: 'b', col: 3, row: 1, w: 6, h: 1 }],
    renderItem: () => null,
  }));
  const b = new JSDOM(html).window.document.querySelector('[data-canvas-id="b"]').getAttribute('style').replace(/\s/g, '');
  assert.ok(b.includes('--uix-dashboard-canvas-row-start:3'), b);
});

test('edit mode: each item has a named move handle and resize handle that describe their keys', async () => {
  const { host, unmount } = await mount({});
  const move = handle(host, 'a', 'move');
  const resize = handle(host, 'a', 'resize');
  assert.equal(move.getAttribute('aria-label'), 'Move Needs you');
  assert.equal(resize.getAttribute('aria-label'), 'Resize Needs you');
  const described = document.getElementById(move.getAttribute('aria-describedby'));
  assert.match(described.textContent, /Arrow keys/);
  assert.equal(move.type, 'button');
  await unmount();
});

test('arrow keys on the move handle report one new layout and say where the item went', async () => {
  const { host, changes, unmount } = await mount({});
  await key(handle(host, 'a', 'move'), 'ArrowDown');
  assert.equal(changes.length, 1);
  assert.deepEqual(changes[0].change, { id: 'a', kind: 'move', source: 'keyboard' });
  const next = Object.fromEntries(changes[0].next.map((item) => [item.id, [item.col, item.row, item.w, item.h]]));
  assert.deepEqual(next, { a: [0, 1, 6, 2], b: [6, 0, 6, 2] });
  assert.equal(status(host), 'Needs you: column 1, row 2');
  await unmount();
});

test('arrow keys on the resize handle grow and shrink, and a limit is announced, not reported', async () => {
  const { host, changes, unmount } = await mount({});
  await key(handle(host, 'b', 'resize'), 'ArrowDown');
  assert.deepEqual(changes[0].change, { id: 'b', kind: 'resize', source: 'keyboard' });
  assert.equal(status(host), 'Updates: 6 columns wide, 3 rows tall');
  // b may be at most 6 wide: wider is refused and said so.
  await key(handle(host, 'b', 'resize'), 'ArrowRight');
  assert.equal(changes.length, 1);
  assert.equal(status(host), 'Updates cannot go further that way');
  await unmount();
});

test('at an edge the move is announced and nothing is reported; other keys are left alone', async () => {
  const { host, changes, unmount } = await mount({});
  await key(handle(host, 'a', 'move'), 'ArrowLeft');
  assert.equal(changes.length, 0);
  assert.equal(status(host), 'Needs you cannot go further that way');
  await key(handle(host, 'a', 'move'), 'Enter');
  assert.equal(changes.length, 0);
  await unmount();
});

test('the canvas keeps no copy: a new items prop is what it shows', async () => {
  const { host, render, unmount } = await mount({});
  await render([{ id: 'a', col: 6, row: 3, w: 6, h: 1 }, LAYOUT[1]]);
  const style = host.querySelector('[data-canvas-id="a"]').getAttribute('style').replace(/\s/g, '');
  assert.ok(style.includes('--uix-dashboard-canvas-col:7') && style.includes('--uix-dashboard-canvas-row-start:4'), style);
  await unmount();
});

test('every word is overridable', async () => {
  const { host, unmount } = await mount({ labels: { move: '{label} verschieben', resize: 'Größe von {label} ändern', region: 'Layout' } });
  assert.equal(handle(host, 'a', 'move').getAttribute('aria-label'), 'Needs you verschieben');
  assert.equal(handle(host, 'a', 'resize').getAttribute('aria-label'), 'Größe von Needs you ändern');
  assert.equal(host.querySelector('.uix-dashboard-canvas').getAttribute('aria-label'), 'Layout');
  await unmount();
});
