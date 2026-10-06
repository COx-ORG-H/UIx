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
