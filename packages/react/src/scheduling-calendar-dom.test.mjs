/* HAR-1347 (TENSOR B1/C9) — SchedulingCalendar week start, date-formatter injection,
 * per-day "+N more" overflow and per-day badge, in jsdom.
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
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('CSS', { escape: (s) => String(s).replace(/"/g, '\\"') });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'CSS', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, root, unmount: () => act(() => root.unmount()) };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, button: 0 })));

const busyDay = (date, count) => Array.from({ length: count }, (_, i) => ({
  id: `${date}-${i}`, title: `Change ${i + 1}`, start: `${date}T0${i}:00:00Z`, end: `${date}T0${i}:30:00Z`,
}));
const dates = (host) => [...host.querySelectorAll('[data-calendar-date]')].map((b) => b.getAttribute('data-calendar-date'));
const weekdays = (host) => [...host.querySelectorAll('.uix-scheduling-calendar__weekday')].map((d) => d.textContent);

test('the month grid starts on Monday by default and carries seven weekday headers', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { entries: [], anchorDate: '2026-10-06', timeZone: 'UTC', locale: 'en-GB' }));
  assert.equal(dates(host)[0], '2026-09-28', 'October 2026 starts on a Thursday; the Monday before is 28 September');
  assert.deepEqual(weekdays(host), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  for (const head of host.querySelectorAll('.uix-scheduling-calendar__weekday')) assert.equal(head.getAttribute('aria-hidden'), 'true', 'headers are visual; each day button names its weekday');
  unmount();
});

test('weekStartsOn moves the first column in the month and week views', () => {
  const month = mount(h(ui.SchedulingCalendar, { entries: [], anchorDate: '2026-10-06', timeZone: 'UTC', locale: 'en-US', weekStartsOn: 0 }));
  assert.equal(dates(month.host)[0], '2026-09-27', 'Sunday start');
  assert.equal(weekdays(month.host)[0], 'Sun');
  assert.equal(dates(month.host).length, 42);
  month.unmount();

  const week = mount(h(ui.SchedulingCalendar, { entries: [], anchorDate: '2026-10-06', timeZone: 'UTC', locale: 'en-US', weekStartsOn: 6, view: 'week' }));
  assert.deepEqual(dates(week.host), ['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'], 'Saturday start contains the anchor');
  week.unmount();
});

test('formatDate and formatInstant replace every date the calendar writes', () => {
  const parts = new Set();
  const formatDate = (date, part) => {
    parts.add(part);
    const [y, m, d] = date.split('-');
    return part === 'weekday' ? `W${new Date(`${date}T00:00:00Z`).getUTCDay()}` : part === 'month' ? `${m}/${y}` : `${d}.${m}.${y}`;
  };
  const formatInstant = (iso) => `@${iso.slice(11, 16)}`;
  const entries = [{ id: 'c1', title: 'Patch', start: '2026-10-07T08:00:00Z', end: '2026-10-07T09:00:00Z' }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { entries, anchorDate: '2026-10-06', timeZone: 'UTC', formatDate, formatInstant }));
  assert.deepEqual([...parts].sort(), ['day', 'month', 'weekday']);
  assert.equal(host.querySelector('.uix-scheduling-calendar__header strong').textContent, '10/2026');
  assert.equal(host.querySelector('[data-calendar-date="2026-10-07"]').getAttribute('aria-label'), '07.10.2026');
  assert.equal(weekdays(host)[0], 'W1');
  assert.match(host.querySelector('.uix-scheduling-calendar__entry').getAttribute('aria-label'), /@08:00 to @09:00/);
  unmount();

  const week = mount(h(ui.SchedulingCalendar, { entries, anchorDate: '2026-10-06', timeZone: 'UTC', formatDate, view: 'week' }));
  assert.equal(week.host.querySelector('.uix-scheduling-calendar__header strong').textContent, '05.10.2026 – 11.10.2026');
  week.unmount();
});

test('maxEntriesPerDay collapses a busy day behind "+N more" and expands it in place', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, {
    entries: [...busyDay('2026-10-07', 5), ...busyDay('2026-10-08', 2)],
    anchorDate: '2026-10-06', timeZone: 'UTC', locale: 'en-GB', maxEntriesPerDay: 2,
  }));
  const day = (date) => host.querySelector(`[data-calendar-date="${date}"]`).closest('.uix-scheduling-calendar__day');
  const busy = day('2026-10-07');
  assert.equal(busy.querySelectorAll('.uix-scheduling-calendar__entry').length, 2);
  const more = busy.querySelector('.uix-scheduling-calendar__more');
  assert.equal(more.textContent, '+3 more');
  assert.equal(more.getAttribute('aria-expanded'), 'false');
  const full = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 9, 7)));
  assert.equal(more.getAttribute('aria-label'), `3 more entries on ${full}`);
  assert.equal(day('2026-10-08').querySelector('.uix-scheduling-calendar__more'), null, 'a day at the limit has no toggle');

  click(more);
  const toggle = busy.querySelector('.uix-scheduling-calendar__more');
  assert.equal(busy.querySelectorAll('.uix-scheduling-calendar__entry').length, 5);
  assert.equal(toggle.textContent, 'Show fewer');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(toggle.getAttribute('aria-label'), null, 'the visible text names it');

  click(toggle);
  assert.equal(busy.querySelectorAll('.uix-scheduling-calendar__entry').length, 2);
  unmount();
});

test('onShowMore hands the whole day to the consumer and keeps it collapsed', () => {
  const calls = [];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, {
    entries: busyDay('2026-10-07', 4), anchorDate: '2026-10-06', timeZone: 'UTC', maxEntriesPerDay: 1,
    onShowMore: (date, entries) => calls.push([date, entries.length]),
    labels: { moreEntries: '+{count} weitere', moreEntriesLabel: '{count} weitere am {date}' },
    formatDate: (date) => date,
  }));
  const more = host.querySelector('.uix-scheduling-calendar__more');
  assert.equal(more.textContent, '+3 weitere');
  assert.equal(more.getAttribute('aria-label'), '3 weitere am 2026-10-07');
  assert.equal(more.getAttribute('aria-expanded'), null, 'it opens something else, so it is not a disclosure');
  click(more);
  assert.deepEqual(calls, [['2026-10-07', 4]]);
  assert.equal(host.querySelectorAll('.uix-scheduling-calendar__entry').length, 1);
  unmount();
});

test('renderDayBadge sits beside the date, outside the date button', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, {
    entries: busyDay('2026-10-07', 3), anchorDate: '2026-10-06', timeZone: 'UTC', locale: 'en-GB',
    renderDayBadge: (date, entries) => (entries.length > 1 ? h('span', null, `${entries.length} collisions`) : null),
  }));
  const badges = host.querySelectorAll('.uix-scheduling-calendar__badge');
  assert.equal(badges.length, 1, 'null renders no badge and no wrapper');
  const head = badges[0].closest('.uix-scheduling-calendar__dayhead');
  const date = head.querySelector('.uix-scheduling-calendar__date');
  assert.equal(date.getAttribute('data-calendar-date'), '2026-10-07');
  assert.equal(badges[0].textContent, '3 collisions');
  assert.ok(!date.contains(badges[0]), 'the badge does not change the day button name');
  assert.equal(host.querySelectorAll('.uix-scheduling-calendar__dayhead').length, 1);
  unmount();
});

/* ---------------------------------------------------------------------------------------
 * HAR-1506 (U2): shared item API, consumer-owned counts, spans drawn once per week row,
 * named scope-true windows, legend and header owned by the consumer. AC numbers are the
 * slice's. Layout (equal heights, 375 px scroll, Enter, contrast, greyscale, forced colours)
 * is measured in a real browser: tests/a11y/scheduling-calendar.spec.mjs. The zone cases
 * re-run under three TZ values (scheduling-calendar-zones.test.mjs).
 * ------------------------------------------------------------------------------------- */

const BERLIN = 'Europe/Berlin';
const base = { anchorDate: '2026-10-07', timeZone: BERLIN, locale: 'en-GB' };
const cellOf = (host, date) => host.querySelector(`[data-calendar-date="${date}"]`).closest('.uix-scheduling-calendar__day');
const items = (host, id) => [...host.querySelectorAll(`[data-item-id="${id}"]`)];
const press = (el, key) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true })));
const rowOf = (el) => el.closest('.uix-scheduling-calendar__week');
const chips = (cell) => [...cell.querySelectorAll('.uix-scheduling-calendar__entry')];
const dayAt = (date, hour, minutes = 60, id = `${date}-${hour}`) => {
  const start = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`);
  return { id, title: `Item ${id}`, start: new Date(start).toISOString(), end: new Date(start + minutes * 60_000).toISOString() };
};

test('the zone wrapper really changed the process time zone', () => {
  const expected = process.env.UIX_EXPECT_TZ_OFFSET;
  if (expected === undefined) return;
  assert.equal(String(new Date('2026-01-15T12:00:00Z').getTimezoneOffset()), expected);
});

test('AC1 (R13 AC1): a Mon–Wed entry renders once in its week row, not once per day', () => {
  const entry = { id: 'mw', title: 'Three-day item', start: '2026-10-05T08:00:00Z', end: '2026-10-07T16:00:00Z' };
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: [entry] }));
  const found = items(host, 'mw');
  assert.equal(found.length, 1, 'exactly one element for the whole span');
  assert.ok(!found[0].closest('.uix-scheduling-calendar__day'), 'the span is not inside a day cell');
  assert.equal(found[0].style.gridColumn, '1 / 4', 'Monday to Wednesday');
  unmount();
});

test('AC1 / R21 AC5: a span crossing a week boundary is one element per week row', () => {
  const entry = { id: 'long', title: 'Long item', start: '2026-10-09T06:00:00Z', end: '2026-10-13T20:00:00Z' };
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: [entry] }));
  const found = items(host, 'long');
  assert.equal(found.length, 2);
  assert.notEqual(rowOf(found[0]), rowOf(found[1]), 'one per row');
  assert.equal(found[0].hasAttribute('data-continues-after'), true);
  assert.equal(found[1].hasAttribute('data-continues-before'), true);
  unmount();
});

/** The controlled-mode fixture: 50 items on 07.10, the consumer ranked and cut them to 3. */
const busy = Array.from({ length: 50 }, (_, i) => dayAt('2026-10-07', 6 + (i % 12), 30, `b${i}`));
const controlled = (extra = {}) => ({
  ...base, entries: [], maxEntriesPerDay: 3,
  dayEntries: { '2026-10-07': busy.slice(0, 3) },
  days: { '2026-10-07': { count: 50, overflowCount: 47 } },
  ...extra,
});

test('AC2 (R13 AC2): in controlled mode "+N" calls onShowMore and the day never expands in place', () => {
  const calls = [];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, controlled({ onShowMore: (date) => calls.push(date) })));
  const cell = cellOf(host, '2026-10-07');
  assert.equal(chips(cell).length, 3);
  const more = cell.querySelector('.uix-scheduling-calendar__more');
  assert.equal(more.textContent, '+47 more');
  assert.equal(more.getAttribute('aria-expanded'), null, 'not a disclosure');
  click(more);
  assert.deepEqual(calls, ['2026-10-07']);
  assert.equal(chips(cell).length, 3, 'still the three picks');
  assert.equal(host.querySelector('[data-expanded]'), null, 'no in-place expansion state');
  assert.equal(cell.querySelector('.uix-scheduling-calendar__more').textContent, '+47 more');
  unmount();
});

test('AC3 (R13 AC4) / AC16 (R2 AC4): a day with a count and no chips still shows the count and its markers', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, {
    ...base, entries: [], dayEntries: {}, onShowMore: () => {},
    days: { '2026-10-08': { count: 7, overflowCount: 7, label: '7 items, 2 need review', markers: [{ id: 'm1', label: 'Needs review', emphasis: 'warning' }] } },
  }));
  const cell = cellOf(host, '2026-10-08');
  assert.equal(chips(cell).length, 0);
  const count = cell.querySelector('.uix-scheduling-calendar__count');
  assert.ok(count, 'count rendered');
  assert.match(count.textContent, /7/);
  assert.match(count.textContent, /7 items, 2 need review/, 'the consumer label is the accessible text');
  const marker = cell.querySelector('.uix-scheduling-calendar__marker');
  assert.equal(marker.getAttribute('data-emphasis'), 'warning');
  assert.match(marker.textContent, /Needs review/);
  assert.equal(cell.querySelector('.uix-scheduling-calendar__more').textContent, '+7 more');
  unmount();
});

test('AC4 (R13 AC5/AC6): "+N" is the consumer overflowCount, never entries.length − shown', () => {
  const picks = busy.slice(0, 3);
  const seven = mount(h(ui.SchedulingCalendar, { ...base, entries: busy, maxEntriesPerDay: 3, onShowMore: () => {}, dayEntries: { '2026-10-07': picks }, days: { '2026-10-07': { count: 10, overflowCount: 7 } } }));
  assert.equal(cellOf(seven.host, '2026-10-07').querySelector('.uix-scheduling-calendar__more').textContent, '+7 more');
  seven.unmount();
  const none = mount(h(ui.SchedulingCalendar, { ...base, entries: busy, maxEntriesPerDay: 3, onShowMore: () => {}, dayEntries: { '2026-10-07': picks }, days: { '2026-10-07': { count: 3, overflowCount: 0 } } }));
  assert.equal(cellOf(none.host, '2026-10-07').querySelector('.uix-scheduling-calendar__more'), null);
  none.unmount();
});

test('AC4 (FG-PLAT-1 fixture): count 5, 3 chips, one visible 3-day span, overflowCount 1 → "+1"', () => {
  const span = { id: 'span3', title: 'Three days', start: '2026-10-06T08:00:00Z', end: '2026-10-08T16:00:00Z' };
  const picks = [dayAt('2026-10-07', 6), dayAt('2026-10-07', 8), dayAt('2026-10-07', 10)];
  const grid = ui.schedulingGridDays('2026-10-07', 'month', 1);
  const spanLayout = ui.layoutMonthSpans([{ ...span, group: 'item' }], grid, { timeZone: BERLIN, weekStartsOn: 1 });
  const { host, unmount } = mount(h(ui.SchedulingCalendar, {
    ...base, entries: [span], maxEntriesPerDay: 3, onShowMore: () => {}, spanLayout,
    dayEntries: { '2026-10-07': picks }, days: { '2026-10-07': { count: 5, overflowCount: 1 } },
  }));
  const cell = cellOf(host, '2026-10-07');
  assert.equal(chips(cell).length, 3);
  assert.equal(items(host, 'span3').length, 1);
  assert.equal(cell.querySelector('.uix-scheduling-calendar__more').textContent, '+1 more');
  unmount();
});

test('AC5 (R13 AC7/AC10): the picks are exactly dayEntries, in the order given, across re-renders', () => {
  const picks = [dayAt('2026-10-07', 15, 60, 'late'), dayAt('2026-10-07', 6, 60, 'early'), dayAt('2026-10-07', 9, 60, 'mid')];
  const props = { ...base, entries: [], maxEntriesPerDay: 2, onShowMore: () => {}, days: { '2026-10-07': { count: 3, overflowCount: 0 } } };
  const { host, root, unmount } = mount(h(ui.SchedulingCalendar, { ...props, dayEntries: { '2026-10-07': picks } }));
  const order = () => chips(cellOf(host, '2026-10-07')).map((c) => c.getAttribute('data-item-id'));
  assert.deepEqual(order(), ['late', 'early', 'mid'], 'not sorted by time and not cut to maxEntriesPerDay');
  act(() => root.render(h(ui.SchedulingCalendar, { ...props, dayEntries: { '2026-10-07': [picks[2], picks[0]] } })));
  assert.deepEqual(order(), ['mid', 'late']);
  unmount();
});

const windowAt = (id, startDay, endDay, extra = {}) => ({
  id, label: `Window ${id}`, kindLabel: 'Hold', start: `${startDay}T06:00:00Z`, end: `${endDay}T18:00:00Z`, pattern: 'diagonal', ...extra,
});

test('AC6 (R13 AC8/AC9, R21 AC7): six overlapping windows take no chip slot and sit outside the day cells', () => {
  const overlays = Array.from({ length: 6 }, (_, i) => windowAt(`w${i}`, '2026-10-05', '2026-10-09'));
  const { host, unmount } = mount(h(ui.SchedulingCalendar, controlled({ overlays, onShowMore: () => {} })));
  const cell = cellOf(host, '2026-10-07');
  assert.equal(chips(cell).length, 3, 'all three chip slots still hold chips');
  assert.equal(cell.querySelector('.uix-scheduling-calendar__window'), null, 'no window inside a cell');
  const drawn = host.querySelectorAll('.uix-scheduling-calendar__window');
  assert.equal(drawn.length, 2, 'two window lanes');
  assert.equal(rowOf(drawn[0]), rowOf(cell), 'visible in the busy day row without expanding');
  unmount();
});

test('AC7 (R21 AC1–AC5): windows are focusable, named with kind, name, scope and span, and call onSelectOverlay', () => {
  const selected = [];
  const scoped = windowAt('scoped', '2026-10-06', '2026-10-06', { kindLabel: 'Hold', label: 'Payroll lock', scopeLabel: 'Payroll services', global: false, pattern: 'cross' });
  const wide = windowAt('wide', '2026-10-08', '2026-10-13', { kindLabel: 'Pause', label: 'Quarter close', global: true, pattern: 'diagonal' });
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: [], overlays: [scoped, wide], onSelectOverlay: (o) => selected.push(o.id) }));
  const [s] = host.querySelectorAll('[data-overlay-id="scoped"]');
  assert.equal(s.tagName, 'BUTTON', 'focusable; Enter activates a button natively (asserted in the browser spec)');
  assert.equal(s.getAttribute('type'), 'button');
  const name = s.getAttribute('aria-label');
  for (const part of ['Hold', 'Payroll lock', 'Payroll services']) assert.match(name, new RegExp(part));
  assert.match(name, /Tuesday,? 6 October 2026 08:00 to Tuesday,? 6 October 2026 20:00/, 'the span is in the name');
  assert.match(s.textContent, /Hold/, 'kind is visible text');
  assert.match(s.textContent, /Payroll lock/, 'name is visible text');
  assert.match(s.textContent, /Payroll services/, 'scope is visible text');
  assert.equal(s.getAttribute('title'), null, 'nothing only in title');
  assert.equal(s.hasAttribute('data-global'), false, 'global: false never gets the global treatment');
  assert.equal(s.getAttribute('data-pattern'), 'cross');
  click(s);
  assert.deepEqual(selected, ['scoped']);
  const wides = host.querySelectorAll('[data-overlay-id="wide"]');
  assert.equal(wides.length, 2, 'a 6-day window crossing a week boundary is one labelled span per row, not six tinted cells');
  for (const el of wides) { assert.match(el.textContent, /Quarter close/); assert.equal(el.hasAttribute('data-global'), true); }
  assert.equal(host.querySelectorAll('.uix-scheduling-calendar__overlay').length, 0, 'no per-day overlay labels');
  unmount();
});

test('AC7: a 5-day window inside one week is one labelled span', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: [], overlays: [windowAt('five', '2026-10-05', '2026-10-09')] }));
  const found = host.querySelectorAll('[data-overlay-id="five"]');
  assert.equal(found.length, 1);
  assert.equal(found[0].style.gridColumn, '1 / 6');
  unmount();
});

test('AC8 (FG-UX-3): three windows over one row with a lane cap of 2 — "+1" calls onShowMore with the first day holding the hidden one', () => {
  const calls = [];
  const overlays = [windowAt('a', '2026-10-05', '2026-10-09'), windowAt('b', '2026-10-06', '2026-10-08'), windowAt('c', '2026-10-07', '2026-10-10')];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: [], overlays, maxEntriesPerDay: 3, onShowMore: (date) => calls.push(date) }));
  assert.equal(host.querySelectorAll('[data-overlay-id="c"]').length, 0, 'the third is not drawn');
  const rowMore = rowOf(host.querySelector('[data-overlay-id="a"]')).querySelector('.uix-scheduling-calendar__rowmore');
  assert.equal(rowMore.textContent, '+1');
  click(rowMore);
  assert.deepEqual(calls, ['2026-10-07']);
  unmount();
});

test('AC8: a consumer spanLayout is rendered as given, never re-packed', () => {
  const overlays = [windowAt('a', '2026-10-05', '2026-10-09'), windowAt('b', '2026-10-06', '2026-10-08')];
  const spanLayout = { placed: [{ id: 'b', group: 'window', weekRow: 1, lane: 0, startCol: 1, endCol: 3, continuesBefore: false, continuesAfter: false }], hiddenByRow: { 1: ['a'] }, firstHiddenDayByRow: { 1: '2026-10-05' } };
  const calls = [];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: [], overlays, spanLayout, dayEntries: {}, onShowMore: (d) => calls.push(d) }));
  assert.equal(host.querySelectorAll('[data-overlay-id="a"]').length, 0);
  assert.equal(host.querySelector('[data-overlay-id="b"]').style.gridColumn, '2 / 5');
  const rowMore = host.querySelector('.uix-scheduling-calendar__rowmore');
  assert.equal(rowMore.textContent, '+1');
  click(rowMore);
  assert.deepEqual(calls, ['2026-10-05']);
  unmount();
});

test('AC9 (R4 AC3, Month): 22:00–00:00 only on its start day; 23:00 → 02:00 one span over both days; a zoned window on 11.10 only', () => {
  const evening = { id: 'eve', title: 'Evening', start: '2026-10-07T20:00:00Z', end: '2026-10-07T22:00:00Z' };
  const overnight = { id: 'night', title: 'Overnight', start: '2026-10-07T21:00:00Z', end: '2026-10-08T00:00:00Z' };
  const zoned = { id: 'z', label: 'Sunday hold', kindLabel: 'Hold', start: '2026-10-10T22:00:00Z', end: '2026-10-11T22:00:00Z', pattern: 'dotted' };
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: [evening, overnight], overlays: [zoned] }));
  const eve = items(host, 'eve');
  assert.equal(eve.length, 1);
  assert.equal(eve[0].closest('.uix-scheduling-calendar__day').querySelector('[data-calendar-date]').getAttribute('data-calendar-date'), '2026-10-07');
  const night = items(host, 'night');
  assert.equal(night.length, 1, 'one span');
  assert.equal(night[0].style.gridColumn, '3 / 5', 'Wednesday and Thursday');
  assert.equal(host.querySelector('[data-overlay-id="z"]').style.gridColumn, '7 / 8', 'Sunday 11.10 only, not Saturday 10.10');
  unmount();
});

test('R19 AC1 hooks: every item carries data-item-id, data-band and data-status; band/status default to none/committed', () => {
  const entries = [
    { ...dayAt('2026-10-07', 6, 60, 'plain') },
    { ...dayAt('2026-10-07', 8, 60, 'hot'), band: 'high', status: 'tentative', markers: [{ id: 'k', label: 'Refused', emphasis: 'refused' }] },
    { id: 'multi', title: 'Multi', start: '2026-10-05T08:00:00Z', end: '2026-10-06T16:00:00Z', band: 'medium', status: 'live' },
  ];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries }));
  const [plain] = items(host, 'plain');
  assert.equal(plain.getAttribute('data-band'), 'none');
  assert.equal(plain.getAttribute('data-status'), 'committed');
  const [hot] = items(host, 'hot');
  assert.equal(hot.getAttribute('data-band'), 'high');
  assert.equal(hot.getAttribute('data-status'), 'tentative');
  const marker = hot.querySelector('.uix-scheduling-calendar__marker');
  assert.equal(marker.getAttribute('data-emphasis'), 'refused');
  assert.match(hot.getAttribute('aria-label'), /Refused/, 'marker text is in the accessible name');
  const [multi] = items(host, 'multi');
  assert.equal(multi.getAttribute('data-band'), 'medium');
  assert.equal(multi.getAttribute('data-status'), 'live');
  unmount();
});

test('accessibleName replaces the default entry name; the default chip reads "HH:MM title" in the zone', () => {
  const entries = [{ ...dayAt('2026-10-07', 6, 60, 'n'), title: 'Firewall rule change', accessibleName: 'Firewall rule change, high, 08:00 to 09:00' }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries }));
  const [chip] = items(host, 'n');
  assert.equal(chip.getAttribute('aria-label'), 'Firewall rule change, high, 08:00 to 09:00');
  assert.match(chip.textContent, /^08:00 Firewall rule change/, '06:00Z is 08:00 in Berlin; time first, never an id first');
  unmount();
});

test('AC14 (R20 AC1/AC2): click on an item and on a span calls onSelectEntry; ids survive a re-render', () => {
  const selected = [];
  const entries = [dayAt('2026-10-07', 6, 60, 'one'), { id: 'span', title: 'Span', start: '2026-10-05T08:00:00Z', end: '2026-10-07T16:00:00Z' }];
  const props = { ...base, entries, onSelectEntry: (e) => selected.push(e.id) };
  const { host, root, unmount } = mount(h(ui.SchedulingCalendar, props));
  const [chip] = items(host, 'one');
  const [span] = items(host, 'span');
  for (const el of [chip, span]) { assert.equal(el.tagName, 'BUTTON'); assert.equal(el.getAttribute('type'), 'button'); }
  click(chip);
  click(span);
  assert.deepEqual(selected, ['one', 'span']);
  act(() => root.render(h(ui.SchedulingCalendar, { ...props, entries: entries.map((e) => ({ ...e })) })));
  assert.equal(host.querySelector('[data-item-id="one"]'), chip, 'the same element, found by id');
  assert.equal(host.querySelector('[data-item-id="span"]'), span);
  unmount();
  const agenda = mount(h(ui.SchedulingCalendar, { ...props, view: 'agenda' }));
  assert.equal(items(agenda.host, 'one').length, 1, 'agenda items carry data-item-id too');
  agenda.unmount();
});

test('AC15 (R12 AC7): activating a day number calls onSelectDate with that date', () => {
  const picked = [];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: [], onSelectDate: (d) => picked.push(d) }));
  click(host.querySelector('[data-calendar-date="2026-10-14"]'));
  assert.deepEqual(picked, ['2026-10-14']);
  press(host.querySelector('[data-calendar-date="2026-10-14"]'), 'ArrowRight');
  assert.deepEqual(picked, ['2026-10-14'], 'arrow keys move focus only');
  unmount();
});

test('AC16 (R9 AC5): with emptyNote and nothing to show, every day cell still renders plus the note inside the grid', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: [], emptyNote: h('span', null, 'Nothing scheduled this month.') }));
  const grid = host.querySelector('.uix-scheduling-calendar__grid');
  assert.equal(grid.querySelectorAll('.uix-scheduling-calendar__day').length, 42);
  const note = grid.querySelector('.uix-scheduling-calendar__empty');
  assert.ok(note, 'the note is inside the grid');
  assert.equal(note.textContent, 'Nothing scheduled this month.');
  unmount();
  const busyMonth = mount(h(ui.SchedulingCalendar, { ...base, entries: [dayAt('2026-10-07', 6)], emptyNote: 'Nothing' }));
  assert.equal(busyMonth.host.querySelector('.uix-scheduling-calendar__empty'), null, 'no note when there is something');
  busyMonth.unmount();
});

test('notice renders above the grid', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: [], notice: h('p', null, 'Showing the first 2,000 items.') }));
  const notice = host.querySelector('.uix-scheduling-calendar__notice');
  assert.equal(notice.textContent, 'Showing the first 2,000 items.');
  assert.ok(notice.compareDocumentPosition(host.querySelector('.uix-scheduling-calendar__grid')) & window.Node.DOCUMENT_POSITION_FOLLOWING);
  unmount();
});

test('AC17: showHeader={false} renders no previous/next/view control; the header names are per view', () => {
  const off = mount(h(ui.SchedulingCalendar, { ...base, entries: [], showHeader: false, onAnchorDateChange: () => {} }));
  assert.equal(off.host.querySelector('.uix-scheduling-calendar__header'), null);
  assert.equal(off.host.querySelectorAll('.uix-segmented, .uix-btn').length, 0);
  off.unmount();
  const names = (host) => [...host.querySelectorAll('.uix-scheduling-calendar__header .uix-btn')].map((b) => b.textContent);
  const month = mount(h(ui.SchedulingCalendar, { ...base, entries: [], onAnchorDateChange: () => {} }));
  assert.deepEqual(names(month.host), ['Previous month', 'Next month']);
  month.unmount();
  const week = mount(h(ui.SchedulingCalendar, { ...base, entries: [], view: 'week', onAnchorDateChange: () => {} }));
  assert.deepEqual(names(week.host), ['Previous week', 'Next week']);
  week.unmount();
  const legacy = mount(h(ui.SchedulingCalendar, { ...base, entries: [], labels: { previous: 'Zurück', next: 'Weiter' } }));
  assert.deepEqual(names(legacy.host), ['Zurück', 'Weiter'], 'an older previous/next override still wins');
  legacy.unmount();
});

test('AC11 (R19 AC3): with legend set the legend is exactly the given items; unset keeps the built-in legend', () => {
  const legend = [
    { id: 'high', label: 'High band', swatch: { band: 'high' } },
    { id: 'tent', label: 'Tentative', swatch: { status: 'tentative' } },
    { id: 'hold', label: 'Hold window', swatch: { pattern: 'diagonal' } },
  ];
  const set = mount(h(ui.SchedulingCalendar, { ...base, entries: [], legend, legendCaption: 'Times in Europe/Berlin' }));
  const shown = [...set.host.querySelectorAll('.uix-scheduling-calendar__legend li')].map((li) => [li.getAttribute('data-legend-id'), li.textContent]);
  assert.deepEqual(shown, [['high', 'High band'], ['tent', 'Tentative'], ['hold', 'Hold window']]);
  assert.equal(set.host.querySelectorAll('.uix-scheduling-calendar__legend [data-state]').length, 0, 'no built-in item');
  assert.equal(set.host.querySelector('.uix-scheduling-calendar__legend-caption').textContent, 'Times in Europe/Berlin');
  const swatches = [...set.host.querySelectorAll('.uix-scheduling-calendar__swatch')];
  assert.deepEqual(swatches.map((s) => [s.getAttribute('data-band'), s.getAttribute('data-status'), s.getAttribute('data-pattern')]), [['high', null, null], [null, 'tentative', null], [null, null, 'diagonal']]);
  set.unmount();
  const unset = mount(h(ui.SchedulingCalendar, { ...base, entries: [] }));
  assert.deepEqual([...unset.host.querySelectorAll('.uix-scheduling-calendar__legend [data-state]')].map((s) => s.getAttribute('data-state')), ['scheduled', 'conflicted', 'in-progress', 'blackout-violation']);
  unset.unmount();
});

/* Consumers that pass only the 2.31 props (found in review of PR #102): nothing they render
 * today may throw, vanish or reach a callback differently. */

test('old props: an overlay and a multi-day entry may share an id, and a repeated id is drawn once', () => {
  const entries = [{ id: '1', title: 'Two days', start: '2026-10-07T08:00:00Z', end: '2026-10-08T09:00:00Z' }];
  const overlays = [
    { id: '1', label: 'Same id as the entry', start: '2026-10-05T06:00:00Z', end: '2026-10-06T18:00:00Z', kind: 'maintenance' },
    { id: '1', label: 'Repeated', start: '2026-10-12T06:00:00Z', end: '2026-10-13T18:00:00Z', kind: 'blackout' },
  ];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, overlays }));
  assert.equal(items(host, '1').length, 1, 'the entry is drawn');
  const windows = host.querySelectorAll('[data-overlay-id="1"]');
  assert.equal(windows.length, 1, 'the first overlay with that id is drawn, the repeat is not');
  assert.match(windows[0].textContent, /Same id as the entry/);
  unmount();
});

test('old props: without onShowMore every overlapping window gets a lane (a growing cell has room)', () => {
  const overlays = ['a', 'b', 'c', 'd'].map((id) => ({ id, label: `Window ${id}`, start: '2026-10-05T06:00:00Z', end: '2026-10-09T18:00:00Z', kind: 'maintenance' }));
  const spans = ['x', 'y', 'z'].map((id) => ({ id, title: `Span ${id}`, start: '2026-10-05T08:00:00Z', end: '2026-10-07T16:00:00Z' }));
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: spans, overlays }));
  assert.equal(host.querySelectorAll('.uix-scheduling-calendar__window').length, 4, 'all four windows');
  assert.equal(host.querySelectorAll('.uix-scheduling-calendar__span').length, 3, 'all three spans');
  assert.equal(host.querySelector('.uix-scheduling-calendar__rowmore'), null, 'nothing is hidden behind a control that cannot open');
  assert.equal(host.querySelector('[data-fixed]'), null);
  unmount();
  const capped = mount(h(ui.SchedulingCalendar, { ...base, entries: spans, overlays, windowLaneCap: 1, spanLaneCap: 2 }));
  assert.equal(capped.host.querySelectorAll('.uix-scheduling-calendar__window').length, 1, 'an explicit cap is kept');
  assert.equal(capped.host.querySelectorAll('.uix-scheduling-calendar__span').length, 2);
  assert.equal(capped.host.querySelector('.uix-scheduling-calendar__rowmore > [aria-hidden]').textContent, '+4', 'three windows and one span have no lane');
  capped.unmount();
});

test('old props: the word for an entry with no state is states.scheduled, so a translation still applies', () => {
  const entries = [dayAt('2026-10-07', 6, 60, 'plain'), { ...dayAt('2026-10-07', 8, 60, 'new'), status: 'tentative' }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, labels: { states: { scheduled: 'Geplant' }, statuses: { tentative: 'Vorläufig' } } }));
  assert.match(items(host, 'plain')[0].getAttribute('aria-label'), /Item plain, Geplant, /);
  assert.match(items(host, 'new')[0].getAttribute('aria-label'), /Item new, Vorläufig, /);
  unmount();
  const agenda = mount(h(ui.SchedulingCalendar, { ...base, entries, view: 'agenda', labels: { states: { scheduled: 'Geplant' } } }));
  assert.match(items(agenda.host, 'plain')[0].textContent, /Geplant/);
  agenda.unmount();
});

test('old props: onShowMore and renderDayBadge get the day in the order the consumer gave', () => {
  const calls = [];
  const badges = [];
  const multi = { id: 'multi', title: 'Multi', start: '2026-10-06T08:00:00Z', end: '2026-10-08T16:00:00Z' };
  const entries = [multi, dayAt('2026-10-07', 6, 60, 's1'), dayAt('2026-10-07', 8, 60, 's2')];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, {
    ...base, entries, maxEntriesPerDay: 1, onShowMore: (date, list) => calls.push([date, list.map((e) => e.id)]),
    renderDayBadge: (date, list) => { if (date === '2026-10-07') badges.push(list.map((e) => e.id)); return null; },
  }));
  click(cellOf(host, '2026-10-07').querySelector('.uix-scheduling-calendar__more'));
  assert.deepEqual(calls, [['2026-10-07', ['multi', 's1', 's2']]], 'input order, not chips first');
  assert.deepEqual(badges.at(-1), ['multi', 's1', 's2']);
  unmount();
});

test('days without dayEntries: the chips are still the entries; the "+N" is the consumer count and nothing expands', () => {
  const calls = [];
  const entries = [dayAt('2026-10-07', 6, 60, 'a'), dayAt('2026-10-07', 8, 60, 'b'), dayAt('2026-10-07', 10, 60, 'c'), dayAt('2026-10-08', 6, 60, 'd')];
  const props = { ...base, entries, maxEntriesPerDay: 2, days: { '2026-10-07': { count: 9, overflowCount: 7 } } };
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...props, onShowMore: (date, list) => calls.push([date, list.length]) }));
  const cell = cellOf(host, '2026-10-07');
  assert.deepEqual(chips(cell).map((c) => c.getAttribute('data-item-id')), ['a', 'b'], 'the day shows its entries, cut to the cap');
  assert.equal(cell.querySelector('.uix-scheduling-calendar__count').textContent.startsWith('9'), true);
  const more = cell.querySelector('.uix-scheduling-calendar__more');
  assert.equal(more.textContent, '+7 more', 'the consumer number, not 3 − 2');
  click(more);
  assert.deepEqual(calls, [['2026-10-07', 3]]);
  assert.equal(chips(cell).length, 2);
  assert.deepEqual(chips(cellOf(host, '2026-10-08')).map((c) => c.getAttribute('data-item-id')), ['d'], 'a day with no count shows its entries too');
  unmount();
  const noHandler = mount(h(ui.SchedulingCalendar, props));
  const plain = cellOf(noHandler.host, '2026-10-07').querySelector('.uix-scheduling-calendar__more');
  assert.equal(plain.tagName, 'SPAN', 'without onShowMore the count is text, never an in-place toggle');
  noHandler.unmount();
});

test('a dayEntries list longer than maxEntriesPerDay makes the fixed cells taller instead of clipping', () => {
  const picks = [dayAt('2026-10-07', 6, 60, 'a'), dayAt('2026-10-07', 8, 60, 'b'), dayAt('2026-10-07', 10, 60, 'c'), dayAt('2026-10-07', 12, 60, 'd')];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: [], maxEntriesPerDay: 2, onShowMore: () => {}, dayEntries: { '2026-10-07': picks } }));
  assert.equal(host.querySelector('.uix-scheduling-calendar__grid').style.getPropertyValue('--uix-scheduling-calendar-chips'), '4');
  assert.equal(chips(cellOf(host, '2026-10-07')).length, 4);
  unmount();
});

test('a consumer spanLayout with only placed and hiddenByRow renders', () => {
  const overlays = [windowAt('a', '2026-10-05', '2026-10-09'), windowAt('b', '2026-10-06', '2026-10-08')];
  const spanLayout = { placed: [{ id: 'b', group: 'window', weekRow: 1, lane: 0, startCol: 1, endCol: 3, continuesBefore: false, continuesAfter: false }], hiddenByRow: { 1: ['a'] } };
  const calls = [];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: [], overlays, spanLayout, dayEntries: {}, onShowMore: (d) => calls.push(d) }));
  click(host.querySelector('.uix-scheduling-calendar__rowmore'));
  assert.deepEqual(calls, ['2026-10-05'], 'with no first hidden day given, the first day of the row');
  unmount();
  const bare = mount(h(ui.SchedulingCalendar, { ...base, entries: [], overlays, spanLayout: { placed: spanLayout.placed }, dayEntries: {} }));
  assert.equal(bare.host.querySelectorAll('.uix-scheduling-calendar__window').length, 1);
  bare.unmount();
});

test('the built-in legend is a named group', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries: [] }));
  const legend = host.querySelector('.uix-scheduling-calendar__legend');
  assert.equal(legend.getAttribute('role'), 'group');
  assert.equal(legend.getAttribute('aria-label'), 'Schedule state legend');
  unmount();
});

test('deprecated state and overlay kind keep working (E13: deprecated, not removed)', () => {
  const entries = [{ ...dayAt('2026-10-07', 6, 60, 'old'), state: 'in-progress' }];
  const overlays = [{ id: 'legacy', label: 'Legacy window', start: '2026-10-05T06:00:00Z', end: '2026-10-06T18:00:00Z', kind: 'maintenance' }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries, overlays }));
  const [old] = items(host, 'old');
  assert.equal(old.getAttribute('data-state'), 'in-progress');
  assert.equal(old.getAttribute('data-status'), 'live', 'in-progress reads as the live status');
  assert.match(old.getAttribute('aria-label'), /In progress/);
  const legacy = host.querySelector('[data-overlay-id="legacy"]');
  assert.match(legacy.textContent, /Legacy window/);
  assert.equal(legacy.getAttribute('data-pattern'), 'solid');
  unmount();
});
