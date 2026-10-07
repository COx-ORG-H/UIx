/* Calendar model tests. Zone tests must not depend on the process time zone, so
 * `calendar-model-zones.test.mjs` re-runs this file under TZ=UTC, Europe/Berlin and
 * America/New_York (R4 AC5). Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCalendarMonths, addZonedDays, buildMonthGrid, cachedDateTimeFormat, enumerateDateKeys, enumerateDateSpan,
  isDateInRange, packLanes, rankOverflow, selectRangeDate, zonedDateKey, zonedDateSpan, zonedDayBounds, zonedDaySpan,
  zonedHourSlots,
} from './calendar-model.ts';

const HOUR = 3_600_000;
const iso = (date) => date.toISOString();

test('the zone wrapper really changed the process time zone', () => {
  const expected = process.env.UIX_EXPECT_TZ_OFFSET;
  if (expected === undefined) return;
  // January offset: UTC 0, Europe/Berlin -60, America/New_York 300.
  assert.equal(String(new Date('2026-01-15T12:00:00Z').getTimezoneOffset()), expected);
});

test('month grid is a stable six-week Monday-first grid', () => {
  const days = buildMonthGrid('2026-09-01');
  assert.equal(days.length, 42);
  assert.equal(days[0].date, '2026-08-31');
  assert.equal(days[41].date, '2026-10-11');
});

test('month movement clamps end-of-month dates', () => {
  assert.equal(addCalendarMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addCalendarMonths('2028-01-31', 1), '2028-02-29');
});

test('UTC instants become inclusive date spans in the supplied IANA zone (deprecated zonedDateSpan, unchanged)', () => {
  const span = zonedDateSpan('2026-09-07T22:30:00Z', '2026-09-09T01:00:00Z', 'Europe/Berlin');
  assert.deepEqual(span, { start: '2026-09-08', end: '2026-09-09' });
  assert.deepEqual(enumerateDateSpan(span), ['2026-09-08', '2026-09-09']);
  // Still swaps and still stops at 370 in 2.x (pending E13); pinned so a minor cannot change it.
  assert.deepEqual(zonedDateSpan('2026-09-09T01:00:00Z', '2026-09-07T22:30:00Z', 'Europe/Berlin'), span);
  assert.equal(enumerateDateSpan({ start: '2026-01-01', end: '2027-12-31' }).length, 370);
});

test('range selection normalizes reverse selection', () => {
  const range = selectRangeDate({ start: '2026-09-12' }, '2026-09-08');
  assert.deepEqual(range, { start: '2026-09-08', end: '2026-09-12' });
  assert.equal(isDateInRange('2026-09-10', range), true);
});

// ---------------------------------------------------------------------------------------
// R11 AC1 — end-exclusive day membership
// ---------------------------------------------------------------------------------------

test('R11 AC1: an overlay from 2026-10-10T22:00Z to 2026-10-11T22:00Z in Europe/Berlin occupies only 11.10', () => {
  const span = zonedDaySpan('2026-10-10T22:00:00Z', '2026-10-11T22:00:00Z', 'Europe/Berlin');
  assert.deepEqual(span, { start: '2026-10-11', end: '2026-10-12' });
  assert.deepEqual(enumerateDateKeys(span), { dates: ['2026-10-11'], truncated: false });
});

test('R11 AC1: an entry ending at local 00:00 occupies one day', () => {
  // 10:00–24:00 local on 08.09 (Berlin, +02:00).
  const span = zonedDaySpan('2026-09-08T08:00:00Z', '2026-09-08T22:00:00Z', 'Europe/Berlin');
  assert.deepEqual(enumerateDateKeys(span).dates, ['2026-09-08']);
  // One millisecond later it reaches into 09.09.
  assert.deepEqual(enumerateDateKeys(zonedDaySpan('2026-09-08T08:00:00Z', '2026-09-08T22:00:00.001Z', 'Europe/Berlin')).dates, ['2026-09-08', '2026-09-09']);
  // The deprecated example ends at 03:00 local, so it still covers 08.09 … 09.09.
  assert.deepEqual(enumerateDateKeys(zonedDaySpan('2026-09-07T22:30:00Z', '2026-09-09T01:00:00Z', 'Europe/Berlin')).dates, ['2026-09-08', '2026-09-09']);
  // A day span is half-open [start, end): end is the first day not occupied.
  assert.deepEqual(zonedDaySpan(new Date('2026-09-07T22:30:00Z'), new Date('2026-09-09T01:00:00Z'), 'Europe/Berlin'), { start: '2026-09-08', end: '2026-09-10' });
});

/** Deterministic pseudo-random fixture (mulberry32). */
function fixture(count, seed = 7) {
  let a = seed;
  const rand = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const base = Date.parse('2026-10-12T06:00:00Z');
  return Array.from({ length: count }, (_, i) => {
    const start = base + Math.floor(rand() * 48) * 15 * 60_000;
    const end = start + (1 + Math.floor(rand() * 12)) * 15 * 60_000;
    return { id: `e${String(i).padStart(2, '0')}`, start: new Date(start).toISOString(), end: new Date(end).toISOString() };
  });
}
const overlaps = (a, b) => Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);

test('R11 AC1: packing a 50-event fixture leaves no overlapping pair in one lane, uses at most maxLanes lanes, and reports an overflow count', () => {
  const events = fixture(50);
  const maxLanes = 3;
  const packed = packLanes(events, maxLanes);
  assert.equal(Object.keys(packed.lanes).length, 50);
  const byLane = new Map();
  for (const event of events) {
    const { lane } = packed.lanes[event.id];
    if (lane === null) continue;
    assert.ok(Number.isInteger(lane) && lane >= 0 && lane < maxLanes, `${event.id} lane ${lane}`);
    for (const other of byLane.get(lane) ?? []) assert.ok(!overlaps(event, other), `${event.id} and ${other.id} overlap in lane ${lane}`);
    byLane.set(lane, [...(byLane.get(lane) ?? []), event]);
  }
  const hidden = events.filter((e) => packed.lanes[e.id].lane === null);
  assert.ok(hidden.length > 0, 'the fixture is dense enough to overflow');
  assert.equal(packed.overflow, hidden.length);
  assert.equal(packed.clusters.reduce((sum, c) => sum + c.overflow, 0), hidden.length);
  for (const cluster of packed.clusters) {
    assert.equal(cluster.overflow, cluster.ids.filter((id) => packed.lanes[id].lane === null).length);
    assert.ok(cluster.laneCount <= maxLanes);
    for (const id of cluster.ids) assert.equal(packed.lanes[id].cluster, packed.clusters.indexOf(cluster));
  }
  // Every hidden event really had no free lane: each lane holds an overlapping event.
  for (const event of hidden) {
    for (let lane = 0; lane < maxLanes; lane++) {
      assert.ok((byLane.get(lane) ?? []).some((other) => overlaps(event, other)), `${event.id} would fit in lane ${lane}`);
    }
  }
  // Deterministic: greedy by start, then end, then id, whatever the input order.
  assert.deepEqual(packLanes([...events].reverse(), maxLanes), packed);
});

test('packLanes: abutting intervals share a lane; a non-overlapping item starts a new cluster', () => {
  const packed = packLanes([
    { id: 'b', start: '2026-10-12T10:00:00Z', end: '2026-10-12T11:00:00Z' },
    { id: 'a', start: '2026-10-12T09:00:00Z', end: '2026-10-12T10:00:00Z' },
    { id: 'c', start: '2026-10-12T09:30:00Z', end: '2026-10-12T10:30:00Z' },
  ], 1);
  assert.deepEqual(packed.lanes, { a: { lane: 0, cluster: 0 }, c: { lane: null, cluster: 0 }, b: { lane: 0, cluster: 0 } });
  assert.equal(packed.overflow, 1);
  const separate = packLanes([
    { id: 'a', start: Date.parse('2026-10-12T09:00:00Z'), end: Date.parse('2026-10-12T10:00:00Z') },
    { id: 'b', start: new Date('2026-10-12T10:00:00Z'), end: new Date('2026-10-12T11:00:00Z') },
  ], 2);
  assert.deepEqual(separate.clusters.map((c) => ({ ids: c.ids, laneCount: c.laneCount, overflow: c.overflow })), [
    { ids: ['a'], laneCount: 1, overflow: 0 },
    { ids: ['b'], laneCount: 1, overflow: 0 },
  ]);
  assert.deepEqual(packLanes([], 3), { lanes: {}, clusters: [], overflow: 0 });
  assert.equal(packLanes([{ id: 'a', start: 0, end: 1 }], 0).lanes.a.lane, null);
});

test("packLanes order 'given' assigns lanes in input order (the consumer's ranking)", () => {
  const early = { id: 'early', start: '2026-10-12T08:00:00Z', end: '2026-10-12T12:00:00Z' };
  const middle = { id: 'middle', start: '2026-10-12T09:00:00Z', end: '2026-10-12T12:00:00Z' };
  const late = { id: 'late', start: '2026-10-12T10:00:00Z', end: '2026-10-12T11:00:00Z' };
  const byStart = packLanes([late, early, middle], 2);
  assert.deepEqual([byStart.lanes.early.lane, byStart.lanes.middle.lane, byStart.lanes.late.lane], [0, 1, null]);
  const given = packLanes([late, early, middle], 2, { order: 'given' });
  assert.deepEqual([given.lanes.late.lane, given.lanes.early.lane, given.lanes.middle.lane], [0, 1, null]);
  assert.deepEqual(given.clusters[0].ids, ['early', 'middle', 'late']);
});

test('packLanes rejects inverted intervals, duplicate ids and a bad maxLanes; never swaps', () => {
  assert.throws(() => packLanes([{ id: 'a', start: '2026-10-12T10:00:00Z', end: '2026-10-12T09:00:00Z' }], 2), RangeError);
  assert.throws(() => packLanes([{ id: 'a', start: 0, end: 1 }, { id: 'a', start: 2, end: 3 }], 2), TypeError);
  assert.throws(() => packLanes([], -1), RangeError);
  assert.throws(() => packLanes([], 1.5), RangeError);
  assert.throws(() => packLanes([], 1, { order: 'random' }), TypeError);
});

// ---------------------------------------------------------------------------------------
// R4 AC5 — zone, day and slot functions
// ---------------------------------------------------------------------------------------

test("R4 AC5: zonedHourSlots('2026-03-29','Europe/Berlin') returns 23 slots with no '02'", () => {
  const slots = zonedHourSlots('2026-03-29', 'Europe/Berlin');
  assert.equal(slots.length, 23);
  assert.ok(!slots.some((slot) => slot.label === '02'));
  assert.deepEqual(slots.map((s) => s.label), ['00', '01', ...Array.from({ length: 21 }, (_, i) => String(i + 3).padStart(2, '0'))]);
  assert.ok(slots.every((s) => s.offsetLabel === null));
  assert.equal(iso(slots[0].instant), '2026-03-28T23:00:00.000Z');
  assert.equal(iso(slots[2].instant), '2026-03-29T01:00:00.000Z'); // 03:00 +02:00
});

test("R4 AC5: zonedHourSlots('2026-10-25','Europe/Berlin') returns 25 slots, '02' twice with an offset label on the repeat", () => {
  const slots = zonedHourSlots('2026-10-25', 'Europe/Berlin');
  assert.equal(slots.length, 25);
  const twos = slots.filter((s) => s.label === '02');
  assert.equal(twos.length, 2);
  assert.deepEqual(twos.map((s) => iso(s.instant)), ['2026-10-25T00:00:00.000Z', '2026-10-25T01:00:00.000Z']);
  assert.deepEqual(twos.map((s) => s.offsetLabel), ['+02:00', '+01:00']);
  assert.ok(slots.filter((s) => s.label !== '02').every((s) => s.offsetLabel === null));
  for (let i = 1; i < slots.length; i++) assert.equal(slots[i].instant - slots[i - 1].instant, HOUR);
});

test('zonedHourSlots: ordinary days have 24 slots, half-hour zones start hours at :30 UTC, a day can start at 01:00', () => {
  const plain = zonedHourSlots('2026-10-12', 'Europe/Berlin');
  assert.equal(plain.length, 24);
  assert.ok(plain.every((s, i) => s.label === String(i).padStart(2, '0') && s.offsetLabel === null));
  const kolkata = zonedHourSlots('2026-10-25', 'Asia/Kolkata');
  assert.equal(kolkata.length, 24);
  assert.equal(iso(kolkata[0].instant), '2026-10-24T18:30:00.000Z');
  const santiago = zonedHourSlots('2026-09-06', 'America/Santiago');
  assert.equal(santiago.length, 23);
  assert.equal(santiago[0].label, '01');
  assert.equal(iso(santiago[0].instant), '2026-09-06T04:00:00.000Z');
  const utc = zonedHourSlots('2026-10-25', 'UTC');
  assert.equal(utc.length, 24);
});

test("R4 AC5: zonedDayBounds('2026-10-25') spans exactly 25 h and ('2026-03-29') exactly 23 h in Europe/Berlin", () => {
  const long = zonedDayBounds('2026-10-25', 'Europe/Berlin');
  assert.equal(long.end - long.start, 25 * HOUR);
  assert.equal(iso(long.start), '2026-10-24T22:00:00.000Z');
  assert.equal(iso(long.end), '2026-10-25T23:00:00.000Z');
  const short = zonedDayBounds('2026-03-29', 'Europe/Berlin');
  assert.equal(short.end - short.start, 23 * HOUR);
  const plain = zonedDayBounds('2026-10-12', 'Europe/Berlin');
  assert.equal(plain.end - plain.start, 24 * HOUR);
  // end(D) === start(D+1), by construction.
  assert.equal(iso(zonedDayBounds('2026-10-24', 'Europe/Berlin').end), iso(long.start));
  assert.equal(iso(zonedDayBounds('2026-10-26', 'Europe/Berlin').start), iso(long.end));
  // A day that starts at 01:00 starts at its first existing instant.
  const santiago = zonedDayBounds('2026-09-06', 'America/Santiago');
  assert.equal(iso(santiago.start), '2026-09-06T04:00:00.000Z');
  assert.equal(santiago.end - santiago.start, 23 * HOUR);
  const kolkata = zonedDayBounds('2026-10-25', 'Asia/Kolkata');
  assert.equal(iso(kolkata.start), '2026-10-24T18:30:00.000Z');
  assert.equal(kolkata.end - kolkata.start, 24 * HOUR);
  assert.throws(() => zonedDayBounds('2026-13-01', 'Europe/Berlin'), TypeError);
  assert.throws(() => zonedDayBounds('2026-10-25', 'Not/AZone'), RangeError);
});

test('R4 AC5: addZonedDays(2026-10-24T20:00Z, 1, Europe/Berlin) returns 2026-10-25T21:00Z', () => {
  const result = addZonedDays('2026-10-24T20:00:00Z', 1, 'Europe/Berlin');
  assert.equal(iso(result.instant), '2026-10-25T21:00:00.000Z');
  assert.equal(result.adjusted, null);
  assert.equal(iso(addZonedDays(new Date('2026-10-25T21:00:00Z'), -1, 'Europe/Berlin').instant), '2026-10-24T20:00:00.000Z');
  assert.equal(iso(addZonedDays('2026-10-24T20:00:00Z', 0, 'Europe/Berlin').instant), '2026-10-24T20:00:00.000Z');
  assert.equal(iso(addZonedDays('2026-03-28T09:15:30.250Z', 1, 'Europe/Berlin').instant), '2026-03-29T08:15:30.250Z');
  assert.equal(iso(addZonedDays('2026-10-24T20:00:00Z', 7, 'Asia/Kolkata').instant), '2026-10-31T20:00:00.000Z');
});

test("R4 AC5: addZonedDays into 02:30 on 29.03 Berlin resolves forward to 03:30 local, adjusted 'gap_forward', never twice", () => {
  // 2026-03-28 02:30 local (+01:00) = 01:30Z.
  const result = addZonedDays('2026-03-28T01:30:00Z', 1, 'Europe/Berlin');
  assert.equal(result.adjusted, 'gap_forward');
  assert.equal(iso(result.instant), '2026-03-29T01:30:00.000Z'); // 03:30 +02:00
  const local = zonedHourSlots('2026-03-29', 'Europe/Berlin').filter((s) => s.instant <= result.instant).at(-1);
  assert.equal(local.label, '03');
  assert.equal(result.instant - local.instant, 30 * 60_000);
  // From the far side too: 30.03 02:30 (+02:00) − 1 day.
  const back = addZonedDays('2026-03-30T00:30:00Z', -1, 'Europe/Berlin');
  assert.deepEqual([iso(back.instant), back.adjusted], ['2026-03-29T01:30:00.000Z', 'gap_forward']);
});

test('addZonedDays: an ambiguous wall time keeps the source offset; non-integer days throw', () => {
  // 24.10 02:30 (+02:00) + 1 day = 25.10 02:30, the first (+02:00) occurrence.
  assert.deepEqual(Object.values(addZonedDays('2026-10-24T00:30:00Z', 1, 'Europe/Berlin')).map((v) => (v instanceof Date ? iso(v) : v)), ['2026-10-25T00:30:00.000Z', null]);
  // 26.10 02:30 (+01:00) − 1 day = 25.10 02:30, the second (+01:00) occurrence.
  assert.equal(iso(addZonedDays('2026-10-26T01:30:00Z', -1, 'Europe/Berlin').instant), '2026-10-25T01:30:00.000Z');
  assert.throws(() => addZonedDays('2026-10-24T20:00:00Z', 0.5, 'Europe/Berlin'), RangeError);
  assert.throws(() => addZonedDays('not a date', 1, 'Europe/Berlin'), TypeError);
});

test('zonedDateKey keeps its signature and reads the zone, not the process', () => {
  assert.equal(zonedDateKey('2026-10-10T22:00:00Z', 'Europe/Berlin'), '2026-10-11');
  assert.equal(zonedDateKey(new Date('2026-10-10T22:00:00Z'), 'America/New_York'), '2026-10-10');
  assert.equal(zonedDateKey('2026-10-10T18:30:00Z', 'Asia/Kolkata'), '2026-10-11');
  assert.throws(() => zonedDateKey('nope', 'UTC'), TypeError);
});

test('cachedDateTimeFormat returns one formatter per locale and options shape', () => {
  const a = cachedDateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
  const b = cachedDateTimeFormat('en-GB', { minute: '2-digit', hour: '2-digit', timeZone: 'Europe/Berlin' });
  assert.equal(a, b);
  assert.notEqual(a, cachedDateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }));
  assert.notEqual(a, cachedDateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }));
  assert.equal(a.format(new Date('2026-10-25T01:00:00Z')), '02:00');
});

// ---------------------------------------------------------------------------------------
// R11 AC7 — never swap, never stop silently. In this minor it runs against the new names;
// the same text runs against zonedDateSpan / enumerateDateSpan in the release E13 allows.
// ---------------------------------------------------------------------------------------

const r11ac7 = (span, enumerate) => () => {
  assert.throws(() => span('2026-10-12T10:00:00Z', '2026-10-12T09:00:00Z', 'Europe/Berlin'), (error) => error instanceof RangeError && /before|after|inverted/i.test(error.message));
  assert.throws(() => span('2026-10-12T10:00:00Z', '2026-10-12T10:00:00Z', 'Europe/Berlin'), RangeError);
  const long = span('2026-01-01T12:00:00Z', '2027-03-01T12:00:00Z', 'Europe/Berlin');
  const result = enumerate(long);
  const dates = Array.isArray(result) ? result : result.dates;
  const truncated = Array.isArray(result) ? false : result.truncated;
  assert.ok(dates.length === 425 || truncated === true, 'a span longer than 370 days is not silently truncated');
};

test('R11 AC7 (new names): an inverted interval throws and never swaps; a span over 370 days is not silently truncated', r11ac7(zonedDaySpan, (span) => enumerateDateKeys(span)));

test('R11 AC7 (deprecated names) — pending E13', { todo: 'zonedDateSpan / enumerateDateSpan take these semantics only in the release E13 allows' }, r11ac7(zonedDateSpan, enumerateDateSpan));

test('enumerateDateKeys reports truncation, honours a limit and rejects inverted spans', () => {
  const long = zonedDaySpan('2026-01-01T12:00:00Z', '2027-03-01T12:00:00Z', 'Europe/Berlin');
  assert.deepEqual(long, { start: '2026-01-01', end: '2027-03-02' });
  const capped = enumerateDateKeys(long);
  assert.equal(capped.dates.length, 370);
  assert.equal(capped.truncated, true);
  const all = enumerateDateKeys(long, { limit: Infinity });
  assert.equal(all.dates.length, 425);
  assert.equal(all.truncated, false);
  assert.equal(all.dates.at(-1), '2027-03-01');
  assert.deepEqual(enumerateDateKeys({ start: '2026-10-01', end: '2026-10-04' }, { limit: 3 }), { dates: ['2026-10-01', '2026-10-02', '2026-10-03'], truncated: false });
  assert.deepEqual(enumerateDateKeys({ start: '2026-10-01', end: '2026-10-01' }), { dates: [], truncated: false });
  assert.throws(() => enumerateDateKeys({ start: '2026-10-04', end: '2026-10-01' }), RangeError);
  assert.throws(() => enumerateDateKeys({ start: '2026-10-01', end: '2026-10-04' }, { limit: -1 }), RangeError);
});

// ---------------------------------------------------------------------------------------
// rankOverflow — generic stable top-N cut
// ---------------------------------------------------------------------------------------

test('rankOverflow: stable sort with the comparator, first n visible, hidden counts the rest', () => {
  const items = [{ id: 'a', p: 2 }, { id: 'b', p: 1 }, { id: 'c', p: 2 }, { id: 'd', p: 1 }, { id: 'e', p: 3 }];
  const result = rankOverflow(items, (x, y) => x.p - y.p, 3);
  assert.deepEqual(result.visible.map((i) => i.id), ['b', 'd', 'a']);
  assert.equal(result.hidden, 2);
  assert.deepEqual(items.map((i) => i.id), ['a', 'b', 'c', 'd', 'e'], 'input is not mutated');
  assert.deepEqual(rankOverflow(items, () => 0, 10), { visible: items, hidden: 0 });
  assert.deepEqual(rankOverflow(items, () => 0, 0), { visible: [], hidden: 5 });
  assert.throws(() => rankOverflow(items, () => 0, -1), RangeError);
});
