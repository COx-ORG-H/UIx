/* HAR-1552 — the UIx chart theme. Pure: tokens come from the BUILT tokens.css through a reader, so
 * this runs without a DOM. Also locks the vanilla styleguide's port (packages/tokens/guide/chart-theme.js)
 * to the shipped source, so the docs charts and the React charts cannot drift apart. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as shipped from './chart-theme.ts';
import * as guide from '../../tokens/guide/chart-theme.js';

const css = readFileSync(new URL('../../tokens/build/css/tokens.css', import.meta.url), 'utf8');
const scope = (dark) => {
  const vars = {};
  for (const m of css.matchAll(/(:root(?::where\([^)]*\))?)\s*\{([^}]*)\}/g)) {
    if (m[1] !== ':root' && !dark) continue;
    for (const d of m[2].matchAll(/(--uix-[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
  }
  return (token) => vars[token] ?? '';
};
const light = scope(false);
const dark = scope(true);

test('the theme draws a SOLID hairline grid from --uix-chart-grid, never a dashed one', () => {
  for (const read of [light, dark]) {
    const theme = shipped.uixChartTheme(read);
    for (const axis of [theme.xAxis, theme.yAxis]) {
      assert.equal(axis.splitLine.lineStyle.type, 'solid');
      assert.equal(axis.splitLine.lineStyle.width, 1);
      assert.equal(axis.splitLine.lineStyle.color, read('--uix-chart-grid'));
      assert.equal(axis.axisTick.show, false);
    }
  }
  assert.notEqual(shipped.uixChartTheme(light).yAxis.splitLine.lineStyle.color, shipped.uixChartTheme(dark).yAxis.splitLine.lineStyle.color);
});

test('palette, fonts and tooltip come from tokens; text wears text tokens', () => {
  const theme = shipped.uixChartTheme(dark);
  assert.deepEqual(theme.color, [1, 2, 3, 4, 5, 6, 7, 8].map((i) => dark(`--uix-chart-${i}`)));
  assert.equal(theme.color.length, 8);
  assert.ok(theme.color.every((c) => /^#[0-9A-F]{6}$/i.test(c)), `palette resolved: ${theme.color}`);
  assert.equal(theme.textStyle.fontFamily, dark('--uix-font-sans').replace(/"/g, ''));
  assert.equal(theme.xAxis.axisLabel.color, dark('--uix-text-muted'));
  assert.equal(theme.tooltip.backgroundColor, dark('--uix-surface'));
  assert.equal(theme.tooltip.textStyle.color, dark('--uix-text'));
  assert.equal(theme.tooltip.borderColor, dark('--uix-border-strong'));
  assert.equal(theme.backgroundColor, 'transparent');
});

test('uixChartTokens exposes every analytic role, resolved in both modes', () => {
  for (const read of [light, dark]) {
    const k = shipped.uixChartTokens(read);
    for (const role of ['grid', 'axis', 'reference', 'zoneWarning', 'zoneDanger', 'forecastBand', 'event', 'partial', 'comparison']) {
      assert.ok(k[role], `${role} resolved`);
    }
  }
});

test('mergeChartTheme: the consumer wins, plain objects merge deeply, arrays are the consumer\'s', () => {
  const theme = shipped.uixChartTheme(light);
  const merged = shipped.mergeChartTheme(theme, {
    color: ['#123456'],
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', splitLine: { show: false } },
    yAxis: [{ type: 'value' }, { type: 'value', axisLabel: { color: '#ff0000' } }],
    series: [{ type: 'line', data: [1, 2] }],
  });
  assert.deepEqual(merged.color, ['#123456']);
  assert.equal(merged.tooltip.trigger, 'axis');
  assert.equal(merged.tooltip.backgroundColor, light('--uix-surface'));
  assert.equal(merged.xAxis.type, 'category');
  assert.equal(merged.xAxis.splitLine.show, false);
  assert.equal(merged.xAxis.splitLine.lineStyle.type, 'solid');
  assert.equal(merged.yAxis.length, 2);
  assert.equal(merged.yAxis[0].splitLine.lineStyle.type, 'solid');
  assert.equal(merged.yAxis[1].axisLabel.color, '#ff0000');
  assert.equal(merged.yAxis[1].axisLabel.fontFamily, light('--uix-font-mono').replace(/"/g, ''));
  assert.deepEqual(merged.series, [{ type: 'line', data: [1, 2] }]);
  // the theme object itself is never mutated
  assert.equal(theme.xAxis.splitLine.show, undefined);
});

test('mergeChartTheme adds no axes to an option without them (pie, gauge)', () => {
  const merged = shipped.mergeChartTheme(shipped.uixChartTheme(light), { series: [{ type: 'pie', data: [] }] });
  assert.equal('xAxis' in merged, false);
  assert.equal('yAxis' in merged, false);
});

test('uixChartAreaGradient fades the series colour to transparent', () => {
  const g = shipped.uixChartAreaGradient('#0455E6');
  assert.deepEqual(g.colorStops.map((s) => s.color), ['rgba(4,85,230,0.28)', 'rgba(4,85,230,0.06)', 'rgba(4,85,230,0)']);
});

test('the styleguide port produces exactly what the shipped theme produces', () => {
  const option = { xAxis: [{ type: 'category' }], yAxis: { type: 'value' }, series: [{ type: 'bar', data: [3] }], tooltip: { trigger: 'axis' } };
  for (const read of [light, dark]) {
    assert.deepEqual(guide.uixChartTheme(read), shipped.uixChartTheme(read));
    assert.deepEqual(guide.uixChartTokens(read), shipped.uixChartTokens(read));
    assert.deepEqual(guide.mergeChartTheme(guide.uixChartTheme(read), option), shipped.mergeChartTheme(shipped.uixChartTheme(read), option));
  }
  assert.deepEqual(guide.uixChartAreaGradient('#3280FC'), shipped.uixChartAreaGradient('#3280FC'));
});

test('the styleguide examples keep no hand-rolled styling helpers', () => {
  const src = readFileSync(new URL('../../tokens/guide/charts.js', import.meta.url), 'utf8');
  for (const helper of ['axisBase', 'const tip', 'const textStyle', 'areaGrad', 'const alpha', "type: 'dashed' } },\n  splitLine"]) {
    assert.equal(src.includes(helper), false, `guide/charts.js still defines ${helper}`);
  }
  assert.match(src, /mergeChartTheme\(uixChartTheme\(el\)/);
  // the only dashed stroke left is the threshold markLine
  assert.equal((src.match(/type: 'dashed'/g) ?? []).length, 1);
});
