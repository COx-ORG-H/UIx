/* The resource day's model (HAR-983): the slot axis in the display zone, where each span goes,
 * and the gaps that are "no schedule". Truthful by construction: nothing is free unless a free
 * span says so. Reads the BUILT dist (the model imports calendar-model); run `npm run build` first. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutResourceColumn, resourceDayGaps, resourceDaySlots } from '../dist/scheduling-resource-model.js';

const ZONE = 'Europe/Sarajevo';
const span = (id, start, end, kind, extra = {}) => ({ id, resourceId: 'r1', start, end, kind, ...extra });

test('the axis: real instants from dayStart to dayEnd in the zone, one per slot', () => {
  const slots = resourceDaySlots('2026-10-22', ZONE, { dayStart: '08:00', dayEnd: '12:00', slotMinutes: 15 });
  assert.equal(slots.length, 16);
  assert.equal(slots[0].label, '08:00');
  assert.equal(new Date(slots[0].start).toISOString(), '2026-10-22T06:00:00.000Z', '08:00 in Sarajevo (UTC+2 in October)');
  assert.equal(slots.at(-1).label, '11:45');
  assert.equal(slots.at(-1).end - slots[0].start, 4 * 3_600_000);
  // defaults: 07:00 to 19:00 in 15 minutes; bad input falls back
  assert.equal(resourceDaySlots('2026-10-22', ZONE).length, 48);
  assert.equal(resourceDaySlots('2026-10-22', ZONE, { dayStart: '7', slotMinutes: 0 }).length, 48);
  assert.equal(resourceDaySlots('2026-10-22', ZONE, { slotMinutes: 30 }).length, 24);
});

test('a clock-change day is as long as it really is', () => {
  // Sarajevo leaves summer time on 2026-10-25 at 03:00 (back to 02:00): 01:00–05:00 holds five real hours.
  const back = resourceDaySlots('2026-10-25', ZONE, { dayStart: '01:00', dayEnd: '05:00', slotMinutes: 60 });
  assert.deepEqual(back.map((slot) => slot.label), ['01:00', '02:00', '02:00', '03:00', '04:00']);
  // and enters it on 2026-03-29 at 02:00 (to 03:00): 01:00–05:00 holds three.
  const forward = resourceDaySlots('2026-03-29', ZONE, { dayStart: '01:00', dayEnd: '05:00', slotMinutes: 60 });
  assert.deepEqual(forward.map((slot) => slot.label), ['01:00', '03:00', '04:00']);
});

test('free spans are cut into bookable slots; bookings and time off stay whole', () => {
  const slots = resourceDaySlots('2026-10-22', ZONE, { dayStart: '08:00', dayEnd: '12:00' });
  const items = layoutResourceColumn([
    span('f1', '2026-10-22T06:00:00Z', '2026-10-22T07:00:00Z', 'free'),
    span('b1', '2026-10-22T07:00:00Z', '2026-10-22T07:30:00Z', 'booked', { label: 'Lejla M.' }),
    span('o1', '2026-10-22T08:00:00Z', '2026-10-22T09:00:00Z', 'off', { label: 'Pauza' }),
    // a free piece that is not a whole slot keeps its own edges
    span('f2', '2026-10-22T07:30:00Z', '2026-10-22T07:40:00Z', 'free'),
  ], slots);
  assert.deepEqual(items.map((item) => [item.kind, item.offset, item.length]), [
    ['free', 0, 1], ['free', 1, 1], ['free', 2, 1], ['free', 3, 1],
    ['booked', 4, 2],
    ['free', 6, 10 / 15],
    ['off', 8, 4],
  ]);
  assert.ok(items.every((item) => item.lanes === 1));
});

test('spans past the axis are clipped and flagged; spans outside it are dropped; bad spans are ignored', () => {
  const slots = resourceDaySlots('2026-10-22', ZONE, { dayStart: '08:00', dayEnd: '12:00' });
  const items = layoutResourceColumn([
    span('early', '2026-10-22T05:00:00Z', '2026-10-22T06:30:00Z', 'booked'),
    span('late', '2026-10-22T09:30:00Z', '2026-10-22T11:00:00Z', 'off'),
    span('outside', '2026-10-22T12:00:00Z', '2026-10-22T13:00:00Z', 'booked'),
    span('backwards', '2026-10-22T08:00:00Z', '2026-10-22T07:00:00Z', 'booked'),
    span('early', '2026-10-22T07:00:00Z', '2026-10-22T07:15:00Z', 'booked'),
  ], slots);
  assert.deepEqual(items.map((item) => [item.span.id, item.offset, item.length, item.continuesBefore, item.continuesAfter]), [
    ['early', 0, 2, true, false],
    ['late', 14, 2, false, true],
  ]);
});

test('a double booking gets two lanes', () => {
  const slots = resourceDaySlots('2026-10-22', ZONE, { dayStart: '08:00', dayEnd: '10:00' });
  const items = layoutResourceColumn([
    span('a', '2026-10-22T06:00:00Z', '2026-10-22T06:30:00Z', 'booked'),
    span('b', '2026-10-22T06:15:00Z', '2026-10-22T06:45:00Z', 'booked'),
  ], slots);
  assert.deepEqual(items.map((item) => [item.span.id, item.lane, item.lanes]), [['a', 0, 2], ['b', 1, 2]]);
});

test('gaps are what no span covers: no schedule, never free', () => {
  const slots = resourceDaySlots('2026-10-22', ZONE, { dayStart: '08:00', dayEnd: '12:00' });
  const items = layoutResourceColumn([span('b', '2026-10-22T07:00:00Z', '2026-10-22T08:00:00Z', 'booked')], slots);
  assert.deepEqual(resourceDayGaps(items, slots).map((gap) => [new Date(gap.start).toISOString(), new Date(gap.end).toISOString()]), [
    ['2026-10-22T06:00:00.000Z', '2026-10-22T07:00:00.000Z'],
    ['2026-10-22T08:00:00.000Z', '2026-10-22T10:00:00.000Z'],
  ]);
  assert.equal(layoutResourceColumn([], slots).length, 0, 'no spans, nothing drawn');
  assert.deepEqual(resourceDayGaps([], slots).map((gap) => gap.end - gap.start), [4 * 3_600_000]);
});
