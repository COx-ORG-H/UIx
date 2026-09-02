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

export { uixChartPalette } from './components/ChartCore.js';
export type { ChartProps, ChartTableRow } from './components/ChartCore.js';
