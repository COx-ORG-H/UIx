/* HAR-1521 (U5) — SchedulingTimeline for service lanes, in jsdom. AC numbers are the slice's.
 * jsdom has no layout, so the track width a drag needs is stubbed below; what a browser alone
 * can measure (where a clipped window is painted, real scrolling, Enter on a button, the hit
 * area, axe) is in tests/a11y/scheduling-timeline.spec.mjs. The suite re-runs under three TZ
 * values (scheduling-timeline-zones.test.mjs).
 *
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import * as react from 'react';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let ui;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
/** Layout stand-in: every track is 700 px wide, so a 7-day range is 100 px a day. */
const TRACK_PX = 700;

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('requestAnimationFrame', (fn) => { fn(0); return 0; });
  expose('cancelAnimationFrame', () => {});
  expose('CSS', { escape: (s) => String(s).replace(/"/g, '\\"') });
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const original = dom.window.HTMLElement.prototype.getBoundingClientRect;
  dom.window.HTMLElement.prototype.getBoundingClientRect = function rect() {
    if (!this.classList.contains('uix-scheduling-timeline__track')) return original.call(this);
    return { left: 0, right: TRACK_PX, top: 0, bottom: 40, width: TRACK_PX, height: 40, x: 0, y: 0, toJSON() {} };
  };
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'requestAnimationFrame', 'cancelAnimationFrame', 'CSS', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, root, rerender: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })));
const key = (el, name, mods = {}) => {
  const event = new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...mods });
  act(() => { el.dispatchEvent(event); });
  return event;
};
const SHIFT = { shiftKey: true };
const ALT_SHIFT = { shiftKey: true, altKey: true };
const pointer = (target, type, clientX, clientY = 10, extra = {}) => {
  const event = new window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX, clientY });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  for (const [name, value] of Object.entries(extra)) Object.defineProperty(event, name, { value });
  act(() => { target.dispatchEvent(event); });
};

const P = '.uix-scheduling-timeline__';
const range = { start: '2026-10-05T00:00:00Z', end: '2026-10-12T00:00:00Z' }; // Mon–Mon, seven days
const utc = (day, time) => `2026-10-${String(day).padStart(2, '0')}T${time}:00.000Z`;
const stamp = (iso) => iso.slice(0, 16).replace('T', ' ');
const lanes = [{ id: 'A', label: 'Checkout API', meta: 'Tier 1' }, { id: 'B', label: 'Ledger' }, { id: 'C', label: 'Core switch' }, { id: 'D', label: 'Edge routers' }];
const items = [
  { id: 'a', laneId: 'A', title: 'Schema update', start: utc(5, '08:00'), end: utc(6, '08:00') },
  { id: 'b', laneId: 'A', title: 'Cache warm-up', start: utc(5, '20:00'), end: utc(7, '00:00') },
  { id: 'c', laneId: 'B', title: 'Report run', start: utc(6, '00:00'), end: utc(6, '12:00') },
  { id: 'd', laneId: 'C', title: 'Firmware', start: utc(9, '00:00'), end: utc(10, '00:00') },
  { id: 'e', laneId: 'D', title: 'Cabling', start: utc(9, '06:00'), end: utc(9, '12:00'), movable: false },
];
const groups = [
  { id: 'pay', label: 'Payments', meta: '2 lanes', laneIds: ['A', 'B'] },
  { id: 'net', label: 'Network', laneIds: ['C', 'D'] },
];
const props = (extra = {}) => ({ lanes, items, range, timeZone: 'UTC', locale: 'en-GB', formatInstant: stamp, ...extra });
const bar = (host, id) => host.querySelector(`[data-item-id="${id}"]`);
const slot = (host, id) => bar(host, id).closest(`${P}slot`);
const laneRow = (host, id) => host.querySelector(`${P}row[data-lane-id="${id}"]`);
const groupRows = (host, id) => [...host.querySelectorAll(`${P}row[data-group-id="${id}"]`)];
const live = (host) => host.querySelector('[role="status"]').textContent;
const percent = (value) => Number(String(value).replace('%', ''));
/** The row extents written into a clip: [sub-rows, lanes, heads] per corner, in order. */
const clipCorners = (el) => [...el.style.getPropertyValue('--uix-timeline-clip')
  .matchAll(/calc\((\d+) \* var\(--timeline-bar-row\) \+ (\d+) \* var\(--timeline-lane-pad\) \+ (\d+) \* var\(--timeline-head\)\)/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);

test('the zone wrapper really changed the process time zone', () => {
  const expected = process.env.UIX_EXPECT_TZ_OFFSET;
  if (expected === undefined) return;
  assert.equal(String(new Date('2026-01-15T12:00:00Z').getTimezoneOffset()), expected);
});

test('AC1 (R15 AC1): a collapsed group is exactly one summary row with the consumer count and markers', () => {
  const toggled = [];
  const collapsed = groups.map((group) => group.id === 'pay'
    ? { ...group, collapsed: true, summary: { count: 7, markers: [{ id: 'worst', label: '2 need sign-off', emphasis: 'warning' }] } }
    : group);
  const { host, rerender, unmount } = mount(h(ui.SchedulingTimeline, props({ groups: collapsed, onToggleGroup: (id) => toggled.push(id) })));
  const rows = groupRows(host, 'pay');
  assert.equal(rows.length, 1, 'one row stands for the group');
  assert.ok(rows[0].classList.contains('uix-scheduling-timeline__row--summary'));
  assert.equal(laneRow(host, 'A'), null);
  assert.equal(laneRow(host, 'B'), null);
  assert.equal(bar(host, 'a'), null, 'its bars are not drawn');
  assert.equal(rows[0].querySelector(`${P}group-count`).textContent, '7 items', 'the count is the consumer number, not the three items given');
  assert.match(rows[0].textContent, /2 need sign-off/);
  assert.equal(rows[0].querySelector(`${P}item-marker`).getAttribute('data-emphasis'), 'warning');
  const toggle = rows[0].querySelector('button');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.match(toggle.textContent, /Payments/);
  // The other group is open: a head row that is not a summary, then its lanes.
  const open = groupRows(host, 'net');
  assert.equal(open.length, 1);
  assert.equal(open[0].classList.contains('uix-scheduling-timeline__row--summary'), false);
  assert.equal(open[0].querySelector('button').getAttribute('aria-expanded'), 'true');
  assert.equal(open[0].querySelector(`${P}group-count`), null, 'an open group shows no summary');
  assert.ok(laneRow(host, 'C') && laneRow(host, 'D'));
  assert.equal(host.querySelectorAll(`${P}row--summary`).length, 1);

  click(toggle);
  assert.deepEqual(toggled, ['pay'], 'the consumer owns the state');
  assert.equal(laneRow(host, 'A'), null, 'nothing opens until the props say so');
  rerender(h(ui.SchedulingTimeline, props({ groups, onToggleGroup: (id) => toggled.push(id) })));
  assert.equal(host.querySelectorAll(`${P}row--summary`).length, 0);
  assert.ok(laneRow(host, 'A') && laneRow(host, 'B') && bar(host, 'a'));
  unmount();
});

test('AC1: a collapsed group with no summary shows no count (the component derives none); without onToggleGroup the group opens and closes itself', () => {
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ groups: [{ ...groups[0], collapsed: true }, groups[1]] })));
  const row = () => groupRows(host, 'pay')[0];
  assert.ok(row().classList.contains('uix-scheduling-timeline__row--summary'));
  assert.equal(row().querySelector(`${P}group-count`), null);
  assert.doesNotMatch(row().textContent, /\d+ items/);
  click(row().querySelector('button'));
  assert.equal(row().querySelector('button').getAttribute('aria-expanded'), 'true');
  assert.ok(laneRow(host, 'A'));
  click(row().querySelector('button'));
  assert.equal(laneRow(host, 'A'), null);
  unmount();
});

test('AC1: lanes follow their groups in the order given; a lane in no group, or named twice, is drawn once', () => {
  const shuffled = [
    { id: 'net', label: 'Network', laneIds: ['D', 'C', 'ghost'] },
    { id: 'pay', label: 'Payments', laneIds: ['A', 'D'] },
  ];
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ groups: shuffled })));
  const order = [...host.querySelectorAll(`${P}body > ${P}row`)].map((row) => row.getAttribute('data-group-id') ? `group:${row.getAttribute('data-group-id')}` : row.getAttribute('data-lane-id'));
  assert.deepEqual(order, ['group:net', 'D', 'C', 'group:pay', 'A', 'B'], 'B is in no group and is still drawn, after the groups');
  // The list of a lane is named for its group and its lane.
  const list = bar(host, 'd').closest('ul');
  const name = list.getAttribute('aria-labelledby').split(' ').map((id) => document.getElementById(id).textContent).join(' / ');
  assert.equal(name, 'Network / Core switch');
  unmount();
});

test('AC3 (R15 AC3 / R21 AC10): one element per overlay whatever the row count; laneIds limits it to those lanes; a global one spans every row', () => {
  const many = Array.from({ length: 30 }, (_, index) => ({ id: `L${index}`, label: `Lane ${index}` }));
  const overlays = [
    { id: 'all', label: 'Quarter close', kindLabel: 'Hold', pattern: 'diagonal', start: utc(10, '00:00'), end: utc(12, '00:00') },
    { id: 'some', label: 'Storage work', kindLabel: 'Maintenance', scopeLabel: '3 lanes', pattern: 'dotted', laneIds: ['L3', 'L4', 'L10'], start: utc(6, '00:00'), end: utc(7, '00:00') },
  ];
  const picked = [];
  const { host, rerender, unmount } = mount(h(ui.SchedulingTimeline, props({ lanes: many, items: [], overlays, onSelectOverlay: (overlay) => picked.push(overlay.id) })));
  assert.equal(host.querySelectorAll(`${P}row[data-lane-id]`).length, 30);
  assert.equal(host.querySelectorAll(`${P}overlay`).length, 2, 'two overlays, two elements, over 30 lanes');
  const all = host.querySelector('[data-overlay-id="all"]');
  const some = host.querySelector('[data-overlay-id="some"]');
  assert.equal(all.getAttribute('data-scope'), 'all');
  assert.equal(all.style.getPropertyValue('--uix-timeline-clip'), '', 'a global window is not clipped');
  assert.equal(all.style.left, `${(5 / 7) * 100}%`);
  assert.equal(some.getAttribute('data-scope'), 'lanes');
  // Every lane is one sub-row tall here, so lane n starts n sub-rows and n lane paddings down.
  assert.deepEqual(clipCorners(some), [[3, 3, 0], [3, 3, 0], [5, 5, 0], [5, 5, 0], [10, 10, 0], [10, 10, 0], [11, 11, 0], [11, 11, 0]], 'two runs: lanes 3–4 and lane 10');
  assert.match(some.style.getPropertyValue('--uix-timeline-clip'), /^polygon\(/);
  // Neutral, patterned, with its kind, name and scope as visible text.
  assert.equal(some.getAttribute('data-pattern'), 'dotted');
  assert.equal(some.querySelector(`${P}overlay-kind`).textContent, 'Maintenance');
  assert.equal(some.querySelector(`${P}overlay-name`).textContent, 'Storage work');
  assert.equal(some.querySelector(`${P}overlay-scope`).textContent, '3 lanes');
  assert.equal(some.tagName, 'BUTTON');
  assert.equal(some.getAttribute('aria-label'), 'Maintenance, Storage work, 3 lanes, 2026-10-06 00:00 to 2026-10-07 00:00');
  click(some);
  assert.deepEqual(picked, ['some']);

  // Twice the lanes: still one element each.
  const more = Array.from({ length: 60 }, (_, index) => ({ id: `L${index}`, label: `Lane ${index}` }));
  rerender(h(ui.SchedulingTimeline, props({ lanes: more, items: [], overlays, onSelectOverlay: () => {} })));
  assert.equal(host.querySelectorAll(`${P}row[data-lane-id]`).length, 60);
  assert.equal(host.querySelectorAll(`${P}overlay`).length, 2);
  unmount();
});

test('AC3: the clip follows rows of different heights and group heads, and skips the lanes of a collapsed group', () => {
  const overlay = (laneIds) => [{ id: 'w', label: 'Window', pattern: 'cross', laneIds, start: utc(6, '00:00'), end: utc(8, '00:00') }];
  // Payments: head, A (two sub-rows: a and b overlap), B (one). Network: head, C, D.
  const { host, rerender, unmount } = mount(h(ui.SchedulingTimeline, props({ groups, overlays: overlay(['A', 'D']) })));
  const band = () => host.querySelector('[data-overlay-id="w"]');
  assert.equal(laneRow(host, 'A').style.getPropertyValue('--uix-timeline-rows'), '2');
  assert.deepEqual(clipCorners(band()), [[0, 0, 1], [0, 0, 1], [2, 1, 1], [2, 1, 1], [4, 3, 2], [4, 3, 2], [5, 4, 2], [5, 4, 2]]);
  assert.equal(band().getAttribute('aria-hidden'), 'true', 'without onSelectOverlay the band is decoration; the list names it');
  assert.equal(band().tagName, 'SPAN');
  assert.match(host.querySelector('.uix-visually-hidden ul').textContent, /Window, 2026-10-06 00:00 – 2026-10-08 00:00/);

  // Payments collapsed: lane A is not on screen, so the window is only over D.
  rerender(h(ui.SchedulingTimeline, props({ groups: [{ ...groups[0], collapsed: true }, groups[1]], onToggleGroup: () => {}, overlays: overlay(['A', 'D']) })));
  assert.deepEqual(clipCorners(band()), [[1, 1, 2], [1, 1, 2], [2, 2, 2], [2, 2, 2]]);
  // Every lane it names is hidden: nothing to draw.
  rerender(h(ui.SchedulingTimeline, props({ groups: [{ ...groups[0], collapsed: true }, groups[1]], onToggleGroup: () => {}, overlays: overlay(['A', 'B']) })));
  assert.equal(band(), null);
  // An empty laneIds list names no lane; unset means every lane.
  rerender(h(ui.SchedulingTimeline, props({ groups, overlays: overlay([]) })));
  assert.equal(band(), null);
  rerender(h(ui.SchedulingTimeline, props({ groups, overlays: overlay(undefined) })));
  assert.equal(band().getAttribute('data-scope'), 'all');
  unmount();
});

const STRESS_LANES = 500;
const STRESS_GROUPS = 40;
function stress() {
  const stressLanes = Array.from({ length: STRESS_LANES }, (_, index) => ({ id: `lane-${index}`, label: `Service ${index}` }));
  const stressGroups = Array.from({ length: STRESS_GROUPS }, (_, g) => ({
    id: `group-${g}`, label: `Group ${g}`,
    laneIds: stressLanes.filter((_, index) => Math.floor((index * STRESS_GROUPS) / STRESS_LANES) === g).map((lane) => lane.id),
  }));
  const stressItems = stressLanes.flatMap((lane, index) => {
    const first = { id: `item-${index}`, laneId: lane.id, title: `Item ${index}`, start: utc(5 + (index % 5), '06:00'), end: utc(6 + (index % 5), '06:00') };
    // Every seventh lane has a second, overlapping item: two sub-rows.
    return index % 7 === 0 ? [first, { ...first, id: `item-${index}-b`, title: `Item ${index} b`, start: utc(5 + (index % 5), '12:00') }] : [first];
  });
  return { lanes: stressLanes, groups: stressGroups, items: stressItems };
}

test('AC4 (R15 AC4 / R17 AC2): 500 rows over 40 groups mount at most 150 row elements, and every bar stays keyboard-reachable', () => {
  const fixture = stress();
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props(fixture)));
  const rowCount = () => host.querySelectorAll(`${P}row`).length;
  const barCount = () => host.querySelectorAll('[data-item-id]').length;
  assert.ok(rowCount() <= 150, `${rowCount()} row elements at the start`);
  assert.ok(rowCount() >= 5, 'and the first rows are there');
  assert.ok(barCount() <= 150, `${barCount()} bars`);
  assert.ok(host.querySelector(`${P}scroller`).hasAttribute('data-virtual'));
  assert.equal([...host.querySelectorAll('[data-item-id]')].filter((el) => el.tabIndex === 0).length, 1, 'one tab stop');

  // Arrow down through every lane: focus arrives in each, and the DOM never grows.
  act(() => bar(host, 'item-0').focus());
  const reached = new Set(['lane-0']);
  let most = rowCount();
  for (let step = 1; step < STRESS_LANES; step++) {
    key(document.activeElement, 'ArrowDown');
    const lane = document.activeElement.closest(`${P}row`)?.getAttribute('data-lane-id');
    assert.ok(lane, `step ${step}: focus is on a bar`);
    reached.add(lane);
    most = Math.max(most, rowCount());
  }
  assert.equal(reached.size, STRESS_LANES, 'every lane was reached with the arrow keys');
  assert.equal(document.activeElement.getAttribute('data-item-id'), `item-${STRESS_LANES - 1}`);
  assert.ok(most <= 150, `at most ${most} row elements while walking`);
  // And back up: the first lane is mounted again when focus gets there.
  key(document.activeElement, 'ArrowUp');
  assert.equal(document.activeElement.closest(`${P}row`).getAttribute('data-lane-id'), `lane-${STRESS_LANES - 2}`);

  // Scrolled to the end: the last rows are mounted, the first are not, the focused lane stays.
  const scroller = host.querySelector(`${P}scroller`);
  Object.defineProperty(scroller, 'scrollTop', { value: 1_000_000, configurable: true });
  act(() => { scroller.dispatchEvent(new window.Event('scroll')); });
  assert.ok(laneRow(host, `lane-${STRESS_LANES - 1}`), 'the last lane is mounted');
  assert.equal(laneRow(host, 'lane-0'), null);
  assert.ok(rowCount() <= 150);
  assert.equal([...host.querySelectorAll('[data-item-id]')].filter((el) => el.tabIndex === 0).length, 1);
  unmount();
});

test('AC4: at or under virtualizeAbove every row is mounted; virtualizeAbove={Infinity} turns windowing off', () => {
  const fixture = stress();
  const small = mount(h(ui.SchedulingTimeline, props({ lanes: fixture.lanes.slice(0, 120), items: fixture.items })));
  assert.equal(small.host.querySelectorAll(`${P}row[data-lane-id]`).length, 120);
  assert.equal(small.host.querySelector(`${P}scroller`).hasAttribute('data-virtual'), false);
  small.unmount();
  const off = mount(h(ui.SchedulingTimeline, props({ ...fixture, virtualizeAbove: Infinity })));
  assert.equal(off.host.querySelectorAll(`${P}row[data-lane-id]`).length, STRESS_LANES);
  assert.equal(off.host.querySelectorAll(`${P}row[data-group-id]`).length, STRESS_GROUPS);
  off.unmount();
  const low = mount(h(ui.SchedulingTimeline, props({ lanes: fixture.lanes.slice(0, 60), items: fixture.items, virtualizeAbove: 20 })));
  assert.ok(low.host.querySelectorAll(`${P}row`).length <= 21 + 1, 'the cap follows virtualizeAbove (plus the axis row)');
  low.unmount();
});

test('AC4: one lane with hundreds of stacked bars mounts only the bars near the viewport, and each is still reachable', () => {
  const stacked = Array.from({ length: 400 }, (_, index) => ({ id: `s${index}`, laneId: 'A', title: `Stacked ${index}`, start: utc(5, '00:00'), end: utc(8, '00:00') }));
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ lanes: [lanes[0]], items: stacked })));
  assert.equal(laneRow(host, 'A').style.getPropertyValue('--uix-timeline-rows'), '400');
  assert.ok(host.querySelectorAll('[data-item-id]').length <= 150, `${host.querySelectorAll('[data-item-id]').length} bars`);
  act(() => bar(host, 's0').focus());
  key(document.activeElement, 'End');
  assert.equal(document.activeElement.getAttribute('data-item-id'), 's399');
  assert.ok(host.querySelectorAll('[data-item-id]').length <= 150);
  unmount();
});

test('AC5 (R15 AC5 / R25 AC1): Shift+Right builds a pending proposal and calls nothing; Enter sends it once; Escape drops it', () => {
  const proposals = [];
  const moves = [];
  const selected = [];
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({
    onProposeMove: (id, proposal) => { proposals.push([id, proposal]); },
    onMoveItem: (id, next) => moves.push([id, next]),
    onSelectItem: (item) => selected.push(item.id),
  })));
  const el = bar(host, 'a');
  const before = slot(host, 'a').style.left;
  act(() => el.focus());
  assert.match(document.getElementById(el.getAttribute('aria-describedby')).textContent, /Enter confirms, Escape cancels/);
  key(el, 'ArrowRight', SHIFT);
  key(el, 'ArrowRight', SHIFT);
  assert.deepEqual(proposals, [], 'two key presses call nothing');
  assert.deepEqual(moves, []);
  const ghost = host.querySelector(`${P}ghost`);
  assert.equal(ghost.getAttribute('aria-hidden'), 'true');
  assert.equal(ghost.style.left, `${(10 / 168) * 100}%`, 'the outline is two hours later (one hour a step on a day axis)');
  assert.equal(ghost.style.getPropertyValue('--uix-timeline-row'), '0', 'in the row of its bar');
  assert.equal(slot(host, 'a').style.left, before, 'the bar has not moved');
  assert.equal(live(host), 'Move to 2026-10-05 10:00 – 2026-10-06 10:00. Enter confirms, Escape cancels.');

  const enter = key(el, 'Enter');
  assert.equal(enter.defaultPrevented, true, 'Enter confirms the move; it does not also select the bar');
  assert.deepEqual(proposals, [['a', { start: utc(5, '10:00'), end: utc(6, '10:00'), adjusted: null }]]);
  assert.equal(host.querySelector(`${P}ghost`), null);
  assert.equal(slot(host, 'a').style.left, before, 'the props did not change, so the bar is where it was');
  assert.deepEqual(selected, []);
  assert.deepEqual(moves, [], 'with onProposeMove, onMoveItem is not the move channel');

  key(el, 'ArrowLeft', SHIFT);
  assert.ok(host.querySelector(`${P}ghost`));
  const escape = key(el, 'Escape');
  assert.equal(escape.defaultPrevented, true);
  assert.equal(host.querySelector(`${P}ghost`), null);
  assert.equal(live(host), 'Move cancelled.');
  const idleEnter = key(el, 'Enter');
  assert.equal(idleEnter.defaultPrevented, false, 'with nothing pending Enter is the button\'s own click');
  assert.equal(proposals.length, 1, 'Escape dropped the proposal');
  assert.equal(key(el, 'Escape').defaultPrevented, false, 'with nothing pending Escape belongs to the consumer');

  // Back to where it started: nothing is pending.
  key(el, 'ArrowRight', SHIFT);
  key(el, 'ArrowLeft', SHIFT);
  assert.equal(host.querySelector(`${P}ghost`), null);
  // A bar that is pinned builds nothing.
  key(bar(host, 'e'), 'ArrowRight', SHIFT);
  assert.equal(host.querySelector(`${P}ghost`), null);
  assert.equal(bar(host, 'e').getAttribute('aria-describedby'), null);
  // Leaving the bar drops what was pending.
  key(el, 'ArrowRight', SHIFT);
  act(() => el.blur());
  assert.equal(host.querySelector(`${P}ghost`), null);
  unmount();
});

test('AC5: a drag proposes once, on drop; a press that travels under 4 px is a click; the click that ends a drag selects nothing', () => {
  const proposals = [];
  const selected = [];
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ onProposeMove: (id, proposal) => { proposals.push([id, proposal]); }, onSelectItem: (item) => selected.push(item.id) })));
  const el = bar(host, 'c');
  const before = slot(host, 'c').style.left;
  pointer(el, 'pointerdown', 150);
  pointer(window, 'pointermove', 152, 11);
  assert.equal(host.querySelector(`${P}ghost`), null, 'under 4 px is not a drag');
  pointer(window, 'pointerup', 152, 11);
  click(el);
  assert.deepEqual(selected, ['c']);
  assert.deepEqual(proposals, []);

  // 100 px is one day on this track.
  pointer(el, 'pointerdown', 150);
  pointer(window, 'pointermove', 200);
  pointer(window, 'pointermove', 250);
  assert.deepEqual(proposals, [], 'nothing is called while the pointer travels');
  assert.equal(host.querySelector(`${P}ghost`).style.left, `${(2 / 7) * 100}%`, 'the outline follows');
  assert.equal(slot(host, 'c').style.left, before, 'the bar itself stays');
  assert.equal(el.hasAttribute('data-dragging'), false);
  pointer(window, 'pointerup', 250);
  assert.deepEqual(proposals, [['c', { start: utc(7, '00:00'), end: utc(7, '12:00'), adjusted: null }]]);
  assert.equal(host.querySelector(`${P}ghost`), null);
  click(el);
  assert.deepEqual(selected, ['c'], 'the click that ends a drag is not an activation');
  click(el);
  assert.deepEqual(selected, ['c', 'c'], 'the next real click is');
  // A pinned bar does not start a drag.
  pointer(bar(host, 'e'), 'pointerdown', 450);
  pointer(window, 'pointermove', 550);
  assert.equal(host.querySelector(`${P}ghost`), null);
  pointer(window, 'pointerup', 550);
  assert.equal(proposals.length, 1);
  unmount();
});

test('AC5: Escape during a drag drops it and the release is not a click; a move with no button down ends a drag whose release was never seen', () => {
  const proposals = [];
  const selected = [];
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ onProposeMove: (id) => { proposals.push(id); }, onSelectItem: (item) => selected.push(item.id) })));
  const el = bar(host, 'c');
  pointer(el, 'pointerdown', 150);
  pointer(window, 'pointermove', 250);
  assert.ok(host.querySelector(`${P}ghost`));
  act(() => { window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
  assert.equal(host.querySelector(`${P}ghost`), null, 'the outline goes at once');
  pointer(window, 'pointermove', 300);
  assert.equal(host.querySelector(`${P}ghost`), null, 'and does not come back while the button is down');
  pointer(window, 'pointerup', 300);
  click(el);
  assert.deepEqual(proposals, []);
  assert.deepEqual(selected, [], 'the release is not an activation');

  pointer(el, 'pointerdown', 150);
  pointer(window, 'pointermove', 250);
  pointer(window, 'pointermove', 260, 10, { buttons: 0, pointerType: 'mouse' });
  assert.equal(host.querySelector(`${P}ghost`), null);
  pointer(window, 'pointerup', 260);
  assert.deepEqual(proposals, [], 'a later, unrelated release proposes nothing');
  unmount();
});

test('AC5: the outline of a sent move is the proposal that was sent, until the consumer answers; a refusal leaves the bar where it was', async () => {
  let settle;
  let reject;
  const sent = { onProposeMove: () => new Promise((yes, no) => { settle = yes; reject = no; }) };
  const { host, rerender, unmount } = mount(h(ui.SchedulingTimeline, props(sent)));
  const before = slot(host, 'c').style.left;
  key(bar(host, 'c'), 'ArrowRight', SHIFT);
  key(bar(host, 'c'), 'Enter');
  const waiting = host.querySelector(`${P}ghost`);
  assert.equal(waiting.hasAttribute('data-sent'), true, 'the outline waits for the answer');
  const asked = waiting.style.left;
  assert.equal(asked, `${(25 / 168) * 100}%`);
  // The consumer applies the move optimistically while its request is still open.
  rerender(h(ui.SchedulingTimeline, props({ ...sent, items: items.map((item) => item.id === 'c' ? { ...item, start: utc(6, '01:00'), end: utc(6, '13:00') } : item) })));
  assert.equal(host.querySelector(`${P}ghost`).style.left, asked, 'the outline is the proposal, not the proposal applied twice');
  await act(async () => { settle(); await Promise.resolve(); });
  assert.equal(host.querySelector(`${P}ghost`), null);

  rerender(h(ui.SchedulingTimeline, props(sent)));
  key(bar(host, 'c'), 'ArrowRight', SHIFT);
  key(bar(host, 'c'), 'Enter');
  assert.ok(host.querySelector(`${P}ghost[data-sent]`));
  await act(async () => { reject(new Error('refused')); await Promise.resolve(); });
  assert.equal(host.querySelector(`${P}ghost`), null);
  assert.equal(slot(host, 'c').style.left, before, 'a refused move is back where it was, by construction');
  unmount();
});

test('AC5: focus stays on a bar the consumer moves after a keyboard proposal, and a pending move is dropped when its item leaves', () => {
  function Applied() {
    const [list, setList] = react.useState(items);
    return h(ui.SchedulingTimeline, props({ items: list, onProposeMove: (id, proposal) => setList(list.map((item) => item.id === id ? { ...item, start: proposal.start, end: proposal.end, laneId: 'B' } : item)) }));
  }
  const applied = mount(h(Applied));
  act(() => bar(applied.host, 'd').focus());
  key(bar(applied.host, 'd'), 'ArrowRight', SHIFT);
  key(bar(applied.host, 'd'), 'Enter');
  const moved = bar(applied.host, 'd');
  assert.equal(moved.closest(`${P}row`).getAttribute('data-lane-id'), 'B', 'the consumer applied the move, into another lane');
  assert.equal(document.activeElement, moved, 'and focus is on the bar in its new place');
  applied.unmount();

  const { host, rerender, unmount } = mount(h(ui.SchedulingTimeline, props({ onProposeMove: () => {} })));
  key(bar(host, 'c'), 'ArrowRight', SHIFT);
  assert.ok(host.querySelector(`${P}ghost`));
  rerender(h(ui.SchedulingTimeline, props({ onProposeMove: () => {}, items: items.filter((item) => item.id !== 'c') })));
  assert.equal(host.querySelector(`${P}ghost`), null);
  unmount();
});

test('AC5: on a week axis a step is a calendar day, so a move keeps its wall-clock time across the clock change', () => {
  const proposals = [];
  const berlin = {
    lanes: [lanes[0]], timeZone: 'Europe/Berlin', scale: 'week',
    range: { start: '2026-10-18T22:00:00Z', end: '2026-11-01T23:00:00Z' },
    // 22:00–23:00 on 24.10.2026 in Berlin (UTC+2); the 25th has 25 hours.
    items: [{ id: 'late', laneId: 'A', title: 'Late item', start: '2026-10-24T20:00:00.000Z', end: '2026-10-24T21:00:00.000Z' }],
  };
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ ...berlin, onProposeMove: (id, proposal) => { proposals.push(proposal); } })));
  key(bar(host, 'late'), 'ArrowRight', SHIFT);
  key(bar(host, 'late'), 'Enter');
  assert.deepEqual(proposals, [{ start: '2026-10-25T21:00:00.000Z', end: '2026-10-25T22:00:00.000Z', adjusted: null }], '22:00 local on the 25th is 25 real hours later');
  unmount();
});

test('AC5: a keyboard move into the gap hour of 29.03.2026 goes forward once and says so', () => {
  const proposals = [];
  const berlin = {
    lanes: [lanes[0]], timeZone: 'Europe/Berlin', scale: 'week',
    range: { start: '2026-03-22T23:00:00Z', end: '2026-04-05T22:00:00Z' },
    // 02:30–02:45 on 28.03.2026 in Berlin (UTC+1); 02:30 does not exist on the 29th.
    items: [{ id: 'gap', laneId: 'A', title: 'Half past two', start: '2026-03-28T01:30:00.000Z', end: '2026-03-28T01:45:00.000Z' }],
  };
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ ...berlin, onProposeMove: (id, proposal) => { proposals.push(proposal); } })));
  key(bar(host, 'gap'), 'ArrowRight', SHIFT);
  assert.match(live(host), /does not exist/);
  assert.match(live(host), /03:30/);
  key(bar(host, 'gap'), 'Enter');
  assert.deepEqual(proposals, [{ start: '2026-03-29T01:30:00.000Z', end: '2026-03-29T01:45:00.000Z', adjusted: 'gap_forward' }]);
  unmount();
});

test('AC5 (PDR-0013): with onResizeItem unset Alt+Shift+Arrow does nothing and the hint does not mention it', () => {
  const calls = [];
  const hintOf = (host, id) => { const described = bar(host, id).getAttribute('aria-describedby'); return described ? document.getElementById(described).textContent : null; };

  const legacy = mount(h(ui.SchedulingTimeline, props({ onMoveItem: (id, next) => calls.push(['move', id, next]) })));
  key(bar(legacy.host, 'a'), 'ArrowLeft', ALT_SHIFT);
  key(bar(legacy.host, 'a'), 'ArrowRight', ALT_SHIFT);
  assert.deepEqual(calls, [], 'no resize, and not a move either');
  assert.equal(hintOf(legacy.host, 'a'), 'Shift and an arrow key moves it.');
  assert.doesNotMatch(legacy.host.textContent, /Alt/);
  legacy.unmount();

  const proposing = mount(h(ui.SchedulingTimeline, props({ onProposeMove: (id, proposal) => { calls.push(['propose', id, proposal]); } })));
  key(bar(proposing.host, 'a'), 'ArrowLeft', ALT_SHIFT);
  assert.equal(proposing.host.querySelector(`${P}ghost`), null, 'Alt+Shift builds no proposal');
  key(bar(proposing.host, 'a'), 'Enter');
  assert.deepEqual(calls, []);
  assert.doesNotMatch(proposing.host.textContent, /Alt/);
  proposing.unmount();

  const none = mount(h(ui.SchedulingTimeline, props()));
  assert.equal(hintOf(none.host, 'a'), null, 'with no move prop there is no hint at all');
  assert.equal(none.host.querySelector('[data-movable]'), null);
  assert.doesNotMatch(none.host.textContent, /Shift/);
  none.unmount();
});

test('AC5: with onResizeItem, Alt+Shift+Arrow moves the end by the step, never under one step, and the hint says so', () => {
  const resized = [];
  const proposals = [];
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ onResizeItem: (id, next) => resized.push([id, next]), onProposeMove: (id, proposal) => { proposals.push(proposal); } })));
  key(bar(host, 'a'), 'ArrowLeft', ALT_SHIFT);
  assert.deepEqual(resized, [['a', { start: utc(5, '08:00'), end: utc(6, '07:00') }]]);
  assert.equal(live(host), 'Schema update now ends 2026-10-06 07:00');
  assert.equal(host.querySelector(`${P}ghost`), null);
  assert.deepEqual(proposals, []);
  assert.match(document.getElementById(bar(host, 'a').getAttribute('aria-describedby')).textContent, /Alt, Shift and an arrow key/);
  key(bar(host, 'e'), 'ArrowLeft', ALT_SHIFT);
  assert.equal(resized.length, 1, 'movable: false pins the end too');
  unmount();

  // Resize alone, with no move prop.
  const only = mount(h(ui.SchedulingTimeline, props({ onResizeItem: (id, next) => resized.push([id, next]) })));
  key(bar(only.host, 'c'), 'ArrowRight', ALT_SHIFT);
  assert.deepEqual(resized[1], ['c', { start: utc(6, '00:00'), end: utc(6, '13:00') }]);
  key(bar(only.host, 'c'), 'ArrowRight', SHIFT);
  assert.equal(resized.length, 2, 'Shift alone moves nothing without a move prop');
  only.unmount();
});

test('do-not: onMoveItem still commits every step and every drop, exactly as in 2.32', () => {
  const moves = [];
  const selected = [];
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ onMoveItem: (id, next) => moves.push([id, next]), onSelectItem: (item) => selected.push(item.id) })));
  const el = bar(host, 'a');
  key(el, 'ArrowRight', SHIFT);
  key(el, 'ArrowRight', SHIFT);
  key(el, 'ArrowLeft', SHIFT);
  assert.deepEqual(moves, [
    ['a', { start: utc(5, '09:00'), end: utc(6, '09:00') }],
    ['a', { start: utc(5, '09:00'), end: utc(6, '09:00') }],
    ['a', { start: utc(5, '07:00'), end: utc(6, '07:00') }],
  ], 'each key press calls onMoveItem at once, from the props as they are');
  assert.equal(live(host), 'Moved Schema update to 2026-10-05 07:00 – 2026-10-06 07:00');
  assert.equal(host.querySelector(`${P}ghost`), null, 'no pending outline in this mode');
  assert.equal(key(el, 'Enter').defaultPrevented, false);

  // The 2.32 drag: followed on the bar, the bar itself moves, one call on release.
  const dragged = bar(host, 'c');
  pointer(dragged, 'pointerdown', 150);
  pointer(dragged, 'pointermove', 250);
  assert.equal(dragged.hasAttribute('data-dragging'), true);
  assert.equal(slot(host, 'c').style.left, `${(2 / 7) * 100}%`, 'the bar follows the pointer');
  assert.equal(moves.length, 3);
  pointer(dragged, 'pointerup', 250);
  assert.deepEqual(moves[3], ['c', { start: utc(7, '00:00'), end: utc(7, '12:00') }]);
  click(dragged);
  assert.deepEqual(selected, [], 'the click that ends the drag selects nothing');
  unmount();
});

test('AC6 (R20 AC1 / AC2): a click selects, Enter with nothing pending is left to the button, and bars carry data-item-id', () => {
  const selected = [];
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ onSelectItem: (item) => selected.push(item), onProposeMove: () => {} })));
  const el = host.querySelector('[data-item-id="d"]');
  assert.equal(el.tagName, 'BUTTON');
  assert.equal(el.getAttribute('data-timeline-item'), 'd', 'the 2.32 hook is still there');
  assert.equal(el.getAttribute('data-band'), 'none');
  assert.equal(el.getAttribute('data-status'), 'committed');
  assert.equal(el.hasAttribute('data-state'), false);
  click(el);
  assert.equal(selected.length, 1);
  assert.equal(selected[0], items[3], 'the callback gets the item it was given');
  assert.equal(key(el, 'Enter').defaultPrevented, false, 'the browser turns Enter into that click');
  assert.equal(host.querySelectorAll('[data-item-id]').length, items.length);
  unmount();
});

test('AC7 (V13): with flagOverlaps={false} overlapping bars stack without hatching or overlap text; a marker carries the consumer reason', () => {
  const reason = { id: 'shared', label: 'Shares a database with Schema update', emphasis: 'refused' };
  const marked = items.map((item) => item.id === 'b' ? { ...item, markers: [reason] } : item);
  const { host, rerender, unmount } = mount(h(ui.SchedulingTimeline, props({ items: marked, flagOverlaps: false })));
  assert.equal(slot(host, 'a').style.getPropertyValue('--uix-timeline-row'), '0');
  assert.equal(slot(host, 'b').style.getPropertyValue('--uix-timeline-row'), '1', 'the stacking stays');
  assert.equal(host.querySelector('[data-conflict]'), null, 'no hatch');
  for (const el of host.querySelectorAll('[data-item-id]')) assert.doesNotMatch(el.getAttribute('aria-label'), /overlap/i);
  assert.doesNotMatch(host.textContent, /overlap/i);
  assert.equal(bar(host, 'a').getAttribute('aria-label'), 'Schema update, Scheduled, 2026-10-05 08:00 to 2026-10-06 08:00');
  assert.equal(bar(host, 'b').getAttribute('aria-label'), 'Cache warm-up, Scheduled, 2026-10-05 20:00 to 2026-10-07 00:00, Shares a database with Schema update');
  const marker = bar(host, 'b').querySelector(`${P}item-marker`);
  assert.equal(marker.getAttribute('data-emphasis'), 'refused');
  assert.equal(marker.getAttribute('data-glyph'), 'refused', 'a shape, not a colour');
  assert.equal(marker.textContent, 'Shares a database with Schema update');

  // The default is what 2.32 did.
  rerender(h(ui.SchedulingTimeline, props({ items: marked })));
  assert.ok(bar(host, 'a').hasAttribute('data-conflict') && bar(host, 'b').hasAttribute('data-conflict'));
  assert.match(bar(host, 'a').getAttribute('aria-label'), /, overlaps another entry$/);
  unmount();
});

test('AC7: accessibleName replaces the built name; a marker icon is drawn in place of the shape', () => {
  const custom = [{ ...items[0], accessibleName: 'CHG-1 Schema update, high, awaiting review', markers: [{ id: 'm', label: 'Awaiting review', icon: h('svg', { 'data-test-icon': '' }) }] }];
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ items: custom })));
  assert.equal(bar(host, 'a').getAttribute('aria-label'), 'CHG-1 Schema update, high, awaiting review');
  const marker = bar(host, 'a').querySelector(`${P}item-marker`);
  assert.ok(marker.querySelector('[data-test-icon]'));
  assert.equal(marker.hasAttribute('data-glyph'), false);
  assert.equal(marker.getAttribute('data-emphasis'), 'neutral');
  unmount();
});

test('AC8 (R2 AC3 / AC4, R9 AC5): the notice is above the axis; a columnNotes entry sits on its day column; an empty range still draws the axis and the note', () => {
  const { host, rerender, unmount } = mount(h(ui.SchedulingTimeline, props({
    notice: 'Showing 500 of 1,240 items.',
    columnNotes: { '2026-10-07': h('button', { type: 'button' }, '12 not shown'), '2026-10-20': 'outside the range' },
  })));
  const notice = host.querySelector(`${P}notice`);
  assert.equal(notice.textContent, 'Showing 500 of 1,240 items.');
  const axis = host.querySelector(`${P}row--axis`);
  assert.ok(notice.compareDocumentPosition(axis) & window.Node.DOCUMENT_POSITION_FOLLOWING, 'the notice comes before the axis');
  const notes = [...host.querySelectorAll(`${P}column-note`)];
  assert.equal(notes.length, 1, 'a day outside the range has no column');
  assert.equal(notes[0].getAttribute('data-date'), '2026-10-07');
  assert.equal(notes[0].style.left, `${(2 / 7) * 100}%`);
  assert.ok(Math.abs(percent(notes[0].style.width) - 100 / 7) < 1e-9);
  assert.equal(notes[0].querySelector('button').textContent, '12 not shown');
  assert.equal(notes[0].closest('[aria-hidden="true"]'), null, 'the note is not hidden from assistive technology');
  assert.ok(axis.compareDocumentPosition(notes[0]) & window.Node.DOCUMENT_POSITION_FOLLOWING, 'under the axis');

  // No items: the axis, the lanes and the note are all still there.
  rerender(h(ui.SchedulingTimeline, props({ items: [], notice: 'Nothing matches the filters.', labels: { empty: 'Nothing is scheduled this week.' } })));
  assert.equal(host.querySelectorAll(`${P}row--axis ${P}tick`).length, 8);
  assert.equal(host.querySelectorAll(`${P}row[data-lane-id]`).length, 4);
  assert.equal(host.querySelector(`${P}empty`).textContent, 'Nothing is scheduled this week.');
  assert.equal(host.querySelector(`${P}notice`).textContent, 'Nothing matches the filters.');
  assert.equal(host.querySelector(`${P}column-note`), null);
  // Items that exist but sit in a collapsed group are not "nothing".
  rerender(h(ui.SchedulingTimeline, props({ groups: groups.map((group) => ({ ...group, collapsed: true })), onToggleGroup: () => {} })));
  assert.equal(host.querySelector(`${P}empty`), null);
  unmount();
});

test('AC8: a column note covers its day in the display zone, a 25-hour day included', () => {
  const autumn = { start: '2026-10-23T22:00:00Z', end: '2026-10-26T23:00:00Z' }; // 24., 25. and 26.10. in Berlin: 24 + 25 + 24 hours
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ range: autumn, timeZone: 'Europe/Berlin', items: [], columnNotes: { '2026-10-25': '3 not shown' } })));
  const note = host.querySelector(`${P}column-note`);
  assert.ok(Math.abs(percent(note.style.left) - (24 / 73) * 100) < 1e-9);
  assert.ok(Math.abs(percent(note.style.width) - (25 / 73) * 100) < 1e-9, 'the long day is a wider column');
  unmount();
});

test('AC9 (R18 AC1-equivalent): with groups and windows the bars are still one tab stop, and the arrows cross group heads', () => {
  const overlays = [{ id: 'w', label: 'Quarter close', start: utc(10, '00:00'), end: utc(12, '00:00') }];
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ groups, overlays })));
  const stops = [...host.querySelectorAll('[data-item-id]')].filter((el) => el.tabIndex === 0);
  assert.deepEqual(stops.map((el) => el.getAttribute('data-item-id')), ['a']);
  act(() => bar(host, 'a').focus());
  key(bar(host, 'a'), 'ArrowRight');
  assert.equal(document.activeElement, bar(host, 'b'));
  key(bar(host, 'b'), 'ArrowDown');
  assert.equal(document.activeElement, bar(host, 'c'));
  key(bar(host, 'c'), 'ArrowDown');
  assert.equal(document.activeElement, bar(host, 'd'), 'over the Network head row into its first lane');
  key(bar(host, 'd'), 'ArrowDown');
  assert.equal(document.activeElement, bar(host, 'e'));
  key(bar(host, 'e'), 'ArrowUp');
  key(bar(host, 'd'), 'ArrowUp');
  assert.equal(document.activeElement, bar(host, 'c'));
  assert.equal([...host.querySelectorAll('[data-item-id]')].filter((el) => el.tabIndex === 0).length, 1);
  unmount();
});

test('AC15 (FG-REC-14): a day axis with subTicks draws three minor ticks a day, at local 06:00, 12:00 and 18:00', () => {
  const autumn = { start: '2026-10-23T22:00:00Z', end: '2026-10-25T23:00:00Z' }; // 24.10. (24 h) and 25.10.2026 (25 h) in Berlin
  const total = 49;
  const { host, rerender, unmount } = mount(h(ui.SchedulingTimeline, props({ range: autumn, timeZone: 'Europe/Berlin', items: [], subTicks: [6, 12, 18] })));
  const minor = [...host.querySelectorAll(`${P}row--axis ${P}tick[data-minor]`)];
  assert.equal(minor.length, 6);
  assert.deepEqual(minor.map((tick) => tick.textContent), ['06', '12', '18', '06', '12', '18']);
  // Hours from the start of the range: 6, 12, 18 on the first day; 24 + 7, 13, 19 on the 25-hour day.
  const expected = [6, 12, 18, 31, 37, 43].map((hours) => (hours / total) * 100);
  minor.forEach((tick, index) => assert.ok(Math.abs(percent(tick.style.left) - expected[index]) < 1e-9, `minor tick ${index}`));
  assert.equal(host.querySelectorAll(`${P}row--axis ${P}tick:not([data-minor])`).length, 3, 'the day ticks are as before');
  assert.equal(host.querySelectorAll(`${P}gridline[data-minor]`).length, 6, 'and one minor grid line each, drawn once');
  // The consumer formats them through formatTick, as an hour.
  rerender(h(ui.SchedulingTimeline, props({ range: autumn, timeZone: 'Europe/Berlin', items: [], subTicks: [12], formatTick: (at, scale) => `${scale}:${at.toISOString().slice(11, 16)}` })));
  assert.deepEqual([...host.querySelectorAll(`${P}tick[data-minor]`)].map((tick) => tick.textContent), ['hour:10:00', 'hour:11:00']);
  // Without subTicks, and on other scales, there are none.
  rerender(h(ui.SchedulingTimeline, props({ range: autumn, timeZone: 'Europe/Berlin', items: [] })));
  assert.equal(host.querySelector('[data-minor]'), null);
  rerender(h(ui.SchedulingTimeline, props({ range: autumn, timeZone: 'Europe/Berlin', items: [], scale: 'week', subTicks: [6, 12, 18] })));
  assert.equal(host.querySelector('[data-minor]'), null);
  unmount();
});

test('AC16 (FG-REC-14): an hour axis over 25.10.2026 in Berlin shows "02" twice with the UTC offset; over 29.03.2026 there is no "02"', () => {
  const { host, rerender, unmount } = mount(h(ui.SchedulingTimeline, props({ range: { start: '2026-10-24T22:00:00Z', end: '2026-10-25T23:00:00Z' }, scale: 'hour', timeZone: 'Europe/Berlin', items: [] })));
  const labels = () => [...host.querySelectorAll(`${P}row--axis ${P}tick-label`)];
  const twos = labels().filter((label) => label.textContent.startsWith('02'));
  assert.equal(twos.length, 2, '"02" appears twice');
  assert.deepEqual(twos.map((label) => label.querySelector(`${P}tick-offset`)?.textContent), ['+02:00', '+01:00'], 'each with the offset it is in; the second is +01:00');
  assert.equal(host.querySelectorAll(`${P}tick-offset`).length, 2, 'no other hour carries one');
  rerender(h(ui.SchedulingTimeline, props({ range: { start: '2026-03-28T23:00:00Z', end: '2026-03-29T22:00:00Z' }, scale: 'hour', timeZone: 'Europe/Berlin', items: [] })));
  assert.equal(labels().length, 23);
  assert.equal(labels().some((label) => label.textContent.startsWith('02')), false);
  assert.equal(host.querySelector(`${P}tick-offset`), null);
  unmount();
});

test('AC17 (E13): the generic props carry no kind or state word; the deprecated ones still draw', () => {
  const generic = mount(h(ui.SchedulingTimeline, props({
    items: [{ ...items[0], band: 'high', status: 'tentative' }, { ...items[2], status: 'live' }],
    overlays: [{ id: 'w', label: 'Quarter close', kindLabel: 'Hold', scopeLabel: 'Payments', pattern: 'cross', start: utc(10, '00:00'), end: utc(12, '00:00') }],
  })));
  const band = generic.host.querySelector('[data-overlay-id="w"]');
  assert.equal(band.hasAttribute('data-kind'), false);
  assert.equal(band.getAttribute('data-pattern'), 'cross');
  assert.equal(bar(generic.host, 'a').getAttribute('data-band'), 'high');
  assert.equal(bar(generic.host, 'a').getAttribute('data-status'), 'tentative');
  assert.equal(bar(generic.host, 'a').hasAttribute('data-state'), false);
  assert.equal(bar(generic.host, 'a').getAttribute('aria-label'), 'Schema update, Tentative, 2026-10-05 08:00 to 2026-10-06 08:00');
  assert.match(bar(generic.host, 'c').getAttribute('aria-label'), /^Report run, In progress, /);
  assert.match(generic.host.querySelector('.uix-visually-hidden ul').textContent, /Hold, Quarter close, Payments, 2026-10-10 00:00 – 2026-10-12 00:00/);
  assert.doesNotMatch(generic.host.textContent, /freeze|blackout|violation|conflicted/i);
  assert.doesNotMatch(generic.host.innerHTML, /freeze|blackout|violation|conflicted/i, 'not in an attribute either');
  generic.unmount();

  // What a 2.32 consumer passes: `state` on items and `kind` on overlays.
  const legacy = mount(h(ui.SchedulingTimeline, props({
    items: [{ ...items[0], state: 'blackout-violation' }, { ...items[2], state: 'in-progress' }, { ...items[3], state: 'conflicted' }],
    overlays: [{ id: 'f', kind: 'freeze', label: 'Q4', start: utc(10, '00:00'), end: utc(12, '00:00') }, { id: 'm', kind: 'maintenance', label: 'Storage', start: utc(6, '00:00'), end: utc(6, '06:00') }],
  })));
  assert.equal(bar(legacy.host, 'a').getAttribute('data-state'), 'blackout-violation');
  assert.equal(bar(legacy.host, 'a').getAttribute('aria-label'), 'Schema update, Blackout violation, 2026-10-05 08:00 to 2026-10-06 08:00');
  assert.equal(bar(legacy.host, 'a').querySelector(`${P}item-marker`).textContent, 'Blackout violation', 'the problem states keep a shape and their word, not a hue');
  assert.equal(bar(legacy.host, 'd').querySelector(`${P}item-marker`).textContent, 'Conflicted');
  assert.equal(bar(legacy.host, 'c').getAttribute('data-status'), 'live');
  assert.equal(bar(legacy.host, 'c').querySelector(`${P}item-marker`), null);
  assert.equal(legacy.host.querySelector('[data-overlay-id="f"]').getAttribute('data-kind'), 'freeze');
  assert.ok(legacy.host.querySelector('[data-overlay-id="f"]').getAttribute('data-pattern'));
  assert.notEqual(legacy.host.querySelector('[data-overlay-id="f"]').getAttribute('data-pattern'), legacy.host.querySelector('[data-overlay-id="m"]').getAttribute('data-pattern'), 'the kinds 2.32 told apart by hue are told apart by pattern');
  assert.match(legacy.host.querySelector('.uix-visually-hidden ul').textContent, /Change freeze: Q4, 2026-10-10 00:00 – 2026-10-12 00:00/);
  assert.match(legacy.host.querySelector('.uix-visually-hidden ul').textContent, /Maintenance window: Storage/);
  legacy.unmount();
});

test('what a 2.32 consumer renders still renders: repeated ids, an inverted item, laneId on overlays and markers, ids that match nothing', () => {
  const odd = [
    { id: 'dup', laneId: 'A', title: 'First', start: utc(5, '08:00'), end: utc(5, '12:00') },
    { id: 'dup', laneId: 'A', title: 'Second', start: utc(5, '10:00'), end: utc(5, '14:00') },
    { id: 'dup', laneId: 'B', title: 'Third', start: utc(6, '08:00'), end: utc(6, '12:00') },
    { id: 'inv', laneId: 'B', title: 'Inverted', start: utc(8, '10:00'), end: utc(8, '08:00') },
    { id: 'lost', laneId: 'nowhere', title: 'No such lane', start: utc(8, '10:00'), end: utc(8, '12:00') },
    { id: 'away', laneId: 'C', title: 'Outside the range', start: '2026-11-01T00:00:00.000Z', end: '2026-11-02T00:00:00.000Z' },
  ];
  const overlays = [
    { id: 'one', kind: 'maintenance', label: 'Ledger only', laneId: 'B', start: utc(7, '00:00'), end: utc(7, '06:00') },
    { id: 'every', kind: 'freeze', label: 'Everywhere', start: utc(10, '00:00'), end: utc(12, '00:00') },
    { id: 'every', kind: 'freeze', label: 'Same id again', start: utc(11, '00:00'), end: utc(12, '00:00') },
    { id: 'none', kind: 'blackout', label: 'No such lane', laneId: 'nowhere', start: utc(7, '00:00'), end: utc(7, '06:00') },
    { id: 'gone', kind: 'blackout', label: 'Outside', start: '2026-11-01T00:00:00.000Z', end: '2026-11-02T00:00:00.000Z' },
    { id: 'back', kind: 'blackout', label: 'Ends before it starts', start: utc(9, '06:00'), end: utc(9, '00:00') },
  ];
  const markers = [{ id: 'm1', label: 'Renewal', at: utc(8, '00:00') }, { id: 'm2', label: 'Lane renewal', at: utc(9, '00:00'), laneId: 'C' }, { id: 'm3', label: 'Lost', at: utc(9, '00:00'), laneId: 'nowhere' }];
  const picked = [];
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ items: odd, overlays, markers, onSelectItem: (item) => picked.push(item.title) })));
  const dups = [...host.querySelectorAll('[data-item-id="dup"]')];
  assert.deepEqual(dups.map((el) => el.textContent), ['First', 'Second', 'Third'], 'a repeated id is drawn each time, as in 2.32');
  dups.forEach((el) => click(el));
  assert.deepEqual(picked, ['First', 'Second', 'Third'], 'and each bar selects its own item');
  assert.ok(bar(host, 'inv'), 'an item that ends before it starts is a point at its start');
  assert.equal(slot(host, 'inv').style.width, '0%');
  assert.equal(bar(host, 'lost'), null);
  assert.equal(bar(host, 'away'), null);

  const one = [...host.querySelectorAll('[data-overlay-id="one"]')];
  assert.equal(one.length, 1);
  assert.equal(one[0].closest(`${P}row`).getAttribute('data-lane-id'), 'B', 'a laneId window is drawn in its lane');
  assert.equal(host.querySelectorAll('[data-overlay-id="every"]').length, 2, 'a repeated overlay id is drawn each time');
  assert.equal(host.querySelector('[data-overlay-id="none"]'), null);
  assert.equal(host.querySelector('[data-overlay-id="gone"]'), null);
  assert.ok(host.querySelector('[data-overlay-id="back"]'), 'an inverted window is a line at its start, as before');
  assert.equal(host.querySelectorAll(`${P}marker`).length, 2);
  assert.equal(host.querySelector('[data-marker-id="m2"]').closest(`${P}row`).getAttribute('data-lane-id'), 'C');
  assert.equal(host.querySelector('[data-marker-id="m1"]').getAttribute('title'), 'Renewal');
  // The screen-reader list names every window and marker it was given, in the order given.
  assert.equal(host.querySelectorAll('.uix-visually-hidden ul li').length, overlays.length + markers.length);
  // Lanes with one id twice are two rows, each with the lane's bars.
  unmount();
  const twice = mount(h(ui.SchedulingTimeline, props({ lanes: [lanes[0], lanes[0]] })));
  assert.equal(twice.host.querySelectorAll(`${P}row[data-lane-id="A"]`).length, 2);
  assert.equal(twice.host.querySelectorAll('[data-item-id="a"]').length, 2);
  twice.unmount();
});

test('laneIds on a point marker limits its one line to those lanes', () => {
  const markers = [{ id: 'm', label: 'Renewal', at: utc(8, '00:00'), laneIds: ['A', 'C'] }];
  const { host, unmount } = mount(h(ui.SchedulingTimeline, props({ markers })));
  const lines = host.querySelectorAll('[data-marker-id="m"]');
  assert.equal(lines.length, 1);
  // A has two sub-rows, B one: A is [0, 2 sub-rows + 1 lane), C starts after A and B.
  assert.deepEqual(clipCorners(lines[0]), [[0, 0, 0], [0, 0, 0], [2, 1, 0], [2, 1, 0], [3, 2, 0], [3, 2, 0], [4, 3, 0], [4, 3, 0]]);
  unmount();
});

test('maxHeight makes the lanes scroll inside the timeline; unset, the page scrolls as before', () => {
  const { host, rerender, unmount } = mount(h(ui.SchedulingTimeline, props({ maxHeight: '20rem' })));
  const scroller = host.querySelector(`${P}scroller`);
  assert.equal(scroller.style.maxHeight, '20rem');
  assert.ok(scroller.hasAttribute('data-scroll-y'));
  rerender(h(ui.SchedulingTimeline, props()));
  assert.equal(host.querySelector(`${P}scroller`).style.maxHeight, '');
  assert.equal(host.querySelector(`${P}scroller`).hasAttribute('data-scroll-y'), false);
  unmount();
});

test('the fixed row geometry is used only with the new layout props: a plain 2.32 timeline keeps rows that grow with their label', () => {
  const plain = mount(h(ui.SchedulingTimeline, props({ overlays: [{ id: 'one', kind: 'maintenance', label: 'Ledger only', laneId: 'B', start: utc(7, '00:00'), end: utc(7, '06:00') }] })));
  assert.equal(plain.host.querySelector('section').hasAttribute('data-fixed'), false);
  plain.unmount();
  for (const extra of [{ groups }, { overlays: [{ id: 'w', label: 'W', laneIds: ['A'], start: utc(7, '00:00'), end: utc(7, '06:00') }] }, { markers: [{ id: 'm', label: 'M', at: utc(7, '00:00'), laneIds: ['A'] }] }]) {
    const fixed = mount(h(ui.SchedulingTimeline, props(extra)));
    assert.equal(fixed.host.querySelector('section').hasAttribute('data-fixed'), true, Object.keys(extra)[0]);
    fixed.unmount();
  }
});
