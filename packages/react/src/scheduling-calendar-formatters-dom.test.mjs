/* AC18 (R17 AC4, UIx half; HAR-1506): rendering a 2,100-entry month constructs at most 4
 * `Intl.DateTimeFormat` instances, with no formatter injected and the built-in header on.
 * The spy goes on globalThis.Intl.DateTimeFormat BEFORE React, jsdom and the package load:
 * node --test runs each file in its own process, so the dist import below is the first.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const Original = Intl.DateTimeFormat;
let constructed = 0;
globalThis.Intl.DateTimeFormat = new Proxy(Original, {
  construct(target, args, newTarget) { constructed++; return Reflect.construct(target, args, newTarget === globalThis.Intl.DateTimeFormat ? target : newTarget); },
  apply(target, self, args) { constructed++; return Reflect.apply(target, self, args); },
});
const atLoad = constructed;

const { JSDOM } = await import('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
expose('window', dom.window);
expose('document', dom.window.document);
expose('navigator', dom.window.navigator);
expose('IS_REACT_ACT_ENVIRONMENT', true);
const { createElement: h, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const ui = await import('../dist/index.js');

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const fixture = (timeZone) => {
  const base = Date.parse('2026-10-01T00:00:00Z');
  return Array.from({ length: 2100 }, (_, i) => {
    const start = base + ((i * 7919) % (31 * 96)) * 15 * 60_000;
    // Every 25th item runs for two to four days, so spans are drawn too.
    const minutes = i % 25 === 0 ? (2 + (i % 3)) * 1440 : (1 + (i % 40)) * 15;
    return { id: `e${i}`, title: `Item ${i}`, start: new Date(start).toISOString(), end: new Date(start + minutes * 60_000).toISOString(), band: i % 9 === 0 ? 'high' : 'none' };
  });
};

test('AC18 (R17 AC4): a 2,100-entry month renders with ≤ 4 Intl.DateTimeFormat instances', () => {
  const timeZone = 'Europe/Berlin';
  const entries = fixture(timeZone);
  const overlays = [{ id: 'w', label: 'Hold', kindLabel: 'Window', start: '2026-10-09T22:00:00Z', end: '2026-10-14T22:00:00Z', pattern: 'diagonal' }];
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(h(ui.SchedulingCalendar, { entries, overlays, anchorDate: '2026-10-07', timeZone, locale: 'en-GB', maxEntriesPerDay: 3, onShowMore: () => {}, onAnchorDateChange: () => {} })));
  act(() => root.render(h(ui.SchedulingCalendar, { entries, overlays, anchorDate: '2026-10-07', timeZone, locale: 'en-GB', maxEntriesPerDay: 3, onShowMore: () => {}, onAnchorDateChange: () => {}, view: 'agenda' })));
  assert.ok(host.querySelectorAll('[data-item-id]').length >= 2000, 'the agenda rendered the fixture');
  act(() => root.render(h(ui.SchedulingCalendar, { entries, overlays, anchorDate: '2026-10-07', timeZone, locale: 'en-GB', maxEntriesPerDay: 3, onShowMore: () => {}, onAnchorDateChange: () => {} })));
  assert.ok(host.querySelectorAll('.uix-scheduling-calendar__entry').length > 50, 'the month rendered chips');
  assert.ok(host.querySelectorAll('.uix-scheduling-calendar__span').length > 0, 'and spans');
  act(() => root.unmount());
  const count = constructed - atLoad;
  assert.ok(count <= 4, `constructed ${count} Intl.DateTimeFormat instances`);
});

test('the spy counts constructions (calibration)', () => {
  const before = constructed;
  new Intl.DateTimeFormat('en-GB');
  Intl.DateTimeFormat('en-GB');
  assert.equal(constructed - before, 2);
});
