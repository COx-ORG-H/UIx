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

test('AC2 (R18 AC2): a day cell is named with its date and the consumer label when there is one', () => {
  const days = { '2026-10-07': { count: 12, overflowCount: 9, label: '12 items, highest: needs sign-off' }, '2026-10-08': { count: 2, overflowCount: 0 } };
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...monthProps, days, dayEntries: {} }));
  // The label is the count and the signal (as its doc says); the date is never lost from the name.
  assert.match(date(host, '2026-10-07').getAttribute('aria-label'), /^Wednesday,? 7 October 2026, 12 items, highest: needs sign-off$/);
  assert.equal(date(host, '2026-10-07').closest(cls('dayhead')).querySelector(cls('count')).getAttribute('aria-hidden'), 'true', 'the count is not said twice');
  assert.match(date(host, '2026-10-08').getAttribute('aria-label'), /8 October 2026/, 'without a label, the date');
  assert.equal(date(host, '2026-10-08').closest(cls('dayhead')).querySelector(cls('count')).hasAttribute('aria-hidden'), false);
  unmount();
  const grid = mount(h(ui.SchedulingCalendar, { ...base, view: 'week', timeGrid: true, entries: [], days }));
  assert.match(date(grid.host, '2026-10-07').getAttribute('aria-label'), /^Wednesday,? 7 October 2026, 12 items, highest: needs sign-off$/);
  assert.match(date(grid.host, '2026-10-07').closest('[role="group"]').getAttribute('aria-label'), /^Wednesday,? 7 October 2026, 12 items, highest: needs sign-off$/, 'the head group too');
  assert.match(date(grid.host, '2026-10-08').closest('[role="group"]').getAttribute('aria-label'), /^Thursday,? 8 October 2026, 2 entries$/, 'no label: the date and the count');
  grid.unmount();
  // A consumer whose labels already say the date words the name itself.
  for (const view of [{ view: 'month' }, { view: 'week', timeGrid: true }]) {
    const own = mount(h(ui.SchedulingCalendar, { ...base, ...view, entries: [], dayEntries: {}, days: { '2026-10-07': { count: 1, overflowCount: 0, label: 'Mi 7.10., 1 Eintrag' } }, labels: { dayName: '{label}' } }));
    assert.equal(date(own.host, '2026-10-07').getAttribute('aria-label'), 'Mi 7.10., 1 Eintrag');
    own.unmount();
  }
  // ... and a day with numbers but no label still says its date in the time grid.
  const bare = mount(h(ui.SchedulingCalendar, { ...base, view: 'week', timeGrid: true, entries: [], days: { '2026-10-08': { count: 3, overflowCount: 0 } }, labels: { dayName: '{label}' } }));
  assert.match(date(bare.host, '2026-10-08').closest('[role="group"]').getAttribute('aria-label'), /^Thursday,? 8 October 2026, 3 entries$/);
  assert.match(date(bare.host, '2026-10-08').getAttribute('aria-label'), /^Thursday,? 8 October 2026$/);
  bare.unmount();
});

test('the keys of the grid act on the items of a day only: a field or a link the consumer put in a cell keeps its own', () => {
  const picked = [];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, {
    ...monthProps, onSelectDate: (day) => picked.push(day),
    renderDayBadge: (day) => (day === '2026-10-07' ? h('input', { 'data-probe': 'field', 'aria-label': 'Note' }) : null),
    renderEntry: (entry) => (entry.id === 'a' ? h('span', null, 'Item a ', h('a', { href: '#x', 'data-probe': 'link' }, 'details')) : entry.title),
  }));
  for (const probe of ['field', 'link']) {
    const inner = host.querySelector(`[data-probe="${probe}"]`);
    act(() => inner.focus());
    for (const name of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape']) {
      assert.equal(key(inner, name).defaultPrevented, false, `${name} in the ${probe} is left alone`);
      assert.equal(active(), inner, `${name} in the ${probe} does not move focus`);
    }
  }
  unmount();
  // The same in the time grid, for a link the consumer renders inside an item.
  const grid = mount(h(ui.SchedulingCalendar, { ...gridProps, renderEntry: (entry) => (entry.id === 'early' ? h('span', null, 'Item early ', h('a', { href: '#x', 'data-probe': 'link' }, 'details')) : entry.title) }));
  const link = grid.host.querySelector('[data-probe="link"]');
  act(() => link.focus());
  for (const name of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape']) {
    assert.equal(key(link, name).defaultPrevented, false, `${name} in a link of the time grid is left alone`);
    assert.equal(active(), link);
  }
  grid.unmount();
});

test('the "+N" of a week row is reached from the day it opens, not from every day of the row', () => {
  const picked = [];
  const bars = [1, 2, 3].map((n) => ({ id: `bar${n}`, title: `Bar ${n}`, start: '2026-10-05T08:00:00+02:00', end: '2026-10-06T16:00:00+02:00' }));
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, showHeader: false, entries: bars, spanLaneCap: 0, onShowMore: () => {}, onSelectDate: (day) => picked.push(day) }));
  const more = host.querySelector(cls('rowmore'));
  assert.equal(more.getAttribute('data-more-date'), '2026-10-05');
  // Saturday has nothing: Enter is left to the day button (which opens the day), and focus stays.
  const saturday = date(host, '2026-10-10');
  act(() => saturday.focus());
  assert.equal(key(saturday, 'Enter').defaultPrevented, false);
  assert.equal(active(), saturday);
  // Monday, the day the "+3" opens: Enter goes to it, and Escape comes back to Monday.
  const monday = date(host, '2026-10-05');
  act(() => monday.focus());
  assert.equal(key(monday, 'Enter').defaultPrevented, true);
  assert.equal(active(), more);
  key(more, 'Escape');
  assert.equal(active(), monday);
  unmount();
});

test('an item that takes focus without the keyboard brings the tab stop to its day', () => {
  for (const props of [monthProps, gridProps]) {
    const { host, unmount } = mount(h(ui.SchedulingCalendar, props));
    const scope = host.querySelector(`${cls('grid')}, ${cls('timegrid')}`);
    const target = props === monthProps ? '2026-10-09' : '2026-10-08';
    assert.equal(tabStops(scope).length, 1);
    assert.notEqual(idOf(tabStops(scope)[0]), target);
    act(() => host.querySelector('[data-item-id="other"], [data-item-id="thu"]').focus());
    assert.deepEqual(tabStops(scope).map(idOf), [target], 'Tab comes back to the day of the item');
    unmount();
  }
});

test('a move not yet sent is dropped, and said to be, when the arrow keys leave the item', () => {
  const moves = [];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...gridProps, canMove: true, onProposeMove: (id) => moves.push(id) }));
  const early = host.querySelector('[data-item-id="early"]');
  act(() => early.focus());
  key(early, 'ArrowDown', true);
  assert.ok(host.querySelector(cls('tg-ghost')), 'a pending move');
  key(early, 'ArrowDown');
  assert.equal(idOf(active()), 'late');
  assert.equal(host.querySelector(cls('tg-ghost')), null, 'the move did not stay behind');
  assert.match(host.querySelector('[aria-live]').textContent, /cancel/i);
  key(active(), 'Enter');
  assert.deepEqual(moves, []);
  unmount();
  // An arrow that goes nowhere (the last item of the day) leaves the move as it is.
  const plain = mount(h(ui.SchedulingCalendar, { ...gridProps, days: undefined, canMove: true, onProposeMove: (id) => moves.push(id) }));
  const late = plain.host.querySelector('[data-item-id="late"]');
  act(() => late.focus());
  key(late, 'ArrowDown', true);
  key(late, 'ArrowDown');
  assert.equal(active(), late, 'the last item: nowhere to go');
  assert.ok(plain.host.querySelector(cls('tg-ghost')), 'the move is still pending');
  key(late, 'Enter');
  assert.deepEqual(moves, ['late']);
  plain.unmount();
});

test('the flat agenda (no agendaGroups) is one tab stop too, walked with the arrow keys, and carries emphasis', () => {
  const entries = [at('a', '2026-10-07', '08:00', '09:00', { emphasis: 'highlight' }), at('b', '2026-10-07', '10:00', '11:00', { emphasis: 'dim' }), at('c', '2026-10-08', '08:00', '09:00')];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, view: 'agenda', showHeader: false, entries }));
  const agenda = host.querySelector(cls('agenda'));
  assert.deepEqual(tabStops(agenda).map(idOf), ['a']);
  act(() => tabStops(agenda)[0].focus());
  key(active(), 'ArrowDown');
  assert.equal(idOf(active()), 'b');
  key(active(), 'End');
  assert.equal(idOf(active()), 'c');
  assert.deepEqual(tabStops(agenda).map(idOf), ['c']);
  key(active(), 'Home');
  assert.equal(idOf(active()), 'a');
  assert.equal(host.querySelector('[data-item-id="a"]').hasAttribute('data-highlight'), true);
  assert.equal(host.querySelector('[data-item-id="b"]').hasAttribute('data-dim'), true);
  assert.equal(host.querySelector('[data-item-id="c"]').hasAttribute('data-highlight') || host.querySelector('[data-item-id="c"]').hasAttribute('data-dim'), false);
  unmount();
});

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 30)));
/** A long agenda: 220 rows on the first day, thirty days with no row, then five rows on the last day. */
const gappy = () => [
  { date: '2026-09-01', rows: Array.from({ length: 220 }, (_, i) => at(`r${i}`, '2026-09-01', '08:00', '09:00')) },
  ...Array.from({ length: 30 }, (_, i) => ({ date: `2026-09-${String(i + 2).padStart(2, '0')}`, rows: [], continuesCount: 1 })),
  { date: '2026-10-07', rows: Array.from({ length: 5 }, (_, i) => at(`z${i}`, '2026-10-07', '08:00', '09:00')) },
];
const scrolled = async (box) => { box.dispatchEvent(new window.Event('scroll')); await settle(); };

test('long agenda: a step is counted in rows, so it crosses a run of headings and lands on the next row', async () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, view: 'agenda', showHeader: false, entries: [], agendaGroups: gappy() }));
  const box = host.querySelector(cls('agenda--virtual'));
  Object.defineProperty(box, 'clientHeight', { value: 440, configurable: true });
  act(() => host.querySelector('[data-item-id="r0"]').focus());
  key(active(), 'End');
  await scrolled(box);
  assert.equal(idOf(active()), 'z4', 'End lands on the last row');
  for (const id of ['z3', 'z2', 'z1', 'z0']) { key(active(), 'ArrowUp'); assert.equal(idOf(active()), id); }
  // Above z0 are sixty rows without a control (thirty headings, thirty notes): one press crosses them.
  key(active(), 'ArrowUp');
  await scrolled(box);
  assert.equal(idOf(active()), 'r219');
  key(active(), 'ArrowDown');
  await scrolled(box);
  assert.equal(idOf(active()), 'z0');
  // At the ends there is nowhere to go, and nothing is left waiting.
  key(active(), 'End');
  await scrolled(box);
  assert.equal(key(active(), 'ArrowDown').defaultPrevented, true);
  assert.equal(idOf(active()), 'z4');
  assert.equal(tabStops(box).length, 1);
  unmount();
});

test('long agenda: a step still waiting is given up when focus has gone elsewhere', async () => {
  const outside = document.createElement('button');
  document.body.append(outside);
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, view: 'agenda', showHeader: false, entries: [], agendaGroups: gappy() }));
  const box = host.querySelector(cls('agenda--virtual'));
  Object.defineProperty(box, 'clientHeight', { value: 440, configurable: true });
  act(() => host.querySelector('[data-item-id="r0"]').focus());
  key(active(), 'End');
  // Before the rows arrive, the user leaves.
  act(() => outside.focus());
  await scrolled(box);
  assert.equal(active(), outside, 'focus is not pulled back');
  box.scrollTop = 0;
  await scrolled(box);
  box.scrollTop = 44 * 280;
  await scrolled(box);
  assert.ok(host.querySelector('[data-item-id="z4"]'), 'the row that was awaited is mounted now');
  assert.equal(active(), outside, 'and focus is still where the user put it');
  unmount();
  outside.remove();
});

test('long agenda: a step that is waiting follows its row when the list changes, and is given up when the row is gone', async () => {
  const groups = gappy();
  const props = (agendaGroups) => ({ ...base, view: 'agenda', showHeader: false, entries: [], agendaGroups });
  const { host, root, unmount } = mount(h(ui.SchedulingCalendar, props(groups)));
  const box = host.querySelector(cls('agenda--virtual'));
  Object.defineProperty(box, 'clientHeight', { value: 440, configurable: true });
  act(() => host.querySelector('[data-item-id="r0"]').focus());
  key(active(), 'End');
  // Before the scroll is seen, forty rows arrive above the awaited one.
  const more = [{ date: '2026-08-31', rows: Array.from({ length: 40 }, (_, i) => at(`n${i}`, '2026-08-31', '08:00', '09:00')) }, ...groups];
  act(() => root.render(h(ui.SchedulingCalendar, props(more))));
  await scrolled(box);
  await scrolled(box);
  assert.equal(idOf(active()), 'z4', 'it lands on the row it was going to, not on whatever now has its old place');
  // And when the awaited row is removed, nothing is left waiting.
  key(active(), 'Home');
  act(() => root.render(h(ui.SchedulingCalendar, props(more.slice(1)))));
  await scrolled(box);
  act(() => root.render(h(ui.SchedulingCalendar, props(more))));
  await scrolled(box);
  assert.notEqual(idOf(active()), 'n0', 'a row that came back later does not take focus');
  unmount();
});

test('long agenda: a window of headings only makes the scroller the tab stop', async () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, view: 'agenda', showHeader: false, entries: [], agendaGroups: gappy() }));
  const box = host.querySelector(cls('agenda--virtual'));
  Object.defineProperty(box, 'clientHeight', { value: 220, configurable: true });
  assert.equal(box.hasAttribute('tabindex'), false, 'rows are mounted: one of them is the stop');
  box.scrollTop = 44 * 245;
  await scrolled(box);
  assert.equal(box.querySelectorAll('button').length, 0, 'only headings and notes in the window');
  assert.equal(box.tabIndex, 0);
  // While the scroller has focus it stays the stop; when it lets go and rows are mounted, a row is the only one.
  act(() => box.focus());
  box.scrollTop = 0;
  await scrolled(box);
  assert.equal(box.tabIndex, 0, 'still focused: still the stop');
  act(() => box.blur());
  assert.equal(box.hasAttribute('tabindex'), false);
  assert.equal(tabStops(box).length, 1);
  unmount();
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
