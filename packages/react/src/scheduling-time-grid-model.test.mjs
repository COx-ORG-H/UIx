/* SchedulingCalendar time-grid geometry (HAR-1509, U3): the top-lane rule (operator decision
 * E12), day columns from real instants on 23-, 24- and 25-hour days, midnight segments, lane
 * packing, row spans and move proposals. The numbers must not depend on the process zone:
 * `scheduling-calendar-zones.test.mjs` re-runs this file under TZ=UTC, Europe/Berlin and
 * America/New_York. Reads the BUILT dist — run `npm run build` first; CI does.
 * Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as ui from '../dist/index.js';

test('the zone wrapper really changed the process time zone', () => {
  const expected = process.env.UIX_EXPECT_TZ_OFFSET;
  if (expected === undefined) return;
  assert.equal(String(new Date('2026-01-15T12:00:00Z').getTimezoneOffset()), expected);
});

const BERLIN = 'Europe/Berlin';
// Europe/Berlin is UTC+2 from 29.03.2026 03:00 to 25.10.2026 03:00, else UTC+1.
const summer = (date, time) => new Date(`${date}T${time}:00+02:00`).toISOString();
const winter = (date, time) => new Date(`${date}T${time}:00+01:00`).toISOString();

test('E12: the threshold is one named constant, 360 minutes', () => {
  assert.equal(ui.TOP_LANE_CROSS_MIDNIGHT_MINUTES, 360);
});

test('E12 / AC6: all-day, longer than a day, or more than 360 minutes past midnight go to the top lane', () => {
  const top = (start, end, extra) => ui.placesInTopLane({ start, end, ...extra }, BERLIN);
  assert.equal(top(summer('2026-10-07', '09:00'), summer('2026-10-07', '10:00'), { allDay: true }), true, 'all-day');
  assert.equal(top(summer('2026-10-07', '08:00'), summer('2026-10-08', '14:00')), true, 'a 30-hour entry');
  assert.equal(top(summer('2026-10-07', '23:00'), summer('2026-10-08', '07:00')), true, '7 hours past midnight');
  assert.equal(top(summer('2026-10-07', '23:00'), summer('2026-10-08', '06:01')), true, 'one minute over the threshold');
  assert.equal(top(summer('2026-10-07', '23:00'), summer('2026-10-08', '06:00')), false, 'exactly the threshold stays in the grid');
  assert.equal(top(summer('2026-10-07', '23:00'), summer('2026-10-08', '02:00')), false, '23:00 → 02:00 stays in the grid');
  assert.equal(top(summer('2026-10-07', '22:00'), summer('2026-10-08', '00:00')), false, '22:00 → 00:00 does not cross');
  assert.equal(top(summer('2026-10-07', '09:00'), summer('2026-10-07', '10:00')), false);
  assert.equal(top(summer('2026-10-07', '10:00'), summer('2026-10-07', '09:00')), false, 'an inverted entry is not a top-lane entry');
});

test('E12: the threshold is a parameter, never a second constant', () => {
  const entry = { start: summer('2026-10-07', '23:00'), end: summer('2026-10-08', '00:30') };
  assert.equal(ui.placesInTopLane(entry, BERLIN), false);
  assert.equal(ui.placesInTopLane(entry, BERLIN, { crossMidnightMinutes: 0 }), true);
  assert.equal(ui.placesInTopLane(entry, BERLIN, { crossMidnightMinutes: 30 }), false);
});

test('"longer than a day" is the same wall-clock time on the next day, also on a 25-hour day', () => {
  // 24.10. 12:00 → 25.10. 12:00 local is 25 real hours and exactly one calendar day: not longer.
  assert.equal(ui.placesInTopLane({ start: summer('2026-10-24', '12:00'), end: winter('2026-10-25', '12:00') }, BERLIN, { crossMidnightMinutes: 100000 }), false);
  assert.equal(ui.placesInTopLane({ start: summer('2026-10-24', '12:00'), end: winter('2026-10-25', '12:01') }, BERLIN, { crossMidnightMinutes: 100000 }), true);
});

test('R4 AC1 / R14 AC3: 29.03.2026 has 23 real hours and a 03:00 item sits under "03"', () => {
  const slots = ui.zonedHourSlots('2026-03-29', BERLIN);
  assert.equal(slots.length, 23);
  assert.equal(slots.some((slot) => slot.label === '02'), false, 'there is no 02:00 that day');
  const day = ui.layoutTimeGridDay([{ id: 'a', start: summer('2026-03-29', '03:00'), end: summer('2026-03-29', '04:00') }], '2026-03-29', BERLIN);
  assert.equal(day.dayHours, 23);
  const [segment] = day.segments;
  const three = slots.find((slot) => slot.label === '03');
  assert.equal(segment.offsetHours, (three.instant.getTime() - day.dayStart) / 3_600_000, 'the item starts at the "03" line');
  assert.equal(segment.offsetHours, 2, 'which is the third row: 00, 01, 03');
  assert.equal(segment.lengthHours, 1);
});

test('R4 AC1: 25.10.2026 has 25 real hours, "02" twice with its offset, and 03:00 is the fifth row', () => {
  const slots = ui.zonedHourSlots('2026-10-25', BERLIN);
  assert.equal(slots.length, 25);
  assert.deepEqual(slots.filter((slot) => slot.label === '02').map((slot) => slot.offsetLabel), ['+02:00', '+01:00']);
  const day = ui.layoutTimeGridDay([{ id: 'a', start: winter('2026-10-25', '03:00'), end: winter('2026-10-25', '04:00') }], '2026-10-25', BERLIN);
  assert.equal(day.dayHours, 25);
  assert.equal(day.segments[0].offsetHours, 4, '00, 01, 02, 02, then 03');
});

test('R4 AC3 (E12): 22:00–00:00 is on its start day only; 23:00 → 02:00 is a start part and a continuation', () => {
  const evening = { id: 'eve', start: summer('2026-10-07', '22:00'), end: summer('2026-10-08', '00:00') };
  const night = { id: 'night', start: summer('2026-10-07', '23:00'), end: summer('2026-10-08', '02:00') };
  const first = ui.layoutTimeGridDay([evening, night], '2026-10-07', BERLIN);
  const second = ui.layoutTimeGridDay([evening, night], '2026-10-08', BERLIN);
  assert.deepEqual(first.segments.map((s) => [s.id, s.part, s.offsetHours, s.lengthHours]), [['eve', 'whole', 22, 2], ['night', 'start', 23, 1]]);
  assert.deepEqual(second.segments.map((s) => [s.id, s.part, s.offsetHours, s.lengthHours]), [['night', 'continuation', 0, 2]]);
});

test('top-lane entries take no room in the day columns', () => {
  const long = { id: 'long', start: summer('2026-10-07', '08:00'), end: summer('2026-10-08', '14:00') };
  const allDay = { id: 'all', start: summer('2026-10-07', '00:00'), end: summer('2026-10-07', '01:00'), allDay: true };
  assert.deepEqual(ui.layoutTimeGridDay([long, allDay], '2026-10-07', BERLIN).segments, []);
});

test('R14 AC7: overlapping entries share the column in lanes; past maxLanes they are hidden, not squeezed', () => {
  const at = (id, from, to) => ({ id, start: summer('2026-10-07', from), end: summer('2026-10-07', to) });
  const entries = [at('a', '09:00', '11:00'), at('b', '09:30', '10:30'), at('c', '10:00', '12:00'), at('d', '13:00', '14:00')];
  const open = ui.layoutTimeGridDay(entries, '2026-10-07', BERLIN);
  assert.deepEqual(open.segments.map((s) => [s.id, s.lane, s.laneCount]), [['a', 0, 3], ['b', 1, 3], ['c', 2, 3], ['d', 0, 1]]);
  assert.deepEqual(open.hidden, []);
  const capped = ui.layoutTimeGridDay(entries, '2026-10-07', BERLIN, { maxLanes: 2 });
  assert.deepEqual(capped.segments.map((s) => [s.id, s.lane, s.laneCount]), [['a', 0, 2], ['b', 1, 2], ['d', 0, 1]]);
  assert.deepEqual(capped.hidden, ['c']);
});

test('a zero-length entry is drawn at its instant, on its day only', () => {
  const point = { id: 'p', start: summer('2026-10-07', '10:00'), end: summer('2026-10-07', '10:00') };
  assert.deepEqual(ui.layoutTimeGridDay([point], '2026-10-07', BERLIN).segments.map((s) => [s.offsetHours, s.lengthHours]), [[10, 0]]);
  assert.deepEqual(ui.layoutTimeGridDay([point], '2026-10-08', BERLIN).segments, []);
});

test('layoutDaySpans: a week row and the single day of the Day view, in the order given, capped', () => {
  const week = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
  const spans = [
    { id: 'a', start: summer('2026-10-07', '08:00'), end: summer('2026-10-08', '14:00') },
    { id: 'b', start: summer('2026-10-03', '08:00'), end: summer('2026-10-07', '14:00') },
    { id: 'c', start: summer('2026-10-07', '06:00'), end: summer('2026-10-13', '06:00') },
  ];
  const row = ui.layoutDaySpans(spans, week, { timeZone: BERLIN, laneCap: 2 });
  assert.deepEqual(row.placed, [
    { id: 'a', lane: 0, startCol: 2, endCol: 3, continuesBefore: false, continuesAfter: false },
    { id: 'b', lane: 1, startCol: 0, endCol: 2, continuesBefore: true, continuesAfter: false },
  ]);
  assert.deepEqual(row.hidden, ['c']);
  assert.equal(row.firstHiddenDay, '2026-10-07');
  const day = ui.layoutDaySpans(spans, ['2026-10-08'], { timeZone: BERLIN });
  assert.deepEqual(day.placed.map((p) => [p.id, p.startCol, p.endCol, p.continuesBefore, p.continuesAfter]), [['a', 0, 0, true, false], ['c', 0, 0, true, true]]);
  assert.throws(() => ui.layoutDaySpans(spans, [], { timeZone: BERLIN }), RangeError);
});

test('R4 AC2: 22:00 on 24.10.2026 moved +1 day is 22:00 on 25.10. (21:00Z), not 25 hours later', () => {
  const proposal = ui.proposeMove({ start: summer('2026-10-24', '22:00'), end: summer('2026-10-24', '23:00') }, { days: 1 }, BERLIN);
  assert.deepEqual(proposal, { start: '2026-10-25T21:00:00.000Z', end: '2026-10-25T22:00:00.000Z', adjusted: null });
});

test('R4 AC6: a move into the 29.03. gap hour goes forward to 03:30, once', () => {
  const entry = { start: winter('2026-03-28', '02:30'), end: winter('2026-03-28', '02:45') };
  const one = ui.proposeMove(entry, { days: 1 }, BERLIN);
  assert.equal(one.start, summer('2026-03-29', '03:30'));
  assert.equal(one.adjusted, 'gap_forward');
  // Two days on is computed from the original, so it is 02:30 again and not 03:30.
  const two = ui.proposeMove(entry, { days: 2 }, BERLIN);
  assert.equal(two.start, summer('2026-03-30', '02:30'));
  assert.equal(two.adjusted, null);
});

test('proposeMove: minutes are real time, days keep both wall-clock ends, and the two combine', () => {
  const night = { start: summer('2026-10-07', '23:00'), end: summer('2026-10-08', '02:00') };
  assert.deepEqual(ui.proposeMove(night, { minutes: 60 }, BERLIN), { start: summer('2026-10-08', '00:00'), end: summer('2026-10-08', '03:00'), adjusted: null });
  const long = { start: summer('2026-10-24', '08:00'), end: winter('2026-10-25', '14:00') };
  assert.deepEqual(ui.proposeMove(long, { days: 1 }, BERLIN), { start: winter('2026-10-25', '08:00'), end: winter('2026-10-26', '14:00'), adjusted: null });
  assert.deepEqual(ui.proposeMove(night, { days: -1, minutes: -15 }, BERLIN), { start: summer('2026-10-06', '22:45'), end: summer('2026-10-07', '01:45'), adjusted: null });
  assert.deepEqual(ui.proposeMove(night, {}, BERLIN), { start: night.start, end: night.end, adjusted: null });
});
