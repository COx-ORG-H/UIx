/* Render-contract coverage for the workflow and analytical chrome additions. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Flow, FlowNode, Pipeline, PipelineStage } from '../dist/index.js';
import { Chart, ChartLegend, ChartLegendItem, ChartMetric } from '../dist/chart.js';

test('detailed pipeline exposes ordered current-stage semantics and visible status', () => {
  const html = renderToStaticMarkup(h(Pipeline, { detailed: true, 'aria-label': 'Release pipeline' },
    h(PipelineStage, { label: 'Build', state: 'complete', marker: '1', description: 'Packed', meta: '2m' }),
    h(PipelineStage, { label: 'Review', state: 'blocked', current: true, marker: '2', stateLabel: 'Blocked', description: 'Needs owner' }),
    h(PipelineStage, { label: 'Deploy', state: 'pending' }),
  ));

  assert.match(html, /<ol class="uix-pipeline uix-pipeline--detailed" tabindex="0" aria-label="Release pipeline">/);
  assert.match(html, /data-state="blocked" aria-current="step"/);
  assert.match(html, /Blocked/);
  assert.match(html, /aria-current="step"/);
  assert.match(html, /uix-pipeline__meta/);
  assert.match(html, /<div class="uix-pipeline__title">Deploy<\/div>/);

  const callerManaged = renderToStaticMarkup(h(Pipeline, { detailed: true, tabIndex: -1 },
    h(PipelineStage, { label: 'Build', state: 'complete' }),
  ));
  assert.match(callerManaged, /tabindex="-1"/);
});

test('flow wrappers keep state text and operational metadata in the class contract', () => {
  const html = renderToStaticMarkup(h(Flow, { panel: true, 'aria-label': 'Verification flow' },
    h('div', { className: 'uix-flow__row' },
      h(FlowNode, { title: 'Run checks', state: 'running', eyebrow: 'Gate 2', meta: 'Runner 03', footer: '4m 12s', wide: true }),
    ),
  ));

  assert.match(html, /class="uix-flow uix-flow--linear uix-flow--panel"/);
  assert.match(html, /class="uix-node uix-node--running uix-node--no-icon uix-node--wide"/);
  assert.match(html, /Gate 2/);
  assert.match(html, /Running/);
  assert.match(html, /uix-node__footer/);
});

test('chart adapter composes metric, legend, footer, and accessible data table', () => {
  const headerAction = h(ChartMetric, { value: '18h', label: 'Residence', delta: 'Over budget', deltaTone: 'warning' });
  const footer = h(ChartLegend, null,
    h(ChartLegendItem, { label: 'Observed', color: 'var(--uix-chart-1)', swatch: 'line' }),
  );
  const html = renderToStaticMarkup(h(Chart, {
    option: {}, title: 'Checkpoint residence', subtitle: '14 days', headerAction, footer,
    tableHeaders: ['Day', 'Hours'], tableData: [{ Day: 'Today', Hours: 18 }],
  }));

  assert.match(html, /uix-chart__header/);
  assert.match(html, /uix-chart__metric-value">18h/);
  assert.match(html, /data-tone="warning"/);
  assert.match(html, /aria-label="Checkpoint residence — data table"/);
  assert.match(html, /uix-legend__swatch--line/);
  assert.match(html, /uix-chart__footer/);
});

test('chart empty state replaces the plotting surface without losing its frame', () => {
  const html = renderToStaticMarkup(h(Chart, { option: {}, title: 'No history', empty: 'No measured checkpoints yet.' }));
  assert.match(html, /class="uix-chart"/);
  assert.match(html, /class="uix-chart__plot" data-empty="true"/);
  assert.match(html, /No measured checkpoints yet/);
  assert.doesNotMatch(html, /role="img"/);
});

test('chart loading state is exposed as busy while retaining the eventual plot label', () => {
  const html = renderToStaticMarkup(h(Chart, { option: {}, title: 'Loading history', loading: true }));
  assert.match(html, /data-loading="true" aria-busy="true"/);
  assert.match(html, /role="img" aria-label="Loading history"/);
});
