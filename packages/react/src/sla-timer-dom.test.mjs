/* SlaTimer and its model (roadmap #17), in jsdom with Node's mock clock.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test, { before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let hydrateRoot;
let renderToString;
let ui;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('HTMLElement', dom.window.HTMLElement);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot, hydrateRoot } = await import('react-dom/client'));
  ({ renderToString } = await import('react-dom/server'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const T0 = Date.UTC(2026, 10, 20, 12, 0, 0);
const MIN = 60_000;
const HOUR = 3_600_000;

let restoreTimers = null;
const useFakeTimers = (now = T0) => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now });
  restoreTimers = () => mock.timers.reset();
};
const mounted = [];
afterEach(() => {
  for (const root of mounted.splice(0)) act(() => root.unmount());
  restoreTimers?.();
  restoreTimers = null;
  setVisibility('visible');
  document.body.innerHTML = '';
});
const tick = (ms) => act(() => { mock.timers.tick(ms); });

function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new window.Event('visibilitychange'));
}

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  mounted.push(root);
  act(() => root.render(element));
  return { host, root, rerender: (el) => act(() => root.render(el)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const sla = (host) => host.querySelector('.uix-sla');
// ICU writes a narrow no-break space before AM/PM and in some units; compare with plain spaces
const plain = (text) => (text ?? '').replace(/[  ]/g, ' ');
const shown = (host) => plain(host.querySelector('.uix-sla__time').textContent);
const spoken = (host) => plain(host.querySelector('.uix-sla > .uix-visually-hidden').textContent);
const title = (host) => plain(sla(host).getAttribute('title'));
const announcer = () => plain(document.body.querySelector(':scope > [data-uix-announcer]')?.textContent);

// ---- the model ------------------------------------------------------------------------------

test('model: elapsed thresholds (75 % warning, 90 % urgent), then the breach at 100 %', () => {
  const input = { startedAt: T0, dueAt: T0 + 10 * HOUR };
  const at = (share) => ui.slaStatus(input, T0 + share * 10 * HOUR);
  assert.equal(at(0.5).state, 'on-track');
  assert.equal(at(0.75).state, 'warning');
  assert.equal(at(0.89).state, 'warning');
  assert.equal(at(0.9).state, 'urgent');
  assert.equal(at(1).state, 'breached');
  assert.equal(at(1.2).remaining, -2 * HOUR);
  assert.equal(at(0.5).remaining, 5 * HOUR);
});

test('model: without startedAt the defaults count back from the deadline (2 h warning, 30 min urgent)', () => {
  const due = T0 + 3 * HOUR;
  assert.equal(ui.slaStatus({ dueAt: due }, T0).state, 'on-track');
  assert.equal(ui.slaStatus({ dueAt: due }, due - 2 * HOUR).state, 'warning');
  assert.equal(ui.slaStatus({ dueAt: due }, due - 30 * MIN).state, 'urgent');
  assert.deepEqual(ui.DEFAULT_SLA_REMAINING_THRESHOLDS.map((t) => t.level), ['warning', 'urgent']);
});

test('model: three thresholds of three kinds; the worst crossed wins; [] means none before the breach', () => {
  const thresholds = [
    { level: 'notice', elapsed: 0.5 },
    { level: 'warning', remaining: 2 * HOUR },
    { level: 'urgent', at: new Date(T0 + 9 * HOUR).toISOString() },
  ];
  const input = { startedAt: T0, dueAt: T0 + 10 * HOUR, thresholds };
  assert.equal(ui.slaStatus(input, T0 + 5 * HOUR).state, 'notice');
  assert.equal(ui.slaStatus(input, T0 + 8 * HOUR).state, 'warning');
  assert.equal(ui.slaStatus(input, T0 + 9 * HOUR).state, 'urgent');
  assert.equal(ui.slaStatus({ ...input, thresholds: [] }, T0 + 9.9 * HOUR).state, 'on-track');
  // an elapsed threshold without a start cannot be placed and is left out
  assert.equal(ui.slaStatus({ dueAt: T0 + HOUR, thresholds: [{ level: 'warning', elapsed: 0.1 }] }, T0 + 59 * MIN).state, 'on-track');
});

test('model: the next change is the next whole minute to the deadline, or a threshold sooner', () => {
  const due = T0 + 2 * HOUR + 30_000; // 2 h 0 min 30 s left
  const s = ui.slaStatus({ dueAt: due, thresholds: [] }, T0);
  assert.equal(s.nextChangeAt, T0 + 30_000);
  // a threshold 10 s away comes first
  const t = ui.slaStatus({ dueAt: due, thresholds: [{ level: 'warning', at: T0 + 10_000 }] }, T0);
  assert.equal(t.nextChangeAt, T0 + 10_000);
  // exactly on a minute boundary: the next one, a minute on
  assert.equal(ui.slaStatus({ dueAt: T0 + 5 * MIN, thresholds: [] }, T0).nextChangeAt, T0 + MIN);
  // overdue: still counts whole minutes past the deadline
  assert.equal(ui.slaStatus({ dueAt: T0 - 90_000 }, T0).nextChangeAt, T0 + 30_000);
});

test('model: paused freezes the time left at pausedAt; breachedAt wins; completed is met or breached', () => {
  const due = T0 + 4 * HOUR;
  const paused = ui.slaStatus({ dueAt: due, paused: true, pausedAt: T0 - HOUR }, T0 + 10 * HOUR);
  assert.equal(paused.state, 'paused');
  assert.equal(paused.remaining, 5 * HOUR);
  assert.equal(paused.nextChangeAt, null);
  // the server recorded a breach before the wall clock's deadline (a business calendar)
  const early = ui.slaStatus({ dueAt: due, breachedAt: T0 - 10 * MIN }, T0);
  assert.equal(early.state, 'breached');
  assert.equal(early.remaining, -10 * MIN);
  // a breached clock that is paused stays breached, frozen
  const pausedLate = ui.slaStatus({ dueAt: T0 - HOUR, paused: true, pausedAt: T0 - 30 * MIN }, T0);
  assert.equal(pausedLate.state, 'breached');
  assert.equal(pausedLate.stopped, true);
  assert.equal(ui.slaStatus({ dueAt: due, completedAt: T0 }, T0 + 9 * HOUR).state, 'met');
  assert.equal(ui.slaStatus({ dueAt: due, completedAt: due + MIN }, T0 + 9 * HOUR).state, 'breached');
  assert.equal(ui.slaStatus({ dueAt: 'not a date' }, T0).state, 'none');
  assert.equal(ui.slaStatus({}, T0).state, 'none');
});

test('model: slaSortValue sorts most urgent first, met and no SLA last with a finite sentinel', () => {
  const rows = [
    { id: 'met', dueAt: T0 + HOUR, completedAt: T0 - MIN },
    { id: 'later', dueAt: T0 + 5 * HOUR },
    { id: 'none' },
    { id: 'overdue-long', dueAt: T0 - 3 * HOUR },
    { id: 'paused', dueAt: T0 + HOUR, paused: true, pausedAt: T0 - HOUR }, // 2 h left, frozen at the pause
    { id: 'soon', dueAt: T0 + 10 * MIN },
    { id: 'overdue', dueAt: T0 - 5 * MIN },
  ];
  const sorted = [...rows].sort((a, b) => ui.slaSortValue(a, T0) - ui.slaSortValue(b, T0)).map((r) => r.id);
  assert.deepEqual(sorted.slice(0, 5), ['overdue-long', 'overdue', 'soon', 'paused', 'later']);
  assert.deepEqual(new Set(sorted.slice(5)), new Set(['met', 'none']));
  assert.ok(Number.isFinite(ui.slaSortValue({}, T0)));
  assert.equal(ui.slaSortValue({}, T0), ui.SLA_SORT_LAST);
});

// ---- rendering ------------------------------------------------------------------------------

test('cell: the compact time in Intl units, the spoken text with the state and the deadline, hover', () => {
  const due = T0 + HOUR + 14 * MIN + 50_000; // inside the default 2 h warning
  const { host } = mount(h(ui.SlaTimer, { dueAt: due, now: T0, locale: 'en', timeZone: 'UTC' }));
  const el = sla(host);
  assert.equal(el.dataset.state, 'warning');
  assert.equal(shown(host), '1 hr 14 min'); // floored: never more time than is left
  assert.equal(spoken(host), 'Due in 1 hour 14 minutes, warning. Deadline Nov 20, 2026, 1:14 PM');
  assert.equal(title(host), 'Deadline Nov 20, 2026, 1:14 PM');
  assert.equal(host.querySelector('time').getAttribute('dateTime'), new Date(due).toISOString());
  assert.equal(host.querySelector('time').getAttribute('aria-hidden'), 'true');
  assert.equal(host.querySelector('.uix-sla__mark').getAttribute('aria-hidden'), 'true');
  assert.equal(el.getAttribute('role'), null, 'a cell timer is text, not a live region');
  assert.equal(el.getAttribute('aria-live'), null);
});

test('cell: under a minute, days, breached, paused, met and no deadline', () => {
  const at = (props) => {
    const m = mount(h(ui.SlaTimer, { now: T0, locale: 'en', timeZone: 'UTC', ...props }));
    const out = { state: sla(m.host).dataset.state, shown: shown(m.host), spoken: spoken(m.host) };
    m.host.remove();
    return out;
  };
  assert.deepEqual(at({ dueAt: T0 + 40_000 }), { state: 'urgent', shown: '< 1 min', spoken: 'Due in less than a minute, urgent. Deadline Nov 20, 2026, 12:00 PM' });
  assert.equal(at({ dueAt: T0 + 3 * 24 * HOUR + 4 * HOUR + 59 * MIN }).shown, '3 days 4 hr');
  const breached = at({ dueAt: T0 - 35 * MIN - 20_000 });
  assert.equal(breached.state, 'breached');
  assert.equal(breached.shown, '35 min over');
  assert.equal(breached.spoken, 'Breached 35 minutes ago. Deadline Nov 20, 2026, 11:24 AM');
  const paused = at({ dueAt: T0 + 3 * HOUR, paused: true, pausedAt: T0 - HOUR, pausedReason: 'Waiting for the requester' });
  assert.deepEqual(paused, { state: 'paused', shown: 'Paused', spoken: 'Paused, 4 hours left. Waiting for the requester' });
  assert.equal(at({ dueAt: T0 + HOUR, completedAt: T0 - MIN }).shown, 'Met');
  const late = at({ dueAt: T0 - HOUR, completedAt: T0 - 20 * MIN });
  assert.deepEqual([late.state, late.shown], ['breached', '40 min over']);
  assert.match(late.spoken, /^breached, 40 minutes over\./);
  assert.deepEqual(at({ dueAt: null }), { state: 'none', shown: '—', spoken: 'No due date' });
});

test('header: the name, the line and the deadline; a pause shows its reason instead', () => {
  const { host, rerender } = mount(h(ui.SlaTimer, {
    variant: 'header', label: 'Resolution', startedAt: T0 - 8 * HOUR, dueAt: T0 + 2 * HOUR, now: T0, locale: 'en', timeZone: 'UTC',
  }));
  assert.ok(sla(host).classList.contains('uix-sla--header'));
  assert.equal(host.querySelector('.uix-sla__label').textContent, 'Resolution');
  assert.equal(shown(host), 'Due in 2 hr');
  assert.equal(plain(host.querySelector('.uix-sla__meta').textContent), 'Deadline Nov 20, 2026, 2:00 PM');
  assert.equal(spoken(host), 'Resolution: Due in 2 hours, warning. Deadline Nov 20, 2026, 2:00 PM');
  rerender(h(ui.SlaTimer, {
    variant: 'header', label: 'Resolution', dueAt: T0 + 2 * HOUR, now: T0, locale: 'en', timeZone: 'UTC', paused: true, pausedReason: 'Waiting for the requester',
  }));
  assert.equal(shown(host), 'Paused, 2 hr left');
  assert.equal(host.querySelector('.uix-sla__meta').textContent, 'Waiting for the requester');
  assert.equal(title(host), 'Waiting for the requester');
  assert.equal(sla(host).dataset.paused, '');
  rerender(h(ui.SlaTimer, { variant: 'header', dueAt: T0 - 2 * HOUR, now: T0, locale: 'en', timeZone: 'UTC' }));
  assert.equal(shown(host), 'Breached 2 hr ago');
});

test('relative and absolute formats', () => {
  const { host, rerender } = mount(h(ui.SlaTimer, { dueAt: T0 + 2 * HOUR + 10 * MIN, now: T0, format: 'relative', locale: 'en', timeZone: 'UTC' }));
  assert.equal(shown(host), 'in 2 hours');
  rerender(h(ui.SlaTimer, { dueAt: T0 - 3 * HOUR, now: T0, format: 'relative', locale: 'en', timeZone: 'UTC' }));
  assert.equal(shown(host), 'Breached 3 hours ago');
  rerender(h(ui.SlaTimer, { dueAt: T0 + 2 * HOUR, now: T0, format: 'absolute', variant: 'header', locale: 'en', timeZone: 'UTC' }));
  assert.equal(shown(host), 'Due Nov 20, 2026, 2:00 PM');
  assert.match(spoken(host), /^Due in 2 hours, warning\./, 'the spoken text keeps the time left');
});

test('labels: UixLabelsProvider translates the words, Intl the numbers (German)', () => {
  const labels = {
    slaTimer: {
      dueIn: 'Fällig in {time}', deadline: 'Frist {time}', over: '{time} überschritten',
      states: { warning: 'Warnung' },
    },
    dateFormat: { locale: 'de' },
  };
  const { host } = mount(h(ui.UixLabelsProvider, { labels }, h(ui.SlaTimer, { dueAt: T0 + HOUR + 14 * MIN, now: T0, timeZone: 'UTC' })));
  assert.match(shown(host), /^1 Std\.,? 14 Min\.$/);
  assert.match(spoken(host), /^Fällig in 1 Stunde,? 14 Minuten, Warnung\. Frist 20\.11\.2026, 13:14$/);
});

test('ticks on the minute with a mock clock, crosses a threshold, and never re-renders while paused', () => {
  useFakeTimers(T0);
  const due = T0 + 2 * HOUR + 30_000; // warning at 2 h left (defaults without a start)
  const { host, rerender } = mount(h(ui.SlaTimer, { dueAt: due, locale: 'en', timeZone: 'UTC' }));
  assert.equal(shown(host), '2 hr');
  assert.equal(sla(host).dataset.state, 'on-track');
  tick(29_000);
  assert.equal(shown(host), '2 hr', 'nothing changes before the minute');
  tick(1_000);
  assert.equal(shown(host), '2 hr', 'exactly two hours left');
  assert.equal(sla(host).dataset.state, 'warning', 'the 2 h threshold is crossed on the second it falls');
  tick(MIN);
  assert.equal(shown(host), '1 hr 59 min');
  tick(MIN);
  assert.equal(shown(host), '1 hr 58 min');
  rerender(h(ui.SlaTimer, { dueAt: due, locale: 'en', timeZone: 'UTC', paused: true }));
  const frozen = spoken(host);
  tick(3 * HOUR);
  assert.equal(spoken(host), frozen);
  assert.equal(shown(host), 'Paused');
});

test('crossing a threshold is announced once, politely, only with announce; never on mount or each minute', () => {
  useFakeTimers(T0);
  const due = T0 + 31 * MIN;
  const { host } = mount(h(ui.SlaTimer, { dueAt: due, label: 'Resolution', announce: true, locale: 'en', timeZone: 'UTC' }));
  tick(10);
  assert.equal(sla(host).dataset.state, 'warning');
  assert.equal(announcer(), '', 'nothing said on mount');
  tick(MIN);
  tick(10);
  assert.equal(sla(host).dataset.state, 'urgent');
  assert.equal(announcer(), 'Resolution: Due in 29 minutes, urgent. Deadline Nov 20, 2026, 12:31 PM');
  const region = document.body.querySelector(':scope > [data-uix-announcer]');
  assert.equal(region.getAttribute('role'), 'status');
  region.textContent = '';
  tick(MIN);
  tick(10);
  assert.equal(announcer(), '', 'a minute passing is not news');
  tick(29 * MIN);
  tick(10);
  assert.equal(sla(host).dataset.state, 'breached');
  assert.match(announcer(), /^Resolution: Breached less than a minute ago\./);
});

test('a timer without announce says nothing when it crosses', () => {
  useFakeTimers(T0);
  const existing = document.body.querySelector(':scope > [data-uix-announcer]');
  if (existing) existing.textContent = '';
  const { host } = mount(h(ui.SlaTimer, { dueAt: T0 + 30 * MIN + 30_000 }));
  tick(31_000);
  tick(10);
  assert.equal(sla(host).dataset.state, 'urgent');
  assert.equal(announcer(), '');
});

test('a hidden tab schedules nothing; showing it again catches up at once', () => {
  useFakeTimers(T0);
  const { host } = mount(h(ui.SlaTimer, { dueAt: T0 + 3 * HOUR, locale: 'en', timeZone: 'UTC' }));
  assert.equal(shown(host), '3 hr');
  act(() => setVisibility('hidden'));
  tick(20 * MIN);
  assert.equal(shown(host), '3 hr', 'no re-render while hidden');
  act(() => setVisibility('visible'));
  assert.equal(shown(host), '2 hr 40 min');
  tick(MIN);
  assert.equal(shown(host), '2 hr 39 min', 'and it keeps ticking');
});

test('server render and hydration: the client writes its own time after hydrating', async () => {
  useFakeTimers(T0);
  const element = h(ui.SlaTimer, { dueAt: T0 + 3 * HOUR, locale: 'en', timeZone: 'UTC' });
  // the server rendered an hour ago (a cached page)
  mock.timers.setTime(T0 - HOUR);
  const win = globalThis.window;
  delete globalThis.window; // a real server has no window
  const html = renderToString(element);
  expose('window', win);
  assert.match(html, /4 hr/);
  mock.timers.setTime(T0);
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  const errors = [];
  let root;
  act(() => { root = hydrateRoot(host, element, { onRecoverableError: (e) => errors.push(e) }); });
  assert.equal(shown(host), '3 hr');
  assert.equal(sla(host).dataset.state, 'on-track');
  assert.equal(spoken(host), 'Due in 3 hours, on track. Deadline Nov 20, 2026, 3:00 PM');
  assert.deepEqual(errors, []);
  mounted.push(root);
});

test('more than three thresholds warns once in development', () => {
  const warn = mock.method(console, 'warn', () => {});
  const thresholds = [0.2, 0.4, 0.6, 0.8].map((elapsed) => ({ level: 'warning', elapsed }));
  mount(h(ui.SlaTimer, { startedAt: T0 - HOUR, dueAt: T0 + HOUR, thresholds, now: T0 }));
  mount(h(ui.SlaTimer, { startedAt: T0 - HOUR, dueAt: T0 + HOUR, thresholds, now: T0 }));
  assert.equal(warn.mock.callCount(), 1);
  warn.mock.restore();
});
