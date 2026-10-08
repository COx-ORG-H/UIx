/* The date-field model (HAR-1383): locale date order, typed-date parsing, date-time split / join. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dateOrder, datePattern, formatDateKey, isValidDateKey, joinDateTime, parseDateInput, splitDateTime, timeZoneName,
} from './date-field-model.ts';

test('isValidDateKey accepts only real calendar days', () => {
  assert.equal(isValidDateKey('2026-11-22'), true);
  assert.equal(isValidDateKey('2028-02-29'), true); // leap year
  assert.equal(isValidDateKey('2026-02-29'), false);
  assert.equal(isValidDateKey('2026-02-30'), false);
  assert.equal(isValidDateKey('2026-13-01'), false);
  assert.equal(isValidDateKey('2026-00-10'), false);
  assert.equal(isValidDateKey('2026-04-00'), false);
  assert.equal(isValidDateKey('2026-4-3'), false); // not zero-padded: not a key
  assert.equal(isValidDateKey('22.11.2026'), false);
});

test('dateOrder and datePattern follow the locale', () => {
  assert.deepEqual(dateOrder('de'), ['day', 'month', 'year']);
  assert.deepEqual(dateOrder('en-GB'), ['day', 'month', 'year']);
  assert.deepEqual(dateOrder('en-US'), ['month', 'day', 'year']);
  assert.deepEqual(dateOrder('sv'), ['year', 'month', 'day']);
  assert.equal(datePattern('de'), 'DD.MM.YYYY');
  assert.equal(datePattern('en-US'), 'MM/DD/YYYY');
  assert.equal(datePattern('en-GB'), 'DD/MM/YYYY');
  assert.equal(datePattern('sv'), 'YYYY-MM-DD');
});

test('formatDateKey writes the numeric date of the locale, in UTC', () => {
  assert.equal(formatDateKey('2026-11-22', 'de'), '22.11.2026');
  assert.equal(formatDateKey('2026-11-22', 'en-US'), '11/22/2026');
  assert.equal(formatDateKey('2026-01-01', 'en-GB'), '01/01/2026'); // never the day before
  assert.equal(formatDateKey('not a date', 'de'), 'not a date');
});

test('parseDateInput reads ISO everywhere and the locale order otherwise', () => {
  for (const locale of ['de', 'en-US', 'en-GB', 'sv']) {
    assert.equal(parseDateInput('2026-11-22', locale), '2026-11-22');
    assert.equal(parseDateInput('2026-4-3', locale), '2026-04-03');
  }
  assert.equal(parseDateInput('3.4.2026', 'de'), '2026-04-03');
  assert.equal(parseDateInput('03.04.2026', 'de'), '2026-04-03');
  assert.equal(parseDateInput('3/4/2026', 'en-US'), '2026-03-04');
  assert.equal(parseDateInput('3/4/2026', 'en-GB'), '2026-04-03');
  assert.equal(parseDateInput(' 22 11 2026 ', 'de'), '2026-11-22');
  assert.equal(parseDateInput('22-11-2026', 'de'), '2026-11-22');
  assert.equal(parseDateInput('22.11.26', 'de'), '2026-11-22'); // two-digit year: 2000 to 2099
});

test('parseDateInput round-trips what formatDateKey writes', () => {
  for (const locale of ['de', 'en-US', 'en-GB', 'sv', 'fr', 'ja', 'nl', 'bs']) {
    for (const date of ['2026-11-22', '2026-01-02', '2028-02-29']) {
      assert.equal(parseDateInput(formatDateKey(date, locale), locale), date, `${locale} ${date}`);
    }
  }
});

test('parseDateInput refuses what is not a real date', () => {
  assert.equal(parseDateInput('', 'de'), null);
  assert.equal(parseDateInput('   ', 'de'), null);
  assert.equal(parseDateInput('tomorrow', 'de'), null);
  assert.equal(parseDateInput('31.02.2026', 'de'), null);
  assert.equal(parseDateInput('13/13/2026', 'en-US'), null);
  assert.equal(parseDateInput('22.11', 'de'), null);
  assert.equal(parseDateInput('22.11.126', 'de'), null); // a three-digit year is a typo
  assert.equal(parseDateInput('2026-02-30', 'de'), null);
  assert.equal(parseDateInput('22.11.2026 10:00', 'de'), null);
});

test('splitDateTime and joinDateTime keep the datetime-local shape', () => {
  assert.deepEqual(splitDateTime('2026-11-22T14:30'), { date: '2026-11-22', time: '14:30' });
  assert.deepEqual(splitDateTime('2026-11-22T14:30:45'), { date: '2026-11-22', time: '14:30' });
  assert.deepEqual(splitDateTime('2026-11-22'), { date: '2026-11-22', time: '' });
  assert.deepEqual(splitDateTime(null), { date: null, time: '' });
  assert.deepEqual(splitDateTime(''), { date: null, time: '' });
  assert.deepEqual(splitDateTime('2026-02-30T10:00'), { date: null, time: '' });
  assert.equal(joinDateTime('2026-11-22', '14:30'), '2026-11-22T14:30');
  assert.equal(joinDateTime('2026-11-22', '14:30:45'), '2026-11-22T14:30');
  assert.equal(joinDateTime('2026-11-22', ''), '2026-11-22T00:00');
  assert.equal(joinDateTime('2026-11-22', '', '09:00'), '2026-11-22T09:00');
  assert.equal(joinDateTime(null, '14:30'), null);
});

test('timeZoneName names the zone on that day, and survives an unknown zone', () => {
  assert.equal(timeZoneName('UTC', '2026-11-22', 'en-US'), 'UTC');
  // Vienna is on summer time in July and winter time in November.
  const summer = timeZoneName('Europe/Vienna', '2026-07-01', 'en-GB');
  const winter = timeZoneName('Europe/Vienna', '2026-11-22', 'en-GB');
  assert.notEqual(summer, winter);
  assert.match(summer, /CEST|GMT\+2/);
  assert.match(winter, /CET|GMT\+1/);
  assert.equal(timeZoneName('Not/AZone', '2026-11-22', 'en'), 'Not/AZone');
});
