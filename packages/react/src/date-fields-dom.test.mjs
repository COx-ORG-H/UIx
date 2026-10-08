/* Date fields (HAR-1383; TENSOR B26, 59 native date / datetime-local inputs), in jsdom:
 *   DatePicker
 *   - shows the formatted date; the placeholder is the locale's shape; a hidden input submits ISO;
 *   - typed text is read on blur and on Enter (locale order or ISO); bad text marks the field
 *     invalid, says why and leaves the value alone; clearing the field clears the value;
 *   - the calendar button and ArrowDown open one month in a popover with focus on the selected
 *     day; arrows, Home / End, PageUp / PageDown (Shift: a year) move it, clamped to min / max;
 *   - choosing a day sets the value, closes the popover and returns focus to the field;
 *     Escape closes it without reaching what is around the field;
 *   - weekStartsOn, formatDate / parseDate, labels (props and provider), Field wiring, SSR.
 *   DateTimePicker
 *   - one `YYYY-MM-DDTHH:mm` value, a date field and a time input, the zone shown and described.
 *   DateRangePicker
 *   - mode="field": a trigger showing the range that opens the months and closes on the end date;
 *   - weekStartsOn reorders the grid; the inline picker is otherwise unchanged.
 * Renders the BUILT dist — run `npm run build` first.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState, StrictMode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const OPEN = 'data-test-popover-open';
const EXPOSED = ['window', 'document', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'IntersectionObserver', 'HTMLInputElement', 'IS_REACT_ACT_ENVIRONMENT'];
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  expose('window', window);
  expose('document', window.document);
  expose('navigator', window.navigator);
  expose('getComputedStyle', window.getComputedStyle.bind(window));
  expose('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  expose('HTMLInputElement', window.HTMLInputElement);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  // Native Popover API (not in jsdom), with the `toggle` event the fields listen to.
  const el = window.HTMLElement.prototype;
  const toggle = (target, newState) => { const event = new window.Event('toggle'); event.newState = newState; target.dispatchEvent(event); };
  el.showPopover = function showPopover() { if (this.hasAttribute(OPEN)) return; this.setAttribute(OPEN, ''); toggle(this, 'open'); };
  el.hidePopover = function hidePopover() { if (!this.hasAttribute(OPEN)) return; this.removeAttribute(OPEN); toggle(this, 'closed'); };
  const matches = window.Element.prototype.matches;
  window.Element.prototype.matches = function patched(selector) {
    return selector === ':popover-open' ? this.hasAttribute(OPEN) : matches.call(this, selector);
  };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of EXPOSED) delete globalThis[name];
});

const render = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => {
  el.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
});
/** Dispatch a keydown; returns false when a handler called preventDefault. */
const key = (el, k, init = {}) => {
  let notPrevented = true;
  act(() => { notPrevented = el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })); });
  return notPrevented;
};
const type = (input, text) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, text);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const blur = (input) => act(() => { input.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })); });
const focused = () => document.activeElement;

/** A controlled DatePicker; `changes` records every onValueChange. */
function mountDate(props = {}) {
  const changes = [];
  const problems = [];
  const outer = [];
  function Field() {
    const [value, setValue] = useState(props.value ?? null);
    return h('div', { onKeyDown: (e) => { if (e.key === 'Escape') outer.push('Escape'); } },
      h(ui.DatePicker, {
        locale: 'de', today: '2026-11-10', 'aria-label': 'Due', ...props, value,
        onValueChange: (next) => { changes.push(next); setValue(next); },
        onInputProblem: (problem) => problems.push(problem),
      }));
  }
  const view = render(h(Field));
  const { host } = view;
  return {
    ...view, changes, problems, outer,
    input: () => host.querySelector('input.uix-date-picker__input'),
    toggle: () => host.querySelector('button.uix-date-picker__toggle'),
    popover: () => host.querySelector('.uix-date-picker__popover'),
    isOpen: () => host.querySelector('.uix-date-picker__popover').hasAttribute(OPEN),
    day: (date) => host.querySelector(`.uix-date-picker__grid [data-date="${date}"]`),
    days: () => [...host.querySelectorAll('.uix-date-picker__grid [data-date]')],
    month: () => host.querySelector('.uix-date-picker__month')?.textContent,
    error: () => host.querySelector('.uix-date-picker__error'),
  };
}

test('DatePicker shows the formatted date, the locale placeholder and submits ISO', () => {
  const empty = mountDate();
  assert.equal(empty.input().value, '');
  assert.equal(empty.input().placeholder, 'DD.MM.YYYY');
  assert.equal(empty.input().getAttribute('aria-label'), 'Due');
  assert.equal(empty.input().hasAttribute('inputmode'), false, 'a numeric keypad could not type the separators');
  assert.equal(empty.toggle().getAttribute('aria-label'), 'Choose date');
  assert.equal(empty.toggle().getAttribute('aria-haspopup'), 'dialog');
  assert.equal(empty.toggle().getAttribute('aria-expanded'), 'false');
  assert.equal(empty.toggle().getAttribute('aria-controls'), empty.popover().id);
  assert.equal(empty.host.querySelector('input[type="hidden"]'), null);
  empty.unmount();

  const set = mountDate({ value: '2026-11-22', name: 'due' });
  assert.equal(set.input().value, '22.11.2026');
  assert.equal(set.toggle().getAttribute('aria-label'), 'Change date, Sonntag, 22. November 2026');
  const hidden = set.host.querySelector('input[type="hidden"]');
  assert.equal(hidden.name, 'due');
  assert.equal(hidden.value, '2026-11-22');
  set.unmount();

  const us = mountDate({ value: '2026-11-22', locale: 'en-US' });
  assert.equal(us.input().value, '11/22/2026');
  us.unmount();
});

test('DatePicker reads typed text on blur and on Enter, in the locale order or ISO', () => {
  const v = mountDate();
  type(v.input(), '3.4.2026');
  assert.deepEqual(v.changes, [], 'nothing changes while typing');
  blur(v.input());
  assert.deepEqual(v.changes, ['2026-04-03']);
  assert.equal(v.input().value, '03.04.2026', 'the text is rewritten in the field format');

  type(v.input(), '2026-12-24');
  assert.equal(key(v.input(), 'Enter'), false, 'Enter reads a changed draft and stays in the field');
  assert.deepEqual(v.changes, ['2026-04-03', '2026-12-24']);
  assert.equal(v.input().value, '24.12.2026');

  assert.equal(key(v.input(), 'Enter'), true, 'Enter on an unchanged field is left to the form');
  blur(v.input());
  assert.equal(v.changes.length, 2, 'an unchanged field reports nothing');
  v.unmount();

  const us = mountDate({ locale: 'en-US' });
  type(us.input(), '3/4/2026');
  blur(us.input());
  assert.deepEqual(us.changes, ['2026-03-04']);
  us.unmount();
});

test('DatePicker refuses text that is not a date, or a date that cannot be chosen', () => {
  const v = mountDate({ value: '2026-11-22', min: '2026-11-01', max: '2026-11-30', isUnavailable: (d) => d === '2026-11-15' });
  type(v.input(), '31.02.2026');
  blur(v.input());
  assert.deepEqual(v.changes, [], 'the value is left alone');
  assert.equal(v.input().getAttribute('aria-invalid'), 'true');
  assert.equal(v.error().getAttribute('role'), 'alert');
  assert.equal(v.error().textContent.trim(), 'Enter a date as DD.MM.YYYY.');
  assert.ok(v.input().getAttribute('aria-describedby').split(' ').includes(v.error().id));
  assert.equal(v.input().value, '31.02.2026', 'the draft stays as typed');
  assert.deepEqual(v.problems, ['format']);

  type(v.input(), '31.12.2026');
  assert.equal(v.error(), null, 'editing clears the message');
  assert.equal(v.input().hasAttribute('aria-invalid'), false);
  blur(v.input());
  assert.equal(v.error().textContent.trim(), 'That date is not available.');
  type(v.input(), '15.11.2026');
  blur(v.input());
  assert.equal(v.error().textContent.trim(), 'That date is not available.');
  assert.deepEqual(v.changes, []);
  assert.deepEqual(v.problems, ['format', null, 'unavailable', null, 'unavailable']);

  type(v.input(), '16.11.2026');
  blur(v.input());
  assert.deepEqual(v.changes, ['2026-11-16']);
  assert.equal(v.error(), null);
  v.unmount();
});

test('DatePicker clears the value when the field is emptied', () => {
  const v = mountDate({ value: '2026-11-22' });
  type(v.input(), '  ');
  blur(v.input());
  assert.deepEqual(v.changes, [null]);
  assert.equal(v.input().value, '');
  blur(v.input());
  assert.deepEqual(v.changes, [null], 'an empty field that stays empty reports nothing');
  v.unmount();
});

test('DatePicker opens one month with focus on the selected day', () => {
  const v = mountDate({ value: '2026-11-22' });
  assert.equal(v.days().length, 0, 'the calendar is not rendered while closed');
  click(v.toggle());
  assert.equal(v.isOpen(), true);
  assert.equal(v.toggle().getAttribute('aria-expanded'), 'true');
  assert.equal(v.popover().getAttribute('role'), 'dialog');
  assert.equal(v.popover().getAttribute('aria-label'), 'Calendar');
  assert.equal(v.month(), 'November 2026');
  assert.equal(v.days().length, 30);
  assert.equal(v.day('2026-11-22').getAttribute('aria-pressed'), 'true');
  assert.equal(v.day('2026-11-22').hasAttribute('data-selected'), true);
  assert.equal(v.day('2026-11-21').getAttribute('aria-pressed'), 'false');
  assert.equal(v.day('2026-11-10').getAttribute('aria-current'), 'date');
  assert.equal(v.day('2026-11-22').getAttribute('aria-label'), 'Sonntag, 22. November 2026');
  assert.equal(focused(), v.day('2026-11-22'));
  assert.deepEqual(v.days().filter((d) => d.tabIndex === 0).map((d) => d.dataset.date), ['2026-11-22'], 'one day is in the tab order');
  // Monday first: November 2026 starts on a Sunday, so six blanks lead the grid.
  const grid = v.host.querySelector('.uix-date-picker__grid');
  assert.equal(grid.querySelectorAll('span[aria-hidden="true"]').length, 6);
  assert.deepEqual([...v.host.querySelectorAll('.uix-date-range-picker__weekdays span')].map((s) => s.textContent), ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
  click(v.toggle());
  assert.equal(v.isOpen(), false, 'the button closes it again');
  v.unmount();

  const empty = mountDate();
  click(empty.toggle());
  assert.equal(focused(), empty.day('2026-11-10'), 'without a value, today has focus');
  empty.unmount();
});

test('DatePicker calendar keys: day, week, ends of the week, month and year', () => {
  const v = mountDate({ value: '2026-11-18' }); // a Wednesday
  click(v.toggle());
  const at = () => focused().dataset.date;
  const press = (k, init) => assert.equal(key(focused(), k, init), false, `${k} is handled`);
  press('ArrowRight'); assert.equal(at(), '2026-11-19');
  press('ArrowLeft'); press('ArrowLeft'); assert.equal(at(), '2026-11-17');
  press('ArrowDown'); assert.equal(at(), '2026-11-24');
  press('ArrowUp'); assert.equal(at(), '2026-11-17');
  press('Home'); assert.equal(at(), '2026-11-16', 'Home: the Monday of that week');
  press('End'); assert.equal(at(), '2026-11-22', 'End: the Sunday of that week');
  press('PageDown'); assert.equal(at(), '2026-12-22'); assert.equal(v.month(), 'Dezember 2026');
  press('PageUp'); press('PageUp'); assert.equal(at(), '2026-10-22'); assert.equal(v.month(), 'Oktober 2026');
  press('PageDown', { shiftKey: true }); assert.equal(at(), '2027-10-22');
  press('PageUp', { shiftKey: true }); assert.equal(at(), '2026-10-22');
  // Crossing a month edge with the arrows shows the next month.
  press('ArrowDown'); press('ArrowDown'); assert.equal(at(), '2026-11-05'); assert.equal(v.month(), 'November 2026');
  assert.deepEqual(v.changes, [], 'moving focus chooses nothing');
  v.unmount();
});

test('DatePicker keeps focus inside min / max and does not choose an unavailable day', () => {
  const v = mountDate({ value: '2026-11-18', min: '2026-11-16', max: '2026-11-20', isUnavailable: (d) => d === '2026-11-19' });
  click(v.toggle());
  const at = () => focused().dataset.date;
  key(focused(), 'PageUp'); assert.equal(at(), '2026-11-16', 'clamped to min');
  key(focused(), 'ArrowUp'); assert.equal(at(), '2026-11-16');
  key(focused(), 'PageDown'); assert.equal(at(), '2026-11-20', 'clamped to max');
  assert.equal(v.day('2026-11-15').getAttribute('aria-disabled'), 'true');
  assert.equal(v.day('2026-11-19').getAttribute('aria-disabled'), 'true');
  assert.equal(v.day('2026-11-18').hasAttribute('aria-disabled'), false);
  // An unavailable day inside the range can take focus (so it is read out) but not be chosen.
  key(focused(), 'ArrowLeft'); assert.equal(at(), '2026-11-19');
  click(v.day('2026-11-19'));
  click(v.day('2026-11-15'));
  assert.deepEqual(v.changes, []);
  assert.equal(v.isOpen(), true);
  // The month buttons stop at the limits.
  const [previous, next] = v.host.querySelectorAll('.uix-date-picker__nav-btn');
  assert.equal(previous.getAttribute('aria-label'), 'Show previous month');
  assert.equal(previous.getAttribute('aria-disabled'), 'true');
  assert.equal(next.getAttribute('aria-disabled'), 'true');
  click(next);
  assert.equal(v.month(), 'November 2026');
  v.unmount();
});

test('DatePicker month buttons change the month without moving focus', () => {
  const v = mountDate({ value: '2026-11-18' });
  click(v.toggle());
  const [previous, next] = v.host.querySelectorAll('.uix-date-picker__nav-btn');
  act(() => next.focus());
  click(next);
  assert.equal(v.month(), 'Dezember 2026');
  assert.equal(focused(), next);
  click(previous); click(previous);
  assert.equal(v.month(), 'Oktober 2026');
  assert.equal(v.host.querySelector('.uix-date-picker__month').getAttribute('aria-live'), 'polite');
  v.unmount();
});

test('DatePicker: choosing a day sets the value, closes the calendar and returns focus', () => {
  const v = mountDate({ value: '2026-11-18' });
  click(v.toggle());
  click(v.day('2026-11-25'));
  assert.deepEqual(v.changes, ['2026-11-25']);
  assert.equal(v.input().value, '25.11.2026');
  assert.equal(v.isOpen(), false);
  assert.equal(focused(), v.input());
  assert.equal(v.days().length, 0);
  v.unmount();
});

test('DatePicker: ArrowDown opens the calendar; Escape closes it and stays inside the field', () => {
  const v = mountDate({ value: '2026-11-18' });
  act(() => v.input().focus());
  assert.equal(key(v.input(), 'ArrowDown'), false);
  assert.equal(v.isOpen(), true);
  assert.equal(focused(), v.day('2026-11-18'));
  assert.equal(key(focused(), 'Escape'), false);
  assert.equal(v.isOpen(), false);
  assert.equal(focused(), v.input(), 'focus is back on the field');
  assert.deepEqual(v.outer, [], 'Escape did not reach what is around the field');
  assert.deepEqual(v.changes, []);
  v.unmount();
});

test('DatePicker: disabled and read-only fields do not open or read', () => {
  for (const props of [{ disabled: true }, { readOnly: true }]) {
    const v = mountDate({ value: '2026-11-18', ...props });
    assert.equal(v.toggle().disabled, true);
    key(v.input(), 'ArrowDown');
    assert.equal(v.isOpen(), false);
    v.unmount();
  }
});

test('DatePicker weekStartsOn moves the first column', () => {
  const v = mountDate({ value: '2026-11-18', weekStartsOn: 0, locale: 'en-US' });
  click(v.toggle());
  assert.deepEqual([...v.host.querySelectorAll('.uix-date-range-picker__weekdays span')].map((s) => s.textContent), ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  assert.equal(v.host.querySelectorAll('.uix-date-picker__grid span[aria-hidden="true"]').length, 0, 'November 2026 starts on a Sunday');
  key(focused(), 'Home'); assert.equal(focused().dataset.date, '2026-11-15', 'Home: the Sunday');
  key(focused(), 'End'); assert.equal(focused().dataset.date, '2026-11-21', 'End: the Saturday');
  v.unmount();
});

test('DatePicker formatDate / parseDate replace the field format', () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formatDate = (date) => `${Number(date.slice(8))} ${months[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
  const parseDate = (text) => {
    const match = /^(\d{1,2}) (\w{3}) (\d{4})$/.exec(text);
    const month = match ? months.indexOf(match[2]) : -1;
    return month < 0 ? null : `${match[3]}-${String(month + 1).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  };
  const v = mountDate({ value: '2026-11-22', formatDate, parseDate });
  assert.equal(v.input().value, '22 Nov 2026');
  assert.equal(v.input().hasAttribute('placeholder'), false, 'no numeric hint for a custom format');
  type(v.input(), '3 Apr 2026');
  blur(v.input());
  assert.deepEqual(v.changes, ['2026-04-03']);
  type(v.input(), '03.04.2026');
  blur(v.input());
  assert.equal(v.error().textContent.trim(), 'That is not a date.', 'the custom parser decides, and no numeric shape is promised');
  v.unmount();
  const hinted = mountDate({ formatDate, parseDate, placeholder: 'D Mon YYYY' });
  type(hinted.input(), 'soon');
  blur(hinted.input());
  assert.equal(hinted.error().textContent.trim(), 'Enter a date as D Mon YYYY.', 'the placeholder is the shape the message names');
  hinted.unmount();
});

test('DatePicker words come from props and from UixLabelsProvider', () => {
  const view = render(h(ui.UixLabelsProvider, { labels: { datePicker: { open: 'Datum wählen', calendar: 'Kalender', invalidDate: 'Datum als {pattern} eingeben.' } } },
    h(ui.DatePicker, { value: null, onValueChange() {}, locale: 'de', 'aria-label': 'Fällig', labels: { calendar: 'Monat' } })));
  const input = view.host.querySelector('.uix-date-picker__input');
  assert.equal(view.host.querySelector('.uix-date-picker__toggle').getAttribute('aria-label'), 'Datum wählen');
  assert.equal(view.host.querySelector('.uix-date-picker__popover').getAttribute('aria-label'), 'Monat', 'a prop wins over the provider');
  type(input, 'morgen');
  blur(input);
  assert.equal(view.host.querySelector('.uix-date-picker__error').textContent.trim(), 'Datum als DD.MM.YYYY eingeben.');
  view.unmount();
});

test('DatePicker inside Field: the label names the input and the message describes it', () => {
  const view = render(h(ui.Field, { label: 'Due date', error: 'Required', required: true },
    h(ui.DatePicker, { value: null, onValueChange() {}, locale: 'de' })));
  const input = view.host.querySelector('.uix-date-picker__input');
  const label = view.host.querySelector('label');
  assert.equal(label.htmlFor, input.id);
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(input.getAttribute('aria-required'), 'true');
  const described = input.getAttribute('aria-describedby').split(' ').map((id) => document.getElementById(id));
  assert.ok(described.some((el) => el?.textContent.includes('Required')), 'the field message describes the input');
  view.unmount();
});

test('DatePicker and DateTimePicker render on the server', () => {
  const date = renderToStaticMarkup(h(ui.DatePicker, { value: '2026-11-22', onValueChange() {}, locale: 'de', today: '2026-11-10', 'aria-label': 'Due' }));
  assert.match(date, /value="22\.11\.2026"/);
  assert.doesNotMatch(date, /data-date=/, 'no calendar in the closed markup');
  const dateTime = renderToStaticMarkup(h(ui.DateTimePicker, { value: '2026-11-22T14:30', onValueChange() {}, locale: 'en-GB', timeZone: 'Europe/Vienna', today: '2026-11-10', 'aria-label': 'Starts' }));
  assert.match(dateTime, /value="22\/11\/2026"/);
  assert.match(dateTime, /type="time"[^>]*value="14:30"|value="14:30"[^>]*type="time"/);
  const range = renderToStaticMarkup(h(ui.DateRangePicker, { mode: 'field', value: { start: '2026-11-22', end: '2026-11-28' }, onChange() {}, locale: 'de' }));
  assert.match(range, /22\.11\.2026 – 28\.11\.2026/);
});

/** A controlled DateTimePicker. */
function mountDateTime(props = {}, wrap = (el) => el) {
  const changes = [];
  function Field() {
    const [value, setValue] = useState(props.value ?? null);
    return wrap(h(ui.DateTimePicker, {
      locale: 'en-GB', today: '2026-11-10', timeZone: 'Europe/Vienna', ...props, value,
      onValueChange: (next) => { changes.push(next); setValue(next); },
    }));
  }
  const view = render(h(Field));
  const { host } = view;
  return {
    ...view, changes,
    root: () => host.querySelector('.uix-date-time-picker'),
    date: () => host.querySelector('input.uix-date-picker__input'),
    time: () => host.querySelector('input[type="time"]'),
    zone: () => host.querySelector('.uix-date-time-picker__zone'),
  };
}

test('DateTimePicker splits one value into a date, a time and the zone they are in', () => {
  const v = mountDateTime({ value: '2026-11-22T14:30', 'aria-label': 'Starts', name: 'starts' });
  assert.equal(v.root().getAttribute('role'), 'group');
  assert.equal(v.root().getAttribute('aria-label'), 'Starts');
  assert.equal(v.date().value, '22/11/2026');
  assert.equal(v.date().getAttribute('aria-label'), 'Date');
  assert.equal(v.time().value, '14:30');
  assert.equal(v.time().getAttribute('aria-label'), 'Time');
  assert.equal(v.time().step, '60');
  const zone = v.zone();
  assert.match(zone.querySelector('[aria-hidden="true"]').textContent, /^(CET|GMT\+1)$/, 'Vienna in November');
  const spoken = zone.querySelector('.uix-visually-hidden');
  assert.match(spoken.textContent, /^Time zone: (CET|GMT\+1)$/);
  assert.equal(v.time().getAttribute('aria-describedby'), spoken.id);
  const hidden = v.host.querySelector('input[type="hidden"]');
  assert.equal(hidden.name, 'starts');
  assert.equal(hidden.value, '2026-11-22T14:30');
  assert.equal(v.host.querySelectorAll('input[type="hidden"]').length, 1, 'the date field adds no second hidden input');
  v.unmount();

  const summer = mountDateTime({ value: '2026-07-01T09:00', 'aria-label': 'Starts' });
  assert.match(summer.zone().querySelector('[aria-hidden="true"]').textContent, /^(CEST|GMT\+2)$/, 'the zone name follows the chosen day');
  summer.unmount();
});

test('DateTimePicker: changing either part reports the whole value', () => {
  const v = mountDateTime({ value: '2026-11-22T14:30', 'aria-label': 'Starts', minuteStep: 15 });
  assert.equal(v.time().step, '900');
  type(v.time(), '09:15');
  assert.deepEqual(v.changes, ['2026-11-22T09:15']);
  type(v.date(), '24/12/2026');
  blur(v.date());
  assert.deepEqual(v.changes, ['2026-11-22T09:15', '2026-12-24T09:15'], 'a new date keeps the time');
  type(v.date(), '');
  blur(v.date());
  assert.equal(v.changes.at(-1), null, 'clearing the date clears the value');
  assert.equal(v.time().value, '');
  v.unmount();
});

test('DateTimePicker: a time typed first waits for its date; a date alone gets defaultTime', () => {
  const v = mountDateTime({ 'aria-label': 'Starts' });
  type(v.time(), '16:45');
  assert.deepEqual(v.changes, [], 'a time alone is not a value');
  assert.equal(v.time().value, '16:45');
  type(v.date(), '22/11/2026');
  blur(v.date());
  assert.deepEqual(v.changes, ['2026-11-22T16:45']);
  v.unmount();

  const morning = mountDateTime({ 'aria-label': 'Starts', defaultTime: '09:00' });
  type(morning.date(), '22/11/2026');
  blur(morning.date());
  assert.deepEqual(morning.changes, ['2026-11-22T09:00']);
  morning.unmount();
});

test('DateTimePicker: the zone text can be replaced or left out, and min / max take a date-time', () => {
  const named = mountDateTime({ value: '2026-11-22T14:30', 'aria-label': 'Starts', timeZoneLabel: 'Vienna time' });
  assert.equal(named.zone().querySelector('[aria-hidden="true"]').textContent, 'Vienna time');
  named.unmount();
  const none = mountDateTime({ value: '2026-11-22T14:30', 'aria-label': 'Starts', timeZoneLabel: null });
  assert.equal(none.zone(), null);
  assert.equal(none.time().hasAttribute('aria-describedby'), false);
  none.unmount();

  const limited = mountDateTime({ value: '2026-11-22T14:30', 'aria-label': 'Starts', min: '2026-11-20T08:00', max: '2026-11-25T18:00' });
  type(limited.date(), '26/11/2026');
  blur(limited.date());
  assert.deepEqual(limited.changes, []);
  assert.equal(limited.host.querySelector('.uix-date-picker__error').textContent.trim(), 'That date is not available.');
  limited.unmount();
});

test('DateTimePicker inside Field: the label names the date and the time borrows it', () => {
  const v = mountDateTime({ value: '2026-11-22T14:30' }, (el) => h(ui.Field, { label: 'Starts', hint: 'Local time of the site' }, el));
  const label = v.host.querySelector('label');
  assert.equal(label.htmlFor, v.date().id);
  assert.equal(v.date().hasAttribute('aria-label'), false);
  assert.equal(v.time().getAttribute('aria-label'), 'Starts, time');
  assert.match(document.getElementById(v.date().getAttribute('aria-describedby')).textContent, /Local time of the site/);
  v.unmount();
});

/** A controlled DateRangePicker. */
function mountRange(props = {}) {
  const changes = [];
  function Field() {
    const [value, setValue] = useState(props.value ?? {});
    return h(ui.DateRangePicker, {
      locale: 'de', today: '2026-11-10', label: 'Period', ...props, value,
      onChange: (next) => { changes.push(next); setValue(next); },
    });
  }
  const view = render(h(Field));
  const { host } = view;
  return {
    ...view, changes,
    trigger: () => host.querySelector('button.uix-date-range-field__trigger'),
    popover: () => host.querySelector('.uix-date-range-field__popover'),
    isOpen: () => host.querySelector('.uix-date-range-field__popover').hasAttribute(OPEN),
    day: (date) => host.querySelector(`.uix-date-range-picker__grid [data-date="${date}"]`),
  };
}

test('DateRangePicker mode="field": a trigger that shows the range and opens the months', () => {
  const v = mountRange({ mode: 'field', visibleMonth: '2026-11-01' });
  const trigger = v.trigger();
  assert.equal(trigger.textContent, 'Period: Choose dates');
  assert.equal(trigger.querySelector('.uix-date-range-field__value--empty') !== null, true);
  assert.equal(trigger.getAttribute('aria-haspopup'), 'dialog');
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(v.host.querySelector('.uix-date-range-picker'), null, 'the months are not rendered while closed');

  click(trigger);
  assert.equal(v.isOpen(), true);
  assert.equal(v.popover().getAttribute('role'), 'dialog');
  assert.equal(v.popover().getAttribute('aria-label'), 'Period');
  assert.equal(v.host.querySelectorAll('.uix-date-range-picker__month').length, 2);
  assert.equal(v.host.querySelector('.uix-date-range-picker--in-popover') !== null, true);
  assert.equal(document.activeElement, v.day('2026-11-01'), 'focus moves into the months');

  click(v.day('2026-11-22'));
  assert.deepEqual(v.changes, [{ start: '2026-11-22' }]);
  assert.equal(v.isOpen(), true, 'a start alone keeps it open');
  assert.equal(trigger.textContent, 'Period: 22.11.2026 –');
  click(v.day('2026-11-28'));
  assert.deepEqual(v.changes.at(-1), { start: '2026-11-22', end: '2026-11-28' });
  assert.equal(v.isOpen(), false, 'the end date closes it');
  assert.equal(document.activeElement, trigger, 'focus is back on the trigger');
  assert.equal(trigger.textContent, 'Period: 22.11.2026 – 28.11.2026');
  v.unmount();
});

test('DateRangePicker mode="field": Escape, formatDate, a label, an invalid range', () => {
  const outer = [];
  const changes = [];
  const view = render(h('div', { onKeyDown: (e) => { if (e.key === 'Escape') outer.push('Escape'); } },
    h(ui.Field, { label: 'Period' },
      h(ui.DateRangePicker, {
        mode: 'field', value: { start: '2026-11-22', end: '2026-11-28' }, onChange: (next) => changes.push(next), locale: 'de',
        formatDate: (date) => date.slice(5).split('-').reverse().join('.'), labels: { fieldRange: '{start} bis {end}' },
      }))));
  const trigger = view.host.querySelector('.uix-date-range-field__trigger');
  const value = trigger.querySelector('.uix-date-range-field__value');
  assert.equal(value.textContent, '22.11 bis 28.11');
  assert.equal(view.host.querySelector('label').htmlFor, trigger.id);
  assert.ok(trigger.getAttribute('aria-describedby').split(' ').includes(value.id), 'with a label as its name, the range is its description');
  click(trigger);
  const popover = view.host.querySelector('.uix-date-range-field__popover');
  assert.equal(popover.hasAttribute(OPEN), true);
  assert.equal(document.activeElement.dataset.date, '2026-11-28', 'focus starts on the end of the range');
  assert.equal(key(document.activeElement, 'Escape'), false);
  assert.equal(popover.hasAttribute(OPEN), false);
  assert.equal(document.activeElement, trigger);
  assert.deepEqual(outer, []);
  assert.deepEqual(changes, []);
  view.unmount();

  const bad = mountRange({ mode: 'field', value: { start: '2026-11-28', end: '2026-11-22' } });
  assert.equal(bad.trigger().getAttribute('aria-invalid'), 'true');
  bad.unmount();
  const off = mountRange({ mode: 'field', disabled: true });
  assert.equal(off.trigger().disabled, true);
  off.unmount();
});

test('DateRangePicker weekStartsOn reorders the grid; the default stays Monday-first and inline', () => {
  const monday = mountRange({ visibleMonth: '2026-11-01', locale: 'en-US' });
  const root = monday.host.querySelector('section.uix-date-range-picker');
  assert.ok(root, 'inline by default');
  assert.equal(monday.host.querySelector('.uix-date-range-field'), null);
  assert.deepEqual([...root.querySelector('.uix-date-range-picker__weekdays').children].map((s) => s.textContent), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  assert.equal(root.querySelector('.uix-date-range-picker__grid').querySelectorAll('span[aria-hidden="true"]').length, 6);
  monday.unmount();

  const sunday = mountRange({ visibleMonth: '2026-11-01', locale: 'en-US', weekStartsOn: 0, value: { start: '2026-11-18' } });
  const grid = sunday.host.querySelector('.uix-date-range-picker__grid');
  assert.deepEqual([...sunday.host.querySelector('.uix-date-range-picker__weekdays').children].map((s) => s.textContent), ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  assert.equal(grid.querySelectorAll('span[aria-hidden="true"]').length, 0);
  act(() => sunday.day('2026-11-18').focus());
  key(sunday.day('2026-11-18'), 'Home');
  assert.equal(document.activeElement.dataset.date, '2026-11-15', 'Home: the Sunday');
  key(document.activeElement, 'End');
  assert.equal(document.activeElement.dataset.date, '2026-11-21', 'End: the Saturday');
  sunday.unmount();
});

test('DatePicker under StrictMode reports each input problem once', () => {
  const problems = [];
  const view = render(h(StrictMode, null, h(ui.DatePicker, { value: '2026-11-22', onValueChange() {}, locale: 'de', 'aria-label': 'Due', onInputProblem: (problem) => problems.push(problem) })));
  const input = view.host.querySelector('.uix-date-picker__input');
  assert.deepEqual(problems, [], 'nothing to report at mount');
  type(input, 'morgen');
  blur(input);
  type(input, '23.11.2026');
  assert.deepEqual(problems, ['format', null]);
  view.unmount();
});

test('a press on the calendar button that never becomes a click does not swallow the next one', () => {
  const v = mountDate({ value: '2026-11-18' });
  click(v.toggle());
  assert.equal(v.isOpen(), true);
  // pressed while open, then the pointer leaves without a click; the popover is closed elsewhere
  act(() => { v.toggle().dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true })); });
  act(() => { v.toggle().dispatchEvent(new window.MouseEvent('pointerout', { bubbles: true, relatedTarget: document.body })); });
  act(() => { v.popover().hidePopover(); });
  assert.equal(v.isOpen(), false);
  // a keyboard activation: a click with no pointerdown before it
  act(() => { v.toggle().dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })); });
  assert.equal(v.isOpen(), true, 'it opens');
  v.unmount();
});
