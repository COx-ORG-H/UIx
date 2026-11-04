/* Calm kit (2.56) — the glance chart options. Pure: tokens come from the BUILT tokens.css through a
 * reader, so this runs without a DOM. Also checks the styleguide port (guide/chart-analytic.js,
 * bundled from this source) draws the same options. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as theme from './chart-theme.ts';
import * as glance from './chart-glance.ts';
import * as port from '../../tokens/guide/chart-analytic.js';

const css = readFileSync(new URL('../../tokens/build/css/tokens.css', import.meta.url), 'utf8');
const scope = (dark) => {
  const vars = {};
  for (const m of css.matchAll(/(:root(?::where\([^)]*\))?)\s*\{([^}]*)\}/g)) {
    if (m[1] !== ':root' && !dark) continue;
    for (const d of m[2].matchAll(/(--uix-[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
  }
  const read = (token) => {
    const v = vars[token] ?? '';
    const alias = /^var\((--uix-[\w-]+)\)$/.exec(v);
    return alias ? read(alias[1]) : v;
  };
  return read;
};
const light = theme.uixChartTokens(scope(false));
const dark = theme.uixChartTokens(scope(true));

const LINE = {
  categories: ['17. Aug.', '24. Aug.', '31. Aug.', '7. Sept.'],
  values: [20, 21, 60, 85],
  name: 'offen',
  forecast: { categories: ['9. Nov.', '16. Nov.'], values: [102, 140], name: 'erwartet', label: 'Prognose 140' },
};
const BARS = {
  categories: ['Do', 'Fr', 'Sa', 'So', 'Mo', 'Di', 'Mi'],
  series: { name: 'eröffnet', values: [18, 22, 15, 9, 6, 21, 19] },
  comparison: { name: 'gelöst', values: [14, 17, 16, 8, 5, 15, 13] },
};
const PLAY = { play: true, delay: 195, trace: 700, grow: 500, stagger: 25 };

test('the series is chart-1 and the comparison grey; red and amber never encode a series', () => {
  for (const k of [light, dark]) {
    assert.equal(k.series, k.palette[0]);
    assert.deepEqual(k.categories, k.palette.slice(0, 3));
    assert.ok(k.seriesSoft.startsWith('rgba('), k.seriesSoft);
    const bars = glance.pairedBarsOption(k, BARS);
    assert.deepEqual(bars.series.map((s) => s.color), [k.series, k.comparison]);
    const line = glance.glanceLineOption(k, LINE);
    for (const s of [...bars.series, ...line.series]) {
      assert.notEqual(s.color, k.danger);
      assert.notEqual(s.color, k.warning);
    }
  }
});

test('three dashed gridlines, no axis titles, sans axis digits, a dark tooltip', () => {
  for (const k of [light, dark]) {
    const o = glance.glanceLineOption(k, LINE);
    assert.equal(o.yAxis.splitNumber, 3);
    assert.deepEqual(o.yAxis.splitLine.lineStyle.type, [3, 4]);
    assert.equal(o.yAxis.name, undefined);
    assert.equal(o.xAxis.name, undefined);
    assert.equal(o.yAxis.axisLabel.fontFamily, k.fontSans);
    assert.equal(o.xAxis.axisLabel.fontFamily, k.fontSans);
    assert.equal(o.tooltip.backgroundColor, k.text);
    assert.equal(o.tooltip.textStyle.color, k.surface);
    assert.equal(o.tooltip.axisPointer.type, 'line');
    assert.equal(o.legend, undefined, 'one series needs no legend');
  }
  assert.notEqual(glance.glanceLineOption(light, LINE).tooltip.backgroundColor, glance.glanceLineOption(dark, LINE).tooltip.backgroundColor);
});

test('a line is labelled at its end; a forecast continues dashed from the last measured point', () => {
  const plain = glance.glanceLineOption(light, { ...LINE, forecast: undefined });
  assert.equal(plain.series.length, 1);
  const end = plain.series[0].data.at(-1);
  assert.equal(end.value, 85);
  assert.equal(end.label.show, true);
  assert.equal(end.label.formatter(), '85');
  assert.deepEqual(plain.series[0].data.slice(0, -1), [20, 21, 60]);
  assert.equal(glance.glanceLineOption(light, { ...LINE, forecast: undefined, endLabel: false }).series[0].data.at(-1), 85);
  const o = glance.glanceLineOption(light, LINE);
  assert.deepEqual(o.xAxis.data, [...LINE.categories, ...LINE.forecast.categories]);
  assert.deepEqual(o.series[0].data, [20, 21, 60, { value: 85, symbolSize: 8 }, null, null], 'the forecast carries the end label; the last measured point keeps its dot');
  assert.equal(end.symbolSize, 8, 'the endpoint dot');
  assert.equal(o.series[1].data.at(-1).symbolSize, 0);
  assert.deepEqual(o.series[1].data.slice(0, -1), [null, null, null, 85, 102]);
  assert.equal(o.series[1].data.at(-1).value, 140);
  assert.equal(o.series[1].data.at(-1).label.formatter(), 'Prognose 140');
  assert.deepEqual(o.series[1].lineStyle.type, [4, 5]);
  for (const s of [...o.series, ...plain.series]) assert.equal(s.endLabel, undefined, 'no endLabel: it lands on NaN while a forecast draws in');
});

test('the tooltip names the point and its value, escaped', () => {
  const o = glance.glanceLineOption(light, { ...LINE, forecast: undefined, name: '<b>offen</b>', tooltipTitle: (c) => `Woche ab ${c}` });
  const out = o.tooltip.formatter([{ seriesIndex: 0, name: '2. Nov.', seriesName: '<b>offen</b>', value: 85 }]);
  assert.match(out, /Woche ab 2\. Nov\./);
  assert.match(out, /&lt;b&gt;offen&lt;\/b&gt;/);
  assert.match(out, /<span class="uix-glance-tooltip__value">85<\/span>/);
  const bars = glance.pairedBarsOption(light, BARS).tooltip.formatter([
    { name: 'Mi', seriesName: 'eröffnet', value: 19, color: light.series },
    { name: 'Mi', seriesName: 'gelöst', value: 13, color: light.comparison },
  ]);
  assert.match(bars, /eröffnet<span class="uix-glance-tooltip__value">19<\/span>.*gelöst<span class="uix-glance-tooltip__value">13<\/span>/s);
});

test('at rest nothing animates; playing, a line traces and bars grow bucket by bucket; no refresh is animated', () => {
  const rest = glance.pairedBarsOption(light, BARS);
  assert.equal(rest.animation, false);
  assert.equal(rest.animationDurationUpdate, 0);
  const bars = glance.pairedBarsOption(light, BARS, PLAY);
  assert.equal(bars.animation, true);
  assert.equal(bars.animationDurationUpdate, 0);
  assert.equal(bars.series[0].animationDuration, 500);
  assert.deepEqual([0, 1, 6].map((i) => bars.series[0].animationDelay(i)), [195, 220, 345]);
  assert.equal(bars.series[1].animationDelay(0), 220, 'the grey bar follows its blue one');
  const line = glance.glanceLineOption(light, LINE, PLAY);
  assert.equal(line.series[0].animationDuration, 700);
  assert.equal(line.series[0].animationDelay, 195);
  assert.equal(line.series[1].animationDelay, 895, 'the forecast draws after the measured line');
  assert.equal(line.series[1].animationDuration, 350);
});

test('the styleguide port draws the same options', () => {
  for (const k of [light, dark]) {
    const strip = (o) => JSON.parse(JSON.stringify(o));
    assert.deepEqual(strip(port.glanceLineOption(k, LINE, PLAY)), strip(glance.glanceLineOption(k, LINE, PLAY)));
    assert.deepEqual(strip(port.pairedBarsOption(k, BARS)), strip(glance.pairedBarsOption(k, BARS)));
  }
});

test('the right gutter fits the end label', () => {
  assert.equal(glance.glanceLineOption(light, LINE).grid.right, Math.ceil('Prognose 140'.length * 6.5) + 14);
  assert.equal(glance.glanceLineOption(light, { ...LINE, forecast: undefined, endLabel: false }).grid.right, 12);
  assert.equal(glance.glanceLineOption(light, { ...LINE, forecast: undefined }).grid.right, Math.ceil('85'.length * 6.5) + 14);
});
