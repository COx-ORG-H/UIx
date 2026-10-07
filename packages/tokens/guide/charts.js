/* guide/charts.js — deterministic ECharts examples themed by guide/chart-theme.js (--uix-* tokens).
   Requires window.echarts (loaded on demand by guide/app.js). */

import { mergeChartTheme, uixChartAreaGradient, uixChartTheme, uixChartTokens } from './chart-theme.js';

const instances = new Map();
const observers = new Map();

/* Each example is a consumer option: data, series and layout only. Colours, fonts, the solid
   hairline grid, axes and the tooltip come from uixChartTheme(), merged underneath. */
const OPTIONS = {
  residence: (k) => ({
    animationDuration: 320,
    tooltip: { trigger: 'axis', valueFormatter: (value) => `${value}h` },
    grid: { top: 10, right: 18, bottom: 25, left: 12, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['Aug 25', '26', '27', '28', '29', '30', '31', 'Sep 1', '2', '3', '4', '5', '6', 'Today'],
      splitLine: { show: false },
      axisLabel: { interval: 2 },
    },
    yAxis: { type: 'value', min: 0, max: 24, interval: 6, axisLabel: { formatter: '{value}h' } },
    series: [{
      name: 'Residence',
      type: 'line',
      smooth: .24,
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: false,
      data: [8, 7, 9, 8, 10, 11, 9, 12, 11, 13, 16, 17, 16, 18.7],
      lineStyle: { width: 2 },
      itemStyle: { borderColor: k.surface, borderWidth: 2 },
      areaStyle: { color: uixChartAreaGradient(k.palette[0]) },
      // a threshold is the one dashed line on the plot; neutral reference ink, not a status hue
      markLine: {
        silent: true,
        symbol: 'none',
        label: { formatter: '15h budget', position: 'insideEndTop', color: k.reference, fontSize: 11 },
        lineStyle: { color: k.reference, width: 1, type: 'dashed' },
        data: [{ yAxis: 15 }],
      },
      emphasis: { focus: 'series', lineStyle: { width: 3 } },
    }],
  }),

  throughput: (k) => ({
    animationDuration: 280,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, left: 0 },
    grid: { top: 34, right: 8, bottom: 22, left: 8, containLabel: true },
    xAxis: { type: 'category', data: ['W31', 'W32', 'W33', 'W34', 'W35', 'W36', 'W37', 'W38'], splitLine: { show: false } },
    yAxis: { type: 'value', splitNumber: 3 },
    series: [
      // slots 1-3 in fixed order, a 2px surface gap between stacked segments
      { name: 'Merged', type: 'bar', stack: 'flow', data: [12, 15, 14, 18, 16, 20, 21, 24], itemStyle: { borderRadius: [3, 3, 0, 0], borderColor: k.surface, borderWidth: 1 }, barMaxWidth: 24 },
      { name: 'Reviewed', type: 'bar', stack: 'flow', data: [5, 4, 6, 5, 7, 5, 6, 5], itemStyle: { borderColor: k.surface, borderWidth: 1 }, barMaxWidth: 24 },
      { name: 'Returned', type: 'bar', stack: 'flow', data: [3, 2, 4, 2, 3, 2, 2, 1], itemStyle: { borderColor: k.surface, borderWidth: 1 }, barMaxWidth: 24 },
    ],
  }),

  donut: (k, status) => ({
    animationDuration: 300,
    // these slices MEAN outcomes, so they wear status tokens (never mixed with categorical slots)
    color: [status.success, status.attention, status.warning, status.danger],
    tooltip: { trigger: 'item', formatter: '{b}: {c} runs ({d}%)' },
    title: [
      { text: '63%', left: 'center', top: '31%', textStyle: { color: k.text, fontFamily: k.fontMono, fontSize: 24, fontWeight: 600 } },
      { text: 'successful', left: 'center', top: '48%', textStyle: { color: k.textMuted, fontFamily: k.fontSans, fontSize: 11, fontWeight: 400 } },
    ],
    legend: { orient: 'vertical', right: 0, top: 'middle', itemWidth: 10, itemHeight: 10, itemGap: 10 },
    series: [{
      type: 'pie',
      radius: ['54%', '76%'],
      center: ['34%', '46%'],
      startAngle: 90,
      padAngle: 2,
      data: [
        { value: 19, name: 'Successful' },
        { value: 6, name: 'Tests' },
        { value: 3, name: 'Review' },
        { value: 2, name: 'Deploy' },
      ],
      label: { show: false },
      itemStyle: { borderColor: k.surface, borderWidth: 2, borderRadius: 4 },
      emphasis: { scaleSize: 5 },
    }],
  }),
};

/** The themed option for one example, read from the element's own computed tokens. */
const optionFor = (type, el) => {
  const style = getComputedStyle(el);
  const status = Object.fromEntries(['success', 'attention', 'warning', 'danger']
    .map((tone) => [tone, style.getPropertyValue(`--uix-${tone}-solid`).trim()]));
  return mergeChartTheme(uixChartTheme(el), OPTIONS[type](uixChartTokens(el), status));
};

export const initCharts = () => {
  const ec = window.echarts;
  if (!ec) return;
  document.querySelectorAll('[data-uix-chart]').forEach((el) => {
    if (instances.has(el)) return;
    const type = el.dataset.uixChart;
    if (!OPTIONS[type]) return;
    const chart = ec.init(el, null, { renderer: 'svg' });
    chart.setOption(optionFor(type, el));
    instances.set(el, chart);
    let frame = 0;
    let width = el.clientWidth;
    let height = el.clientHeight;
    const ro = new ResizeObserver(() => {
      const nextWidth = el.clientWidth;
      const nextHeight = el.clientHeight;
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        chart.resize();
      });
    });
    observers.set(el, { ro, cancel: () => frame && cancelAnimationFrame(frame) });
    ro.observe(el);
  });
};

export const refreshCharts = () => {
  instances.forEach((chart, el) => {
    if (!el.isConnected) {
      observers.get(el)?.ro.disconnect();
      observers.get(el)?.cancel();
      observers.delete(el);
      chart.dispose();
      instances.delete(el);
      return;
    }
    const type = el.dataset.uixChart;
    if (OPTIONS[type]) chart.setOption(optionFor(type, el), { notMerge: true });
  });
};
