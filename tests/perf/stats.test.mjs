/* The perf gate's arithmetic (tests/perf/stats.mjs), held to its failure cases.   node --test tests/perf/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collect, evaluate, failing, frameStats, interactionLatency, limitFor, median, quantile, summarize } from './stats.mjs';

const lane = { tolerance: { ratio: 0.5, floorMs: 25 }, metrics: { sort: { baseline: 100 }, mount: { baseline: 20 } } };

test('median and quantiles interpolate between samples', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(quantile([10, 20, 30, 40, 50], 0.75), 40);
  assert.throws(() => median([]), /no samples/);
});

test('the limit is the baseline plus the larger of the ratio and the floor', () => {
  assert.equal(limitFor(100, lane.tolerance), 150); // 50 % beats 25 ms
  assert.equal(limitFor(20, lane.tolerance), 45); // the 25 ms floor beats 50 % of 20
});

test('a median over its limit fails; one at the limit passes', () => {
  const rows = evaluate({ sort: summarize([150, 150, 150]), mount: summarize([46, 46, 46]) }, lane);
  assert.deepEqual(rows.map((r) => [r.metric, r.status]), [['sort', 'ok'], ['mount', 'over']]);
  assert.equal(failing(rows).length, 1);
});

test('one slow sample does not fail a run whose median is fine', () => {
  const rows = evaluate({ sort: summarize([90, 95, 400, 100, 98]), mount: summarize([20, 21, 22]) }, lane);
  assert.deepEqual(failing(rows), []);
});

test('a metric with no baseline fails rather than passing unchecked', () => {
  const rows = evaluate({ sort: summarize([1]), mount: summarize([1]), filter: summarize([1]) }, lane);
  assert.deepEqual(failing(rows).map((r) => [r.metric, r.status]), [['filter', 'unbudgeted']]);
});

test('a budgeted metric the run did not produce fails', () => {
  const rows = evaluate({ sort: summarize([1]) }, lane);
  assert.deepEqual(failing(rows).map((r) => [r.metric, r.status]), [['mount', 'unmeasured']]);
});

test('collect groups per-run records by metric', () => {
  assert.deepEqual(collect([{ a: 1, b: 2 }, { a: 3, b: 4 }]), { a: [1, 3], b: [2, 4] });
});

test('an interaction is its longest Event Timing entry; older entries are ignored', () => {
  const entries = [
    { interactionId: 7, startTime: 10, duration: 200 },
    { interactionId: 9, startTime: 100, duration: 24 },
    { interactionId: 9, startTime: 101, duration: 56 },
  ];
  assert.equal(interactionLatency(entries, 50), 56);
  assert.equal(interactionLatency(entries, 500), null);
});

test('frame stats name the slow frames', () => {
  assert.deepEqual(frameStats([16, 17, 16, 70, 16]), { p95: 59.4, max: 70, slow: 1 });
  assert.throws(() => frameStats([]), /no frames/);
});

test('budgets.json: every lane has a tolerance, and every baseline is a number', () => {
  const budgets = JSON.parse(readFileSync(new URL('./budgets.json', import.meta.url), 'utf8'));
  for (const name of ['workspace', 'no-gpu']) {
    const l = budgets.lanes[name];
    assert.ok(l, `lane ${name}`);
    assert.equal(typeof l.tolerance.ratio, 'number');
    assert.equal(typeof l.tolerance.floorMs, 'number');
    for (const [metric, { baseline }] of Object.entries(l.metrics)) assert.equal(typeof baseline, 'number', `${name}: ${metric}`);
  }
});
