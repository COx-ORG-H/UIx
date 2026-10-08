/* The SchedulingTimeline specimen on the docs page is the React component's own markup
 * (HAR-1521, U5 AC11). It was hand-pasted markup of an older release: one band per lane, state tints and the
 * resize hint. This test renders the specimen again from the BUILT dist and fails when the
 * committed page differs, so a change to the component's markup cannot leave the docs behind.
 * The page is shared with the calendar specimens (render-scheduling-calendar-specimen.mjs): the
 * timeline script replaces only its own region and leaves every other byte alone.
 * To update the page: node packages/react/scripts/render-scheduling-timeline-specimen.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = await import('../scripts/render-scheduling-timeline-specimen.mjs').catch((error) => ({ error }));
const { SHOWCASE_DATA, START, END, applySchedulingTimelineSpecimen, renderSchedulingTimelineSpecimen } = script;
const ready = () => assert.equal(script.error, undefined, `the render script loads: ${script.error?.message}`);
const committed = () => readFileSync(SHOWCASE_DATA, 'utf8');
const pageOf = (source) => {
  const slug = source.indexOf('"slug": "examples-scheduling-calendar"');
  const from = source.indexOf('"html": ', slug) + '"html": '.length;
  return JSON.parse(source.slice(from, source.indexOf('\n', from)));
};

test('the docs page holds exactly what the component renders today', () => {
  ready();
  const specimen = renderSchedulingTimelineSpecimen();
  const stored = JSON.stringify(specimen).slice(1, -1);
  assert.ok(committed().includes(stored), 'packages/tokens/docs/showcase-data.js is out of date — run node packages/react/scripts/render-scheduling-timeline-specimen.mjs');
  assert.equal(applySchedulingTimelineSpecimen(committed(), specimen), committed(), 'rendering again changes nothing');
});

test('the comparison can fail: a changed specimen is not found in the page', () => {
  ready();
  const specimen = renderSchedulingTimelineSpecimen();
  assert.equal(committed().includes(JSON.stringify(specimen.replace('uix-scheduling-timeline__row--summary', 'uix-scheduling-timeline__row--closed')).slice(1, -1)), false);
});

test('the script replaces only its own region: every byte outside the two markers is left alone', () => {
  ready();
  const before = committed();
  const changed = applySchedulingTimelineSpecimen(before, `${START}<h3 data-timeline-specimen>Changed</h3>${END}`);
  assert.notEqual(changed, before);
  // Outside the page line nothing moved.
  const lineOf = (source) => { const slug = source.indexOf('"slug": "examples-scheduling-calendar"'); const from = source.indexOf('"html": ', slug); return [from, source.indexOf('\n', from)]; };
  const [from, to] = lineOf(before);
  const [changedFrom, changedTo] = lineOf(changed);
  assert.equal(changed.slice(0, changedFrom), before.slice(0, from));
  assert.equal(changed.slice(changedTo), before.slice(to));
  // Inside it, everything before the start marker and after the end marker is the same.
  const page = pageOf(before);
  const next = pageOf(changed);
  assert.equal(next.slice(0, next.indexOf(START)), page.slice(0, page.indexOf(START)));
  assert.equal(next.slice(next.indexOf(END) + END.length), page.slice(page.indexOf(END) + END.length));
  // The calendar specimens are untouched, markers and all.
  const calendar = (html) => html.slice(html.indexOf('<!-- scheduling-calendar-specimen:start -->'), html.indexOf('<!-- scheduling-calendar-specimen:end -->'));
  assert.ok(calendar(page).length > 10_000);
  assert.equal(calendar(next), calendar(page));
  // Running it twice changes nothing more.
  assert.equal(applySchedulingTimelineSpecimen(changed, `${START}<h3 data-timeline-specimen>Changed</h3>${END}`), changed);
});

test('the script also takes over the hand-pasted older specimen: from the marker heading to the end of the timeline section', () => {
  ready();
  const page = pageOf(committed());
  const legacy = '<h3 data-timeline-specimen>Old</h3>\n      <p>Old text.</p>\n      <section class="uix-scheduling-timeline" aria-label="x"><div><section>inner</section></div><span></span></section>';
  const withLegacy = page.slice(0, page.indexOf(START)) + legacy + page.slice(page.indexOf(END) + END.length);
  const source = committed().replace(JSON.stringify(page), JSON.stringify(withLegacy));
  assert.notEqual(source, committed(), 'the fixture page was built');
  const applied = pageOf(applySchedulingTimelineSpecimen(source, renderSchedulingTimelineSpecimen()));
  assert.equal(applied, page, 'the result is the committed page: nothing of the old specimen is left and nothing after it was eaten');
});

test('AC11 (R11 AC9): the specimen shows lane packing, the time axis with sub-ticks, a collapsed group and a scope-true overlay', () => {
  ready();
  const specimen = renderSchedulingTimelineSpecimen();
  assert.ok(specimen.startsWith(START) && specimen.endsWith(END));
  assert.match(specimen, /<h3 data-timeline-specimen>/, 'the marker heading the calendar script looks for is kept');
  assert.equal((specimen.match(/<section class="uix-scheduling-timeline"/g) ?? []).length, 1, 'one timeline, the component');
  // Lane packing: a lane with more than one sub-row, and bars in sub-row 1.
  assert.match(specimen, /--uix-timeline-rows:[2-9]/);
  assert.match(specimen, /--uix-timeline-row:1/);
  // The axis: day ticks and three sub-ticks a day.
  const minor = (specimen.match(/class="uix-scheduling-timeline__tick" data-minor="true"/g) ?? []).length;
  const major = (specimen.match(/class="uix-scheduling-timeline__tick"(?! data-minor)/g) ?? []).length;
  assert.ok(major >= 7, `${major} day ticks`);
  assert.equal(minor, (major - 1) * 3, 'three sub-ticks for each day on the axis');
  // A collapsed group: one summary row with the consumer count.
  assert.equal((specimen.match(/uix-scheduling-timeline__row--summary/g) ?? []).length, 1);
  assert.match(specimen, /aria-expanded="false"/);
  assert.match(specimen, /uix-scheduling-timeline__group-count/);
  // Overlays: each drawn once; one limited to some lanes by a clip, one over every row.
  const overlays = specimen.match(/<(?:button|span)[^>]*class="uix-scheduling-timeline__overlay"[^>]*>/g) ?? [];
  assert.ok(overlays.length >= 2);
  assert.equal(new Set(overlays.map((tag) => tag.match(/data-overlay-id="([^"]+)"/)[1])).size, overlays.length, 'one element per overlay');
  assert.ok(overlays.some((tag) => /data-scope="lanes"/.test(tag) && /--uix-timeline-clip:polygon\(/.test(tag)), 'a window limited to its lanes');
  assert.ok(overlays.some((tag) => /data-scope="all"/.test(tag)), 'a window over every row');
  for (const tag of overlays) assert.match(tag, /data-pattern="(diagonal|cross|dotted|solid)"/);
  assert.match(specimen, /uix-scheduling-timeline__overlay-kind/);
  // Wording (the product rules for every default label, specimen and doc).
  const words = specimen.replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(words, /violation|overlap|re-approval|\bRLS\b|prevents|guarantees|real-time|unique|freeze|blackout/i);
  assert.doesNotMatch(specimen, /data-state=|data-kind=|data-conflict=/, 'no deprecated state, kind or generic conflict flag in the specimen');
  assert.doesNotMatch(specimen, /Alt, Shift/, 'resize is off: the hint does not offer it');
});

test('the page has no hand-written timeline markup beside the generated region', () => {
  ready();
  const page = pageOf(committed());
  const outside = page.slice(0, page.indexOf(START)) + page.slice(page.indexOf(END) + END.length);
  assert.ok(page.includes(START) && page.includes(END));
  assert.doesNotMatch(outside, /class="uix-scheduling-timeline[_ "]/);
  assert.doesNotMatch(outside, /data-timeline-specimen/);
});
