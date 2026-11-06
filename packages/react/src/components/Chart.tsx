"use client";

import * as echarts from 'echarts';
import { ChartCore } from './ChartCore.js';
import type { ChartProps } from './ChartCore.js';
import { GlanceLineChartCore, PairedBarChartCore } from './GlanceCharts.js';
import type { GlanceLineChartProps, PairedBarChartProps } from './GlanceCharts.js';

export { ChartLegend, ChartLegendItem, ChartMetric, DEFAULT_CHART_LABELS, uixChartPalette } from './ChartCore.js';
export { mergeChartTheme, uixChartAreaGradient, uixChartTheme, uixChartTokens } from '../chart-theme.js';
export type { ChartTokenSource, UixChartTokens } from '../chart-theme.js';
export { GLANCE_AT_REST, PAIRED_BARS_MAX_BUCKETS, glanceLineOption, pairedBarsOption, uixGlanceBase } from '../chart-glance.js';
export type { GlanceFormat, GlanceLineInput, GlanceMotion, PairedBarsInput } from '../chart-glance.js';
export type { GlanceChartBaseProps, GlanceLineChartProps, PairedBarChartProps } from './GlanceCharts.js';
export type { ChartEventHandler, ChartLabels, ChartLegendItemProps, ChartLegendProps, ChartMetricProps, ChartOption, ChartProps, ChartTable, ChartTableRow } from './ChartCore.js';

/** Full-compatibility adapter. Use `@tensor_1/react/chart/preset` for the lean preset. */
export function Chart(props: ChartProps) {
  return <ChartCore {...props} engine={echarts} />;
}

/** A glance line (calm kit 2.56): one series in the series blue, labelled at its end, an optional dashed forecast. Put it in a `ChartCard`. */
export function GlanceLineChart(props: GlanceLineChartProps) {
  return <GlanceLineChartCore {...props} engine={echarts} />;
}

/** Paired bars (calm kit 2.56): per bucket the measure in blue beside its grey comparison, up to 12 buckets. Put it in a `ChartCard`. */
export function PairedBarChart(props: PairedBarChartProps) {
  return <PairedBarChartCore {...props} engine={echarts} />;
}
