/* Live harness for the UIx chart theme (HAR-1552), bundled by build.mjs from source for
 * tests/a11y/chart-theme.spec.mjs.
 *   - #plain: a line + bar chart whose option has data and series ONLY: no colour, font, grid or
 *     tooltip styling. Everything it looks like must come from uixChartTheme().
 *   - #raw: the same option with theme="none", the control.
 * window.__chartInits counts engine inits, so the spec can prove a theme flip does not remount. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { ECharts } from 'echarts';
import { Chart } from '../../packages/react/src/chart.js';

declare global {
  interface Window { __chartInits: Record<string, number>; __charts: Record<string, ECharts> }
}
window.__chartInits = {};
window.__charts = {};

const weeks = ['W31', 'W32', 'W33', 'W34', 'W35', 'W36', 'W37', 'W38'];
const option = {
  tooltip: { trigger: 'axis' as const },
  legend: {},
  xAxis: { type: 'category' as const, data: weeks },
  yAxis: { type: 'value' as const },
  series: [
    { name: 'Merged', type: 'line' as const, data: [12, 15, 14, 18, 16, 20, 21, 24] },
    { name: 'Returned', type: 'bar' as const, data: [3, 2, 4, 2, 3, 2, 2, 1] },
  ],
};
const ready = (id: string) => (chart: ECharts) => {
  window.__chartInits[id] = (window.__chartInits[id] ?? 0) + 1;
  window.__charts[id] = chart;
};

function Harness() {
  return (
    <>
      <section id="plain" aria-label="Themed chart">
        <Chart title="Throughput (themed)" option={option} height={260} onReady={ready('plain')} />
      </section>
      <section id="raw" aria-label="Unthemed chart">
        <Chart title="Throughput (theme none)" option={option} height={260} theme="none" onReady={ready('raw')} />
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
