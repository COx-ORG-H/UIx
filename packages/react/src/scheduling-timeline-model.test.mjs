import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, HOUR, defaultTimelineStep, layoutLane, pixelsToMs, placeSpan, shiftSpan, snapToStep, timelineTicks } from './scheduling-timeline-model.ts';

const range = { start: '2026-10-05T00:00:00Z', end: '2026-10-12T00:00:00Z' }; // Mon–Mon, 7 days

test('day ticks fall on local midnights in the zone, and the week start is major', () => {
  const ticks = timelineTicks(range, 'day', 'UTC');
  assert.equal(ticks.length, 8);
  assert.equal(ticks[0].offset, 0);
  assert.equal(ticks[7].offset, 100);
  assert.deepEqual(ticks.map((t) => t.major), [true, false, false, false, false, false, false, true]);
  const berlin = timelineTicks(range, 'day', 'Europe/Berlin');
  assert.equal(new Date(berlin[0].at).toISOString(), '2026-10-05T22:00:00.000Z', 'Berlin midnight is 22:00 UTC in CEST');
});

test('hour ticks align to the zone, including half-hour offsets', () => {
  const day = { start: '2026-10-05T00:00:00Z', end: '2026-10-05T06:00:00Z' };
  assert.equal(timelineTicks(day, 'hour', 'UTC').length, 7);
  const kolkata = timelineTicks(day, 'hour', 'Asia/Kolkata');
  assert.equal(new Date(kolkata[0].at).toISOString(), '2026-10-05T00:30:00.000Z', 'IST hours start at :30 UTC');
});

test('a DST day has 23 hour ticks', () => {
  const dst = { start: '2026-03-28T23:00:00Z', end: '2026-03-29T22:00:00Z' }; // Berlin, spring forward on the 29th
  const ticks = timelineTicks(dst, 'hour', 'Europe/Berlin');
  assert.equal(ticks.length, 24, '23 hours plus the closing midnight');
});

test('week and month ticks', () => {
  const quarter = { start: '2026-10-01T00:00:00Z', end: '2026-12-31T00:00:00Z' };
  assert.equal(timelineTicks(quarter, 'month', 'UTC').length, 3, 'Oct 1, Nov 1, Dec 1');
  assert.equal(timelineTicks(quarter, 'week', 'UTC', 1).length, 13, 'Mondays in Oct–Dec 2026');
});

test('placeSpan clamps to the range and reports cut edges; outside spans are null', () => {
  const p = placeSpan({ start: '2026-10-04T00:00:00Z', end: '2026-10-06T12:00:00Z' }, range);
  assert.equal(p.left, 0);
  assert.ok(Math.abs(p.width - (1.5 / 7) * 100) < 1e-9);
  assert.equal(p.clippedStart, true);
  assert.equal(p.clippedEnd, false);
  assert.equal(placeSpan({ start: '2026-10-20T00:00:00Z', end: '2026-10-21T00:00:00Z' }, range), null);
});

test('layoutLane stacks overlapping bars into rows and flags every overlap', () => {
  const items = [
    { id: 'a', start: '2026-10-05T08:00:00Z', end: '2026-10-05T12:00:00Z' },
    { id: 'b', start: '2026-10-05T10:00:00Z', end: '2026-10-05T14:00:00Z' },
    { id: 'c', start: '2026-10-05T14:00:00Z', end: '2026-10-05T15:00:00Z' },
    { id: 'z', start: '2026-11-01T00:00:00Z', end: '2026-11-02T00:00:00Z' },
  ];
  const placed = layoutLane(items, range);
  assert.deepEqual(placed.map((p) => [p.item.id, p.row, p.conflict]), [['a', 0, true], ['b', 1, true], ['c', 0, false]], 'c starts as b ends: adjacent, not overlapping; z is off the axis');
});

test('steps, snapping, moves and pointer distance', () => {
  assert.equal(defaultTimelineStep('hour'), 15 * 60_000);
  assert.equal(defaultTimelineStep('day'), HOUR);
  assert.equal(defaultTimelineStep('week'), DAY);
  assert.equal(snapToStep(50 * 60_000, HOUR), HOUR);
  const span = { start: '2026-10-05T08:00:00Z', end: '2026-10-05T10:00:00Z' };
  assert.deepEqual(shiftSpan(span, HOUR, 'move', HOUR), { start: '2026-10-05T09:00:00.000Z', end: '2026-10-05T11:00:00.000Z' });
  assert.deepEqual(shiftSpan(span, -3 * HOUR, 'resize', HOUR), { start: '2026-10-05T08:00:00.000Z', end: '2026-10-05T09:00:00.000Z' }, 'never shorter than one step');
  assert.equal(pixelsToMs(100, 700, range, HOUR), DAY, '100 of 700 px over 7 days is one day');
});
