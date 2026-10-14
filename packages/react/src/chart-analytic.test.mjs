/* HAR-1553 / HAR-1554 — the analytic chart models: stats, overlays, panels and the scatter. Pure, so they
 * run without a DOM (on the BUILT dist — run `npm run build` first; CI does); tokens come from the BUILT tokens.css through a reader (like chart-theme.test.mjs). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as stats from '../dist/chart-stats.js';
import * as model from '../dist/chart-analytic-model.js';
import * as panels from '../dist/chart-panels-model.js';
import * as scatter from '../dist/correlation-scatter-model.js';
import { uixChartTokens } from '../dist/chart-theme.js';

const css = readFileSync(new URL('../../tokens/build/css/tokens.css', import.meta.url), 'utf8');
const vars = {};
for (const m of css.matchAll(/(:root)\s*\{([^}]*)\}/g)) {
  for (const d of m[2].matchAll(/(--uix-[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
}
const tokens = uixChartTokens((token) => vars[token] ?? '');

// ── chart-stats ────────────────────────────────────────────────────────────────────────────────
test('linearFit: a perfect line gives r = 1 and its slope and intercept', () => {
  const fit = stats.linearFit([0, 1, 2, 3, 4].map((x) => ({ x, y: 3 + 2 * x })));
  assert.equal(fit.n, 5);
  assert.ok(Math.abs(fit.slope - 2) < 1e-12);
  assert.ok(Math.abs(fit.intercept - 3) < 1e-12);
  assert.ok(Math.abs(fit.r - 1) < 1e-12);
  assert.equal(fit.residualStdError, 0);
});

test('linearFit matches a known dataset to 1e-9', () => {
  // Anscombe's quartet, set I: slope 0.5001, intercept 3.0001, r 0.81642
  const x = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5];
  const y = [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68];
  const fit = stats.linearFit(x.map((xi, i) => ({ x: xi, y: y[i] })));
  assert.ok(Math.abs(fit.slope - 0.500090909090909) < 1e-9, `slope ${fit.slope}`);
  assert.ok(Math.abs(fit.intercept - 3.000090909090909) < 1e-9, `intercept ${fit.intercept}`);
  assert.ok(Math.abs(fit.r - 0.816420516344985) < 1e-9, `r ${fit.r}`);
});

test('linearFit: fewer than two usable points, or no spread in x, is null — never a fake line', () => {
  assert.equal(stats.linearFit([]), null);
  assert.equal(stats.linearFit([{ x: 1, y: 2 }]), null);
  assert.equal(stats.linearFit([{ x: 1, y: 2 }, { x: Number.NaN, y: 3 }]), null);
  assert.equal(stats.linearFit([{ x: 2, y: 1 }, { x: 2, y: 5 }]), null);
  assert.equal(stats.linearFit([{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }]).r, null, 'r is undefined when y is constant');
});

test('quantiles interpolate between order statistics (type 7)', () => {
  assert.deepEqual(stats.quantiles([1, 2, 3, 4], [0, 0.5, 1]), [1, 2.5, 4]);
  assert.deepEqual(stats.quantiles([10, 1, 7], [0.9]), [9.4]);
  assert.deepEqual(stats.quantiles([], [0.5]), [null]);
});

test('predictionBand widens away from the mean of x and covers the line', () => {
  const fit = stats.linearFit([[1, 2.1], [2, 3.9], [3, 6.2], [4, 7.8], [5, 10.1], [6, 11.9]].map(([x, y]) => ({ x, y })));
  const band = stats.predictionBand(fit, [3.5, 10], 0.8);
  assert.ok(band[0].lower < band[0].y && band[0].y < band[0].upper);
  assert.ok(band[1].upper - band[1].lower > band[0].upper - band[0].lower);
  assert.ok(Math.abs(stats.normalQuantile(0.975) - 1.959963985) < 1e-6);
  assert.ok(Math.abs(stats.studentTQuantile(0.9, 10) - 1.372) < 2e-3);
});

// ── overlays (C2) ──────────────────────────────────────────────────────────────────────────────
const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
const limit = { value: 15, kind: 'limit', tone: 'danger', label: '15h budget', badSide: 'above' };

test('thresholdMarks: a solid reference line labelled in the right gutter, and a toned zone', () => {
  const marks = model.thresholdMarks([limit], { tokens, extent: [0, 24] });
  const line = marks.markLine.data[0];
  assert.equal(line.yAxis, 15);
  assert.equal(line.lineStyle.type, 'solid');
  assert.equal(line.lineStyle.color, tokens.reference);
  assert.equal(line.label.position, 'end');
  assert.equal(line.label.color, tokens.textMuted, 'text wears a text token');
  const [from, to] = marks.markArea.data[0];
  assert.deepEqual([from.yAxis, to.yAxis], [15, 24]);
  assert.equal(from.itemStyle.color, tokens.zoneDanger);
});

test('eventMarks: unlabeled solid lines plus a pin lane; tone is the pin shape, not a hue', () => {
  const events = [
    { at: 'W2', kind: 'Leave', label: 'Reviewer on leave' },
    { at: 'W4', kind: 'Freeze', label: 'Release freeze', tone: 'warning' },
    { at: 'W5', kind: 'Incident', label: 'Major incident', tone: 'danger', href: '/incidents/1' },
  ];
  const marks = model.eventMarks(events, { tokens });
  assert.equal(marks.markLine.data.length, 3);
  assert.ok(marks.markLine.data.every((d) => d.label.show === false && d.lineStyle.type === 'solid'));
  assert.deepEqual(marks.lane.series.data.map((d) => d.symbol), ['circle', 'triangle', 'diamond']);
  assert.equal(marks.lane.series.itemStyle.color, tokens.event);
  assert.deepEqual(marks.lane.series.data[2].value, ['W5', 0, 2]);
});

test('forecastSeries: a hidden lower bound, a stacked band, and the ONLY dashed line', () => {
  const forecast = { from: 'W6', level: 0.8, method: 'linear', points: [
    { x: 'W7', y: 20, lower: 18, upper: 22 }, { x: 'W8', y: 21, lower: 18.5, upper: 23.5 },
    { x: 'W9', y: 22, lower: 19, upper: 25 }, { x: 'W10', y: 23, lower: 19.5, upper: 26.5 },
  ] };
  const series = model.forecastSeries(forecast, { name: 'Residence', tokens, fromValue: 18.7 });
  assert.equal(series.length, 3);
  const [lower, band, centre] = series;
  assert.equal(lower.stack, band.stack);
  assert.equal(lower.lineStyle.opacity, 0);
  assert.deepEqual(band.data[1], ['W7', 4]);
  assert.equal(band.areaStyle.color, tokens.forecastBand);
  assert.equal(centre.lineStyle.type, 'dashed');
  assert.deepEqual(centre.data[0], ['W6', 18.7], 'the projection starts where the actual line ends');
  assert.equal(centre.markArea.data[0][0].label.formatter, 'Projection');
  const ghost = model.comparisonSeries({ label: 'Previous 6 weeks', values: [1, 2, 3, null, 5, 6] }, { x: weeks, tokens });
  assert.equal(ghost.lineStyle.type, 'solid');
  assert.deepEqual(ghost.data[3], ['W4', null]);
});

test('findCrossings / crossingPoints: only the first point of each run on the bad side', () => {
  const values = [10, 16, 17, 12, null, 18, 19];
  assert.deepEqual(model.findCrossings(values, limit), [1]);
  assert.deepEqual(model.findCrossings([10, 16, 12, 18], limit), [1, 3]);
  assert.deepEqual(model.findCrossings([20, 10, 5], { value: 8, kind: 'floor' }), [2]);
  const marks = model.crossingPoints([10, 16, 12, 18], limit, { x: ['a', 'b', 'c', 'd'], tokens, labels: { crossed: (x) => `Überschritten ${x}` } });
  assert.deepEqual(marks.markPoint.data.map((d) => d.label.formatter), ['Überschritten b', 'Überschritten d']);
  // Only the latest crossing is labelled on the line; earlier ones reveal theirs on hover.
  assert.deepEqual(marks.markPoint.data.map((d) => d.label.show), [false, true]);
  assert.equal(marks.markPoint.data[0].emphasis.label.show, true);
  assert.equal(marks.markPoint.data[1].emphasis, undefined);
});

// ── panels (C3) ────────────────────────────────────────────────────────────────────────────────
const spec = {
  x: { type: 'category', values: weeks },
  partialLast: true,
  events: [{ at: 'W3', kind: 'Leave', label: 'Reviewer on leave' }, { at: 'W5', kind: 'Freeze', label: 'Release freeze' }],
  panels: [
    {
      id: 'residence', title: 'Residence', unit: 'h', kind: 'line',
      series: [{ id: 'review', label: 'Review', values: [9, 12, 16, 17, 18, 18.7] }, { id: 'build', label: 'Build', values: [4, 4, 5, 4, 5, 5] }],
      thresholds: [limit],
      comparison: { label: 'Previous period', values: [8, 9, 9, 10, 9, 10] },
      forecast: { from: 'W6', level: 0.8, method: 'linear', points: [{ x: 'W7', y: 20, lower: 18, upper: 22 }, { x: 'W8', y: 21, lower: 18.5, upper: 23.5 }] },
    },
    { id: 'wip', title: 'WIP in review', unit: 'items', kind: 'bar', series: [{ id: 'wip', label: 'WIP', values: [3, 5, 7, 8, 9, 9] }] },
    { id: 'capacity', title: 'Reviewers', kind: 'line', series: [{ id: 'cap', label: 'Reviewers', values: [4, 4, 3, 3, 3, 3] }] },
  ],
};

test('panels: one grid and ONE y axis per panel (no dual axis), all x axes linked to one crosshair', () => {
  const m = panels.chartPanelsModel(spec, tokens);
  const grids = m.option.grid;
  assert.equal(grids.length, 4, 'event lane + 3 panels');
  assert.equal(m.option.yAxis.length, grids.length);
  assert.deepEqual(m.option.yAxis.map((a) => a.gridIndex), [0, 1, 2, 3]);
  assert.deepEqual(m.option.xAxis.map((a) => a.gridIndex), [0, 1, 2, 3]);
  assert.deepEqual(m.option.axisPointer.link, [{ xAxisIndex: 'all' }]);
  assert.equal(m.option.tooltip.trigger, 'axis');
  // plots line up: every grid has the same left and right
  assert.equal(new Set(grids.map((g) => `${g.left}/${g.right}`)).size, 1);
  // the forecast extends the axis past the actual weeks
  assert.deepEqual(m.categories, [...weeks, 'W7', 'W8']);
  // only the bottom panel prints x labels
  assert.deepEqual(m.option.xAxis.map((a) => a.axisLabel.show), [false, false, false, true]);
  assert.equal(m.height, grids.at(-1).top + grids.at(-1).height + panels.CHART_PANELS_LAYOUT.axisBand);
});

test('panels: only projections are dashed; thresholds, events, comparison and data are solid', () => {
  const m = panels.chartPanelsModel(spec, tokens);
  const dashed = [];
  for (const s of m.option.series) {
    if (s.lineStyle?.type === 'dashed') dashed.push(s.id);
    for (const d of s.markLine?.data ?? []) assert.notEqual(d.lineStyle?.type, 'dashed', `${s.id} markLine`);
  }
  assert.deepEqual(dashed, ['residence:forecast-centre']);
});

test('panels: overlays land on the first series of a panel — threshold, crossing, events, partial period', () => {
  const m = panels.chartPanelsModel(spec, tokens);
  const review = m.option.series.find((s) => s.id === 'residence:review');
  assert.ok(review.markLine.data.some((d) => d.yAxis === 15));
  assert.equal(review.markLine.data.filter((d) => d.xAxis != null).length, 2, 'two event lines');
  assert.ok(review.markArea.data.some(([from]) => from.label?.formatter === 'Partial'));
  const wipPartial = m.option.series.find((s) => s.id === 'wip:wip').markArea.data.find(([from]) => from.itemStyle?.color === tokens.partial);
  assert.equal(wipPartial[0].label.show, false, 'the word "Partial" is said once, in the top panel');
  assert.equal(review.markPoint.data.length, 1, 'one crossing');
  const wip = m.option.series.find((s) => s.id === 'wip:wip');
  assert.equal(wip.markLine.data.filter((d) => d.xAxis != null).length, 2, 'event lines run through every panel');
  assert.equal(m.seriesPanel['wip:wip'], 'wip');
  assert.equal(m.laneSeriesId, 'uix-event-lane');
});

test('panels: each panel has a hidden table with lower, upper, threshold and event columns when supplied', () => {
  const m = panels.chartPanelsModel(spec, tokens, { formatValue: (v, unit) => `${v}${unit ?? ''}` });
  assert.equal(m.tables.length, 3);
  const [residence, wip] = m.tables;
  assert.deepEqual(residence.headers, ['Period', 'Review', 'Build', 'Previous period', 'Projection', 'Lower', 'Upper', 'Threshold: 15h budget', 'Event']);
  assert.equal(residence.rows.length, 8);
  assert.equal(residence.rows[6].Upper, '22h');
  assert.equal(residence.rows[2].Event, 'Reviewer on leave');
  assert.deepEqual(wip.headers, ['Period', 'WIP', 'Event']);
});

test('panels: the legend names every role by shape — series lines, the ghost, the projection dash and the range block', () => {
  const m = panels.chartPanelsModel(spec, tokens);
  assert.deepEqual(m.legend.map((i) => [i.label, i.swatch]), [
    ['Review', 'line'], ['Build', 'line'], ['Previous period', 'line'], ['Projection', 'dash'], ['80% range', 'block'],
  ]);
  // a single series with a ghost still names itself, or the ghost has no counterpart
  const single = panels.chartPanelsModel({ ...spec, panels: [{ ...spec.panels[0], series: [spec.panels[0].series[0]] }] }, tokens);
  assert.equal(single.legend[0].label, 'Review');
});

test('panels: the tooltip lists every panel at one x and escapes text', () => {
  const m = panels.chartPanelsModel({ ...spec, events: [{ at: 'W2', kind: 'Note', label: '<b>x</b>' }] }, tokens);
  const html = m.option.tooltip.formatter([{ axisValue: 'W2' }]);
  for (const part of ['Review', 'WIP', 'Reviewers', 'Previous period', '&lt;b&gt;x&lt;/b&gt;']) assert.ok(html.includes(part), part);
  const future = m.option.tooltip.formatter([{ axisValue: 'W7' }]);
  assert.ok(future.includes('Projection (linear)') && future.includes('80% range'));
});

test('niceCeil rounds up to a readable bound', () => {
  assert.deepEqual([0.7, 9.2, 15, 23.1, 130].map(panels.niceCeil), [0.8, 10, 15, 25, 150]);
});

// ── scatter (C3) ───────────────────────────────────────────────────────────────────────────────
const pts = Array.from({ length: 12 }, (_, i) => ({ x: i * 4, y: 2 + i * 1.5 + (i % 3) * 0.4, label: `Week ${i + 1}` }));

test('scatter: below minPoints there is no trend, no stats — the not-enough-data state', () => {
  const m = scatter.correlationScatterModel({ points: pts.slice(0, 5), xLabel: 'WIP', yLabel: 'Residence' }, tokens);
  assert.equal(m.enough, false);
  assert.equal(m.fit, null);
  assert.equal(m.option.series.some((s) => s.id === 'trend'), false);
  assert.equal(scatter.DEFAULT_CORRELATION_SCATTER_LABELS.notEnough(m.n, m.minPoints), 'Not enough data (n = 5 of 8)');
});

test('scatter: trend line, r and n, "association, not cause", percentiles and a breaking point', () => {
  const m = scatter.correlationScatterModel({
    points: pts, xLabel: 'WIP', yLabel: 'Residence', percentiles: [50, 90], breakpoint: { x: 36, label: 'Knee ≈ 9 items' },
  }, tokens);
  assert.equal(m.enough, true);
  assert.ok(m.fit.r > 0.99);
  assert.match(m.statsText, /^r = 0\.99 · n = 12 · association, not cause$/);
  const dots = m.option.series.find((s) => s.id === 'points');
  assert.deepEqual(dots.markLine.data.filter((d) => d.yAxis != null).map((d) => d.label.formatter), ['p50', 'p90']);
  assert.ok(dots.markLine.data.some((d) => d.xAxis === 36 && d.label.formatter === 'Knee ≈ 9 items'));
  assert.equal(m.option.series.find((s) => s.id === 'trend').lineStyle.type, 'solid');
  assert.deepEqual(m.table.headers, ['Point', 'WIP', 'Residence']);
  assert.equal(m.table.rows.length, 12);
});

test('scatter: every point has a 24 px hit target over a smaller dot; emphasis is shape AND hue', () => {
  const m = scatter.correlationScatterModel({ points: [...pts, { x: 50, y: 30, label: 'Breach', emphasis: 'danger' }], xLabel: 'x', yLabel: 'y' }, tokens);
  const hit = m.option.series.find((s) => s.id === m.hitSeriesId);
  assert.equal(hit.symbolSize, scatter.SCATTER_HIT_SIZE);
  assert.ok(scatter.SCATTER_HIT_SIZE >= 24);
  const dots = m.option.series.find((s) => s.id === 'points');
  const breach = dots.data.at(-1);
  assert.equal(breach.symbol, 'diamond');
  assert.equal(breach.itemStyle.color, tokens.danger);
  assert.ok(dots.data[0].symbolSize < 24);
});

test('the model never asks for a second y axis per panel at the type level', () => {
  const src = readFileSync(new URL('./chart-panels-model.ts', import.meta.url), 'utf8');
  const panelType = src.slice(src.indexOf('export interface ChartPanel {'), src.indexOf('}', src.indexOf('export interface ChartPanel {')));
  assert.equal(/yAxis|secondary|axis2|rightAxis/i.test(panelType), false);
});
