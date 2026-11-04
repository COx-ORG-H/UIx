/* guide/charts.js — deterministic ECharts examples themed by guide/chart-theme.js (--uix-* tokens).
   Requires window.echarts (loaded on demand by guide/app.js). */

import { mergeChartTheme, uixChartAreaGradient, uixChartTheme, uixChartTokens } from './chart-theme.js';
import { chartPanelsModel, correlationScatterModel, glanceLineOption, pairedBarsOption, GLANCE_AT_REST } from './chart-analytic.js';
import { ANALYTIC_EXAMPLE, DELIVERY_PANELS, DELIVERY_SCATTER } from './insight-examples.js';

const instances = new Map();
const observers = new Map();

/* Each example is a consumer option: data, series and layout only. Colours, fonts, the solid
   hairline grid, axes and the tooltip come from uixChartTheme(), merged underneath. */
const OPTIONS = {
  residence: (k) => ({
    animationDuration: 320,
    tooltip: { trigger: 'axis', valueFormatter: (value) => `${value}h` },
    grid: { top: 10, right: 76, bottom: 25, left: 12, containLabel: true },
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
      // a threshold is a SOLID reference line (dashes mean projection), labelled in the right gutter
      markLine: {
        silent: true,
        symbol: 'none',
        label: { formatter: '15h budget', position: 'end', color: k.textMuted, fontSize: 11 },
        lineStyle: { color: k.reference, width: 1, type: 'solid' },
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

/* Decision-grade examples (HAR-1553/1554/1556): the shipped ChartPanels / CorrelationScatter models
   (guide/chart-analytic.js is generated from the React source) over guide/insight-examples.js, the
   same data the React harness renders. Each returns { option, height?, statsText? }. */
const MODELS = {
  analytic: (k) => chartPanelsModel(ANALYTIC_EXAMPLE, k),
  'delivery-panels': (k) => chartPanelsModel(DELIVERY_PANELS, k),
  'delivery-scatter': (k) => ({ height: 280, ...correlationScatterModel(DELIVERY_SCATTER, k) }),
};

/** A model example: size the element from the model and fill its stats caption, then theme the option. */
const modelOptionFor = (type, el) => {
  const model = MODELS[type](uixChartTokens(el));
  if (model.height) el.style.height = `${model.height}px`;
  if (model.statsText) {
    document.querySelectorAll(`[data-uix-chart-stats="${type}"]`).forEach((caption) => { caption.textContent = model.statsText; });
  }
  return mergeChartTheme(uixChartTheme(el), model.option);
};

/* Glance charts (calm kit 2.56): the shipped ChartCard options (guide/chart-analytic.js is bundled
   from packages/react/src/chart-glance.ts), drawn as GlanceLineChart / PairedBarChart draw them —
   not merged under the analytic theme. They draw in with their card on the first paint and when
   the arrival is replayed (docs.js), and sit at rest on a theme change. */
const GLANCE = {
  'glance-line': (k, motion) => glanceLineOption(k, {
    categories: ['17. Aug.', '24. Aug.', '31. Aug.', '7. Sept.', '14. Sept.', '21. Sept.', '28. Sept.', '5. Okt.', '12. Okt.', '19. Okt.', '26. Okt.', '2. Nov.'],
    values: [20, 21, 18, 19, 22, 22, 20, 19, 60, 75, 82, 85],
    name: 'offen',
    forecast: { categories: ['9. Nov.', '16. Nov.', '23. Nov.'], values: [102, 121, 140], name: 'erwartet', label: 'Prognose 140' },
    tooltipTitle: (c) => `Woche ab ${c}`,
  }, motion),
  'glance-paired': (k, motion) => pairedBarsOption(k, {
    categories: ['Do', 'Fr', 'Sa', 'So', 'Mo', 'Di', 'Mi'],
    series: { name: 'eröffnet', values: [18, 22, 15, 9, 6, 21, 19] },
    comparison: { name: 'gelöst', values: [14, 17, 16, 8, 5, 15, 13] },
  }, motion),
};

/** The arrival timing for a glance chart in its card, from the tokens (as the React components read them). */
const glanceMotion = (el) => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce') return GLANCE_AT_REST;
  const style = getComputedStyle(el);
  const ms = (name, fallback) => { const v = style.getPropertyValue(name).trim(); const n = Number.parseFloat(v); return Number.isFinite(n) ? (v.endsWith('ms') ? n : n * 1000) : fallback; };
  const index = Number.parseFloat(style.getPropertyValue('--uix-arrive-i')) || 0;
  return { play: true, delay: index * ms('--uix-stagger-arrive', 45) + ms('--uix-delay-arrive-trace', 150), trace: ms('--uix-dur-arrive-trace', 700), grow: ms('--uix-dur-arrive-grow', 500), stagger: ms('--uix-stagger-arrive-grow', 25) };
};

const knownType = (type) => Boolean(OPTIONS[type] || MODELS[type] || GLANCE[type]);

/** The themed option for one example, read from the element's own computed tokens. */
const optionFor = (type, el, motion = GLANCE_AT_REST) => {
  if (GLANCE[type]) return GLANCE[type](uixChartTokens(el), motion);
  if (MODELS[type]) return modelOptionFor(type, el);
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
    if (!knownType(type)) return;
    if (MODELS[type]) el.style.height = `${MODELS[type](uixChartTokens(el)).height ?? 280}px`;
    const chart = ec.init(el, null, { renderer: 'svg' });
    chart.setOption(optionFor(type, el, GLANCE[type] ? glanceMotion(el) : undefined));
    if (GLANCE[type]) el.addEventListener('uix-glance-replay', () => chart.setOption(optionFor(type, el, glanceMotion(el)), { notMerge: true }));
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
    if (knownType(type)) chart.setOption(optionFor(type, el), { notMerge: true });
  });
};
