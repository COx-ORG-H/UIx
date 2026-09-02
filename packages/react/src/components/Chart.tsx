"use client";

import * as echarts from 'echarts';
import { ChartCore } from './ChartCore.js';
import type { ChartProps } from './ChartCore.js';

export { uixChartPalette } from './ChartCore.js';
export type { ChartProps, ChartTableRow } from './ChartCore.js';

/** Full-compatibility adapter. Use `@tensor_1/react/chart/preset` for the lean preset. */
export function Chart(props: ChartProps) {
  return <ChartCore {...props} engine={echarts} />;
}
