/* SchedulingCalendar month geometry (HAR-1506, U2): end-exclusive zoned day membership
 * (R4 AC3, Month half) and `layoutMonthSpans` (R13 AC1, R21 AC5, FG-UX-3 / FG-PLAT-5).
 * Zone tests must not depend on the process zone: `scheduling-calendar-zones.test.mjs`
 * re-runs this file under TZ=UTC, Europe/Berlin and America/New_York.
 * Reads the BUILT dist (the model imports U1's module) — run `npm run build` first; CI does.
 * Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { itemDaySpan, layoutMonthSpans, schedulingGridDays, zonedDaySpan } from '../dist/index.js';

test('the zone wrapper really changed the process time zone', () => {
  const expected = process.env.UIX_EXPECT_TZ_OFFSET;
  if (expected === undefined) return;
  assert.equal(String(new Date('2026-01-15T12:00:00Z').getTimezoneOffset()), expected);
});

const BERLIN = 'Europe/Berlin';
// October 2026, Monday start: row 0 is 28.09–04.10, row 1 is 05.10–11.10, row 2 12.10–18.10.
const OCTOBER = schedulingGridDays('2026-10-07', 'month', 1);

test('schedulingGridDays: six Monday-first rows for a month, one row for a week', () => {
  assert.equal(OCTOBER.length, 42);
  assert.equal(OCTOBER[0], '2026-09-28');
  assert.equal(OCTOBER[41], '2026-11-08');
  assert.deepEqual(schedulingGridDays('2026-10-07', 'week', 0), ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']);
  assert.equal(schedulingGridDays('2026-10-04', 'week', 1)[0], '2026-09-28', 'a Sunday belongs to the week that started the Monday before');
});

test('R4 AC3 (Month): a 22:00–00:00 entry in Europe/Berlin covers only its start day', () => {
  // 22:00 CEST = 20:00Z; local midnight = 22:00Z.
  assert.deepEqual(itemDaySpan('2026-10-07T20:00:00Z', '2026-10-07T22:00:00Z', BERLIN), { start: '2026-10-07', end: '2026-10-08' });
});

test('R4 AC3 (Month): a 23:00 → 02:00 entry covers both days', () => {
  assert.deepEqual(itemDaySpan('2026-10-07T21:00:00Z', '2026-10-08T00:00:00Z', BERLIN), { start: '2026-10-07', end: '2026-10-09' });
});

test('R4 AC3 (Month): a window from 10.10 22:00Z to 11.10 22:00Z covers only 11.10 in Europe/Berlin (zoned, not the UTC date)', () => {
  const span = itemDaySpan('2026-10-10T22:00:00Z', '2026-10-11T22:00:00Z', BERLIN);
  assert.deepEqual(span, { start: '2026-10-11', end: '2026-10-12' });
  assert.notEqual(span.start, '2026-10-10T22:00:00Z'.slice(0, 10), 'the UTC slice would say 10.10');
  const { placed } = layoutMonthSpans([{ id: 'w', start: '2026-10-10T22:00:00Z', end: '2026-10-11T22:00:00Z', group: 'window' }], OCTOBER, { timeZone: BERLIN });
  assert.deepEqual(placed.map(({ weekRow, startCol, endCol }) => [weekRow, startCol, endCol]), [[1, 6, 6]], 'Sunday 11.10 only');
});

test('itemDaySpan: zero-length covers its start day; inverted throws (never swaps)', () => {
  assert.deepEqual(itemDaySpan('2026-10-07T10:00:00Z', '2026-10-07T10:00:00Z', 'UTC'), { start: '2026-10-07', end: '2026-10-08' });
  assert.throws(() => itemDaySpan('2026-10-08T10:00:00Z', '2026-10-07T10:00:00Z', 'UTC'), RangeError);
  assert.deepEqual(itemDaySpan('2026-10-07T08:00:00Z', '2026-10-09T08:00:00Z', 'UTC'), zonedDaySpan('2026-10-07T08:00:00Z', '2026-10-09T08:00:00Z', 'UTC'));
});

test('R13 AC1: a Mon–Wed entry is exactly one placement in its week row', () => {
  const { placed, hiddenByRow } = layoutMonthSpans([{ id: 'mw', start: '2026-10-05T08:00:00Z', end: '2026-10-07T16:00:00Z' }], OCTOBER, { timeZone: BERLIN });
  assert.deepEqual(placed, [{ id: 'mw', group: 'item', weekRow: 1, lane: 0, startCol: 0, endCol: 2, continuesBefore: false, continuesAfter: false }]);
  assert.deepEqual(hiddenByRow, {});
});

test('R21 AC5: a span crossing a week boundary is one placement per row, flagged as continuing', () => {
  const { placed } = layoutMonthSpans([{ id: 'f', start: '2026-10-09T06:00:00Z', end: '2026-10-13T20:00:00Z', group: 'window' }], OCTOBER, { timeZone: BERLIN });
  assert.deepEqual(placed.map((p) => [p.weekRow, p.startCol, p.endCol, p.continuesBefore, p.continuesAfter]), [[1, 4, 6, false, true], [2, 0, 1, true, false]]);
});

test('a span that starts before the grid is clipped to it', () => {
  const { placed } = layoutMonthSpans([{ id: 'old', start: '2026-09-20T00:00:00Z', end: '2026-09-30T12:00:00Z' }], OCTOBER, { timeZone: 'UTC' });
  assert.deepEqual(placed.map((p) => [p.weekRow, p.startCol, p.endCol, p.continuesBefore]), [[0, 0, 2, true]]);
  assert.deepEqual(layoutMonthSpans([{ id: 'x', start: '2025-01-01T00:00:00Z', end: '2025-01-03T00:00:00Z' }], OCTOBER, { timeZone: 'UTC' }).placed, []);
});

test('FG-UX-3: three windows over one week row with a lane cap of 2 — the third is hidden and named for its row', () => {
  const windows = [
    { id: 'a', start: '2026-10-05T06:00:00Z', end: '2026-10-09T18:00:00Z', group: 'window' },
    { id: 'b', start: '2026-10-06T06:00:00Z', end: '2026-10-08T18:00:00Z', group: 'window' },
    { id: 'c', start: '2026-10-07T06:00:00Z', end: '2026-10-10T18:00:00Z', group: 'window' },
  ];
  const { placed, hiddenByRow, firstHiddenDayByRow } = layoutMonthSpans(windows, OCTOBER, { timeZone: BERLIN, laneCap: 2 });
  assert.deepEqual(placed.map((p) => [p.id, p.lane]), [['a', 0], ['b', 1]]);
  assert.deepEqual(hiddenByRow, { 1: ['c'] });
  assert.deepEqual(firstHiddenDayByRow, { 1: '2026-10-07' }, 'the first day of that row a hidden span covers');
});

test('FG-PLAT-5: lanes go in input order — a span last in time but first in order gets a lane', () => {
  const spans = [
    { id: 'late-but-first', start: '2026-10-07T06:00:00Z', end: '2026-10-09T18:00:00Z' },
    { id: 'early-1', start: '2026-10-05T06:00:00Z', end: '2026-10-08T18:00:00Z' },
    { id: 'early-2', start: '2026-10-05T07:00:00Z', end: '2026-10-08T18:00:00Z' },
  ];
  const { placed, hiddenByRow } = layoutMonthSpans(spans, OCTOBER, { timeZone: BERLIN, laneCap: 2 });
  assert.deepEqual(placed.map((p) => [p.id, p.lane]), [['late-but-first', 0], ['early-1', 1]]);
  assert.deepEqual(hiddenByRow, { 1: ['early-2'] });
});

test('windows and items pack in separate lane groups: windows never take an item lane', () => {
  const spans = [
    { id: 'w1', start: '2026-10-05T06:00:00Z', end: '2026-10-07T18:00:00Z', group: 'window' },
    { id: 'w2', start: '2026-10-05T06:00:00Z', end: '2026-10-07T18:00:00Z', group: 'window' },
    { id: 'i1', start: '2026-10-05T06:00:00Z', end: '2026-10-07T18:00:00Z' },
    { id: 'i2', start: '2026-10-05T06:00:00Z', end: '2026-10-07T18:00:00Z', group: 'item' },
  ];
  const { placed, hiddenByRow } = layoutMonthSpans(spans, OCTOBER, { timeZone: 'UTC', laneCap: { window: 2, item: 2 } });
  assert.deepEqual(placed.map((p) => [p.id, p.group, p.lane]), [['w1', 'window', 0], ['w2', 'window', 1], ['i1', 'item', 0], ['i2', 'item', 1]]);
  assert.deepEqual(hiddenByRow, {});
});

test('spans that only touch share a lane; a cap of 0 hides every span of that group', () => {
  const touching = [
    { id: 'p', start: '2026-10-05T00:00:00Z', end: '2026-10-07T00:00:00Z' },
    { id: 'q', start: '2026-10-07T00:00:00Z', end: '2026-10-09T00:00:00Z' },
  ];
  assert.deepEqual(layoutMonthSpans(touching, OCTOBER, { timeZone: 'UTC', laneCap: 1 }).placed.map((p) => [p.id, p.lane, p.startCol, p.endCol]), [['p', 0, 0, 1], ['q', 0, 2, 3]]);
  assert.deepEqual(layoutMonthSpans(touching, OCTOBER, { timeZone: 'UTC', laneCap: { item: 0 } }).hiddenByRow, { 1: ['p', 'q'] });
});

test('layoutMonthSpans rejects a grid that is not whole consecutive weeks, a wrong week start, duplicates and bad caps', () => {
  assert.throws(() => layoutMonthSpans([], OCTOBER.slice(0, 10), { timeZone: 'UTC' }), RangeError);
  assert.throws(() => layoutMonthSpans([], [...OCTOBER.slice(0, 6), '2027-01-01'], { timeZone: 'UTC' }), RangeError);
  assert.throws(() => layoutMonthSpans([], OCTOBER, { timeZone: 'UTC', weekStartsOn: 0 }), RangeError);
  const one = { id: 'd', start: '2026-10-05T00:00:00Z', end: '2026-10-07T00:00:00Z' };
  assert.throws(() => layoutMonthSpans([one, one], OCTOBER, { timeZone: 'UTC' }), TypeError);
  assert.throws(() => layoutMonthSpans([one], OCTOBER, { timeZone: 'UTC', laneCap: -1 }), RangeError);
});

test('ids are unique per group: a window and an item may share one', () => {
  const spans = [
    { id: '1', start: '2026-10-05T06:00:00Z', end: '2026-10-07T18:00:00Z', group: 'window' },
    { id: '1', start: '2026-10-06T06:00:00Z', end: '2026-10-08T18:00:00Z', group: 'item' },
  ];
  assert.deepEqual(layoutMonthSpans(spans, OCTOBER, { timeZone: 'UTC' }).placed.map((p) => [p.id, p.group, p.startCol, p.endCol]), [['1', 'window', 0, 2], ['1', 'item', 1, 3]]);
  assert.throws(() => layoutMonthSpans([spans[0], spans[0]], OCTOBER, { timeZone: 'UTC' }), /duplicate window id 1/);
});

test('the layout is a pure function of its input (same input, same output)', () => {
  const spans = [
    { id: 'a', start: '2026-10-05T06:00:00Z', end: '2026-10-09T18:00:00Z', group: 'window' },
    { id: 'b', start: '2026-10-01T06:00:00Z', end: '2026-10-21T18:00:00Z' },
  ];
  assert.deepEqual(layoutMonthSpans(spans, OCTOBER, { timeZone: BERLIN }), layoutMonthSpans(spans, OCTOBER, { timeZone: BERLIN }));
});
