"use client";

import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  TransformComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { ChartCore } from './components/ChartCore.js';
import type { ChartEngine, ChartProps } from './components/ChartCore.js';
import { GlanceLineChartCore, PairedBarChartCore } from './components/GlanceCharts.js';
import type { GlanceLineChartProps, PairedBarChartProps } from './components/GlanceCharts.js';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  TransformComponent,
  SVGRenderer,
]);

const presetEngine = echarts as unknown as ChartEngine;

/** Lean SVG adapter: line, bar, pie, dataset, grid, legend, title, and tooltip. */
export function Chart(props: ChartProps) {
  return <ChartCore {...props} engine={presetEngine} />;
}

/** A glance line (calm kit 2.56) on the lean preset. Put it in a `ChartCard`. */
export function GlanceLineChart(props: GlanceLineChartProps) {
  return <GlanceLineChartCore {...props} engine={presetEngine} />;
}

/** Paired bars (calm kit 2.56) on the lean preset, up to 12 buckets. Put it in a `ChartCard`. */
export function PairedBarChart(props: PairedBarChartProps) {
  return <PairedBarChartCore {...props} engine={presetEngine} />;
}

export { ChartLegend, ChartLegendItem, ChartMetric, DEFAULT_CHART_LABELS, uixChartPalette } from './components/ChartCore.js';
export { mergeChartTheme, uixChartAreaGradient, uixChartTheme, uixChartTokens } from './chart-theme.js';
export type { ChartTokenSource, UixChartTokens } from './chart-theme.js';
export { GLANCE_AT_REST, PAIRED_BARS_MAX_BUCKETS, glanceLineOption, pairedBarsOption, uixGlanceBase } from './chart-glance.js';
export type { GlanceFormat, GlanceLineInput, GlanceMotion, PairedBarsInput } from './chart-glance.js';
export type { GlanceChartBaseProps, GlanceLineChartProps, PairedBarChartProps } from './components/GlanceCharts.js';
export type { ChartEventHandler, ChartLabels, ChartLegendItemProps, ChartLegendProps, ChartMetricProps, ChartOption, ChartProps, ChartTable, ChartTableRow } from './components/ChartCore.js';
