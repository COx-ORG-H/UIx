/* Pure helpers for tests/perf/bench.mjs: summaries of repeated samples, and the budget check.
 * Kept apart so tests/perf/stats.test.mjs can hold the gate to its failure cases without a browser. */

export const median = (values) => quantile(values, 0.5);

/** Linear-interpolated quantile (the R-7 / numpy default) of a non-empty list. */
export function quantile(values, p) {
  if (!values.length) throw new Error('quantile of no samples');
  const sorted = [...values].sort((a, b) => a - b);
  const at = (sorted.length - 1) * p;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

export const round1 = (n) => Math.round(n * 10) / 10;

export function summarize(values) {
  return { median: round1(median(values)), p75: round1(quantile(values, 0.75)), min: round1(Math.min(...values)), max: round1(Math.max(...values)), samples: values.map(round1) };
}

/** The most a metric may read before the gate fails: the baseline plus the larger of a share of it and a floor. */
export function limitFor(baseline, { ratio, floorMs }) {
  return round1(Math.max(baseline * (1 + ratio), baseline + floorMs));
}

/**
 * One row per measured metric: its median against its limit.
 *   ok        under the limit
 *   over      the median is past the limit
 *   unbudgeted   the metric has no baseline in budgets.json (fails: the gate never passes on a number it was not given)
 *   unmeasured   budgets.json has a baseline for a metric the run did not produce (fails: a renamed or dropped metric)
 */
export function evaluate(summaries, lane) {
  const rows = [];
  for (const [metric, summary] of Object.entries(summaries)) {
    const baseline = lane.metrics?.[metric]?.baseline;
    if (typeof baseline !== 'number') { rows.push({ metric, median: summary.median, baseline: null, limit: null, status: 'unbudgeted' }); continue; }
    const limit = limitFor(baseline, lane.tolerance);
    rows.push({ metric, median: summary.median, baseline, limit, status: summary.median > limit ? 'over' : 'ok' });
  }
  for (const metric of Object.keys(lane.metrics ?? {})) {
    if (!(metric in summaries)) rows.push({ metric, median: null, baseline: lane.metrics[metric].baseline, limit: null, status: 'unmeasured' });
  }
  return rows;
}

export const failing = (rows) => rows.filter((row) => row.status !== 'ok');

/** Collects per-run records ({ metric: number }) into { metric: number[] }. */
export function collect(runs) {
  const out = {};
  for (const run of runs) for (const [metric, value] of Object.entries(run)) (out[metric] ??= []).push(value);
  return out;
}

/** The latency of one interaction as INP counts it: the longest Event Timing entry of its interactionId. */
export function interactionLatency(entries, since) {
  const byId = new Map();
  for (const e of entries) if (e.startTime >= since) byId.set(e.interactionId, Math.max(byId.get(e.interactionId) ?? 0, e.duration));
  return byId.size ? Math.max(...byId.values()) : null;
}

/** Frame statistics of rAF-to-rAF intervals. */
export function frameStats(intervals) {
  if (!intervals.length) throw new Error('no frames were recorded');
  return { p95: round1(quantile(intervals, 0.95)), max: round1(Math.max(...intervals)), slow: intervals.filter((ms) => ms > 50).length };
}
