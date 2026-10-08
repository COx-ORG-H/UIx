/* HAR-1521 (U5) — the pure model of the service-lane SchedulingTimeline. AC numbers are those
 * of the slice. The packing tests of HAR-1364 stay in scheduling-timeline-model.test.mjs, unchanged.
 * The suite re-runs under three TZ values (scheduling-timeline-zones.test.mjs).
 * Reads the BUILT dist (the model imports calendar-model) — run `npm run build` first; CI does.
 * Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../dist/index.js';
import * as rows from './scheduling-timeline-rows.ts';

const iso = (ms) => new Date(ms).toISOString();
const HOUR = 3_600_000;
const T0 = Date.parse('2026-10-05T00:00:00Z');
const range = { start: '2026-10-05T00:00:00Z', end: '2026-10-12T00:00:00Z' };
const span = (id, fromHour, toHour) => ({ id, start: iso(T0 + fromHour * HOUR), end: iso(T0 + toHour * HOUR) });

/** The most spans that are open at one instant (half-open intervals), by a sweep. */
function maxConcurrency(spans) {
  const events = spans.flatMap((s) => [[Date.parse(s.start), 1], [Date.parse(s.end), -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let open = 0;
  let most = 0;
  for (const [, change] of events) { open += change; most = Math.max(most, open); }
  return most;
}
const rowsUsed = (placed) => placed.reduce((max, p) => Math.max(max, p.row + 1), 0);
/** A small deterministic generator, so the fixture is the same on every run. */
function seeded(seed) {
  let state = seed;
  return () => { state = (state * 1103515245 + 12345) % 2147483648; return state / 2147483648; };
}

test('the zone wrapper really changed the process time zone', () => {
  const expected = process.env.UIX_EXPECT_TZ_OFFSET;
  if (expected === undefined) return;
  assert.equal(String(new Date('2026-01-15T12:00:00Z').getTimezoneOffset()), expected);
});

test('AC2 (R15 AC2): fixtures with a known optimal lane count use no more rows than their maximum concurrency', () => {
  const fixtures = {
    'three in a staircase, two at a time': [[span('a', 0, 4), span('b', 2, 6), span('c', 4, 8)], 2],
    'four nested': [[span('a', 0, 10), span('b', 1, 9), span('c', 2, 8), span('d', 3, 7)], 4],
    'five that only touch': [[span('a', 0, 2), span('b', 2, 4), span('c', 4, 6), span('d', 6, 8), span('e', 8, 10)], 1],
    'a long one over six short ones': [[span('long', 0, 12), ...[0, 2, 4, 6, 8, 10].map((h) => span(`s${h}`, h, h + 2))], 2],
    'two bursts of three': [[span('a', 0, 3), span('b', 1, 4), span('c', 2, 5), span('d', 20, 23), span('e', 21, 24), span('f', 22, 25)], 3],
  };
  for (const [name, [spans, optimal]] of Object.entries(fixtures)) {
    assert.equal(maxConcurrency(spans), optimal, `${name}: the fixture is what it says`);
    const placed = model.layoutLane(spans, range);
    assert.equal(placed.length, spans.length, name);
    assert.equal(rowsUsed(placed), optimal, name);
    // No two spans in one row overlap.
    for (const a of placed) for (const b of placed) {
      if (a === b || a.row !== b.row) continue;
      assert.ok(Date.parse(a.item.end) <= Date.parse(b.item.start) || Date.parse(b.item.end) <= Date.parse(a.item.start), `${name}: ${a.item.id} and ${b.item.id} share row ${a.row}`);
    }
  }
});

test('AC2: 200 generated spans never take more rows than their maximum concurrency, in any input order', () => {
  const random = seeded(1521);
  const spans = Array.from({ length: 200 }, (_, index) => {
    const from = Math.floor(random() * 150);
    return span(`g${index}`, from, from + 1 + Math.floor(random() * 12));
  });
  const optimal = maxConcurrency(spans);
  assert.ok(optimal > 5, 'the fixture is dense enough to matter');
  assert.equal(rowsUsed(model.layoutLane(spans, range)), optimal);
  assert.equal(rowsUsed(model.layoutLane([...spans].reverse(), range)), optimal);
});

test('AC7 (V13): flagOverlaps: false keeps the stacking and flags nothing; the default still flags', () => {
  const spans = [span('a', 8, 12), span('b', 10, 14), span('c', 14, 15)];
  assert.deepEqual(model.layoutLane(spans, range).map((p) => [p.item.id, p.row, p.conflict]), [['a', 0, true], ['b', 1, true], ['c', 0, false]]);
  assert.deepEqual(model.layoutLane(spans, range, { flagOverlaps: true }).map((p) => p.conflict), [true, true, false]);
  assert.deepEqual(model.layoutLane(spans, range, { flagOverlaps: false }).map((p) => [p.item.id, p.row, p.conflict]), [['a', 0, false], ['b', 1, false], ['c', 0, false]]);
});

test('what a 2.34 consumer passes still lays out: repeated ids, an end before its start, spans equal in time', () => {
  const twice = [span('same', 8, 12), span('same', 10, 14)];
  assert.deepEqual(model.layoutLane(twice, range).map((p) => [p.item.id, p.row]), [['same', 0], ['same', 1]], 'a repeated id is placed twice, as before');
  const inverted = [{ id: 'inv', start: iso(T0 + 10 * HOUR), end: iso(T0 + 8 * HOUR) }, span('a', 12, 14)];
  const placed = model.layoutLane(inverted, range);
  assert.deepEqual(placed.map((p) => [p.item.id, p.row, p.width]), [['inv', 0, 0], ['a', 0, placed[1].width]], 'an inverted span is a point at its start');
  // Equal spans keep the order they were given in (2.34 sorted by start and end only).
  assert.deepEqual(model.layoutLane([span('z', 8, 12), span('a', 8, 12)], range).map((p) => [p.item.id, p.row]), [['z', 0], ['a', 1]]);
  assert.deepEqual(model.layoutLane([], range), []);
});

test('AC15 (FG-REC-14): sub-ticks fall at local 06:00, 12:00 and 18:00, on the clock-change days too', () => {
  // 24.10. (UTC+2) and 25.10.2026 (clocks go back at 03:00, UTC+1 after) in Europe/Berlin.
  const autumn = { start: '2026-10-23T22:00:00Z', end: '2026-10-25T23:00:00Z' };
  const ticks = model.timelineSubTicks(autumn, [6, 12, 18], 'Europe/Berlin');
  assert.deepEqual(ticks.map((t) => iso(t.at)), [
    '2026-10-24T04:00:00.000Z', '2026-10-24T10:00:00.000Z', '2026-10-24T16:00:00.000Z',
    '2026-10-25T05:00:00.000Z', '2026-10-25T11:00:00.000Z', '2026-10-25T17:00:00.000Z',
  ]);
  assert.deepEqual(ticks.map((t) => t.label), ['06', '12', '18', '06', '12', '18']);
  assert.deepEqual(ticks.map((t) => t.hour), [6, 12, 18, 6, 12, 18]);
  const total = Date.parse(autumn.end) - Date.parse(autumn.start);
  for (const tick of ticks) assert.ok(Math.abs(tick.offset - ((tick.at - Date.parse(autumn.start)) / total) * 100) < 1e-9);
  // 29.03.2026: the clocks go forward at 02:00, so local 06:00 is 04:00 UTC.
  const spring = model.timelineSubTicks({ start: '2026-03-28T23:00:00Z', end: '2026-03-29T22:00:00Z' }, [6, 12, 18], 'Europe/Berlin');
  assert.deepEqual(spring.map((t) => iso(t.at)), ['2026-03-29T04:00:00.000Z', '2026-03-29T10:00:00.000Z', '2026-03-29T16:00:00.000Z']);
  // An hour that does not exist that day has no tick; nothing is drawn outside the range.
  assert.deepEqual(model.timelineSubTicks({ start: '2026-03-28T23:00:00Z', end: '2026-03-29T22:00:00Z' }, [2], 'Europe/Berlin'), []);
  assert.deepEqual(model.timelineSubTicks({ start: '2026-10-05T07:00:00Z', end: '2026-10-05T11:00:00Z' }, [6, 12, 18], 'UTC'), []);
  assert.deepEqual(model.timelineSubTicks(range, [], 'UTC'), []);
  assert.deepEqual(model.timelineSubTicks({ start: range.end, end: range.start }, [6], 'UTC'), [], 'an inverted range has no ticks');
});

test('AC16 (FG-REC-14): on an hour axis the repeated hour of 25.10.2026 carries its UTC offset; 29.03. has no 02', () => {
  const hourOf = (tick) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' }).format(new Date(tick.at));
  const autumn = model.timelineTicks({ start: '2026-10-24T22:00:00Z', end: '2026-10-25T23:00:00Z' }, 'hour', 'Europe/Berlin');
  assert.equal(autumn.length, 26, '25 hours and the closing midnight');
  const twos = autumn.filter((tick) => hourOf(tick) === '02');
  assert.deepEqual(twos.map((tick) => [iso(tick.at), tick.offsetLabel]), [['2026-10-25T00:00:00.000Z', '+02:00'], ['2026-10-25T01:00:00.000Z', '+01:00']]);
  assert.deepEqual(autumn.filter((tick) => tick.offsetLabel).length, 2, 'no other hour carries an offset');
  const spring = model.timelineTicks({ start: '2026-03-28T23:00:00Z', end: '2026-03-29T22:00:00Z' }, 'hour', 'Europe/Berlin');
  assert.equal(spring.some((tick) => hourOf(tick) === '02'), false);
  assert.equal(spring.some((tick) => tick.offsetLabel), false);
  // The day axis is as it was: no offsets there.
  assert.equal(model.timelineTicks({ start: '2026-10-23T22:00:00Z', end: '2026-10-26T23:00:00Z' }, 'day', 'Europe/Berlin').some((tick) => tick.offsetLabel), false);
});

test('a step is a number of calendar days or of minutes', () => {
  assert.deepEqual(model.timelineStepDelta(model.defaultTimelineStep('hour')), { days: 0, minutes: 15 });
  assert.deepEqual(model.timelineStepDelta(model.defaultTimelineStep('day')), { days: 0, minutes: 60 });
  assert.deepEqual(model.timelineStepDelta(model.defaultTimelineStep('week')), { days: 1, minutes: 0 });
  assert.deepEqual(model.timelineStepDelta(2 * model.DAY), { days: 2, minutes: 0 });
  assert.deepEqual(model.timelineStepDelta(-model.DAY), { days: -1, minutes: 0 });
  assert.deepEqual(model.timelineStepDelta(90 * 60_000), { days: 0, minutes: 90 });
  assert.deepEqual(model.timelineStepDelta(0), { days: 0, minutes: 0 });
});

test('row geometry: where each row starts, as counts of the three row units', () => {
  const list = [{ kind: 'head' }, { kind: 'lane', subRows: 1 }, { kind: 'lane', subRows: 3 }, { kind: 'head' }, { kind: 'lane', subRows: 2 }];
  assert.deepEqual(rows.timelineRowExtents(list), [
    { subRows: 0, lanes: 0, heads: 0 },
    { subRows: 0, lanes: 0, heads: 1 },
    { subRows: 1, lanes: 1, heads: 1 },
    { subRows: 4, lanes: 2, heads: 1 },
    { subRows: 4, lanes: 2, heads: 2 },
    { subRows: 6, lanes: 3, heads: 2 },
  ], 'one more entry than rows: the last is the whole height');
  assert.deepEqual(rows.timelineRowExtents([]), [{ subRows: 0, lanes: 0, heads: 0 }]);
});

test('AC3: the rows an overlay covers are joined into contiguous runs', () => {
  assert.deepEqual(rows.timelineRuns([false, true, true, false, true]), [{ from: 1, to: 3 }, { from: 4, to: 5 }]);
  assert.deepEqual(rows.timelineRuns([true, true, true]), [{ from: 0, to: 3 }]);
  assert.deepEqual(rows.timelineRuns([false, false]), []);
  assert.deepEqual(rows.timelineRuns([]), []);
});

test('AC4: the row window is what the viewport shows plus overscan, never more than the cap, and never empty', () => {
  // 500 rows of 50 px: offsets 0, 50, … 25000.
  const offsets = Array.from({ length: 501 }, (_, index) => index * 50);
  assert.deepEqual(rows.timelineWindow(offsets, 0, 600, { overscan: 100, cap: 150 }), { start: 0, end: 14 });
  assert.deepEqual(rows.timelineWindow(offsets, 10_000, 10_600, { overscan: 100, cap: 150 }), { start: 198, end: 214 });
  assert.deepEqual(rows.timelineWindow(offsets, 24_900, 25_500, { overscan: 100, cap: 150 }), { start: 496, end: 500 });
  const capped = rows.timelineWindow(offsets, 0, 25_000, { overscan: 100, cap: 150 });
  assert.equal(capped.end - capped.start, 150, 'a viewport taller than the cap still mounts no more than the cap');
  assert.equal(capped.start, 0);
  // Scrolled past the end (the list got shorter): the last rows, not nothing.
  const past = rows.timelineWindow(offsets, 90_000, 90_600, { overscan: 100, cap: 150 });
  assert.ok(past.end === 500 && past.start < 500);
  assert.deepEqual(rows.timelineWindow([0], 0, 600, { overscan: 100, cap: 150 }), { start: 0, end: 0 });
});

/* ── Review of PR 111 (HAR-1521) ─────────────────────────────────────────────────────────── */

test('AC6: minSpan packs each bar as at least as long as it is drawn, and flags only bars that share time', () => {
  const short = [span('s1', 9, 10), span('s2', 11, 12), span('s3', 13, 13.5), span('s4', 14, 15), span('s5', 33, 34)];
  assert.deepEqual(model.layoutLane(short, range).map((p) => p.row), [0, 0, 0, 0, 0], 'by time alone they share a row');
  const placed = model.layoutLane(short, range, { minSpan: 5.76 * HOUR });
  assert.deepEqual(placed.map((p) => [p.item.id, p.row]), [['s1', 0], ['s2', 1], ['s3', 2], ['s4', 3], ['s5', 0]]);
  assert.deepEqual(placed.map((p) => p.conflict), [false, false, false, false, false], 'drawn side by side is not a clash in time');
  // Bars that do share time are still flagged, whatever the minimum.
  assert.deepEqual(model.layoutLane([span('a', 8, 12), span('b', 10, 14), span('c', 14, 15)], range, { minSpan: 5.76 * HOUR }).map((p) => [p.item.id, p.row, p.conflict]), [['a', 0, true], ['b', 1, true], ['c', 0, false]]);
  // A bar cut off at the start of the range is drawn from the start of the range.
  const cut = [{ id: 'cut', start: iso(T0 - 10 * HOUR), end: iso(T0 + 1 * HOUR) }, span('next', 3, 4)];
  assert.deepEqual(model.layoutLane(cut, range, { minSpan: 5.76 * HOUR }).map((p) => p.row), [0, 1]);
  assert.deepEqual(model.layoutLane(cut, range, { minSpan: 0 }).map((p) => p.row), [0, 0]);
});

test('the flag is the 2.34 one: bars that share time, a point inside a bar, and nothing else', () => {
  const flags = (spans) => model.layoutLane(spans, range).map((p) => [p.item.id, p.conflict]);
  assert.deepEqual(flags([span('point', 8, 8), span('bar', 8, 12)]), [['point', false], ['bar', false]], 'a point at the instant a bar starts');
  assert.deepEqual(flags([span('bar', 8, 12), span('point', 10, 10)]), [['bar', true], ['point', true]], 'a point inside a bar');
  assert.deepEqual(flags([span('p1', 8, 8), span('p2', 8, 8)]), [['p1', false], ['p2', false]]);
  assert.deepEqual(flags([span('a', 8, 12), span('b', 12, 14)]), [['a', false], ['b', false]], 'touching is not sharing');
  assert.deepEqual(flags([span('long', 0, 20), span('x', 2, 3), span('y', 5, 6)]), [['long', true], ['x', true], ['y', true]]);
  assert.deepEqual(flags([span('x', 2, 3), span('y', 5, 6), span('z', 5.5, 7)]), [['x', false], ['y', true], ['z', true]]);
});

test('timelineRepeatedHourOffset: the UTC offset of an instant in an hour that occurs twice, else null', () => {
  assert.equal(model.timelineRepeatedHourOffset('2026-10-25T00:00:00Z', 'Europe/Berlin'), '+02:00');
  assert.equal(model.timelineRepeatedHourOffset('2026-10-25T00:59:00Z', 'Europe/Berlin'), '+02:00');
  assert.equal(model.timelineRepeatedHourOffset('2026-10-25T01:30:00Z', 'Europe/Berlin'), '+01:00');
  assert.equal(model.timelineRepeatedHourOffset('2026-10-25T02:00:00Z', 'Europe/Berlin'), null);
  assert.equal(model.timelineRepeatedHourOffset('2026-10-24T23:30:00Z', 'Europe/Berlin'), null);
  assert.equal(model.timelineRepeatedHourOffset('2026-10-25T00:30:00Z', 'UTC'), null);
  assert.equal(model.timelineRepeatedHourOffset('2026-03-29T01:30:00Z', 'Europe/Berlin'), null);
});
