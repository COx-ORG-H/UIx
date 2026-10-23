/* SchedulingCalendar resource day (HAR-983), review of PR #166, in jsdom:
 *   - two bookings at the same start (a double booking) are two items: one tab stop in the whole
 *     view, one `aria-current`, and the arrow keys reach both (the stops were keyed by start, so
 *     both bookings were tab stops and both were current);
 *   - a free slot is open paper with its "+ 08:15" for the eye only; a booking is the time grid's
 *     entry chip (`entry` + `tg-item`), not a box of its own.
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
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  expose('requestAnimationFrame', (fn) => dom.window.setTimeout(() => fn(Date.now()), 0));
  expose('cancelAnimationFrame', (id) => dom.window.clearTimeout(id));
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT', 'requestAnimationFrame', 'cancelAnimationFrame']) delete globalThis[name];
});

const DATE = '2026-10-22';
const at = (time) => new Date(`${DATE}T${time}:00Z`).toISOString();

function mount(props) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(ui.SchedulingCalendar, {
    entries: [], anchorDate: DATE, timeZone: 'UTC', view: 'day', showHeader: false, locale: 'en-GB', legend: [],
    resources: [{ id: 'a', label: 'Dr A' }], slotMinutes: 15, dayStart: '08:00', dayEnd: '10:00', resourceLayout: 'columns',
    ...props,
  })));
  return { host, unmount: () => act(() => root.unmount()) };
}

const doubleBooked = [
  { id: 'b1', resourceId: 'a', start: at('08:00'), end: at('08:30'), kind: 'booked', label: 'Lejla M.' },
  { id: 'b2', resourceId: 'a', start: at('08:00'), end: at('08:30'), kind: 'booked', label: 'Kenan S.' },
  { id: 'f', resourceId: 'a', start: at('08:30'), end: at('10:00'), kind: 'free' },
];

test('a double booking is two items: one tab stop, one current, both reachable', () => {
  const { host, unmount } = mount({ resourceSpans: doubleBooked, selectedSlot: { resourceId: 'a', start: at('08:00') } });
  const bookings = [...host.querySelectorAll('[data-kind="booked"]')];
  assert.equal(bookings.length, 2);
  assert.equal(host.querySelectorAll('.uix-scheduling-calendar__resources [tabindex="0"]').length, 1);
  assert.equal(host.querySelectorAll('[aria-current="true"]').length, 1);
  const first = host.querySelector('.uix-scheduling-calendar__resources [tabindex="0"]');
  act(() => first.focus());
  act(() => first.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
  const second = document.activeElement;
  assert.notEqual(second, first);
  assert.equal(second.dataset.kind, 'booked', 'the other booking at the same start comes next');
  assert.equal(host.querySelectorAll('.uix-scheduling-calendar__resources [tabindex="0"]').length, 1);
  unmount();
});

test('a free slot shows "+ time" to the eye only; a booking is the time grid entry chip', () => {
  const { host, unmount } = mount({ resourceSpans: doubleBooked });
  const free = host.querySelector('[data-kind="free"]');
  const add = free.querySelector('.uix-scheduling-calendar__rs-add');
  assert.equal(add.textContent, '+ 08:30');
  assert.equal(add.getAttribute('aria-hidden'), 'true');
  assert.match(free.getAttribute('aria-label'), /08:30/);
  const booking = host.querySelector('[data-kind="booked"]');
  assert.ok(booking.classList.contains('uix-scheduling-calendar__entry'));
  assert.ok(booking.classList.contains('uix-scheduling-calendar__tg-item'));
  assert.ok(!booking.classList.contains('uix-scheduling-calendar__rs-item'));
  assert.equal(booking.style.getPropertyValue('--uix-scheduling-calendar-lanes'), '2');
  unmount();
});
