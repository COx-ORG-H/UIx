/* guide/charts.js — deterministic ECharts examples wired to --uix-* tokens.
   Requires window.echarts (loaded on demand by guide/app.js). */

const instances = new Map();
const observers = new Map();

const tok = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const palette = () => [1, 2, 3, 4, 5, 6, 7, 8].map((i) => tok(`--uix-chart-${i}`));
const font = () => tok('--uix-font-sans').replace(/"/g, '');
const mono = () => tok('--uix-font-mono').replace(/"/g, '');

const textStyle = () => ({ color: tok('--uix-text-muted'), fontFamily: font(), fontSize: 11 });
const axisBase = () => ({
  axisLine: { lineStyle: { color: tok('--uix-border-strong') } },
  axisTick: { show: false },
  axisLabel: { color: tok('--uix-text-muted'), fontFamily: mono(), fontSize: 10 },
  splitLine: { lineStyle: { color: tok('--uix-border'), type: 'dashed' } },
});
const tip = () => ({
  backgroundColor: tok('--uix-surface'),
  borderColor: tok('--uix-border-strong'),
  borderWidth: 1,
  padding: [8, 10],
  textStyle: { color: tok('--uix-text'), fontFamily: font(), fontSize: 12 },
  extraCssText: `border-radius:${tok('--uix-radius-sm')};box-shadow:${tok('--uix-shadow-popover')}`,
});
const alpha = (hex, opacity) => {
  const value = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return hex;
  const channels = value.match(/.{2}/g).map((channel) => Number.parseInt(channel, 16));
  return `rgba(${channels[0]},${channels[1]},${channels[2]},${opacity})`;
};
const areaGrad = (hex) => ({
  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
  colorStops: [{ offset: 0, color: alpha(hex, .28) }, { offset: .72, color: alpha(hex, .06) }, { offset: 1, color: alpha(hex, 0) }],
});

const OPTIONS = {
  residence: (p) => ({
    backgroundColor: 'transparent',
    animationDuration: 320,
    color: p,
    tooltip: { ...tip(), trigger: 'axis', valueFormatter: (value) => `${value}h` },
    grid: { top: 10, right: 18, bottom: 25, left: 12, containLabel: true },
    xAxis: {
      ...axisBase(),
      type: 'category',
      boundaryGap: false,
      data: ['Aug 25', '26', '27', '28', '29', '30', '31', 'Sep 1', '2', '3', '4', '5', '6', 'Today'],
      splitLine: { show: false },
      axisLabel: { ...axisBase().axisLabel, interval: 2 },
    },
    yAxis: {
      ...axisBase(),
      type: 'value',
      min: 0,
      max: 24,
      interval: 6,
      axisLabel: { ...axisBase().axisLabel, formatter: '{value}h' },
    },
    series: [{
      name: 'Residence',
      type: 'line',
      smooth: .24,
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: false,
      data: [8, 7, 9, 8, 10, 11, 9, 12, 11, 13, 16, 17, 16, 18.7],
      lineStyle: { color: p[0], width: 2.5 },
      itemStyle: { color: p[0], borderColor: tok('--uix-surface'), borderWidth: 2 },
      areaStyle: { color: areaGrad(p[0]) },
      markLine: {
        silent: true,
        symbol: 'none',
        label: { formatter: '15h budget', position: 'insideEndTop', color: tok('--uix-warning-text'), fontFamily: font(), fontSize: 11 },
        lineStyle: { color: tok('--uix-warning'), width: 1.5, type: 'dashed' },
        data: [{ yAxis: 15 }],
      },
      emphasis: { focus: 'series', lineStyle: { width: 3 } },
    }],
  }),

  throughput: (p) => ({
    backgroundColor: 'transparent',
    animationDuration: 280,
    color: p,
    tooltip: { ...tip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, left: 0, textStyle: textStyle(), icon: 'roundRect', itemWidth: 10, itemHeight: 6, itemGap: 12 },
    grid: { top: 34, right: 8, bottom: 22, left: 8, containLabel: true },
    xAxis: { ...axisBase(), type: 'category', data: ['W31', 'W32', 'W33', 'W34', 'W35', 'W36', 'W37', 'W38'], splitLine: { show: false } },
    yAxis: { ...axisBase(), type: 'value', splitNumber: 3 },
    series: [
      { name: 'Merged', type: 'bar', stack: 'flow', data: [12, 15, 14, 18, 16, 20, 21, 24], itemStyle: { color: p[0], borderRadius: [3, 3, 0, 0] }, barMaxWidth: 24 },
      { name: 'Reviewed', type: 'bar', stack: 'flow', data: [5, 4, 6, 5, 7, 5, 6, 5], itemStyle: { color: p[2] }, barMaxWidth: 24 },
      { name: 'Returned', type: 'bar', stack: 'flow', data: [3, 2, 4, 2, 3, 2, 2, 1], itemStyle: { color: p[4] }, barMaxWidth: 24 },
    ],
  }),

  donut: (p) => ({
    backgroundColor: 'transparent',
    animationDuration: 300,
    color: [tok('--uix-success'), p[4], tok('--uix-warning'), tok('--uix-danger')],
    tooltip: { ...tip(), trigger: 'item', formatter: '{b}: {c} runs ({d}%)' },
    title: [
      { text: '63%', left: 'center', top: '31%', textStyle: { color: tok('--uix-text'), fontFamily: mono(), fontSize: 24, fontWeight: 600 } },
      { text: 'successful', left: 'center', top: '48%', textStyle: { color: tok('--uix-text-muted'), fontFamily: font(), fontSize: 11, fontWeight: 400 } },
    ],
    legend: { orient: 'vertical', right: 0, top: 'middle', textStyle: textStyle(), icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 10 },
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
      itemStyle: { borderColor: tok('--uix-surface'), borderWidth: 2, borderRadius: 4 },
      emphasis: { scaleSize: 5, itemStyle: { shadowBlur: 10, shadowColor: alpha(tok('--uix-text'), .14) } },
    }],
  }),
};

export const initCharts = () => {
  const ec = window.echarts;
  if (!ec) return;
  const p = palette();
  document.querySelectorAll('[data-uix-chart]').forEach((el) => {
    if (instances.has(el)) return;
    const type = el.dataset.uixChart;
    if (!OPTIONS[type]) return;
    const chart = ec.init(el, null, { renderer: 'svg' });
    chart.setOption(OPTIONS[type](p));
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
  const p = palette();
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
    if (OPTIONS[type]) chart.setOption(OPTIONS[type](p), { notMerge: true });
  });
};
