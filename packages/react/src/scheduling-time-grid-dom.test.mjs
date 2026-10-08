/* HAR-1509 (U3) — the Week/Day time grid of SchedulingCalendar, in jsdom. AC numbers are the
 * slice's. jsdom has no layout, so the column rectangles a drag needs are stubbed below; real
 * pointer travel, Enter on a button, lane width and the fold are measured in a browser
 * (tests/a11y/scheduling-time-grid.spec.mjs). The suite re-runs under three TZ values
 * (scheduling-calendar-zones.test.mjs).
 *
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import * as ui_react from 'react';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let ui;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
const HOUR_PX = 48;
const COLUMN_PX = 100;

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  // Layout stand-in: day column n is 100 px wide from x = 100·n, and an hour is 48 px tall.
  const original = dom.window.HTMLElement.prototype.getBoundingClientRect;
  dom.window.HTMLElement.prototype.getBoundingClientRect = function rect() {
    if (!this.hasAttribute('data-tg-column')) return original.call(this);
    const columns = [...this.parentElement.querySelectorAll('[data-tg-column]')];
    const index = columns.indexOf(this);
    const hours = Number(this.style.getPropertyValue('--uix-scheduling-calendar-hours'));
    const left = index * COLUMN_PX;
    return { left, right: left + COLUMN_PX, top: 0, bottom: hours * HOUR_PX, width: COLUMN_PX, height: hours * HOUR_PX, x: left, y: 0, toJSON() {} };
  };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, root, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })));
const key = (el, name, shiftKey = false) => {
  const event = new window.KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(event); });
  return event;
};
const pointer = (target, type, clientX, clientY) => {
  const event = new window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX, clientY });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  act(() => { target.dispatchEvent(event); });
};
/** Press at (x, y) on `el`, travel to (toX, toY) in two steps, release. */
const drag = (el, [x, y], [toX, toY]) => {
  pointer(el, 'pointerdown', x, y);
  pointer(window, 'pointermove', (x + toX) / 2, (y + toY) / 2);
  pointer(window, 'pointermove', toX, toY);
  pointer(window, 'pointerup', toX, toY);
};

const BERLIN = 'Europe/Berlin';
const summer = (date, time) => new Date(`${date}T${time}:00+02:00`).toISOString();
const winter = (date, time) => new Date(`${date}T${time}:00+01:00`).toISOString();
const item = (id, date, from, to, extra = {}) => ({ id, title: `Item ${id}`, start: summer(date, from), end: summer(to <= from ? nextDay(date) : date, to), ...extra });
const nextDay = (date) => new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const base = { anchorDate: '2026-10-07', timeZone: BERLIN, locale: 'en-GB', timeGrid: true, view: 'week', entries: [] };
const cls = (name) => `.uix-scheduling-calendar__${name}`;
const column = (host, date) => host.querySelector(`[data-tg-column="${date}"]`);
const offset = (el) => Number(el.style.getPropertyValue('--uix-scheduling-calendar-offset'));
const length = (el) => Number(el.style.getPropertyValue('--uix-scheduling-calendar-length'));
const gutterHours = (host) => [...host.querySelectorAll(`${cls('tg-gutter')} ${cls('tg-hour')}`)];

test('the zone wrapper really changed the process time zone', () => {
  const expected = process.env.UIX_EXPECT_TZ_OFFSET;
  if (expected === undefined) return;
  assert.equal(String(new Date('2026-01-15T12:00:00Z').getTimezoneOffset()), expected);
});

test('the time grid is opt-in: view="week" without timeGrid stays seven day cells', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, timeGrid: false, entries: [item('a', '2026-10-07', '09:00', '10:00')] }));
  assert.equal(host.querySelector(cls('timegrid')), null);
  assert.equal(host.querySelectorAll(cls('day')).length, 7);
  unmount();
});

test('AC1 (R4 AC1 / R14 AC3): Day 29.03.2026 has 23 hour rows and no "02"; a 03:00 item sits under "03"', () => {
  const entries = [{ id: 'a', title: 'Three', start: summer('2026-03-29', '03:00'), end: summer('2026-03-29', '04:00') }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, view: 'day', anchorDate: '2026-03-29', entries }));
  const hours = gutterHours(host);
  assert.equal(hours.length, 23);
  assert.equal(hours.some((hour) => hour.getAttribute('data-hour') === '02'), false);
  const three = hours.find((hour) => hour.getAttribute('data-hour') === '03');
  assert.equal(offset(host.querySelector('[data-item-id="a"]')), offset(three), 'exactly under the 03 line');
  assert.equal(Number(column(host, '2026-03-29').style.getPropertyValue('--uix-scheduling-calendar-hours')), 23, 'the column is 23 hours tall');
  unmount();
});

test('AC1: Day 25.10.2026 has 25 hour rows, "02" twice, each with its offset', () => {
  const entries = [{ id: 'a', title: 'Three', start: winter('2026-10-25', '03:00'), end: winter('2026-10-25', '04:00') }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, view: 'day', anchorDate: '2026-10-25', entries }));
  const hours = gutterHours(host);
  assert.equal(hours.length, 25);
  const twos = hours.filter((hour) => hour.getAttribute('data-hour') === '02');
  assert.deepEqual(twos.map((hour) => hour.textContent), ['02+02:00', '02+01:00']);
  assert.equal(hours.filter((hour) => hour.querySelector(cls('tg-offset'))).length, 2, 'only the repeated hour is annotated');
  assert.equal(offset(host.querySelector('[data-item-id="a"]')), offset(hours.find((hour) => hour.getAttribute('data-hour') === '03')));
  unmount();
});

test('AC1: Week shows seven day labels through formatDate, and a clock-change day writes its own hours', () => {
  const seen = [];
  const formatDate = (date, part) => { seen.push(part); const [, m, d] = date.split('-'); return part === 'column' ? `D ${d}.${m}` : date; };
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, anchorDate: '2026-10-22', formatDate }));
  const heads = [...host.querySelectorAll(`${cls('tg-dayhead')} ${cls('date')}`)].map((button) => button.textContent);
  assert.deepEqual(heads, ['D 19.10', 'D 20.10', 'D 21.10', 'D 22.10', 'D 23.10', 'D 24.10', 'D 25.10']);
  assert.ok(seen.includes('column'));
  assert.equal(gutterHours(host).length, 24, 'the gutter shows the hours six of the seven days share');
  const sunday = column(host, '2026-10-25');
  assert.equal(sunday.querySelectorAll(cls('tg-hour--inline')).length, 25, 'the 25-hour day labels its own rows');
  assert.equal(column(host, '2026-10-24').querySelectorAll(cls('tg-hour--inline')).length, 0);
  unmount();
});

test('AC2 (R4 AC2): a 22:00 item on 24.10.2026 moved one day by keyboard proposes 25.10. 22:00 local', () => {
  const calls = [];
  const entries = [{ id: 'm', title: 'Late', start: summer('2026-10-24', '22:00'), end: summer('2026-10-24', '23:00') }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, anchorDate: '2026-10-24', entries, canMove: true, onProposeMove: (id, proposal) => calls.push([id, proposal]) }));
  const el = host.querySelector('[data-item-id="m"]');
  key(el, 'ArrowRight', true);
  assert.deepEqual(calls, [], 'nothing is sent while the move is pending');
  key(el, 'Enter');
  assert.deepEqual(calls, [['m', { start: '2026-10-25T21:00:00.000Z', end: '2026-10-25T22:00:00.000Z', adjusted: null }]]);
  unmount();
});

test('AC3 (R4 AC3, E12): 22:00–00:00 only on its start day; 23:00 → 02:00 is one focusable start part and a hidden continuation', () => {
  const calls = [];
  const entries = [item('eve', '2026-10-07', '22:00', '00:00'), item('night', '2026-10-07', '23:00', '02:00')];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, canMove: true, onProposeMove: (id, proposal) => calls.push([id, proposal]) }));
  assert.equal(host.querySelectorAll('[data-item-id="eve"]').length, 1);
  assert.equal(column(host, '2026-10-08').querySelector('[data-continuation-of="eve"]'), null, 'nothing of it on the next day');
  const starts = host.querySelectorAll('[data-item-id="night"]');
  assert.equal(starts.length, 1, 'exactly one element carries the id');
  const [start] = starts;
  assert.equal(start.tagName, 'BUTTON');
  assert.equal(start.getAttribute('data-part'), 'start');
  assert.equal(start.closest('[data-tg-column]').getAttribute('data-tg-column'), '2026-10-07');
  assert.match(start.getAttribute('aria-label'), /Item night/);
  const continuation = column(host, '2026-10-08').querySelector('[data-continuation-of="night"]');
  assert.equal(continuation.tagName, 'DIV', 'not a control');
  assert.equal(continuation.getAttribute('aria-hidden'), 'true');
  assert.equal(continuation.hasAttribute('tabindex'), false);
  assert.equal(continuation.hasAttribute('aria-label'), false, 'one accessible name, on the start part');
  assert.match(continuation.textContent, /from 23:00/);
  assert.deepEqual([offset(continuation), length(continuation)], [0, 2]);
  // Dragging the continuation one hour down moves the whole window.
  drag(continuation, [350, 20], [350, 20 + HOUR_PX]);
  assert.deepEqual(calls, [['night', { start: summer('2026-10-08', '00:00'), end: summer('2026-10-08', '03:00'), adjusted: null }]]);
  unmount();
});

test('AC4 (R4 AC6): a keyboard move into the 29.03. gap hour proposes 03:30 and says so', () => {
  const calls = [];
  const entries = [{ id: 'g', title: 'Gap', start: winter('2026-03-28', '02:30'), end: winter('2026-03-28', '02:45') }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, anchorDate: '2026-03-28', entries, canMove: true, onProposeMove: (id, proposal) => calls.push(proposal) }));
  const el = host.querySelector('[data-item-id="g"]');
  key(el, 'ArrowRight', true);
  const live = host.querySelector('[aria-live="polite"]');
  assert.match(live.textContent, /does not exist/);
  assert.match(live.textContent, /03:30/);
  key(el, 'Enter');
  assert.deepEqual(calls, [{ start: summer('2026-03-29', '03:30'), end: summer('2026-03-29', '03:45'), adjusted: 'gap_forward' }]);
  unmount();
});

test('AC5 (R4 AC9): the head of the hour axis names the display zone', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, timeZone: 'Asia/Kolkata' }));
  assert.equal(host.querySelector(cls('tg-zone')).textContent, 'Asia/Kolkata');
  unmount();
});

const topLaneEntries = [
  { id: 'long', title: 'Thirty hours', start: summer('2026-10-06', '08:00'), end: summer('2026-10-07', '14:00') },
  { id: 'deep', title: 'Seven past midnight', start: summer('2026-10-08', '23:00'), end: summer('2026-10-09', '07:00') },
  item('night', '2026-10-05', '23:00', '02:00'),
];

test('AC6 (E12): a 30 h item and one running 7 h past midnight are in the top lane; 23:00 → 02:00 is not', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: topLaneEntries }));
  const top = host.querySelector(cls('tg-top'));
  assert.deepEqual([...top.querySelectorAll('[data-item-id]')].map((el) => el.getAttribute('data-item-id')), ['long', 'deep']);
  assert.equal(host.querySelector(`${cls('tg-body')} [data-item-id="long"]`), null);
  assert.equal(host.querySelector(`${cls('tg-body')} [data-item-id="night"]`).getAttribute('data-part'), 'start');
  assert.equal(top.querySelector('[data-item-id="long"]').style.gridColumn, '3 / 5', 'Tuesday and Wednesday (the axis is column 1)');
  unmount();
});

test('AC6 (E12): a top-lane span drags by whole days only, and Shift+Down moves the whole window by the step', () => {
  const calls = [];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: topLaneEntries, canMove: true, onProposeMove: (id, proposal) => calls.push([id, proposal]) }));
  const span = host.querySelector(`${cls('tg-top')} [data-item-id="long"]`);
  // One column right, and a long way down: only the column counts.
  drag(span, [150, 5], [250, 400]);
  assert.deepEqual(calls, [['long', { start: summer('2026-10-07', '08:00'), end: summer('2026-10-08', '14:00'), adjusted: null }]]);
  calls.length = 0;
  drag(span, [150, 5], [150, 300]);
  assert.deepEqual(calls, [], 'vertical movement alone proposes nothing');
  key(span, 'ArrowDown', true);
  key(span, 'Enter');
  assert.deepEqual(calls, [['long', { start: summer('2026-10-06', '08:15'), end: summer('2026-10-07', '14:15'), adjusted: null }]]);
  unmount();
});

test('AC7 (R14 AC2): the consumer is told how many lines fit, and a marker on the smallest item is still drawn', () => {
  const lines = new Map();
  const marker = { id: 'k', label: 'Flagged', emphasis: 'warning' };
  const entries = [
    item('quarter', '2026-10-07', '08:00', '08:15', { markers: [marker] }),
    item('half', '2026-10-07', '09:00', '09:30'),
    item('threequarter', '2026-10-07', '10:00', '10:45'),
    item('hour', '2026-10-07', '11:00', '12:00'),
    item('two', '2026-10-07', '13:00', '15:00'),
  ];
  const withRender = mount(h(ui.SchedulingCalendar, { ...base, entries, renderEntry: (entry, context) => { lines.set(entry.id, context?.availableLines); return entry.title; } }));
  assert.deepEqual([...lines], [['quarter', 0], ['half', 1], ['threequarter', 2], ['hour', 2], ['two', 5]]);
  withRender.unmount();
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries }));
  const tiny = host.querySelector('[data-item-id="quarter"]');
  assert.equal(tiny.querySelector(cls('entry-text')), null, 'no text where no line fits: never a cut-off label');
  assert.equal(tiny.querySelector(cls('marker')).getAttribute('data-emphasis'), 'warning', 'the marker stays');
  assert.match(tiny.getAttribute('aria-label'), /Item quarter.*Flagged/, 'and the name is complete');
  for (const id of ['half', 'threequarter', 'hour', 'two']) {
    const text = host.querySelector(`[data-item-id="${id}"] ${cls('entry-text')}`).textContent;
    assert.ok(text.length >= 4, `${id}: "${text}"`);
    assert.match(text, /^\d\d:\d\d Item/);
  }
  unmount();
});

test('AC8 (R14 AC4 / R17 AC1): a 350-event week renders fewer than 3,000 elements', () => {
  const start = Date.parse('2026-10-05T04:00:00Z');
  const entries = Array.from({ length: 350 }, (_, i) => {
    const from = start + (i % 7) * 86_400_000 + ((i * 37) % 60) * 15 * 60_000;
    return { id: `e${i}`, title: `Event ${i}`, start: new Date(from).toISOString(), end: new Date(from + (1 + (i % 4)) * 30 * 60_000).toISOString(), band: i % 11 === 0 ? 'high' : 'none' };
  });
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, canMove: true, onProposeMove: () => {}, now: '2026-10-07T10:00:00Z' }));
  const drawn = host.querySelectorAll(`${cls('tg-body')} [data-item-id]`).length;
  assert.ok(drawn >= 60, `drawn ${drawn} items`);
  const elements = host.querySelectorAll('*').length;
  assert.ok(elements < 3000, `${elements} elements`);
  assert.equal(host.querySelectorAll(`${cls('tg-column')} > :not([data-item-id]):not([data-continuation-of]):not(${cls('tg-now')})`).length, 0, 'no element per hour line');
  unmount();
});

test('AC9 (R14 AC8): with canMove={false} there is no move affordance of any kind', () => {
  const calls = [];
  const selected = [];
  const entries = [item('a', '2026-10-07', '09:00', '10:00'), ...topLaneEntries];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, canMove: false, onProposeMove: (id) => calls.push(id), onSelectEntry: (entry) => selected.push(entry.id) }));
  assert.equal(host.querySelectorAll('[data-movable]').length, 0, 'no grab cursor hook');
  assert.equal(host.querySelectorAll('[aria-describedby]').length, 0, 'no move hint');
  assert.doesNotMatch(host.textContent, /Shift/);
  const el = host.querySelector('[data-item-id="a"]');
  const down = key(el, 'ArrowDown', true);
  assert.equal(down.defaultPrevented, false, 'the key is not bound');
  key(el, 'Enter');
  drag(el, [250, 440], [250, 540]);
  drag(host.querySelector('[data-item-id="long"]'), [150, 5], [350, 5]);
  assert.deepEqual(calls, []);
  assert.equal(host.querySelector(cls('tg-ghost')), null);
  click(el);
  assert.deepEqual(selected, ['a'], 'activation still works');
  unmount();
  const without = mount(h(ui.SchedulingCalendar, { ...base, entries, canMove: true }));
  assert.equal(without.host.querySelectorAll('[data-movable]').length, 0, 'canMove without onProposeMove moves nothing either');
  without.unmount();
  const pinned = mount(h(ui.SchedulingCalendar, { ...base, entries: [item('p', '2026-10-07', '09:00', '10:00', { movable: false }), item('q', '2026-10-07', '11:00', '12:00')], canMove: true, onProposeMove: () => {} }));
  assert.deepEqual([...pinned.host.querySelectorAll('[data-movable]')].map((node) => node.getAttribute('data-item-id')), ['q'], 'movable: false pins one entry');
  pinned.unmount();
});

test('AC10 (R25 AC1 / AC4): keys build a pending proposal; Enter sends it once, Escape drops it, a drop sends once', () => {
  const calls = [];
  const selected = [];
  const entries = [item('a', '2026-10-07', '09:00', '10:00')];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, canMove: true, onProposeMove: (id, proposal) => { calls.push([id, proposal]); }, onSelectEntry: (entry) => selected.push(entry.id) }));
  const el = host.querySelector('[data-item-id="a"]');
  assert.ok(document.getElementById(el.getAttribute('aria-describedby')).textContent.length > 10, 'the move hint is the description');
  for (let i = 0; i < 4; i++) key(el, 'ArrowDown', true);
  assert.deepEqual(calls, [], 'four key presses call nothing');
  const ghost = host.querySelector(cls('tg-ghost'));
  assert.deepEqual([offset(ghost), length(ghost)], [10, 1], 'the outline is one hour later');
  assert.equal(ghost.getAttribute('aria-hidden'), 'true');
  assert.equal(offset(el), 9, 'the item has not moved');
  const enter = key(el, 'Enter');
  assert.equal(enter.defaultPrevented, true, 'Enter confirms the move; it does not also activate the item');
  assert.deepEqual(calls, [['a', { start: summer('2026-10-07', '10:00'), end: summer('2026-10-07', '11:00'), adjusted: null }]]);
  assert.equal(host.querySelector(cls('tg-ghost')), null);
  assert.equal(offset(el), 9, 'the props did not change, so the item is where it was');
  assert.deepEqual(selected, []);

  calls.length = 0;
  key(el, 'ArrowUp', true);
  assert.ok(host.querySelector(cls('tg-ghost')));
  const escape = key(el, 'Escape');
  assert.equal(escape.defaultPrevented, true);
  assert.equal(host.querySelector(cls('tg-ghost')), null);
  key(el, 'Enter');
  assert.deepEqual(calls, [], 'Escape dropped the proposal');
  const idle = key(el, 'Escape');
  assert.equal(idle.defaultPrevented, false, 'with nothing pending Escape belongs to the consumer');

  // A drag: 28 px is 35 minutes, snapped to 30 by the 15-minute step; one column right is +1 day.
  pointer(el, 'pointerdown', 250, 440);
  pointer(window, 'pointermove', 252, 441);
  assert.equal(host.querySelector(cls('tg-ghost')), null, 'under 4 px is not a drag');
  pointer(window, 'pointermove', 300, 455);
  pointer(window, 'pointermove', 350, 468);
  assert.deepEqual(calls, [], 'nothing is called while the pointer travels');
  assert.ok(host.querySelector(cls('tg-ghost')));
  pointer(window, 'pointerup', 350, 468);
  assert.deepEqual(calls, [['a', { start: summer('2026-10-08', '09:30'), end: summer('2026-10-08', '10:30'), adjusted: null }]]);
  click(el);
  assert.deepEqual(selected, [], 'the click that ends a drag is not an activation');
  unmount();
});

test('AC10: after a proposal whose promise rejects the item is at its original position and the outline is gone', async () => {
  let reject;
  const entries = [item('a', '2026-10-07', '09:00', '10:00')];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, canMove: true, onProposeMove: () => new Promise((_, no) => { reject = no; }) }));
  const el = host.querySelector('[data-item-id="a"]');
  key(el, 'ArrowDown', true);
  key(el, 'Enter');
  const waiting = host.querySelector(cls('tg-ghost'));
  assert.equal(waiting.hasAttribute('data-sent'), true, 'the outline waits for the answer');
  assert.equal(offset(el), 9);
  await act(async () => { reject(new Error('refused')); await Promise.resolve(); });
  assert.equal(host.querySelector(cls('tg-ghost')), null);
  assert.equal(offset(host.querySelector('[data-item-id="a"]')), 9);
  unmount();
});

test('AC11 (R20 AC1 / AC2): a click on a grid item, a continuation or a top-lane span activates it', () => {
  const selected = [];
  const entries = [item('a', '2026-10-07', '09:00', '10:00'), ...topLaneEntries];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, canMove: true, onProposeMove: () => {}, onSelectEntry: (entry) => selected.push(entry.id) }));
  click(host.querySelector('[data-item-id="a"]'));
  click(host.querySelector('[data-continuation-of="night"]'));
  click(host.querySelector(`${cls('tg-top')} [data-item-id="long"]`));
  assert.deepEqual(selected, ['a', 'night', 'long']);
  // A press that travels under 4 px is still a click.
  const el = host.querySelector('[data-item-id="a"]');
  pointer(el, 'pointerdown', 250, 440);
  pointer(window, 'pointermove', 252, 442);
  pointer(window, 'pointerup', 252, 442);
  click(el);
  assert.deepEqual(selected, ['a', 'night', 'long', 'a']);
  for (const node of host.querySelectorAll(`${cls('tg-body')} button${cls('entry')}, ${cls('tg-top')} button${cls('entry')}`)) assert.ok(node.getAttribute('data-item-id'));
  unmount();
});

test('AC12 (NEW-1): the column "+N" is the consumer overflowCount and calls onShowMore with the day', () => {
  const more = [];
  const entries = [item('a', '2026-10-07', '09:00', '10:00'), item('b', '2026-10-07', '11:00', '12:00'), item('c', '2026-10-07', '13:00', '14:00'), { id: 'top', title: 'Long', start: summer('2026-10-07', '06:00'), end: summer('2026-10-08', '12:00') }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, days: { '2026-10-07': { count: 6, overflowCount: 2, label: '6 items' } }, onShowMore: (date) => more.push(date) }));
  const head = host.querySelector(`${cls('tg-dayhead')}[data-date="2026-10-07"]`);
  const button = head.querySelector(cls('more'));
  assert.equal(button.textContent, '+2');
  click(button);
  assert.deepEqual(more, ['2026-10-07']);
  assert.equal(host.querySelector(`${cls('tg-dayhead')}[data-date="2026-10-08"] ${cls('more')}`), null);
  unmount();
});

test('without consumer counts the column "+N" is what the lanes could not show', () => {
  const entries = ['09:00', '09:10', '09:20', '09:30'].map((from, i) => item(`o${i}`, '2026-10-07', from, '11:00'));
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, maxLanes: 2, onShowMore: () => {} }));
  assert.equal(host.querySelector(`${cls('tg-dayhead')}[data-date="2026-10-07"] ${cls('more')}`).textContent, '+2');
  assert.equal(column(host, '2026-10-07').querySelectorAll('[data-item-id]').length, 2);
  unmount();
});

const hold = (id, from, to, extra = {}) => ({ id, label: `Window ${id}`, kindLabel: 'Hold', start: summer(from, '06:00'), end: summer(to, '18:00'), pattern: 'diagonal', ...extra });

test('AC13 (R21 AC1–AC3, AC6): each window is one focusable, named element; only a global one shades the grid', () => {
  const selected = [];
  const overlays = [
    hold('scoped', '2026-10-06', '2026-10-08', { label: 'Payroll lock', scopeLabel: 'Payroll services', global: false, pattern: 'cross' }),
    hold('global', '2026-10-08', '2026-10-09', { label: 'Quarter close', kindLabel: 'Pause', global: true }),
  ];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, overlays, onSelectOverlay: (overlay) => selected.push(overlay.id) }));
  const scoped = host.querySelectorAll('[data-overlay-id="scoped"]');
  assert.equal(scoped.length, 1, 'three days, one element');
  const [band] = scoped;
  assert.equal(band.tagName, 'BUTTON');
  assert.equal(band.style.gridColumn, '3 / 6');
  for (const part of ['Hold', 'Payroll lock', 'Payroll services']) { assert.match(band.getAttribute('aria-label'), new RegExp(part)); assert.match(band.textContent, new RegExp(part)); }
  assert.match(band.getAttribute('aria-label'), /6 October 2026 06:00 to .*8 October 2026 18:00/);
  assert.equal(band.getAttribute('title'), null);
  assert.equal(band.hasAttribute('data-global'), false);
  click(band);
  assert.deepEqual(selected, ['scoped']);
  const shades = host.querySelectorAll(cls('tg-shade'));
  assert.equal(shades.length, 1, 'one shading element, for the global window only');
  assert.equal(shades[0].getAttribute('aria-hidden'), 'true');
  assert.equal(shades[0].style.gridColumn, '5 / 7', 'Thursday and Friday');
  unmount();
});

test('AC13 (FG-UX-3): three windows over one week with two lanes — the third is behind "+1 windows"', () => {
  const more = [];
  const overlays = [hold('a', '2026-10-05', '2026-10-09'), hold('b', '2026-10-06', '2026-10-08'), hold('c', '2026-10-07', '2026-10-10')];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, overlays, onShowMore: (date) => more.push(date) }));
  assert.equal(host.querySelectorAll(`${cls('tg-strip')} ${cls('window')}`).length, 2);
  assert.equal(host.querySelector('[data-overlay-id="c"]'), null);
  const button = host.querySelector(`${cls('tg-strip')} ${cls('rowmore')}`);
  assert.equal(button.textContent, '+1 windows');
  click(button);
  assert.deepEqual(more, ['2026-10-07']);
  unmount();
});

test('AC14 (R9 AC5): an empty week still draws seven day columns, with the note', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, emptyNote: 'Nothing is scheduled this week.' }));
  assert.equal(host.querySelectorAll(cls('tg-column')).length, 7);
  assert.equal(host.querySelector(`${cls('timegrid')} ${cls('empty')}`).textContent, 'Nothing is scheduled this week.');
  assert.equal(host.querySelector(cls('tg-strip')), null, 'no empty strip takes height');
  unmount();
});

test('AC17 (R12 AC2): a day header shows the consumer count and the marker with its text; its name is the consumer label', () => {
  const icon = h('svg', { 'data-test-icon': '' });
  const days = { '2026-10-07': { count: 6, overflowCount: 0, label: 'Wednesday 7 October, 6 items, 1 needs attention', markers: [{ id: 'm', label: 'Needs attention', emphasis: 'warning', icon }] } };
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, days }));
  const head = host.querySelector(`${cls('tg-dayhead')}[data-date="2026-10-07"]`);
  assert.equal(head.getAttribute('role'), 'group');
  assert.equal(head.getAttribute('aria-label'), 'Wednesday 7 October, 6 items, 1 needs attention');
  assert.equal(head.querySelector(cls('count')).textContent, '6');
  assert.ok(head.querySelector(`${cls('marker')} [data-test-icon]`), 'the icon');
  assert.equal(head.querySelector(cls('marker-label')).textContent, 'Needs attention', 'and the text, visible');
  unmount();
});

test('AC18 (R14): now inside the week draws one line in the column of its zoned day; outside, none', () => {
  // 22:30Z on 07.10. is 00:30 on 08.10. in Europe/Berlin.
  const inside = mount(h(ui.SchedulingCalendar, { ...base, now: '2026-10-07T22:30:00Z' }));
  const lines = inside.host.querySelectorAll(cls('tg-now'));
  assert.equal(lines.length, 1);
  assert.equal(lines[0].closest('[data-tg-column]').getAttribute('data-tg-column'), '2026-10-08');
  assert.equal(offset(lines[0]), 0.5);
  assert.equal(lines[0].getAttribute('aria-hidden'), 'true');
  inside.unmount();
  const outside = mount(h(ui.SchedulingCalendar, { ...base, now: '2026-11-01T10:00:00Z' }));
  assert.equal(outside.host.querySelector(cls('tg-now')), null);
  outside.unmount();
});

test('the built-in header offers Day with the time grid, and steps a day at a time', () => {
  const anchors = [];
  const views = [];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, view: 'day', onAnchorDateChange: (date) => anchors.push(date), onViewChange: (view) => views.push(view) }));
  const buttons = [...host.querySelectorAll(`${cls('header')} .uix-btn`)];
  assert.deepEqual(buttons.map((button) => button.textContent), ['Previous day', 'Next day']);
  click(buttons[1]);
  assert.deepEqual(anchors, ['2026-10-08']);
  const options = [...host.querySelectorAll('.uix-segmented__option')];
  assert.deepEqual(options.map((option) => [option.textContent, option.getAttribute('aria-pressed')]), [['Month', 'false'], ['Week', 'false'], ['Day', 'true'], ['Agenda', 'false']]);
  click(options[1]);
  assert.deepEqual(views, ['week']);
  assert.equal(host.querySelectorAll(cls('tg-column')).length, 1);
  unmount();
  const plain = mount(h(ui.SchedulingCalendar, { ...base, timeGrid: false, view: 'month' }));
  assert.deepEqual([...plain.host.querySelectorAll('.uix-segmented__option')].map((option) => option.textContent), ['Month', 'Week', 'Agenda'], 'unchanged without the time grid');
  plain.unmount();
});

/* Found in review of PR #105. */

test('a midnight-crosser whose first day is off screen is still one named tab stop', () => {
  const selected = [];
  const entries = [item('night', '2026-10-07', '23:00', '02:00'), item('sunday', '2026-10-04', '23:30', '01:00')];
  const day = mount(h(ui.SchedulingCalendar, { ...base, view: 'day', anchorDate: '2026-10-08', entries, onSelectEntry: (entry) => selected.push(entry.id) }));
  const alone = day.host.querySelectorAll('[data-item-id="night"]');
  assert.equal(alone.length, 1);
  assert.equal(alone[0].tagName, 'BUTTON', 'the only part on screen is the control');
  assert.equal(alone[0].getAttribute('data-part'), 'continuation');
  assert.equal(alone[0].hasAttribute('aria-hidden'), false);
  assert.match(alone[0].getAttribute('aria-label'), /Item night/);
  assert.match(alone[0].textContent, /from 23:00/);
  assert.match(alone[0].textContent, /Item night/);
  click(alone[0]);
  assert.deepEqual(selected, ['night']);
  day.unmount();
  // The same in a week: Monday holds the tail of a Sunday-night item; Wednesday's item keeps its two parts.
  const week = mount(h(ui.SchedulingCalendar, { ...base, entries }));
  const monday = column(week.host, '2026-10-05').querySelector('[data-item-id="sunday"]');
  assert.equal(monday.tagName, 'BUTTON');
  assert.equal(week.host.querySelectorAll('[data-item-id="night"]').length, 1);
  assert.equal(week.host.querySelector('[data-continuation-of="night"]').getAttribute('aria-hidden'), 'true');
  week.unmount();
});

test('input the month tolerates does not throw in the time grid: an inverted all-day entry, repeated ids', () => {
  const entries = [
    { id: 'inv', title: 'Inverted', start: summer('2026-10-07', '10:00'), end: summer('2026-10-06', '10:00'), allDay: true },
    { id: 'dup', title: 'First', start: summer('2026-10-08', '00:00'), end: summer('2026-10-09', '00:00'), allDay: true },
    { id: 'dup', title: 'Second', start: summer('2026-10-08', '00:00'), end: summer('2026-10-09', '00:00'), allDay: true },
  ];
  const overlays = [hold('w', '2026-10-06', '2026-10-07'), hold('w', '2026-10-08', '2026-10-09', { label: 'Repeat' })];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, overlays }));
  assert.equal(host.querySelectorAll('[data-item-id="inv"]').length, 1);
  const dup = host.querySelectorAll('[data-item-id="dup"]');
  assert.equal(dup.length, 1);
  assert.match(dup[0].textContent, /First/);
  assert.equal(host.querySelectorAll('[data-overlay-id="w"]').length, 1);
  unmount();
});

test('Escape during a drag drops the move, and letting go over the item afterwards is not a click', () => {
  const calls = [];
  const selected = [];
  const entries = [item('a', '2026-10-07', '09:00', '11:00')];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, canMove: true, onProposeMove: (id) => calls.push(id), onSelectEntry: (entry) => selected.push(entry.id) }));
  const el = host.querySelector('[data-item-id="a"]');
  pointer(el, 'pointerdown', 250, 440);
  pointer(window, 'pointermove', 250, 470);
  assert.ok(host.querySelector(cls('tg-ghost')));
  act(() => { window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
  assert.equal(host.querySelector(cls('tg-ghost')), null, 'the outline goes at once');
  pointer(window, 'pointermove', 250, 500);
  assert.equal(host.querySelector(cls('tg-ghost')), null, 'and does not come back while the button is down');
  pointer(window, 'pointerup', 250, 500);
  click(el);
  assert.deepEqual(calls, []);
  assert.deepEqual(selected, [], 'the release is not an activation');
  click(el);
  assert.deepEqual(selected, ['a'], 'the next real click is');
  unmount();
});

test('a mouse move with no button down ends a drag whose release was never seen', () => {
  const calls = [];
  const entries = [item('a', '2026-10-07', '09:00', '11:00')];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, canMove: true, onProposeMove: (id) => calls.push(id) }));
  const el = host.querySelector('[data-item-id="a"]');
  pointer(el, 'pointerdown', 250, 440);
  pointer(window, 'pointermove', 250, 490);
  const stray = new window.MouseEvent('pointermove', { bubbles: true, clientX: 260, clientY: 500, buttons: 0 });
  Object.defineProperty(stray, 'pointerId', { value: 1 });
  Object.defineProperty(stray, 'pointerType', { value: 'mouse' });
  act(() => { window.dispatchEvent(stray); });
  assert.equal(host.querySelector(cls('tg-ghost')), null);
  pointer(window, 'pointerup', 260, 500);
  assert.deepEqual(calls, [], 'a later, unrelated release proposes nothing');
  unmount();
});

test('the outline of a sent move stays at the window asked for, even when the consumer moves the item first', async () => {
  let settle;
  const first = item('a', '2026-10-07', '09:00', '10:00');
  const props = { ...base, canMove: true, onProposeMove: () => new Promise((yes) => { settle = yes; }) };
  const { host, root, unmount } = mount(h(ui.SchedulingCalendar, { ...props, entries: [first] }));
  const el = host.querySelector('[data-item-id="a"]');
  key(el, 'ArrowDown', true);
  key(el, 'Enter');
  // The consumer applies the move optimistically while its request is still open.
  act(() => root.render(h(ui.SchedulingCalendar, { ...props, entries: [item('a', '2026-10-07', '09:15', '10:15')] })));
  assert.equal(offset(host.querySelector('[data-item-id="a"]')), 9.25);
  assert.equal(offset(host.querySelector(cls('tg-ghost'))), 9.25, 'the outline is the proposal, not the proposal applied twice');
  await act(async () => { settle(); await Promise.resolve(); });
  assert.equal(host.querySelector(cls('tg-ghost')), null);
  unmount();
});

test('a pending move is dropped when its entry leaves, and step={0} falls back to the default step', () => {
  const calls = [];
  const entries = [item('a', '2026-10-07', '09:00', '10:00')];
  const props = { ...base, canMove: true, step: 0, onProposeMove: (id, proposal) => calls.push(proposal.start) };
  const { host, root, unmount } = mount(h(ui.SchedulingCalendar, { ...props, entries }));
  const el = host.querySelector('[data-item-id="a"]');
  drag(el, [250, 440], [250, 440 + HOUR_PX]);
  assert.deepEqual(calls, [summer('2026-10-07', '10:00')], 'no crash, and the hour is still an hour');
  key(el, 'ArrowDown', true);
  assert.equal(offset(host.querySelector(cls('tg-ghost'))), 9.25, 'the keyboard step is 15 minutes');
  act(() => root.render(h(ui.SchedulingCalendar, { ...props, entries: [] })));
  assert.equal(host.querySelector(cls('tg-ghost')), null);
  unmount();
});

test('a day head with consumer numbers and no consumer label still says its count', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, days: { '2026-10-07': { count: 6, overflowCount: 0 } } }));
  const head = host.querySelector(`${cls('tg-dayhead')}[data-date="2026-10-07"]`);
  assert.match(head.getAttribute('aria-label'), /7 October 2026, 6 entries$/);
  assert.match(host.querySelector(`${cls('tg-dayhead')}[data-date="2026-10-08"]`).getAttribute('aria-label'), /8 October 2026$/);
  unmount();
});

test('focus follows an item the consumer moves to another day after a keyboard move', () => {
  function Applied() {
    const [entries, setEntries] = ui_react.useState([item('a', '2026-10-07', '09:00', '10:00')]);
    return h(ui.SchedulingCalendar, { ...base, entries, canMove: true, onProposeMove: (id, proposal) => setEntries([{ id, title: 'Item a', start: proposal.start, end: proposal.end }]) });
  }
  const { host, unmount } = mount(h(Applied));
  const el = host.querySelector('[data-item-id="a"]');
  act(() => el.focus());
  key(el, 'ArrowRight', true);
  key(el, 'Enter');
  const moved = host.querySelector('[data-item-id="a"]');
  assert.equal(moved.closest('[data-tg-column]').getAttribute('data-tg-column'), '2026-10-08', 'the consumer applied the move');
  assert.equal(document.activeElement, moved, 'and focus is on the item in its new column');
  unmount();
});
