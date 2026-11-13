/* Text that fits (HAR-3094, HAR-3099, HAR-3201): a shown date never breaks inside itself, a range
 * breaks only after its dash and prints a one-day date once, the date follows the app-wide date
 * format of the date fields, and a DataWorkspace column says how its text wraps or clamps.
 * Renders the BUILT dist — run `npm run build` first; CI does. The browser half (one line in a
 * 120 px cell, two clamped lines) is tests/a11y/text-fit.spec.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataWorkspace, DateTime, DateTimeRange, RelativeTime, UixLabelsProvider } from '../dist/index.js';

const render = (el) => renderToStaticMarkup(el);
const NBSP = String.fromCharCode(0xa0);
// 09:00 and 12:00 in Berlin on 11 November 2026 (CET, UTC+1)
const NINE = '2026-11-11T08:00:00.000Z';
const NOON = '2026-11-11T11:00:00.000Z';
const NEXT_DAY = '2026-11-12T16:30:00.000Z';
const de = { locale: 'de-DE', timeZone: 'Europe/Berlin' };

test('RelativeTime carries .uix-time, also when it cannot read the date', () => {
  assert.match(render(h(RelativeTime, { value: NINE, now: NOON, ...de })), /^<time class="uix-time" dateTime="2026-11-11T08:00:00.000Z"[^>]*>vor 3 Stunden<\/time>$/);
  assert.match(render(h(RelativeTime, { value: NINE, now: NOON, className: 'x', ...de })), /class="uix-time x"/);
  assert.match(render(h(RelativeTime, { value: 'nope' })), /<time class="uix-time" data-invalid="true">—<\/time>/);
});

test('DateTime: the day and the time in the locale, a <time> with the instant, or the day alone', () => {
  assert.equal(render(h(DateTime, { value: NINE, ...de })), '<time class="uix-time" dateTime="2026-11-11T08:00:00.000Z">11.11.2026 09:00</time>');
  assert.equal(render(h(DateTime, { value: NINE, precision: 'date', ...de })), '<time class="uix-time" dateTime="2026-11-11">11.11.2026</time>');
  assert.equal(render(h(DateTime, { value: 'not a date', invalidLabel: 'unbekannt' })), '<time class="uix-time" data-invalid="true">unbekannt</time>');
});

test('DateTime follows the app-wide date format of the date fields (UixLabelsProvider dateFormat)', () => {
  const labels = { dateFormat: { locale: 'de-DE', formatDate: (d) => d.split('-').reverse().join('/') } };
  const html = render(h(UixLabelsProvider, { labels }, h(DateTime, { value: NINE, timeZone: 'Europe/Berlin' })));
  assert.equal(html, '<time class="uix-time" dateTime="2026-11-11T08:00:00.000Z">11/11/2026 09:00</time>');
  // a prop still wins over the provider's locale
  const en = render(h(UixLabelsProvider, { labels: { dateFormat: { locale: 'de-DE' } } }, h(DateTime, { value: NINE, locale: 'en-GB', timeZone: 'Europe/Berlin' })));
  assert.match(en, />11\/11\/2026 09:00</);
});

test('DateTimeRange: a one-day range prints its date once and breaks only after the dash', () => {
  const html = render(h(DateTimeRange, { start: NINE, end: NOON, ...de }));
  assert.equal(html, `<span class="uix-time-range"><time class="uix-time" dateTime="${NINE}">11.11.2026 09:00</time><span class="uix-time-range__sep">${NBSP}– </span><time class="uix-time" dateTime="${NOON}">12:00</time></span>`);
  // across days both ends are whole
  assert.match(render(h(DateTimeRange, { start: NINE, end: NEXT_DAY, ...de })), />11\.11\.2026 09:00<\/time>.*>12\.11\.2026 17:30<\/time>/);
  // day precision: one day is one date, several days a date range
  assert.equal(render(h(DateTimeRange, { start: NINE, end: NOON, precision: 'date', ...de })), '<span class="uix-time-range"><time class="uix-time" dateTime="2026-11-11">11.11.2026</time></span>');
  assert.match(render(h(DateTimeRange, { start: NINE, end: NEXT_DAY, precision: 'date', ...de })), />11\.11\.2026<\/time><span class="uix-time-range__sep">.– <\/span><time class="uix-time" dateTime="2026-11-12">12\.11\.2026</);
  // an unreadable end keeps the range's shape
  assert.match(render(h(DateTimeRange, { start: NINE, end: 'x', ...de })), /<time class="uix-time" data-invalid="true">—<\/time><\/span>$/);
});

test('a time zone decides the day: 23:30 UTC is the next day in Berlin', () => {
  assert.match(render(h(DateTime, { value: '2026-11-11T23:30:00.000Z', precision: 'date', ...de })), /dateTime="2026-11-12">12\.11\.2026</);
  // a range that crosses midnight in Berlin but not in UTC is two days
  assert.match(render(h(DateTimeRange, { start: '2026-11-11T22:30:00.000Z', end: '2026-11-11T23:30:00.000Z', ...de })), />11\.11\.2026 23:30<\/time>.*>12\.11\.2026 00:30<\/time>/);
});

test('a YYYY-MM-DD string is a calendar day: the same day in every zone, never a time (#241 review)', () => {
  const ny = { locale: 'de-DE', timeZone: 'America/New_York' };
  assert.equal(render(h(DateTime, { value: '2026-11-11', precision: 'date', ...ny })), '<time class="uix-time" dateTime="2026-11-11">11.11.2026</time>');
  assert.equal(render(h(DateTime, { value: '2026-11-11', ...ny })), '<time class="uix-time" dateTime="2026-11-11">11.11.2026</time>', 'minute precision still shows the day alone');
  assert.equal(render(h(DateTimeRange, { start: '2026-11-11', end: '2026-11-11', ...ny })), '<span class="uix-time-range"><time class="uix-time" dateTime="2026-11-11">11.11.2026</time></span>');
  assert.match(render(h(DateTimeRange, { start: '2026-11-11', end: '2026-11-13', ...ny })), /dateTime="2026-11-11">11\.11\.2026<\/time>.*dateTime="2026-11-13">13\.11\.2026</);
});

test('a locale prop asks for the day of that locale, also under a provider formatDate (#241 review)', () => {
  const labels = { dateFormat: { locale: 'de-DE', formatDate: (d) => d.split('-').reverse().join('/') } };
  const html = render(h(UixLabelsProvider, { labels }, h(DateTime, { value: NINE, locale: 'en-US', timeZone: 'Europe/Berlin' })));
  assert.match(html, />11\/11\/2026 09:00 AM</);
});

const ROWS = [{ id: 'CHG-1', when: NINE, note: 'Ein sehr langer Kommentar, der über mehrere Zeilen läuft und abgeschnitten werden soll.' }];
const columns = (extra) => [
  { id: 'when', header: 'Wann', cell: (r) => h(DateTime, { value: r.when, ...de }), textWrap: 'nowrap', className: 'uix-col--w-lg-plus' },
  { id: 'note', header: 'Notiz', cell: (r) => r.note, lineClamp: 2, ...extra },
  { id: 'title', header: 'Titel', cell: (r) => r.id, textWrap: 'truncate' },
  { id: 'plain', header: 'Ohne', cell: (r) => r.id },
];
const workspace = (cols) => render(h(DataWorkspace, { label: 'Changes', rows: ROWS, getRowId: (r) => r.id, columns: cols }));

test('DataWorkspace textWrap puts the wrap class on the header and body cells (HAR-3201)', () => {
  const html = workspace(columns());
  assert.match(html, /<th class="uix-col--w-lg-plus uix-col--nowrap" scope="col"/);
  assert.match(html, /<td class="uix-col--w-lg-plus uix-col--nowrap"><time class="uix-time"/);
  assert.match(html, /<th class="uix-col--truncate" scope="col"/);
  assert.match(html, /<td class="uix-col--truncate">CHG-1<\/td>/);
  assert.match(html, /<td>CHG-1<\/td>/, 'a column without the props keeps a bare cell');
});

test('DataWorkspace lineClamp wraps each body cell in .uix-cell-clamp with the line count, never the header (HAR-3201)', () => {
  const html = workspace(columns());
  assert.match(html, /<td><span class="uix-cell-clamp" style="--uix-clamp:2">Ein sehr langer Kommentar/);
  assert.doesNotMatch(html, /<th[^>]*><span class="uix-cell-clamp"/);
  assert.match(workspace(columns({ lineClamp: 3.7 })), /style="--uix-clamp:3"/, 'a fraction rounds down');
  assert.doesNotMatch(workspace(columns({ lineClamp: 0 })), /uix-cell-clamp/, '0 does not clamp');
  assert.doesNotMatch(workspace(columns({ lineClamp: 0.5 })), /uix-cell-clamp/, 'under one line does not clamp');
  assert.doesNotMatch(workspace(columns({ lineClamp: Infinity })), /uix-cell-clamp/, 'Infinity does not clamp');
  assert.doesNotMatch(workspace(columns({ lineClamp: Number.NaN })), /uix-cell-clamp/, 'NaN does not clamp');
});

test('the lg-plus width tier sizes the column like the other tiers (HAR-3099)', () => {
  const html = workspace(columns());
  assert.match(html, /<col class="uix-col--w-lg-plus"/);
  assert.match(html, /min-width:calc\([^)]*var\(--uix-col-w-lg-plus\)/);
});
