/* HAR-1520 (U4) — the grouped agenda of SchedulingCalendar and the counts-only month, in
 * jsdom. AC numbers are the slice's. Virtualisation, Enter, the 375 px width and contrast are
 * measured in a browser (tests/a11y/scheduling-agenda.spec.mjs).
 *
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';

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
  // The virtual-rows hook observes its scroller; jsdom has no ResizeObserver.
  expose('ResizeObserver', class { observe() {} disconnect() {} });
  // ... and reads its scroll position once per frame.
  expose('requestAnimationFrame', (callback) => dom.window.requestAnimationFrame(callback));
  expose('cancelAnimationFrame', (handle) => dom.window.cancelAnimationFrame(handle));
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
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })));
const cls = (name) => `.uix-scheduling-calendar__${name}`;
const BERLIN = 'Europe/Berlin';
const at = (id, date, from, to, extra = {}) => ({ id, title: `Item ${id}`, start: new Date(`${date}T${from}:00+02:00`).toISOString(), end: new Date(`${date}T${to}:00+02:00`).toISOString(), ...extra });
const base = { anchorDate: '2026-10-07', timeZone: BERLIN, locale: 'en-GB', view: 'agenda', entries: [] };
const rowIds = (root) => [...root.querySelectorAll(`${cls('agenda-row')}`)].map((row) => row.getAttribute('data-item-id'));

test('without agendaGroups the agenda is the flat list it was', () => {
  const entries = [at('b', '2026-10-07', '10:00', '11:00'), at('a', '2026-10-07', '08:00', '09:00')];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, entries }));
  assert.equal(host.querySelector(cls('agenda-group')), null);
  assert.deepEqual([...host.querySelectorAll(`${cls('agenda')} > ol > li > button`)].map((b) => b.getAttribute('data-item-id')), ['a', 'b'], 'sorted by start, as before');
  unmount();
});

test('AC1 (R16 AC2): rows render in the order of agendaGroups exactly; nothing is re-sorted', () => {
  // Equal starts in the consumer's natural-ID order, then a later row listed first on purpose.
  const groups = [
    { date: '2026-10-08', rows: [at('CHG-10', '2026-10-08', '09:00', '10:00'), at('CHG-9', '2026-10-08', '09:00', '10:00'), at('CHG-2', '2026-10-08', '09:00', '10:00')] },
    { date: '2026-10-07', rows: [at('late', '2026-10-07', '15:00', '16:00'), at('early', '2026-10-07', '06:00', '07:00')] },
  ];
  const { host, root, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: groups }));
  assert.deepEqual(rowIds(host), ['CHG-10', 'CHG-9', 'CHG-2', 'late', 'early']);
  assert.deepEqual([...host.querySelectorAll(cls('agenda-group'))].map((g) => g.getAttribute('data-date')), ['2026-10-08', '2026-10-07'], 'groups too');
  act(() => root.render(h(ui.SchedulingCalendar, { ...base, agendaGroups: [...groups].reverse() })));
  assert.deepEqual(rowIds(host), ['late', 'early', 'CHG-10', 'CHG-9', 'CHG-2']);
  unmount();
});

test('AC2 (R16 AC3): each day has an h3 heading through formatDate and its rows in an ol/li', () => {
  const groups = [{ date: '2026-10-07', rows: [at('a', '2026-10-07', '08:00', '09:00'), at('b', '2026-10-07', '10:00', '11:00')] }, { date: '2026-10-08', heading: 'Tomorrow', rows: [at('c', '2026-10-08', '08:00', '09:00')] }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: groups, formatDate: (date, part) => `${part}:${date}` }));
  const headings = [...host.querySelectorAll(`${cls('agenda')} h3`)];
  assert.deepEqual(headings.map((el) => el.textContent), ['day:2026-10-07', 'Tomorrow']);
  const lists = [...host.querySelectorAll(`${cls('agenda-group')} > ol`)];
  assert.equal(lists.length, 2);
  assert.deepEqual(lists.map((ol) => [...ol.children].map((li) => li.tagName).join('')), ['LILI', 'LI']);
  assert.equal(host.querySelector(cls('agenda')).getAttribute('role'), 'region');
  unmount();
  const level = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: groups, agendaHeadingLevel: 4 }));
  assert.equal(level.host.querySelectorAll(`${cls('agenda')} h4`).length, 2);
  assert.equal(level.host.querySelectorAll(`${cls('agenda')} h3`).length, 0);
  level.unmount();
});

test('AC2: above virtualizeAbove the agenda is one flat run of rows in its own scroller, headings kept', () => {
  const rows = Array.from({ length: 12 }, (_, i) => at(`r${i}`, '2026-10-07', '08:00', '09:00'));
  const groups = [{ date: '2026-10-07', rows: rows.slice(0, 6), hiddenCount: 3 }, { date: '2026-10-08', rows: rows.slice(6), continuesCount: 2 }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: groups, virtualizeAbove: 10 }));
  const agenda = host.querySelector(cls('agenda'));
  assert.ok(agenda.classList.contains('uix-scheduling-calendar__agenda--virtual'));
  assert.equal(agenda.querySelector('ol'), null);
  // No layout in jsdom: the window is the assumed 640 px, which holds these sixteen rows, in order, with their headings.
  assert.deepEqual([...agenda.querySelectorAll(cls('agenda-vrow'))].map((row) => row.getAttribute('data-kind')), ['heading', ...Array(6).fill('entry'), 'hidden', 'heading', ...Array(6).fill('entry'), 'continues']);
  assert.equal(agenda.querySelectorAll('h3').length, 2);
  assert.deepEqual(rowIds(host), rows.map((row) => row.id));
  unmount();
  const under = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: groups, virtualizeAbove: 12 }));
  assert.equal(under.host.querySelector(cls('agenda--virtual')), null, 'at the threshold it is still the semantic list');
  under.unmount();
});

test('AC3 (R16 AC4 / R20 AC1): a row is a button that calls onSelectEntry and carries the item API', () => {
  const selected = [];
  const row = at('a', '2026-10-07', '08:00', '09:30', { band: 'high', status: 'tentative', meta: 'Payments', markers: [{ id: 'm', label: 'Needs sign-off', emphasis: 'warning' }] });
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: [{ date: '2026-10-07', rows: [row] }], onSelectEntry: (entry) => selected.push(entry.id) }));
  const button = host.querySelector(cls('agenda-row'));
  assert.equal(button.tagName, 'BUTTON');
  assert.equal(button.getAttribute('type'), 'button');
  assert.deepEqual([button.getAttribute('data-item-id'), button.getAttribute('data-band'), button.getAttribute('data-status')], ['a', 'high', 'tentative']);
  assert.match(button.getAttribute('aria-label'), /Item a, Tentative, .* to .*, Needs sign-off/);
  assert.match(button.querySelector(cls('agenda-time')).textContent, /^08:00 – 09:30$/);
  assert.equal(button.querySelector(cls('agenda-meta')).textContent, 'Payments');
  const swatch = button.querySelector(cls('swatch'));
  assert.deepEqual([swatch.getAttribute('data-band'), swatch.getAttribute('data-status'), swatch.getAttribute('aria-hidden')], ['high', 'tentative', 'true']);
  click(button);
  assert.deepEqual(selected, ['a']);
  unmount();
});

test('AC4 (R16 AC6): three rows inside one window give one note beside the heading, not three', () => {
  const picked = [];
  const hold = { id: 'w', label: 'Quarter close', kindLabel: 'Hold', scopeLabel: 'Payroll services', start: '2026-10-07T00:00:00Z', end: '2026-10-08T00:00:00Z', pattern: 'cross' };
  const groups = [{ date: '2026-10-07', annotations: [hold], rows: [at('a', '2026-10-07', '08:00', '09:00'), at('b', '2026-10-07', '10:00', '11:00'), at('c', '2026-10-07', '12:00', '13:00')] }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: groups, onSelectOverlay: (overlay) => picked.push(overlay.id) }));
  const notes = host.querySelectorAll('[data-overlay-id="w"]');
  assert.equal(notes.length, 1);
  const [note] = notes;
  assert.ok(note.closest(cls('agenda-head')), 'beside the heading');
  assert.equal(note.closest(cls('agenda-row')), null, 'not inside a row');
  assert.equal(note.closest('h3'), null, 'and not part of the heading text');
  assert.equal(note.tagName, 'BUTTON');
  for (const word of ['Hold', 'Quarter close', 'Payroll services']) { assert.match(note.textContent, new RegExp(word)); assert.match(note.getAttribute('aria-label'), new RegExp(word)); }
  assert.equal(note.getAttribute('data-pattern'), 'cross');
  click(note);
  assert.deepEqual(picked, ['w']);
  unmount();
});

test('AC5 (R2 AC4): a day with no rows and four unshown keeps its heading and "4 not shown — open day"', () => {
  const more = [];
  const groups = [{ date: '2026-10-07', rows: [], hiddenCount: 4 }, { date: '2026-10-08', rows: [at('a', '2026-10-08', '08:00', '09:00')], continuesCount: 2 }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: groups, onShowMore: (date) => more.push(date) }));
  const [first, second] = host.querySelectorAll(cls('agenda-group'));
  assert.ok(first.querySelector('h3'), 'the heading is still there');
  assert.equal(first.querySelector('ol'), null, 'no empty list');
  const open = first.querySelector(cls('agenda-more'));
  assert.equal(open.tagName, 'BUTTON');
  assert.equal(open.textContent, '4 not shown — open day');
  click(open);
  assert.deepEqual(more, ['2026-10-07']);
  assert.equal(second.querySelector(cls('agenda-more')), null);
  assert.equal(second.querySelector(cls('agenda-continues')).textContent, 'Continues: 2 listed under an earlier day');
  unmount();
  const translated = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: groups, labels: { hiddenInDay: '{count} nicht gezeigt', continuesInDay: '{count} laufen weiter' } }));
  assert.equal(translated.host.querySelector(cls('agenda-more')).textContent, '4 nicht gezeigt');
  assert.equal(translated.host.querySelector(cls('agenda-more')).tagName, 'P', 'without onShowMore it is text, not a dead control');
  assert.equal(translated.host.querySelector(cls('agenda-continues')).textContent, '2 laufen weiter');
  translated.unmount();
});

test('AC7 (R19 AC5): the status of a row is visible text, and nothing is only in title', () => {
  const groups = [{ date: '2026-10-07', rows: [at('a', '2026-10-07', '08:00', '09:00', { status: 'done' }), at('b', '2026-10-07', '10:00', '11:00', { markers: [{ id: 'm', label: 'Declined', emphasis: 'refused' }] })] }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: groups, labels: { statuses: { done: 'Finished' } } }));
  const [a, b] = host.querySelectorAll(cls('agenda-row'));
  assert.equal(a.querySelector(cls('status')).textContent, 'Finished');
  assert.equal(b.querySelector(cls('status')).textContent, 'Scheduled');
  assert.equal(b.querySelector(cls('marker-label')).textContent, 'Declined', 'a marker shows its text in a row');
  assert.equal(host.querySelectorAll(`${cls('agenda')} [title]`).length, 0);
  assert.equal(host.querySelectorAll(`${cls('agenda')} .uix-pill`).length, 0, 'no coloured state pill');
  unmount();
});

test('AC10 (R16 AC5): the notice is above the first heading, before the list in reading order', () => {
  const groups = [{ date: '2026-10-07', rows: [at('a', '2026-10-07', '08:00', '09:00')] }];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: groups, notice: h('p', null, 'Showing the first 500 items.') }));
  const notice = host.querySelector(cls('notice'));
  const heading = host.querySelector(`${cls('agenda')} h3`);
  assert.equal(notice.textContent, 'Showing the first 500 items.');
  assert.ok(notice.compareDocumentPosition(heading) & window.Node.DOCUMENT_POSITION_FOLLOWING);
  unmount();
});

const long = (count) => [{ date: '2026-10-07', rows: Array.from({ length: count }, (_, i) => at(`r${i}`, '2026-10-07', '08:00', '09:00')) }];
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 60)));

test('AC2: a long agenda is a window of rows before its scroller has been measured, and on the server', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: long(1000) }));
  const mounted = host.querySelectorAll(cls('agenda-vrow')).length;
  assert.ok(mounted > 5 && mounted < 40, `a window of rows, not 1001 (${mounted})`);
  unmount();
  const html = renderToString(h(ui.SchedulingCalendar, { ...base, agendaGroups: long(1000) }));
  const served = html.split('uix-scheduling-calendar__agenda-vrow').length - 1;
  assert.ok(served > 5 && served < 40, `the server sends a window of rows too (${served})`);
});

test('HAR-1541: while the page prints, the long agenda mounts every row, and windows again afterwards', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: long(300) }));
  const rows = () => host.querySelectorAll(cls('agenda-vrow')).length;
  const windowed = rows();
  assert.ok(windowed < 40, `a window of rows on the screen (${windowed})`);
  const scroller = host.querySelector(cls('agenda--virtual'));
  // The browser lays the page out for paper as soon as the handlers return: the rows are there by then, with no act() to wait for.
  window.dispatchEvent(new window.Event('beforeprint'));
  assert.equal(rows(), 301, 'the heading and all 300 rows');
  assert.equal(host.querySelector(cls('agenda-window')).style.paddingTop, '0px', 'no space kept for rows that are not mounted');
  assert.equal(host.querySelector(cls('agenda--virtual')), scroller, 'the same element: scroll position and focus are kept');
  act(() => window.dispatchEvent(new window.Event('afterprint')));
  assert.equal(rows(), windowed);
  // A short agenda does not listen at all.
  const short = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: long(5) }));
  const before = short.host.innerHTML;
  window.dispatchEvent(new window.Event('beforeprint'));
  assert.equal(short.host.innerHTML, before);
  act(() => window.dispatchEvent(new window.Event('afterprint')));
  short.unmount();
  unmount();
});

test('AC2: an agenda that grows past virtualizeAbove after it mounted is windowed and follows its scroller', async () => {
  for (const first of [long(100), []]) {
    const { host, root, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: first }));
    assert.equal(host.querySelector(cls('agenda--virtual')), null);
    act(() => root.render(h(ui.SchedulingCalendar, { ...base, agendaGroups: long(1000) })));
    const scroller = host.querySelector(cls('agenda--virtual'));
    assert.ok(scroller, 'the long form');
    assert.ok(host.querySelectorAll(cls('agenda-vrow')).length < 40);
    assert.ok(host.querySelector('[data-item-id="r0"]'));
    // The scroller is being listened to: scrolling it moves the window of rows.
    Object.defineProperty(scroller, 'clientHeight', { value: 440, configurable: true });
    scroller.scrollTop = 44 * 500;
    scroller.dispatchEvent(new window.Event('scroll'));
    await settle();
    assert.equal(host.querySelector('[data-item-id="r0"]'), null, 'the first rows are no longer mounted');
    assert.ok(host.querySelector('[data-item-id="r500"]'), 'the rows at the scroll position are');
    assert.ok(host.querySelectorAll(cls('agenda-vrow')).length < 40);
    // ... and back under the threshold it is the semantic list again.
    act(() => root.render(h(ui.SchedulingCalendar, { ...base, agendaGroups: long(100) })));
    assert.equal(host.querySelector(cls('agenda--virtual')), null);
    assert.equal(host.querySelectorAll('ol > li').length, 100);
    unmount();
  }
});

test('AC2: in the long form each window note has a row of its own under the heading', () => {
  const notes = [1, 2].map((n) => ({ id: `w${n}`, label: `Window ${n}`, kindLabel: 'Hold', start: '2026-10-06T22:00:00Z', end: '2026-10-07T22:00:00Z' }));
  const picked = [];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: [{ date: '2026-10-07', annotations: notes, rows: long(3)[0].rows }], virtualizeAbove: 2, onSelectOverlay: (overlay) => picked.push(overlay.id) }));
  assert.deepEqual([...host.querySelectorAll(cls('agenda-vrow'))].map((row) => row.getAttribute('data-kind')), ['heading', 'note', 'note', 'entry', 'entry', 'entry']);
  assert.equal(host.querySelector('[data-kind="heading"]').querySelector(cls('window')), null, 'the heading row holds the heading only');
  assert.equal(host.querySelectorAll('[data-overlay-id]').length, 2, 'once per window');
  click(host.querySelector('[data-kind="note"] [data-overlay-id="w2"]'));
  assert.deepEqual(picked, ['w2']);
  unmount();
});

test('the type of a group is exported with the component', () => {
  const types = readFileSync(new URL('../dist/index.d.ts', import.meta.url), 'utf8');
  assert.match(types, /\bSchedulingAgendaGroup\b/);
});

test('a row says its days when its times of day would not: another start day, a long run, no time of day', () => {
  const iso = (date, time) => new Date(`${date}T${time}:00+02:00`).toISOString();
  const rows = [
    at('same', '2026-10-05', '08:00', '09:30'),
    { id: 'night', title: 'Overnight', start: iso('2026-10-05', '23:00'), end: iso('2026-10-06', '01:00') },
    { id: 'midnight', title: 'To midnight', start: iso('2026-10-05', '22:00'), end: iso('2026-10-06', '00:00') },
    { id: 'earlier', title: 'From an earlier day', start: iso('2026-10-01', '14:00'), end: iso('2026-10-07', '03:00') },
    { id: 'long', title: 'Two days on', start: iso('2026-10-05', '14:00'), end: iso('2026-10-07', '03:00') },
    { id: 'day', title: 'Whole day', start: iso('2026-10-05', '00:00'), end: iso('2026-10-06', '00:00'), allDay: true },
    { id: 'days', title: 'Three whole days', start: iso('2026-10-05', '00:00'), end: iso('2026-10-08', '00:00'), allDay: true },
    { id: 'full', title: 'A day to the minute', start: iso('2026-10-05', '14:00'), end: iso('2026-10-06', '14:00') },
    { id: 'other', title: 'A whole day, listed here', start: iso('2026-10-06', '00:00'), end: iso('2026-10-07', '00:00'), allDay: true },
    { id: 'inverted', title: 'Whole day, end before start', start: iso('2026-10-05', '00:00'), end: iso('2026-10-03', '00:00'), allDay: true },
    { id: 'inverted-other', title: 'Another day, end before start', start: iso('2026-10-09', '00:00'), end: iso('2026-10-03', '00:00'), allDay: true },
  ];
  for (const virtualizeAbove of [200, 2]) {
    const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: [{ date: '2026-10-05', rows }], virtualizeAbove }));
    const time = (id) => host.querySelector(`[data-item-id="${id}"] ${cls('agenda-time')}`).textContent;
    assert.equal(time('same'), '08:00 – 09:30');
    assert.equal(time('night'), '23:00 – 01:00', 'past midnight by less than a day reads as times');
    assert.equal(time('midnight'), '22:00 – 00:00');
    assert.match(time('earlier'), /1 Oct(ober)? 2026 14:00 – .*7 Oct(ober)? 2026 03:00/);
    assert.match(time('long'), /5 Oct(ober)? 2026 14:00 – .*7 Oct(ober)? 2026 03:00/);
    assert.equal(time('day'), 'All day');
    assert.match(time('days'), /5 Oct(ober)? 2026 – .*7 Oct(ober)? 2026$/);
    assert.match(time('full'), /5 Oct(ober)? 2026 14:00 – .*6 Oct(ober)? 2026 14:00/, 'a day to the minute is not "14:00 – 14:00"');
    assert.match(time('other'), /^[^–]*6 Oct(ober)? 2026$/, 'one day, said once');
    assert.equal(time('inverted'), 'All day', 'an end before the start: the entry is on its start day');
    assert.match(time('inverted-other'), /^[^–]*9 Oct(ober)? 2026$/);
    unmount();
  }
  const worded = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: [{ date: '2026-10-05', rows }], labels: { allDay: 'Ganztägig' }, formatInstant: (instant) => `<${instant.slice(0, 16)}>` }));
  assert.equal(worded.host.querySelector(`[data-item-id="day"] ${cls('agenda-time')}`).textContent, 'Ganztägig');
  assert.equal(worded.host.querySelector(`[data-item-id="earlier"] ${cls('agenda-time')}`).textContent, '<2026-10-01T12:00> – <2026-10-07T01:00>', 'the consumer words the instants');
  worded.unmount();
  // The day the clocks go back has 25 hours: midnight to midnight is not "00:00 – 00:00".
  const fallBack = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: [{ date: '2026-10-25', rows: [{ id: 'd', title: 'Whole long day', start: '2026-10-24T22:00:00Z', end: '2026-10-25T23:00:00Z' }] }] }));
  assert.match(fallBack.host.querySelector(`[data-item-id="d"] ${cls('agenda-time')}`).textContent, /25 Oct(ober)? 2026 00:00 – .*26 Oct(ober)? 2026 00:00/);
  fallBack.unmount();
});

test('the name of a row carries its detail line; a consumer name is used as given', () => {
  const rows = [at('a', '2026-10-07', '08:00', '09:00', { meta: 'Site B · Rack 4' }), at('b', '2026-10-07', '10:00', '11:00', { meta: 'Site C', accessibleName: 'Exactly this' })];
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: [{ date: '2026-10-07', rows }] }));
  assert.match(host.querySelector('[data-item-id="a"]').getAttribute('aria-label'), /^Item a, .*, Site B · Rack 4$/);
  assert.equal(host.querySelector('[data-item-id="b"]').getAttribute('aria-label'), 'Exactly this');
  unmount();
});

test('a date or an id given twice is drawn twice, in both forms, with no shared key', async () => {
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args.map(String).join(' '));
  try {
    const groups = Array.from({ length: 30 }, (_, i) => ({ date: i % 2 ? '2026-10-08' : '2026-10-07', rows: [at('same', '2026-10-07', '08:00', '09:00'), at('same', '2026-10-07', '10:00', '11:00'), at('same#1', '2026-10-07', '12:00', '13:00')], annotations: [{ id: 'w', label: 'W', start: '2026-10-06T22:00:00Z', end: '2026-10-07T22:00:00Z' }, { id: 'w', label: 'W again', start: '2026-10-06T22:00:00Z', end: '2026-10-07T22:00:00Z' }] }));
    const grouped = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: groups }));
    assert.equal(grouped.host.querySelectorAll(cls('agenda-group')).length, 30);
    assert.equal(grouped.host.querySelectorAll(cls('agenda-row')).length, 90);
    assert.equal(grouped.host.querySelectorAll('[data-overlay-id]').length, 60);
    grouped.unmount();
    const flat = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: groups, virtualizeAbove: 10 }));
    const scroller = flat.host.querySelector(cls('agenda--virtual'));
    const before = flat.host.querySelectorAll(cls('agenda-vrow')).length;
    Object.defineProperty(scroller, 'clientHeight', { value: 440, configurable: true });
    for (const top of [44 * 40, 44 * 80, 0]) {
      scroller.scrollTop = top;
      scroller.dispatchEvent(new window.Event('scroll'));
      await settle();
    }
    assert.ok(flat.host.querySelectorAll(cls('agenda-vrow')).length <= before, 'no row is left behind by a scroll');
    flat.unmount();
  } finally { console.error = original; }
  assert.deepEqual(errors.filter((line) => /same key|unique "key"/.test(line)), []);
});

test('an empty agendaGroups list says so', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { ...base, agendaGroups: [] }));
  assert.equal(host.querySelector(cls('agenda')).textContent, 'No scheduled entries match the current filters.');
  unmount();
});

const monthProps = {
  anchorDate: '2026-10-07', timeZone: BERLIN, locale: 'en-GB', view: 'month', monthDensity: 'counts', onShowMore: () => {},
  entries: [{ id: 'span', title: 'Three days', start: '2026-10-05T08:00:00Z', end: '2026-10-07T16:00:00Z' }, at('single', '2026-10-07', '08:00', '09:00')],
  dayEntries: { '2026-10-07': [at('pick', '2026-10-07', '08:00', '09:00')] },
  days: { '2026-10-07': { count: 12, overflowCount: 11, label: '12 items, 1 needs sign-off', markers: [{ id: 'm', label: 'Needs sign-off', emphasis: 'warning' }] }, '2026-10-08': { count: 3, overflowCount: 0 } },
  overlays: [{ id: 'w', label: 'Quarter close', kindLabel: 'Hold', start: '2026-10-05T06:00:00Z', end: '2026-10-09T18:00:00Z', pattern: 'diagonal' }],
};

test('AC8: with monthDensity="counts" every cell shows its count and markers, and no chip or entry bar', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, monthProps));
  const grid = host.querySelector(cls('grid'));
  assert.equal(grid.getAttribute('data-density'), 'counts');
  assert.equal(host.querySelectorAll(cls('day')).length, 42);
  assert.equal(host.querySelectorAll('[data-item-id]').length, 0, 'no chips and no entry bars');
  assert.equal(host.querySelectorAll(cls('more')).length, 0, 'the count says it; no "+N"');
  assert.equal(host.querySelectorAll(cls('rowmore')).length, 0, 'and no "+N" for the bars it does not draw');
  const cell = host.querySelector('[data-calendar-date="2026-10-07"]').closest(cls('day'));
  assert.match(cell.querySelector(cls('count')).textContent, /^12/);
  assert.match(cell.querySelector(cls('count')).textContent, /12 items, 1 needs sign-off/);
  assert.equal(cell.querySelector(cls('marker')).getAttribute('data-emphasis'), 'warning');
  assert.equal(host.querySelectorAll(cls('window')).length, 1, 'a window keeps its bar');
  assert.match(host.querySelector(cls('window-name')).textContent, /Quarter close/);
  assert.equal(grid.style.getPropertyValue('--uix-scheduling-calendar-chips'), '-1', 'no chip rows are kept');
  unmount();
  const full = mount(h(ui.SchedulingCalendar, { ...monthProps, monthDensity: 'full' }));
  assert.equal(full.host.querySelector(cls('grid')).hasAttribute('data-density'), false);
  assert.ok(full.host.querySelectorAll('[data-item-id]').length >= 2);
  full.unmount();
  const week = mount(h(ui.SchedulingCalendar, { ...monthProps, view: 'week' }));
  assert.equal(week.host.querySelector(cls('grid')).hasAttribute('data-density'), false, 'the density is a month setting');
  week.unmount();
});

test('AC8: the counts-only month never derives a "+N" from the entries; windows over their cap still get one', () => {
  const span = (id) => ({ id: String(id), title: `Span ${id}`, start: '2026-10-05T08:00:00Z', end: '2026-10-08T16:00:00Z' });
  const plain = { anchorDate: '2026-10-07', timeZone: BERLIN, locale: 'en-GB', view: 'month', monthDensity: 'counts', entries: [1, 2, 3, 4, 5].map(span) };
  const { host, unmount } = mount(h(ui.SchedulingCalendar, plain));
  assert.equal(host.querySelectorAll('[data-item-id]').length, 0);
  assert.equal(host.querySelectorAll(cls('rowmore')).length, 0, 'five bars are not drawn, and not counted');
  assert.deepEqual([...new Set([...host.querySelectorAll(cls('week'))].map((week) => week.style.getPropertyValue('--uix-scheduling-calendar-lanes')))], ['0'], 'and keep no lane');
  unmount();
  const windows = [1, 2, 3].map((n) => ({ id: `w${n}`, label: `Window ${n}`, start: '2026-10-05T06:00:00Z', end: '2026-10-09T18:00:00Z' }));
  const capped = mount(h(ui.SchedulingCalendar, { ...plain, overlays: windows, windowLaneCap: 2 }));
  assert.equal(capped.host.querySelectorAll(cls('window')).length, 2);
  assert.match(capped.host.querySelector(cls('rowmore')).textContent, /\+1/, 'the third window, and none of the five entries');
  capped.unmount();
  // A consumer layout may list entries as hidden; here they are not counted either.
  const given = mount(h(ui.SchedulingCalendar, { ...plain, overlays: windows, spanLayout: { placed: [], hiddenByRow: { 1: ['1', '2', 'w3'] }, firstHiddenDayByRow: { 1: '2026-10-05' } } }));
  assert.match(given.host.querySelector(cls('rowmore')).textContent, /\+1/);
  given.unmount();
  // An id shared by an entry and a window that is drawn in the row: the hidden one is the entry.
  const shared = mount(h(ui.SchedulingCalendar, { ...plain, entries: [span('w1')], overlays: windows.slice(0, 1), spanLayout: { placed: [{ id: 'w1', group: 'window', weekRow: 1, startCol: 0, endCol: 4, lane: 0, continuesBefore: false, continuesAfter: false }], hiddenByRow: { 1: ['w1'] }, firstHiddenDayByRow: { 1: '2026-10-05' } } }));
  assert.equal(shared.host.querySelectorAll(cls('window')).length, 1);
  assert.equal(shared.host.querySelectorAll(cls('rowmore')).length, 0);
  shared.unmount();
});

test('monthDensity="counts" leaves the week as it is: cells grow, every chip is drawn', () => {
  const entries = Array.from({ length: 14 }, (_, i) => at(`e${i}`, '2026-10-07', '08:00', '09:00'));
  const props = { anchorDate: '2026-10-07', timeZone: BERLIN, locale: 'en-GB', view: 'week', entries };
  const counts = mount(h(ui.SchedulingCalendar, { ...props, monthDensity: 'counts' }));
  const full = mount(h(ui.SchedulingCalendar, props));
  assert.equal(counts.host.querySelectorAll(cls('entry')).length, 14);
  assert.equal(counts.host.querySelector(cls('grid')).hasAttribute('data-fixed'), false, 'a growing cell clips nothing');
  assert.equal(counts.host.querySelector(cls('grid')).outerHTML, full.host.querySelector(cls('grid')).outerHTML, 'the same week as without the setting');
  counts.unmount();
  full.unmount();
});
