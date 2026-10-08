/* HAR-1364 (TENSOR C8) — SchedulingTimeline in jsdom: placement, stacking and conflicts,
 * windows for screen readers, keyboard navigation and keyboard move/resize, and states.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let ui;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('requestAnimationFrame', (fn) => { fn(0); return 0; });
  expose('CSS', { escape: (s) => String(s).replace(/"/g, '\\"') });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'requestAnimationFrame', 'CSS', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, rerender: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const key = (el, k, mods = {}) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...mods })));

const range = { start: '2026-10-05T00:00:00Z', end: '2026-10-12T00:00:00Z' };
const lanes = [{ id: 'net', label: 'Network', meta: '3 changes' }, { id: 'db', label: 'Databases' }];
const items = [
  { id: 'a', laneId: 'net', title: 'Firewall rules', start: '2026-10-05T08:00:00Z', end: '2026-10-06T08:00:00Z' },
  { id: 'b', laneId: 'net', title: 'DNS cutover', start: '2026-10-05T20:00:00Z', end: '2026-10-07T00:00:00Z', state: 'conflicted' },
  { id: 'c', laneId: 'net', title: 'VPN upgrade', start: '2026-10-09T00:00:00Z', end: '2026-10-10T00:00:00Z' },
  { id: 'd', laneId: 'db', title: 'Index rebuild', start: '2026-10-09T06:00:00Z', end: '2026-10-09T12:00:00Z', movable: false },
];
const props = (extra = {}) => ({ lanes, items, range, timeZone: 'UTC', locale: 'en-GB', formatInstant: (iso) => iso.slice(0, 16).replace('T', ' '), ...extra });
const bar = (host, id) => host.querySelector(`[data-timeline-item="${id}"]`);

test('bars sit by time; overlapping bars stack and are flagged; lanes label their lists', () => {
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ overlays: [{ id: 'f', kind: 'freeze', label: 'Q4 freeze', start: '2026-10-10T00:00:00Z', end: '2026-10-12T00:00:00Z' }], markers: [{ id: 'm', label: 'Licence renewal', at: '2026-10-08T00:00:00Z' }] })));
  const slot = (id) => bar(host, id).closest('.uix-scheduling-timeline__slot');
  assert.equal(slot('a').style.left, `${(8 / 168) * 100}%`);
  assert.equal(slot('c').style.left, `${(96 / 168) * 100}%`);
  assert.equal(slot('a').style.getPropertyValue('--uix-timeline-row'), '0');
  assert.equal(slot('b').style.getPropertyValue('--uix-timeline-row'), '1', 'b overlaps a, so it stacks below');
  assert.ok(bar(host, 'a').hasAttribute('data-conflict') && bar(host, 'b').hasAttribute('data-conflict'));
  assert.ok(!bar(host, 'c').hasAttribute('data-conflict'));
  assert.equal(bar(host, 'a').getAttribute('aria-label'), 'Firewall rules, Scheduled, 2026-10-05 08:00 to 2026-10-06 08:00, overlaps another entry');
  const list = bar(host, 'a').closest('ul');
  assert.equal(document.getElementById(list.getAttribute('aria-labelledby')).textContent, 'Network3 changes');
  assert.equal(host.querySelectorAll('.uix-scheduling-timeline__tick').length, 8, 'a tick per day boundary');
  const windows = host.querySelector('.uix-visually-hidden ul');
  assert.match(windows.textContent, /Change freeze: Q4 freeze, 2026-10-10 00:00 – 2026-10-12 00:00/);
  assert.match(windows.textContent, /Licence renewal, 2026-10-08 00:00/);
  assert.equal(host.querySelectorAll('.uix-scheduling-timeline__overlay').length, 1, 'one band for the window, over both lanes (HAR-1521: 2.33 drew one per lane)');
  unmount();
});

test('one tab stop; arrows move between bars and lanes; Home/End', () => {
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props()));
  const tabbable = [...host.querySelectorAll('[data-timeline-item]')].filter((b) => b.tabIndex === 0);
  assert.deepEqual(tabbable.map((b) => b.dataset.timelineItem), ['a']);
  bar(host, 'a').focus();
  key(bar(host, 'a'), 'ArrowRight');
  assert.equal(document.activeElement, bar(host, 'b'));
  key(bar(host, 'b'), 'End');
  assert.equal(document.activeElement, bar(host, 'c'));
  key(bar(host, 'c'), 'ArrowDown');
  assert.equal(document.activeElement, bar(host, 'd'), 'the nearest bar in the next lane');
  key(bar(host, 'd'), 'ArrowUp');
  assert.equal(document.activeElement, bar(host, 'c'));
  key(bar(host, 'c'), 'Home');
  assert.equal(document.activeElement, bar(host, 'a'));
  unmount();
});

test('Shift+arrow moves by the step, Alt+Shift+arrow resizes, and the change is announced', () => {
  const moves = [];
  // HAR-1521 (PDR-0013): the end moves only with onResizeItem; 2.33 sent it through onMoveItem.
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ onMoveItem: (id, next) => moves.push([id, next]), onResizeItem: (id, next) => moves.push([id, next]) })));
  bar(host, 'a').focus();
  key(bar(host, 'a'), 'ArrowRight', { shiftKey: true });
  key(bar(host, 'a'), 'ArrowLeft', { shiftKey: true, altKey: true });
  assert.deepEqual(moves, [
    ['a', { start: '2026-10-05T09:00:00.000Z', end: '2026-10-06T09:00:00.000Z' }],
    ['a', { start: '2026-10-05T08:00:00.000Z', end: '2026-10-06T07:00:00.000Z' }],
  ], 'day scale moves by one hour');
  assert.equal(host.querySelector('[role="status"]').textContent, 'Firewall rules now ends 2026-10-06 07:00');
  assert.match(document.getElementById(bar(host, 'a').getAttribute('aria-describedby')).textContent, /Shift and an arrow key/);
  bar(host, 'd').focus();
  key(bar(host, 'd'), 'ArrowRight', { shiftKey: true });
  assert.equal(moves.length, 2, 'movable: false stays put');
  assert.equal(bar(host, 'd').getAttribute('aria-describedby'), null);
  unmount();
});

test('click selects; states for loading, error and an empty range', () => {
  const picked = [];
  const { host, rerender, unmount } = mount(h(ui.SchedulingTimeline, props({ onSelectItem: (item) => picked.push(item.id) })));
  act(() => bar(host, 'c').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  assert.deepEqual(picked, ['c']);
  rerender(h(ui.SchedulingTimeline, props({ loading: true })));
  assert.equal(host.querySelector('[role="status"]').textContent, 'Loading schedule…');
  const retries = [];
  rerender(h(ui.SchedulingTimeline, props({ error: 'Could not load changes.', onRetry: () => retries.push(1) })));
  assert.equal(host.querySelector('[role="alert"] p').textContent, 'Could not load changes.');
  act(() => host.querySelector('[role="alert"] button').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  assert.deepEqual(retries, [1]);
  rerender(h(ui.SchedulingTimeline, props({ items: [] })));
  assert.equal(host.querySelector('.uix-scheduling-timeline__empty').textContent, 'Nothing is scheduled in this range.');
  unmount();
});

test('hour scale, the now line, and translated labels', () => {
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({
    range: { start: '2026-10-05T06:00:00Z', end: '2026-10-05T12:00:00Z' }, scale: 'hour', now: '2026-10-05T09:30:00Z',
    labels: { now: 'Jetzt', region: 'Zeitplan in {timeZone}' },
  })));
  assert.equal(host.querySelector('section').getAttribute('aria-label'), 'Zeitplan in UTC');
  assert.equal(host.querySelectorAll('.uix-scheduling-timeline__row--axis .uix-scheduling-timeline__tick').length, 7);
  const nowLine = host.querySelector('.uix-scheduling-timeline__now');
  assert.equal(nowLine.style.left, '58.333333333333336%');
  assert.equal(nowLine.textContent, 'Jetzt');
  unmount();
});
