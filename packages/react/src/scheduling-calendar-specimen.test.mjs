/* The SchedulingCalendar specimens on the docs page are the React component's own markup
 * (HAR-1506). They used to be hand-written HTML that drifted from the component: the week
 * chips overflowed their cells because the page lacked a wrapper the component renders.
 * This test renders the specimens again from the BUILT dist and fails when the committed page
 * differs, so a change to the component's markup cannot leave the docs behind.
 * To update the page: node packages/react/scripts/render-scheduling-calendar-specimen.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SHOWCASE_DATA, applySchedulingCalendarSpecimen, renderSchedulingCalendarSpecimen } from '../scripts/render-scheduling-calendar-specimen.mjs';

const committed = readFileSync(SHOWCASE_DATA, 'utf8');
const specimen = renderSchedulingCalendarSpecimen();

test('the docs page holds exactly what the component renders today', () => {
  const stored = JSON.stringify(specimen).slice(1, -1);
  assert.ok(committed.includes(stored), 'packages/tokens/docs/showcase-data.js is out of date — run node packages/react/scripts/render-scheduling-calendar-specimen.mjs');
  assert.equal(applySchedulingCalendarSpecimen(committed, specimen), committed, 'rendering again changes nothing');
});

test('the comparison can fail: a changed specimen is not found in the page', () => {
  assert.equal(committed.includes(JSON.stringify(specimen.replace('uix-scheduling-calendar__week', 'uix-scheduling-calendar__row')).slice(1, -1)), false);
});

test('the specimens are the component: each view once, and no hand-written calendar markup beside them', () => {
  assert.equal((specimen.match(/data-calendar-panel="/g) ?? []).length, 3);
  for (const view of ['month', 'week', 'agenda']) assert.match(specimen, new RegExp(`data-calendar-view="${view}"[^>]*aria-pressed="true"`), `${view} panel shows its view pressed`);
  const page = JSON.parse(committed.slice(committed.indexOf('"html": ', committed.indexOf('"slug": "examples-scheduling-calendar"')) + 8).split('\n')[0]);
  const outside = page.replace(specimen, '');
  assert.doesNotMatch(outside, /class="uix-scheduling-calendar[_ "]/, 'every calendar on the page comes from the render script');
});
