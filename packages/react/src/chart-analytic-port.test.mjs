/* HAR-1553/1554 — the styleguide's chart models are the shipped ones, bundled. Fails when
 * packages/tokens/guide/chart-analytic.js is stale: run `node packages/react/scripts/port-chart-models.mjs`. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PORT_TARGET, portChartModels } from '../scripts/port-chart-models.mjs';

test('guide/chart-analytic.js is the current bundle of the shipped chart models', async () => {
  const committed = readFileSync(PORT_TARGET, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(committed, await portChartModels(), 'stale: run node packages/react/scripts/port-chart-models.mjs');
});

test('the examples the docs and the harness share render through the port', async () => {
  const port = await import('../../tokens/guide/chart-analytic.js');
  const ex = await import('../../tokens/guide/insight-examples.js');
  const tokens = { palette: Array(8).fill('#000000'), neutral: '', grid: '', axis: '', reference: '', zoneWarning: '', zoneDanger: '', forecastBand: '', event: '', partial: '', comparison: '', warning: '', danger: '', surface: '', text: '', textMuted: '', border: '', fontSans: '', fontMono: '' };
  const analytic = port.chartPanelsModel(ex.ANALYTIC_EXAMPLE, tokens);
  const series = analytic.option.series;
  assert.ok(series.some((s) => s.markArea), 'markArea');
  assert.ok(series.some((s) => s.markLine), 'markLine');
  assert.ok(series.some((s) => s.markPoint), 'markPoint (crossing)');
  assert.equal(ex.ANALYTIC_EXAMPLE.events.length, 3);
  assert.equal(ex.ANALYTIC_EXAMPLE.panels[0].forecast.points.length, 4);
  const delivery = port.chartPanelsModel(ex.DELIVERY_PANELS, tokens);
  assert.equal(delivery.tables.length, 3);
  const scatter = port.correlationScatterModel(ex.DELIVERY_SCATTER, tokens);
  assert.equal(scatter.enough, true);
  assert.ok(scatter.fit.r > 0.8);
  assert.equal(port.correlationScatterModel(ex.SPARSE_SCATTER, tokens).enough, false);
});
