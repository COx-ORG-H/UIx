/* The time-field model (HAR-1835): locale clock, typed-time parsing, arrow-key steps, list slots. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTimeKey, isTimeOutOfRange, isValidTimeKey, minutesToTime, parseTimeInput, stepTime, timeSlots, timeToMinutes, uses12Hour,
} from './time-field-model.ts';

test('isValidTimeKey accepts zero-padded 24-hour times only', () => {
  for (const ok of ['00:00', '09:05', '23:59']) assert.equal(isValidTimeKey(ok), true, ok);
  for (const bad of ['24:00', '9:05', '12:60', '12:5', '', null, '2:30 PM']) assert.equal(isValidTimeKey(bad), false, String(bad));
});

test('minutes round-trip and wrap round midnight', () => {
  assert.equal(timeToMinutes('14:30'), 870);
  assert.equal(minutesToTime(870), '14:30');
  assert.equal(minutesToTime(-15), '23:45');
  assert.equal(minutesToTime(1440 + 5), '00:05');
});

test('the clock follows the locale: 24 h in de, bs and en-GB, 12 h in en-US; hour12 overrides', () => {
  assert.equal(uses12Hour('de'), false);
  assert.equal(uses12Hour('bs'), false);
  assert.equal(uses12Hour('en-GB'), false);
  assert.equal(uses12Hour('en-US'), true);
  assert.equal(formatTimeKey('14:30', 'de'), '14:30');
  assert.equal(formatTimeKey('09:05', 'de'), '09:05');
  assert.match(formatTimeKey('14:30', 'en-US'), /^2:30\s?PM$/);
  assert.match(formatTimeKey('00:15', 'en-US'), /^12:15\s?AM$/);
  assert.equal(formatTimeKey('14:30', 'en-US', false), '14:30');
  assert.match(formatTimeKey('14:30', 'de', true), /^2:30/);
});

test('parseTimeInput reads the shapes people type', () => {
  const cases = {
    '14:30': '14:30', '14.30': '14:30', '14h30': '14:30', '1430': '14:30', '930': '09:30', '9': '09:00', '09:05': '09:05',
    ' 7:45 ': '07:45', '14 Uhr': '14:00', '0:00': '00:00', '23:59': '23:59',
    '2:30 pm': '14:30', '2:30PM': '14:30', '2pm': '14:00', '12 am': '00:00', '12:15 pm': '12:15', '2:30 p.m.': '14:30', '11a': '11:00',
  };
  for (const [typed, expected] of Object.entries(cases)) assert.equal(parseTimeInput(typed, 'en-US'), expected, typed);
  for (const bad of ['', '24:00', '12:60', '13 pm', '0 am', '1:5', 'noon', '12345', '14:30:00', 'pm']) assert.equal(parseTimeInput(bad, 'en-US'), null, bad);
  // German reads its own words too, and plain 24-hour times
  assert.equal(parseTimeInput('8:15', 'de'), '08:15');
  assert.equal(parseTimeInput('20:15', 'de'), '20:15');
});

test('stepTime: wraps without bounds, stops at min / max, starts at min from empty', () => {
  assert.equal(stepTime('23:45', 15), '00:00');
  assert.equal(stepTime('00:00', -60), '23:00');
  assert.equal(stepTime('16:30', 60, '08:00', '17:00'), '17:00');
  assert.equal(stepTime('08:10', -15, '08:00', '17:00'), '08:00');
  assert.equal(stepTime(null, 15, '08:00'), '08:00');
  assert.equal(stepTime(null, -15), '00:00');
});

test('isTimeOutOfRange and timeSlots honour min / max', () => {
  assert.equal(isTimeOutOfRange('07:59', '08:00', '17:00'), true);
  assert.equal(isTimeOutOfRange('17:00', '08:00', '17:00'), false);
  assert.equal(isTimeOutOfRange('17:01', undefined, '17:00'), true);
  assert.deepEqual(timeSlots(30, '08:00', '10:00'), ['08:00', '08:30', '09:00', '09:30', '10:00']);
  assert.equal(timeSlots(15).length, 96);
  assert.equal(timeSlots(15).at(-1), '23:45');
});
