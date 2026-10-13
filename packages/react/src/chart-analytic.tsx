"use client";

/*
 * @tensor_1/react/chart/analytic (HAR-1553/1554): a tree-shaken ECharts build for decision-grade
 * charts — line, bar, scatter, mark lines/areas/points, a piecewise visual map, inside zoom and a
 * linked axis pointer, SVG only. Budget ≤ 185 kB Brotli (scripts/check-chart-preset-size.mjs); the
 * lean `chart/preset` stays ≤ 170 kB.
 */
import * as echarts from 'echarts/core';
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  AxisPointerComponent,
  DataZoomInsideComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent,
  VisualMapPiecewiseComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { ChartCore } from './components/ChartCore.js';
import type { ChartEngine, ChartProps } from './components/ChartCore.js';
import { ChartPanelsCore, CorrelationScatterCore } from './components/ChartPanels.js';
import type { ChartPanelsProps, CorrelationScatterProps } from './components/ChartPanels.js';

echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  AxisPointerComponent,
  DataZoomInsideComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent,
  VisualMapPiecewiseComponent,
  SVGRenderer,
]);

const analyticEngine = echarts as unknown as ChartEngine;

/** Chart on the analytic build: everything the lean preset has for line and bar, plus the overlays. */
export function Chart(props: ChartProps) {
  return <ChartCore {...props} engine={analyticEngine} />;
}

/** Aligned panels on one x axis with one crosshair; thresholds, events, forecasts, comparison, partial period. */
export function ChartPanels(props: ChartPanelsProps) {
  return <ChartPanelsCore {...props} engine={analyticEngine} />;
}

/** Two variables against each other: dots, OLS trend, r and n, percentiles, thresholds, a breaking point. */
export function CorrelationScatter(props: CorrelationScatterProps) {
  return <CorrelationScatterCore {...props} engine={analyticEngine} />;
}

export { ChartLegend, ChartLegendItem, ChartMetric, DEFAULT_CHART_LABELS, uixChartPalette } from './components/ChartCore.js';
export { mergeChartTheme, uixChartAreaGradient, uixChartTheme, uixChartTokens } from './chart-theme.js';
export {
  DEFAULT_ANALYTIC_LABELS,
  combineMarks,
  comparisonSeries,
  crossingPoints,
  eventMarks,
  findCrossings,
  forecastSeries,
  partialPeriod,
  thresholdMarks,
} from './chart-analytic-model.js';
export { CHART_PANELS_LAYOUT, DEFAULT_CHART_PANELS_LABELS, chartPanelsModel, niceCeil } from './chart-panels-model.js';
export { DEFAULT_CORRELATION_SCATTER_LABELS, SCATTER_HIT_SIZE, correlationScatterModel, formatCorrelation } from './correlation-scatter-model.js';
export { linearFit, normalQuantile, predictionBand, quantiles, studentTQuantile } from './chart-stats.js';
export type { ChartTokenSource, UixChartTokens } from './chart-theme.js';
export type {
  ChartEngine,
  ChartEventHandler,
  ChartLabels,
  ChartLegendItemProps,
  ChartLegendProps,
  ChartMetricProps,
  ChartOption,
  ChartProps,
  ChartTable,
  ChartTableRow,
} from './components/ChartCore.js';
export type { ChartPanelsProps, CorrelationScatterProps } from './components/ChartPanels.js';
export type {
  ChartAnalyticLabels,
  ChartComparison,
  ChartEvent,
  ChartEventLane,
  ChartEventPin,
  ChartForecast,
  ChartMarks,
  ChartThreshold,
  ChartX,
} from './chart-analytic-model.js';
export type {
  ChartPanel,
  ChartPanelSeries,
  ChartPanelsLabels,
  ChartPanelsLegendItem,
  ChartPanelsModel,
  ChartPanelsSpec,
  ChartPanelsTable,
  ChartPanelsX,
} from './chart-panels-model.js';
export type {
  CorrelationPoint,
  CorrelationScatterLabels,
  CorrelationScatterModel,
  CorrelationScatterSpec,
} from './correlation-scatter-model.js';
export type { ChartStatPoint, LinearFit, PredictionBandPoint } from './chart-stats.js';
