/* HAR-1527 (U6) — the keyboard model of SchedulingCalendar and item emphasis, in jsdom. AC
 * numbers are the slice's. Each grid is one tab stop; Enter on a day goes into its items,
 * the arrow keys move between them and Escape goes back out. Real Tab order, a native Enter
 * on a button and axe are checked in a browser (tests/a11y/scheduling-keyboard.spec.mjs).
 *
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let ui;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  expose('ResizeObserver', class { observe() {} disconnect() {} });
  expose('requestAnimationFrame', (task) => setTimeout(task, 0));
  expose('cancelAnimationFrame', (id) => clearTimeout(id));
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, root, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const key = (el, name, shiftKey = false) => {
  const event = new window.KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(event); });
  return event;
};
const cls = (name) => `.uix-scheduling-calendar__${name}`;
const BERLIN = 'Europe/Berlin';
const at = (id, date, from, to, extra = {}) => ({ id, title: `Item ${id}`, start: new Date(`${date}T${from}:00+02:00`).toISOString(), end: new Date(`${date}T${to}:00+02:00`).toISOString(), ...extra });
const hold = (id, from, to) => ({ id, label: `Window ${id}`, kindLabel: 'Hold', start: `${from}T00:00:00+02:00`, end: `${to}T23:00:00+02:00`, pattern: 'diagonal' });
const base = { anchorDate: '2026-10-07', timeZone: BERLIN, locale: 'en-GB' };
/** Everything the Tab key can reach inside `root`. */
const tabStops = (root) => [...root.querySelectorAll('button, [tabindex]')].filter((el) => el.tabIndex >= 0 && !el.disabled);
const active = () => document.activeElement;
const idOf = (el) => el?.getAttribute('data-item-id') ?? el?.getAttribute('data-overlay-id') ?? el?.getAttribute('data-calendar-date') ?? el?.className;
const date = (host, day) => host.querySelector(`[data-calendar-date="${day}"]`);

const monthProps = {
  ...base, showHeader: false, maxEntriesPerDay: 3, onShowMore: () => {},
  entries: [
    { id: 'span', title: 'Three days', start: '2026-10-06T08:00:00+02:00', end: '2026-10-08T16:00:00+02:00' },
    at('a', '2026-10-07', '08:00', '09:00'), at('b', '2026-10-07', '10:00', '11:00'), at('c', '2026-10-07', '12:00', '13:00'), at('d', '2026-10-07', '14:00', '15:00'),
    at('other', '2026-10-09', '08:00', '09:00'),
  ],
  overlays: [hold('w', '2026-10-05', '2026-10-09')],
};

test('AC1 / Do-NOT: the month grid is one tab stop, however many items it holds', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, monthProps));
  const grid = host.querySelector(cls('grid'));
  assert.ok(grid.querySelectorAll('button').length > 45, 'the grid is full of controls');
  const stops = tabStops(grid);
  assert.equal(stops.length, 1, 'one of them is in the tab order');
  assert.equal(stops[0].getAttribute('data-calendar-date'), '2026-10-07', 'the active day');
  for (const el of grid.querySelectorAll(`${cls('entry')}, ${cls('window')}, button${cls('more')}, button${cls('rowmore')}`)) assert.equal(el.tabIndex, -1, idOf(el));
  unmount();
});

test('AC4 / AC5 (month): Enter on a day goes into its items, the arrow keys move between them, Escape goes back', () => {
  const selected = [];
  const picked = [];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...monthProps, onSelectEntry: (entry) => selected.push(entry.id), onSelectDate: (day) => picked.push(day) }));
  const day = date(host, '2026-10-07');
  act(() => day.focus());
  const enter = key(day, 'Enter');
  assert.equal(enter.defaultPrevented, true, 'Enter goes into the day; it does not activate the day number');
  assert.deepEqual(picked, []);
  // Reading order: the window over the day, the bar over the day, the chips, the "+N".
  const seen = [idOf(active())];
  for (let i = 0; i < 6; i++) { key(active(), 'ArrowDown'); seen.push(idOf(active())); }
  assert.deepEqual(seen.slice(0, 6), ['w', 'span', 'a', 'b', 'c', 'uix-scheduling-calendar__more']);
  assert.equal(seen[6], seen[5], 'no wrap at the end');
  key(active(), 'ArrowUp');
  assert.equal(idOf(active()), 'c');
  key(active(), 'Home');
  assert.equal(idOf(active()), 'w');
  key(active(), 'End');
  assert.equal(idOf(active()), 'uix-scheduling-calendar__more');
  const escape = key(active(), 'Escape');
  assert.equal(escape.defaultPrevented, true);
  assert.equal(active(), day, 'back on the day it was entered from');
  assert.deepEqual(tabStops(host.querySelector(cls('grid'))).map(idOf), ['2026-10-07']);
  // A day with nothing in it: Enter is left to the button, which activates the day number.
  const empty = date(host, '2026-10-21');
  act(() => empty.focus());
  assert.equal(key(empty, 'Enter').defaultPrevented, false);
  unmount();
});

test('a span is reached from any day it covers, and Escape returns to the day it was entered from', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, monthProps));
  const thursday = date(host, '2026-10-08');
  act(() => thursday.focus());
  key(thursday, 'Enter');
  assert.equal(idOf(active()), 'w');
  key(active(), 'ArrowDown');
  assert.equal(idOf(active()), 'span', 'the three-day bar ends on Thursday');
  key(active(), 'Escape');
  assert.equal(active(), thursday);
  // Reached with the pointer instead (no day entered): Escape goes to the first day the item is on.
  const span = host.querySelector('[data-item-id="span"]');
  act(() => span.focus());
  key(span, 'Escape');
  assert.equal(idOf(active()), '2026-10-06', 'the bar starts on Tuesday');
  const other = host.querySelector('[data-item-id="other"]');
  act(() => other.focus());
  key(other, 'Escape');
  assert.equal(idOf(active()), '2026-10-09');
  unmount();
});

test('AC2 (R18 AC2): a day cell is named with the consumer label when there is one', () => {
  const days = { '2026-10-07': { count: 12, overflowCount: 9, label: 'Wednesday 7 October, 12 items, highest: needs sign-off' }, '2026-10-08': { count: 2, overflowCount: 0 } };
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...monthProps, days, dayEntries: {} }));
  assert.equal(date(host, '2026-10-07').getAttribute('aria-label'), 'Wednesday 7 October, 12 items, highest: needs sign-off');
  assert.equal(date(host, '2026-10-07').closest(cls('dayhead')).querySelector(cls('count')).getAttribute('aria-hidden'), 'true', 'the count is not said twice');
  assert.match(date(host, '2026-10-08').getAttribute('aria-label'), /8 October 2026/, 'without a label, the date');
  assert.equal(date(host, '2026-10-08').closest(cls('dayhead')).querySelector(cls('count')).hasAttribute('aria-hidden'), false);
  unmount();
  const grid = mount(h(ui.SchedulingCalendar, { ...base, view: 'week', timeGrid: true, entries: [], days }));
  assert.equal(date(grid.host, '2026-10-07').getAttribute('aria-label'), 'Wednesday 7 October, 12 items, highest: needs sign-off');
  grid.unmount();
});

const gridProps = {
  ...base, view: 'week', timeGrid: true, showHeader: false, onShowMore: () => {},
  entries: [
    at('early', '2026-10-07', '08:00', '09:00'), at('late', '2026-10-07', '14:00', '15:00'),
    { id: 'long', title: 'Thirty hours', start: '2026-10-06T08:00:00+02:00', end: '2026-10-07T14:00:00+02:00' },
    at('thu', '2026-10-08', '09:00', '10:00'),
  ],
  overlays: [hold('w', '2026-10-06', '2026-10-08')],
  days: { '2026-10-07': { count: 6, overflowCount: 3, label: '6 items' } },
};

test('AC1 / Do-NOT: the time grid is one tab stop, on a day head', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...gridProps, canMove: true, onProposeMove: () => {} }));
  const grid = host.querySelector(cls('timegrid'));
  const stops = tabStops(grid);
  assert.deepEqual(stops.map(idOf), ['2026-10-05'], 'the first day head');
  const head = date(host, '2026-10-05');
  act(() => head.focus());
  key(head, 'ArrowRight');
  key(active(), 'ArrowRight');
  assert.equal(idOf(active()), '2026-10-07');
  assert.deepEqual(tabStops(grid).map(idOf), ['2026-10-07'], 'the tab stop follows the focus');
  key(active(), 'End');
  assert.equal(idOf(active()), '2026-10-11');
  key(active(), 'ArrowRight');
  assert.equal(idOf(active()), '2026-10-11', 'no wrap');
  key(active(), 'Home');
  assert.equal(idOf(active()), '2026-10-05');
  unmount();
});

test('AC4 / AC5 (time grid): Enter on a day head goes into the day; Enter on an item selects, or confirms a pending move', () => {
  const selected = [];
  const moves = [];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...gridProps, canMove: true, onProposeMove: (id, proposal) => moves.push([id, proposal.start]), onSelectEntry: (entry) => selected.push(entry.id) }));
  const head = date(host, '2026-10-07');
  act(() => head.focus());
  assert.equal(key(head, 'Enter').defaultPrevented, true);
  // Top to bottom: the window over the day, the top-lane span over it, the items of the column, the "+N".
  const seen = [idOf(active())];
  for (let i = 0; i < 4; i++) { key(active(), 'ArrowDown'); seen.push(idOf(active())); }
  assert.deepEqual(seen, ['w', 'long', 'early', 'late', 'uix-scheduling-calendar__more']);
  key(active(), 'ArrowUp');
  key(active(), 'ArrowUp');
  const early = active();
  assert.equal(idOf(early), 'early');
  // No pending move: Enter is left to the button, which selects.
  assert.equal(key(early, 'Enter').defaultPrevented, false);
  // Shift and an arrow is a move and does not walk the ring.
  key(early, 'ArrowDown', true);
  assert.equal(active(), early);
  assert.ok(host.querySelector(cls('tg-ghost')), 'a pending move');
  // Escape with a pending move drops the move and stays on the item.
  key(early, 'Escape');
  assert.equal(host.querySelector(cls('tg-ghost')), null);
  assert.equal(active(), early, 'still on the item');
  // Enter with a pending move proposes; it does not select.
  key(early, 'ArrowDown', true);
  assert.equal(key(early, 'Enter').defaultPrevented, true);
  assert.deepEqual(moves, [['early', '2026-10-07T06:15:00.000Z']]);
  assert.deepEqual(selected, []);
  // Escape with nothing pending goes back to the day head.
  key(early, 'Escape');
  assert.equal(active(), head);
  unmount();
});

test('AC4 (agenda): the grouped agenda is one tab stop and the arrow keys walk its rows and controls', () => {
  const groups = [
    { date: '2026-10-07', annotations: [hold('w', '2026-10-07', '2026-10-07')], rows: [at('a', '2026-10-07', '08:00', '09:00'), at('b', '2026-10-07', '10:00', '11:00')], hiddenCount: 2 },
    { date: '2026-10-08', rows: [at('c', '2026-10-08', '08:00', '09:00')] },
  ];
  const { host, root, unmount } = mount(h(ui.SchedulingCalendar, { ...base, view: 'agenda', showHeader: false, entries: [], agendaGroups: groups, onShowMore: () => {} }));
  const agenda = host.querySelector(cls('agenda'));
  assert.deepEqual(tabStops(agenda).map(idOf), ['w'], 'one tab stop: the first control');
  act(() => tabStops(agenda)[0].focus());
  const seen = [];
  for (let i = 0; i < 5; i++) { key(active(), 'ArrowDown'); seen.push(idOf(active())); }
  assert.deepEqual(seen, ['a', 'b', 'uix-scheduling-calendar__agenda-more', 'c', 'c']);
  assert.deepEqual(tabStops(agenda).map(idOf), ['c'], 'the tab stop follows');
  key(active(), 'Home');
  assert.equal(idOf(active()), 'w');
  key(active(), 'End');
  assert.equal(idOf(active()), 'c');
  key(active(), 'ArrowUp');
  const before = active();
  act(() => root.render(h(ui.SchedulingCalendar, { ...base, view: 'agenda', showHeader: false, entries: [], agendaGroups: groups.map((group) => ({ ...group })), onShowMore: () => {} })));
  assert.equal(active(), before, 'focus stays on the same control across a re-render');
  assert.equal(tabStops(agenda).length, 1);
  unmount();
});

test('AC6 (R23 AC12): emphasis sets data-highlight or data-dim on exactly those items, in every view', () => {
  const entries = [
    at('partner', '2026-10-07', '08:00', '09:00', { emphasis: 'highlight' }),
    at('rest', '2026-10-07', '10:00', '11:00', { emphasis: 'dim', band: 'high' }),
    at('plain', '2026-10-07', '12:00', '13:00'),
    { id: 'bar', title: 'Bar', start: '2026-10-06T08:00:00+02:00', end: '2026-10-08T16:00:00+02:00', emphasis: 'highlight' },
  ];
  const marks = (host) => Object.fromEntries([...host.querySelectorAll('[data-item-id]')].map((el) => [el.getAttribute('data-item-id'), [el.hasAttribute('data-highlight'), el.hasAttribute('data-dim')]]));
  const expected = { partner: [true, false], rest: [false, true], plain: [false, false], bar: [true, false] };
  const month = mount(h(ui.SchedulingCalendar, { ...base, entries }));
  assert.deepEqual(marks(month.host), expected);
  assert.equal(month.host.querySelector('[data-item-id="rest"]').getAttribute('data-band'), 'high', 'the band is untouched');
  month.unmount();
  const grid = mount(h(ui.SchedulingCalendar, { ...base, view: 'week', timeGrid: true, entries }));
  assert.deepEqual(marks(grid.host), expected);
  grid.unmount();
  const agenda = mount(h(ui.SchedulingCalendar, { ...base, view: 'agenda', entries: [], agendaGroups: [{ date: '2026-10-07', rows: entries }] }));
  assert.deepEqual(marks(agenda.host), expected);
  agenda.unmount();
});
