/* OverflowRow (HAR-3072), in jsdom: one line of items that shows the ones that fit whole and
 * counts the rest. jsdom has no layout, so each element's width comes from a `data-w` attribute
 * (an item's from its child, the row's from the row) and resizing fires a fake ResizeObserver.
 *   1. overflowRowFit: all fit → all; otherwise the most that fit whole beside the counter, never
 *      fewer than one;
 *   2. five badges in a row wide enough for two show two and "+3"; widened, four and "+1";
 *      wide enough for all, no counter;
 *   3. the hidden items are aria-hidden and the counter's label names them;
 *   4. a server render shows every item and no counter.
 * Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const observers = [];

const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

class FakeResizeObserver {
  constructor(callback) { this.callback = callback; observers.push(this); }
  observe() {}
  disconnect() { observers.splice(observers.indexOf(this), 1); }
}

/** The fake layout: an element's width is its `data-w`, an item's its child's. */
const widthOf = (el) => {
  if (el.classList.contains('uix-overflow-row__item')) return Number(el.firstElementChild?.getAttribute('data-w') ?? 0);
  if (el.classList.contains('uix-overflow-row__probe')) return 24;
  return Number(el.getAttribute('data-w') ?? 0);
};

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  const proto = dom.window.HTMLElement.prototype;
  Object.defineProperty(proto, 'getBoundingClientRect', { configurable: true, value() { const w = widthOf(this); return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: 20, width: w, height: 20 }; } });
  Object.defineProperty(proto, 'scrollWidth', { configurable: true, get() { return widthOf(this); } });
  Object.defineProperty(proto, 'clientWidth', { configurable: true, get() { return widthOf(this); } });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  expose('ResizeObserver', FakeResizeObserver);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};

const ROLES = ['Change-Management', 'Mitarbeitende', 'Interne Revision', 'Servicedesk-Leitung', 'Auditor'];
const badges = () => ROLES.map((name) => h('span', { key: name, className: 'uix-pill', 'data-w': 80 }, name));
const row = (width) => h(ui.OverflowRow, { 'data-w': width, style: { columnGap: '4px' } }, badges());

const read = (host) => {
  const items = [...host.querySelectorAll('.uix-overflow-row__item')];
  const more = host.querySelector('.uix-overflow-row__more');
  return {
    shown: items.filter((el) => !el.hasAttribute('data-overflow-hidden')).map((el) => el.textContent),
    hiddenAriaHidden: items.filter((el) => el.hasAttribute('data-overflow-hidden')).every((el) => el.getAttribute('aria-hidden') === 'true'),
    counter: more?.querySelector('[aria-hidden="true"]')?.textContent ?? null,
    label: more?.querySelector('.uix-visually-hidden')?.textContent ?? null,
    title: more?.getAttribute('title') ?? null,
  };
};

const resize = (host, width) => {
  host.querySelector('.uix-overflow-row').setAttribute('data-w', String(width));
  act(() => { for (const o of [...observers]) o.callback([]); });
};

test('overflowRowFit shows all that fit, else the most that fit whole beside the counter, never fewer than one', () => {
  const five = [80, 80, 80, 80, 80];
  const counter = () => 24;
  assert.equal(ui.overflowRowFit(five, 200, 4, counter), 2);
  assert.equal(ui.overflowRowFit(five, 360, 4, counter), 4);
  assert.equal(ui.overflowRowFit(five, 416, 4, counter), 5);
  assert.equal(ui.overflowRowFit([300, 80], 200, 4, counter), 1);
  assert.equal(ui.overflowRowFit([], 200, 4, counter), 0);
  // the counter is part of the sum: two fit alone (164) but not beside a 40 px counter (208)
  assert.equal(ui.overflowRowFit([80, 80, 80], 200, 4, () => 40), 1);
});

test('five badges show what fits and count the rest, and re-fit when the row is resized', () => {
  const { host, unmount } = mount(row(200));
  let r = read(host);
  assert.deepEqual(r.shown, ROLES.slice(0, 2));
  assert.equal(r.counter, '+3');
  assert.equal(r.hiddenAriaHidden, true);
  assert.equal(r.label, '3 more: Interne Revision, Servicedesk-Leitung, Auditor');
  assert.equal(r.title, 'Interne Revision, Servicedesk-Leitung, Auditor');

  resize(host, 360);
  r = read(host);
  assert.deepEqual(r.shown, ROLES.slice(0, 4));
  assert.equal(r.counter, '+1');
  assert.equal(r.label, '1 more: Auditor');

  resize(host, 500);
  r = read(host);
  assert.deepEqual(r.shown, ROLES);
  assert.equal(r.counter, null);
  unmount();
});

test('a first badge wider than the row shows alone with the count; words are props', () => {
  const wide = [h('span', { key: 'a', 'data-w': 300 }, 'Change-Genehmigende (CAB)'), h('span', { key: 'b', 'data-w': 80 }, 'Mandantenadministration')];
  const { host, unmount } = mount(h(ui.OverflowRow, { 'data-w': 200, more: '+{count}', moreLabel: '{count} weitere: {items}' }, wide));
  const r = read(host);
  assert.deepEqual(r.shown, ['Change-Genehmigende (CAB)']);
  assert.equal(r.counter, '+1');
  assert.equal(r.label, '1 weitere: Mandantenadministration');
  unmount();
});

test('a server render shows every item and no counter', () => {
  const html = renderToStaticMarkup(row(200));
  for (const name of ROLES) assert.ok(html.includes(name), name);
  assert.ok(!html.includes('data-overflow-hidden'));
  assert.ok(!html.includes('uix-overflow-row__more'));
});
