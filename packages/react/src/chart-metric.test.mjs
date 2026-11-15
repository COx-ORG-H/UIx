import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as root from '../dist/index.js';
import { ChartMetric as chartMetric } from '../dist/chart.js';

test('the public root metric renders zero, optional content and independent sentiment', () => {
  assert.equal(typeof root.ChartMetric, 'function');
  assert.equal(root.ChartMetric, chartMetric, 'existing chart imports keep the same component');
  assert.match(renderToStaticMarkup(h(root.ChartMetric, { value: 0 })), /metric-value">0<\/div>/);
  for (const [delta, deltaTone] of [['−12 %', 'positive'], ['+8 %', 'negative'], ['0 %', 'neutral'], ['+2 %', 'warning']]) {
    const html = renderToStaticMarkup(h(root.ChartMetric, { value: '1.234,5', label: 'Vorgänge pro Arbeitsstunde', delta, deltaTone }));
    assert.ok(html.includes('1.234,5'));
    assert.ok(html.includes('Vorgänge pro Arbeitsstunde'));
    assert.ok(html.includes(delta));
    assert.ok(html.includes(`data-tone="${deltaTone}"`));
  }
});

test('alignment is opt-in and never leaks a raw align attribute', () => {
  assert.equal(typeof root.ChartMetric, 'function');
  const defaultHtml = renderToStaticMarkup(h(root.ChartMetric, { value: '0' }));
  assert.doesNotMatch(defaultHtml, /data-align| align=/);
  assert.doesNotMatch(defaultHtml, /metric-label|chart__delta/);
  for (const align of ['start', 'end']) {
    const html = renderToStaticMarkup(h(root.ChartMetric, { value: '42', align, 'aria-label': 'Wert', className: 'caller' }));
    assert.match(html, new RegExp(`data-align="${align}"`));
    assert.match(html, /aria-label="Wert"/);
    assert.match(html, /uix-chart__metric caller/);
    assert.doesNotMatch(html, / align=/);
  }
});
