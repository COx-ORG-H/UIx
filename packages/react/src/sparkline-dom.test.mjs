/* Sparkline (HAR-2880): the inline trend line products put beside a number.
 *   - a missing value (null, NaN) breaks the line; it is never drawn as zero;
 *   - `target` draws a dashed reference line inside the scale;
 *   - `highlightLast` (default on) marks the latest known value; a crossed `threshold` turns that
 *     mark into a diamond, so colour is never the only cue;
 *   - the value is always also text: `valueText` joins the accessible name, and `showValue` shows it;
 *   - a constant series is a flat middle line; all-null draws no line but keeps the value text.
 * The 2.56 calm-kit shape (an `svg.uix-sparkline` root, decoration without a label) is unchanged:
 * calm-kit-dom.test.mjs keeps pinning it. Colours: packages/tokens/tests/sparkline-contrast.test.mjs.
 * Motion and axe in a browser: tests/a11y/sparkline.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Sparkline } from '../dist/index.js';

const html = (el) => renderToStaticMarkup(el);
const paths = (out) => [...out.matchAll(/<path class="uix-sparkline__line[^"]*" d="([^"]+)"/g)].map((m) => m[1]);
/** The y of every point a path's `d` visits. */
const ys = (d) => [...d.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]));

test('a null breaks the line into two segments; nothing is drawn at zero', () => {
  const out = html(h(Sparkline, { values: [1, 2, null, 3, 4] }));
  const segments = paths(out);
  assert.equal(segments.length, 2);
  assert.match(segments[0], /^M3\.0 [\d.]+ L23\.0 [\d.]+$/);
  assert.match(segments[1], /^M63\.0 [\d.]+ L83\.0 [\d.]+$/);
  // the lowest value (1) sits on the bottom padding, so no point lies below it: no fake zero
  assert.ok(Math.max(...segments.flatMap(ys)) <= 21);
  assert.doesNotMatch(out, /M43\.0|L43\.0/, 'the missing slot has no point');
});

test('NaN is a gap too, so the TENSOR copy that maps null to NaN keeps working', () => {
  const out = html(h(Sparkline, { values: [5, Number.NaN, 6, 7] }));
  assert.equal(paths(out).length, 1, 'the lone 5 is a dot, not a path');
  assert.match(out, /<circle class="uix-sparkline__point" cx="3" cy="21" r="1\.25"><\/circle>/, 'a lone value between gaps is a dot');
});

test('target draws a dashed reference line, and the scale includes it', () => {
  const out = html(h(Sparkline, { values: [10, 20, 30], target: 50 }));
  const line = /<line class="uix-sparkline__target" x1="3" x2="83" y1="([\d.]+)" y2="\1"><\/line>/.exec(out);
  assert.ok(line, out);
  assert.equal(Number(line[1]), 3, 'the target (the maximum here) sits on the top padding');
  assert.ok(ys(paths(out)[0]).every((y) => y > 3), 'the data stays under the target');
  assert.ok(out.indexOf('uix-sparkline__target') < out.indexOf('uix-sparkline__line'), 'the reference line is drawn under the data');
  assert.doesNotMatch(html(h(Sparkline, { values: [10, 20, 30] })), /uix-sparkline__target/);
});

test('highlightLast marks the latest known value, and can be turned off', () => {
  const on = html(h(Sparkline, { values: [1, 2, 3, null] }));
  assert.match(on, /<circle class="uix-sparkline__end" cx="56\.3" cy="3" r="2\.5"><\/circle>/, 'the last known value, not the empty last slot');
  const off = html(h(Sparkline, { values: [1, 2, 3], highlightLast: false }));
  assert.doesNotMatch(off, /uix-sparkline__end/);
  assert.equal(paths(off).length, 1);
});

test('a crossed threshold turns the last mark into a diamond in the attention tone', () => {
  const above = html(h(Sparkline, { values: [1, 2, 9], threshold: { value: 5, direction: 'above' } }));
  assert.match(above, /^<svg class="uix-sparkline" /);
  assert.match(above, /<path class="uix-sparkline__end uix-sparkline__end--crossed" d="M83\.0 -0\.5 L86\.5 3\.0 L83\.0 6\.5 L79\.5 3\.0 Z"><\/path>/);
  assert.doesNotMatch(above, /<circle class="uix-sparkline__end"/);
  const below = html(h(Sparkline, { values: [9, 8, 2], threshold: { value: 5, direction: 'below' } }));
  assert.match(below, /uix-sparkline__end--crossed/);
  const inside = html(h(Sparkline, { values: [1, 2, 4], threshold: { value: 5, direction: 'above' } }));
  assert.doesNotMatch(inside, /crossed/);
  // the diamond is the cue, so it stays even when the plain highlight is off
  assert.match(html(h(Sparkline, { values: [1, 9], highlightLast: false, threshold: { value: 5, direction: 'above' } })), /uix-sparkline__end--crossed/);
});

test('the value is always also text: valueText joins the accessible name', () => {
  const out = html(h(Sparkline, { values: [20, 85], label: 'Offener Rückstand, 11 Wochen', valueText: '85 offen' }));
  assert.match(out, /^<svg class="uix-sparkline"[^>]* role="img" aria-label="Offener Rückstand, 11 Wochen: 85 offen" focusable="false">/);
  assert.doesNotMatch(out, /uix-sparkline__value/, 'not visible without showValue');
  assert.match(html(h(Sparkline, { values: [1, 2], valueText: '2 offen' })), /role="img" aria-label="2 offen"/);
});

test('showValue writes the value beside the line; the group is one image with the same name', () => {
  const out = html(h(Sparkline, { values: [20, 85], label: 'Rückstand', valueText: '85 offen', showValue: true, className: 'x' }));
  assert.match(out, /^<span class="uix-sparkline-group x" role="img" aria-label="Rückstand: 85 offen"><svg class="uix-sparkline"[^>]* aria-hidden="true" focusable="false">/);
  assert.match(out, /<\/svg><span class="uix-sparkline__value">85 offen<\/span><\/span>$/);
  assert.doesNotMatch(out, /<svg class="uix-sparkline x"/, 'the class goes on the outermost element');
});

test('a constant series is a flat middle line; all-null draws nothing but keeps the value', () => {
  const flat = paths(html(h(Sparkline, { values: [4, 4, 4] })));
  assert.deepEqual(ys(flat[0]), [12, 12, 12]);
  const none = html(h(Sparkline, { values: [null, null], label: 'Verfügbarkeit', valueText: 'keine Daten', showValue: true }));
  assert.doesNotMatch(none, /<path|<circle|<line/);
  assert.match(none, /aria-label="Verfügbarkeit: keine Daten"/);
  assert.match(none, /<span class="uix-sparkline__value">keine Daten<\/span>/);
  assert.doesNotMatch(html(h(Sparkline, { values: [null, null], target: 5 })), /<line/, 'no target line without data');
  assert.doesNotMatch(html(h(Sparkline, { values: [] })), /NaN|Infinity/);
  assert.doesNotMatch(html(h(Sparkline, { values: [null, 3, null], target: 3 })), /NaN|Infinity/);
});
