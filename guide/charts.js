/* guide/charts.js — ECharts instances wired to --uix-chart-* CSS tokens.
   Requires window.echarts (loaded via CDN <script> in index.html). */

const instances = new Map();

const tok = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const palette = () => [1, 2, 3, 4, 5, 6, 7, 8].map((i) => tok(`--uix-chart-${i}`));
const font = () => tok('--uix-font-sans').replace(/"/g, '');

const textStyle = () => ({ color: tok('--uix-text-muted'), fontFamily: font(), fontSize: 11 });

const axisBase = () => ({
  axisLine: { lineStyle: { color: tok('--uix-border-strong') } },
  axisTick: { show: false },
  axisLabel: { color: tok('--uix-text-muted'), fontFamily: font(), fontSize: 11 },
  splitLine: { lineStyle: { color: tok('--uix-border'), type: 'dashed' } },
});

const tip = () => ({
  backgroundColor: tok('--uix-surface'),
  borderColor: tok('--uix-border-strong'),
  borderWidth: 1,
  textStyle: { color: tok('--uix-text'), fontFamily: font(), fontSize: 12 },
  extraCssText: `border-radius:${tok('--uix-radius-sm')};box-shadow:${tok('--uix-shadow-popover')}`,
});

const areaGrad = (hex) => ({
  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
  colorStops: [{ offset: 0, color: hex + '40' }, { offset: 1, color: hex + '00' }],
});

const OPTIONS = {
  donut: (p) => ({
    backgroundColor: 'transparent',
    color: p,
    tooltip: { ...tip(), trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: {
      orient: 'horizontal', bottom: 0,
      textStyle: textStyle(), icon: 'roundRect',
      itemWidth: 10, itemHeight: 10, itemGap: 12,
    },
    series: [{
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '44%'],
      data: [
        { value: 41, name: 'Network' },
        { value: 28, name: 'Access' },
        { value: 21, name: 'Email' },
        { value: 22, name: 'Hardware' },
        { value: 16, name: 'Other' },
      ],
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,.18)' } },
    }],
  }),

  bar: (p) => ({
    backgroundColor: 'transparent',
    color: p,
    tooltip: { ...tip(), trigger: 'axis' },
    grid: { top: 8, right: 8, bottom: 28, left: 32, containLabel: true },
    xAxis: {
      ...axisBase(),
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      splitLine: { show: false },
    },
    yAxis: { ...axisBase(), type: 'value', splitNumber: 3 },
    series: [{
      name: 'Tickets',
      type: 'bar',
      data: [18, 28, 22, 35, 30, 12, 10],
      itemStyle: { borderRadius: [4, 4, 0, 0], color: p[2] },
      emphasis: { itemStyle: { color: p[0] } },
    }],
  }),

  area: (p) => ({
    backgroundColor: 'transparent',
    color: p,
    tooltip: { ...tip(), trigger: 'axis' },
    legend: {
      top: 0, right: 0,
      textStyle: textStyle(), icon: 'roundRect',
      itemWidth: 10, itemHeight: 3, itemGap: 12,
    },
    grid: { top: 28, right: 8, bottom: 28, left: 32, containLabel: true },
    xAxis: {
      ...axisBase(),
      type: 'category',
      data: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7'],
      boundaryGap: false,
      splitLine: { show: false },
    },
    yAxis: { ...axisBase(), type: 'value', splitNumber: 3 },
    series: [
      {
        name: 'P1',
        type: 'line', smooth: true,
        data: [22, 18, 20, 14, 16, 10, 12],
        lineStyle: { color: p[0], width: 2 },
        itemStyle: { color: p[0] },
        areaStyle: { color: areaGrad(p[0]) },
        symbol: 'circle', symbolSize: 5,
      },
      {
        name: 'P2',
        type: 'line', smooth: true,
        data: [12, 14, 10, 12, 8, 10, 7],
        lineStyle: { color: p[1], width: 2 },
        itemStyle: { color: p[1] },
        areaStyle: { color: areaGrad(p[1]) },
        symbol: 'circle', symbolSize: 5,
      },
    ],
  }),
};

export const initCharts = () => {
  const ec = window.echarts;
  if (!ec) return;
  const p = palette();
  const ro = new ResizeObserver(() => instances.forEach((c) => c.resize()));
  document.querySelectorAll('[data-uix-chart]').forEach((el) => {
    const type = el.dataset.uixChart;
    if (!OPTIONS[type]) return;
    const chart = ec.init(el, null, { renderer: 'svg' });
    chart.setOption(OPTIONS[type](p));
    instances.set(el, chart);
    ro.observe(el);
  });
};

export const refreshCharts = () => {
  const p = palette();
  instances.forEach((chart, el) => {
    const type = el.dataset.uixChart;
    if (OPTIONS[type]) chart.setOption(OPTIONS[type](p));
  });
};
