/* Label in name (WCAG 2.5.3) for the components the a11y lane found naming themselves apart from
 * what they show (tests/a11y/label-in-name.spec.mjs walks the docs; this pins the React side).
 *
 * A voice-control user says the words on screen ("click 09:00 Backup check"). A chip named
 * "Backup check, Scheduled, …" while it shows "09:00 Backup check" is not found. Each control here
 * must say, in its name, the words it shows, in that order.
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
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('requestAnimationFrame', (fn) => { fn(0); return 0; });
  expose('cancelAnimationFrame', () => {});
  expose('CSS', { escape: (s) => String(s).replace(/"/g, '\\"') });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'requestAnimationFrame', 'cancelAnimationFrame', 'CSS', 'IS_REACT_ACT_ENVIRONMENT', 'ResizeObserver']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};

/** Words only, as a voice command compares them: lower case, no punctuation. */
const words = (s) => s.toLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();
const says = (name, shown) => ` ${words(name)} `.includes(` ${words(shown)} `);

const BERLIN = 'Europe/Berlin';
const at = (id, date, from, to, extra = {}) => ({ id, title: `Backup ${id}`, start: new Date(`${date}T${from}:00+02:00`).toISOString(), end: new Date(`${date}T${to}:00+02:00`).toISOString(), ...extra });
const entries = [
  at('a', '2026-10-07', '08:00', '09:00'),
  at('b', '2026-10-08', '10:30', '11:00', { status: 'tentative' }),
  { id: 'span', title: 'Three days', start: '2026-10-06T08:00:00+02:00', end: '2026-10-08T16:00:00+02:00' },
];

test('a calendar chip says the time and title it shows, in month, week and day', () => {
  for (const view of [{ view: 'month' }, { view: 'week', timeGrid: true }, { view: 'day', timeGrid: true }]) {
    const { host, unmount } = mount(h(ui.SchedulingCalendar, { anchorDate: '2026-10-07', timeZone: BERLIN, locale: 'en-GB', showHeader: false, entries, ...view }));
    const chips = [...host.querySelectorAll('.uix-scheduling-calendar__entry[aria-label]')];
    assert.ok(chips.length > 0, `${view.view}: chips rendered`);
    for (const chip of chips) {
      const shown = chip.querySelector('.uix-scheduling-calendar__entry-text')?.textContent ?? '';
      assert.ok(says(chip.getAttribute('aria-label'), shown), `${view.view}: "${chip.getAttribute('aria-label')}" says "${shown}"`);
    }
    const timed = chips.find((chip) => chip.getAttribute('data-item-id') === 'a');
    if (timed) assert.match(timed.getAttribute('aria-label'), /^08:00 Backup a, Scheduled, /, `${view.view}: the shown words are the title in the name`);
    unmount();
  }
});

test('a time-grid day head says the short date it shows', () => {
  const { host, unmount } = mount(h(ui.SchedulingCalendar, { anchorDate: '2026-10-07', timeZone: BERLIN, locale: 'en-GB', showHeader: false, entries, view: 'week', timeGrid: true }));
  const heads = [...host.querySelectorAll('.uix-scheduling-calendar__tg-dayhead .uix-scheduling-calendar__date')];
  assert.equal(heads.length, 7);
  for (const head of heads) assert.ok(says(head.getAttribute('aria-label'), head.textContent), `"${head.getAttribute('aria-label')}" says "${head.textContent}"`);
  unmount();
});

test('a chip drawn by renderEntry is named by the string it returns; a node keeps the title', () => {
  const asText = mount(h(ui.SchedulingCalendar, { anchorDate: '2026-10-07', timeZone: BERLIN, locale: 'en-GB', showHeader: false, entries: [entries[0]], renderEntry: (entry) => `Run ${entry.title}` }));
  assert.match(asText.host.querySelector('[data-item-id="a"]').getAttribute('aria-label'), /^Run Backup a, /);
  asText.unmount();
  const asNode = mount(h(ui.SchedulingCalendar, { anchorDate: '2026-10-07', timeZone: BERLIN, locale: 'en-GB', showHeader: false, entries: [entries[0]], renderEntry: (entry) => h('b', null, entry.title) }));
  assert.match(asNode.host.querySelector('[data-item-id="a"]').getAttribute('aria-label'), /^Backup a, /);
  asNode.unmount();
  const named = mount(h(ui.SchedulingCalendar, { anchorDate: '2026-10-07', timeZone: BERLIN, locale: 'en-GB', showHeader: false, entries: [{ ...entries[0], accessibleName: 'Exactly this' }] }));
  assert.equal(named.host.querySelector('[data-item-id="a"]').getAttribute('aria-label'), 'Exactly this', 'a consumer name is the consumer’s');
  named.unmount();
});

test('a timeline bar says the string renderItem returns and its meta', () => {
  const stamp = (iso) => iso.slice(0, 16).replace('T', ' ');
  const props = {
    lanes: [{ id: 'A', label: 'Checkout API' }],
    items: [
      { id: 'x', laneId: 'A', title: 'Schema update', start: '2026-10-05T08:00:00Z', end: '2026-10-06T08:00:00Z' },
      { id: 'y', laneId: 'A', title: 'Cache warm-up', meta: 'db-03', start: '2026-10-07T08:00:00Z', end: '2026-10-08T08:00:00Z' },
    ],
    range: { start: '2026-10-05T00:00:00Z', end: '2026-10-12T00:00:00Z' }, timeZone: 'UTC', locale: 'en-GB', formatInstant: stamp,
  };
  const plain = mount(h(ui.SchedulingTimeline, props));
  assert.equal(plain.host.querySelector('[data-item-id="x"]').getAttribute('aria-label'), 'Schema update, Scheduled, 2026-10-05 08:00 to 2026-10-06 08:00', 'no renderItem: the name is unchanged');
  assert.match(plain.host.querySelector('[data-item-id="y"]').getAttribute('aria-label'), /^Cache warm-up db-03, /, 'the meta it shows is said');
  plain.unmount();
  const rendered = mount(h(ui.SchedulingTimeline, { ...props, renderItem: (item) => `08:00 ${item.title}` }));
  assert.match(rendered.host.querySelector('[data-item-id="x"]').getAttribute('aria-label'), /^08:00 Schema update, Scheduled, /);
  rendered.unmount();
});

test('an org chart card is named by the person, and the initials beside the name are decoration', () => {
  const { host, unmount } = mount(h(ui.OrgChart, { nodes: [{ id: 'm', name: 'Mira Kovač', title: 'Chief Executive Officer' }] }));
  const item = host.querySelector('[role="treeitem"]');
  assert.equal(item.querySelector('.uix-avatar').getAttribute('aria-hidden'), 'true');
  assert.equal(document.getElementById(item.getAttribute('aria-labelledby')).textContent, 'Mira Kovač');
  unmount();
});
