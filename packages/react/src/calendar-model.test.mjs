import test from 'node:test';
import assert from 'node:assert/strict';
import { addCalendarMonths, buildMonthGrid, enumerateDateSpan, isDateInRange, selectRangeDate, zonedDateSpan } from './calendar-model.ts';

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

test('UTC instants become inclusive date spans in the supplied IANA zone', () => {
  const span = zonedDateSpan('2026-09-07T22:30:00Z', '2026-09-09T01:00:00Z', 'Europe/Berlin');
  assert.deepEqual(span, { start: '2026-09-08', end: '2026-09-09' });
  assert.deepEqual(enumerateDateSpan(span), ['2026-09-08', '2026-09-09']);
});

test('range selection normalizes reverse selection', () => {
  const range = selectRangeDate({ start: '2026-09-12' }, '2026-09-08');
  assert.deepEqual(range, { start: '2026-09-08', end: '2026-09-12' });
  assert.equal(isDateInRange('2026-09-10', range), true);
});
