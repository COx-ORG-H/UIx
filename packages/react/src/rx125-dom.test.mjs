/* TENSOR RX-125 (deep pass 2026-09-18) — behaviour of Tree, Tabs, DetailPage,
 * DateRangePicker and SchedulingCalendar in jsdom.
 *
 * UIX-09 clicking a branch label selects without toggling; the chevron toggles.
 * UIX-10 DetailPage renders its tabs and back link through a consumer link, and
 *        a controlled tab click calls onTabSelect instead of navigating.
 * UIX-11 Tabs activation="manual": arrows move focus, Enter selects.
 * UIX-13 DateRangePicker weekday headers follow the locale; words are labels.
 * UIX-15 SchedulingCalendar names a day cell by the zone-local day its entries fall on.
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
const key = (el, k) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true })));

test('UIX-09: a selectable tree selects on a row click and toggles only from the chevron', () => {
  const toggles = [];
  const selects = [];
  const nodes = [{ id: 'kb', label: 'Knowledge', children: [{ id: 'kb-1', label: 'VPN' }] }];
  const { host, unmount } = mount(
    h(ui.Tree, { nodes, onToggle: (id) => toggles.push(id), onSelect: (id) => selects.push(id) }),
  );
  const label = host.querySelector('.uix-tree__label');
  click(label);
  assert.deepEqual(selects, ['kb'], 'row click selects');
  assert.deepEqual(toggles, [], 'row click does not toggle a selectable tree');
  const chevron = host.querySelector('button.uix-tree__toggle');
  assert.ok(chevron, 'the chevron is a button');
  click(chevron);
  assert.deepEqual(toggles, ['kb'], 'chevron toggles');
  assert.deepEqual(selects, ['kb'], 'chevron does not select');
  unmount();
});

test('UIX-09: a pure navigation tree still toggles on a row click', () => {
  const toggles = [];
  const nodes = [{ id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] }];
  const { host, unmount } = mount(h(ui.Tree, { nodes, onToggle: (id) => toggles.push(id) }));
  click(host.querySelector('.uix-tree__label'));
  assert.deepEqual(toggles, ['a']);
  unmount();
});

test('UIX-11: manual activation — arrows move focus, Enter selects', () => {
  const changes = [];
  const { host, unmount } = mount(
    h(
      ui.Tabs,
      { value: 'one', onChange: (v) => changes.push(v), activation: 'manual' },
      h(ui.Tab, { value: 'one' }, 'One'),
      h(ui.Tab, { value: 'two' }, 'Two'),
      h(ui.TabPanel, { value: 'one' }, 'Panel one'),
      h(ui.TabPanel, { value: 'two' }, 'Panel two'),
    ),
  );
  const [one, two] = host.querySelectorAll('[role="tab"]');
  act(() => one.focus());
  key(one, 'ArrowRight');
  assert.equal(document.activeElement, two, 'focus moved');
  assert.deepEqual(changes, [], 'nothing selected by the arrow');
  click(two); // Enter on a <button> dispatches click
  assert.deepEqual(changes, ['two']);
  unmount();
});

test('UIX-11: automatic activation stays the default', () => {
  const changes = [];
  const { host, unmount } = mount(
    h(ui.Tabs, { value: 'one', onChange: (v) => changes.push(v) }, h(ui.Tab, { value: 'one' }, 'One'), h(ui.Tab, { value: 'two' }, 'Two')),
  );
  const [one] = host.querySelectorAll('[role="tab"]');
  act(() => one.focus());
  key(one, 'ArrowRight');
  assert.deepEqual(changes, ['two']);
  unmount();
});

test('UIX-10: DetailPage links through renderLink; onTabSelect handles a plain click', () => {
  const rendered = [];
  const selected = [];
  const renderLink = (props) => {
    rendered.push(props.href);
    return h('a', { ...props, 'data-router-link': 'true' });
  };
  const { host, unmount } = mount(
    h(ui.DetailPage, {
      title: 'CHG-1',
      back: { href: '/changes', label: 'Back' },
      tabs: [
        { id: 'overview', label: 'Overview', href: '?tab=overview', active: true },
        { id: 'history', label: 'History', href: '?tab=history' },
      ],
      renderLink,
      onTabSelect: (id) => selected.push(id),
    }),
  );
  assert.deepEqual(rendered, ['/changes', '?tab=overview', '?tab=history']);
  const history = [...host.querySelectorAll('a.uix-tab')].find((a) => a.textContent === 'History');
  const ev = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  act(() => history.dispatchEvent(ev));
  assert.deepEqual(selected, ['history']);
  assert.equal(ev.defaultPrevented, true, 'controlled click does not navigate');
  unmount();
});

test('UIX-13: weekday headers follow the locale, and the words are labels', () => {
  const { host, unmount } = mount(
    h(ui.DateRangePicker, {
      value: { start: null, end: null },
      onChange: () => {},
      visibleMonth: '2026-03-01',
      months: 1,
      locale: 'de-DE',
      labels: { noneSelected: 'Kein Zeitraum gewählt.', previous: 'Zurück', previousMonth: 'Vorheriger Monat' },
    }),
  );
  const heads = [...host.querySelectorAll('.uix-date-range-picker__weekdays span')].map((s) => s.textContent);
  assert.equal(heads.length, 7);
  assert.equal(heads[0], new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1))));
  assert.notEqual(heads[0], 'Mon');
  assert.match(host.textContent, /Kein Zeitraum gewählt\./);
  assert.ok(host.querySelector('button[aria-label="Vorheriger Monat"]'));
  unmount();
});

test('UIX-15: a day cell is named for the zone-local day its entry falls on', () => {
  // 2026-03-10T20:00Z is already 11 March in Auckland (UTC+13).
  const { host, unmount } = mount(
    h(ui.SchedulingCalendar, {
      entries: [{ id: 'e1', title: 'Patch window', start: '2026-03-10T20:00:00Z', end: '2026-03-10T21:00:00Z' }],
      anchorDate: '2026-03-11',
      timeZone: 'Pacific/Auckland',
      view: 'week',
      locale: 'en-GB',
    }),
  );
  const entry = host.querySelector('.uix-scheduling-calendar__entry');
  assert.ok(entry, 'entry rendered');
  const day = entry.closest('.uix-scheduling-calendar__day');
  const dateButton = day?.querySelector('.uix-scheduling-calendar__date');
  assert.equal(dateButton?.getAttribute('data-calendar-date'), '2026-03-11', 'entry sits on the Auckland day');
  assert.match(dateButton.getAttribute('aria-label'), /\b11\b/, 'the cell is named for the 11th');
  assert.match(dateButton.getAttribute('aria-label'), /Wednesday/, 'and for its weekday in that zone');
  unmount();
});
