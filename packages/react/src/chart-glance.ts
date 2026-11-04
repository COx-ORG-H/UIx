/*
 * Glance charts (calm kit 2.56): the ECharts options behind GlanceLineChart and PairedBarChart.
 * Pure functions of the chart tokens, with no ECharts import, so the vanilla styleguide ports this
 * module 1:1 (packages/tokens/guide/chart-glance.js) and chart-glance.test.mjs locks the two.
 *
 * The grammar of a glance chart, from the calm-home proposal:
 * - one series in the series blue; a second one, if any, is the grey comparison;
 * - a line is labelled at its end, so one series needs no legend;
 * - three dashed gridlines and no axis titles; axis digits in the UI face (chart-card.css adds
 *   tabular figures);
 * - hovering shows a small dark tooltip and a crosshair with the exact values;
 * - red never encodes a series;
 * - it draws in once (a line traces, bars grow from the baseline) and never animates a refresh.
 */
import type { EChartsOption } from 'echarts';
import type { UixChartTokens } from './chart-theme.js';

/** How a glance chart draws in. `play: false` (the default) draws it at rest, with no animation. */
export interface GlanceMotion {
  play: boolean;
  /** When the chart starts drawing, after its card started (ms). */
  delay: number;
  /** A line tracing in (ms). */
  trace: number;
  /** One bar growing (ms). */
  grow: number;
  /** The gap between one bucket starting to grow and the next (ms). */
  stagger: number;
}

export const GLANCE_AT_REST: GlanceMotion = { play: false, delay: 0, trace: 0, grow: 0, stagger: 0 };

const escapeHtml = (value: unknown) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Formats a value for the tooltip and the end label. */
export type GlanceFormat = (value: number) => string;

const plain: GlanceFormat = (value) => value.toLocaleString();

interface TooltipRow { color: string; name: string; value: string }

function tooltipHtml(title: string, rows: TooltipRow[]): string {
  return `<div class="uix-glance-tooltip"><div class="uix-glance-tooltip__title">${escapeHtml(title)}</div>${rows
    .map((row) => `<div class="uix-glance-tooltip__row"><span class="uix-glance-tooltip__swatch" style="--swatch:${escapeHtml(row.color)}"></span>${escapeHtml(row.name)}<span class="uix-glance-tooltip__value">${escapeHtml(row.value)}</span></div>`)
    .join('')}</div>`;
}

/** The shared frame: grid, dashed gridlines, sans axis digits and the dark tooltip. */
export function uixGlanceBase(k: UixChartTokens, motion: GlanceMotion = GLANCE_AT_REST): EChartsOption {
  return {
    backgroundColor: 'transparent',
    animation: motion.play,
    animationDurationUpdate: 0,
    textStyle: { color: k.textMuted, fontFamily: k.fontSans, fontSize: 11 },
    grid: { top: 10, right: 12, bottom: 4, left: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: k.text,
      borderWidth: 0,
      padding: [6, 10],
      textStyle: { color: k.surface, fontFamily: k.fontSans, fontSize: 12 },
      extraCssText: `border-radius:${k.radius};box-shadow:${k.shadow}`,
      transitionDuration: 0,
    },
    xAxis: {
      type: 'category',
      axisLine: { lineStyle: { color: k.axis } },
      axisTick: { show: false },
      axisLabel: { color: k.textMuted, fontFamily: k.fontSans, fontSize: 11, hideOverlap: true },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      splitNumber: 3,
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: k.textMuted, fontFamily: k.fontSans, fontSize: 11 },
      splitLine: { lineStyle: { color: k.axis, type: [3, 4], width: 1 } },
    },
  } as EChartsOption;
}

export interface GlanceLineInput {
  /** The x labels of the measured points (weeks, days). */
  categories: string[];
  values: number[];
  /** The series name, for the tooltip ("offen"). */
  name: string;
  /** A dashed projection that continues from the last measured point. */
  forecast?: { categories: string[]; values: number[]; name: string; label?: string };
  /** Label the line at its end with its last value (default true). */
  endLabel?: boolean;
  /** A faint wash under the line (default true). */
  area?: boolean;
  format?: GlanceFormat;
  /** The tooltip's title for an x label ("Woche ab 2. Nov."). Default the label itself. */
  tooltipTitle?: (category: string) => string;
}

/** One line in the series blue, labelled at its end, optionally with a dashed forecast. */
export function glanceLineOption(k: UixChartTokens, input: GlanceLineInput, motion: GlanceMotion = GLANCE_AT_REST): EChartsOption {
  const format = input.format ?? plain;
  const last = input.values.length - 1;
  const forecast = input.forecast;
  const categories = [...input.categories, ...(forecast?.categories ?? [])];
  // the direct label sits on the last point as a data label (an ECharts endLabel follows the
  // draw-in across leading nulls and lands on NaN for a forecast)
  const labelled = (value: number, text: string, color: string, dot: boolean) => ({
    value,
    symbolSize: dot ? 8 : 0,
    label: { show: true, position: 'right', distance: 6, color, fontFamily: k.fontSans, fontSize: 11, fontWeight: 600, formatter: () => text },
  });
  const showEnd = input.endLabel !== false && !forecast && last >= 0;
  const measured: unknown[] = forecast ? [
    ...input.values.map((v, i) => (i === last ? { value: v, symbolSize: 8 } : v)),
    ...forecast.values.map(() => null),
  ] : [
    ...input.values.map((v, i) => (showEnd && i === last ? labelled(v, format(v), k.text, true) : v)),
  ];
  const projected: unknown[] = forecast
    ? [...input.values.map((v, i) => (i === last ? v : null)), ...forecast.values.map((v, i) => (i === forecast.values.length - 1 ? labelled(v, forecast.label ?? format(v), k.textMuted, false) : v))]
    : [];
  const color = k.series;
  const base = uixGlanceBase(k, motion) as Record<string, any>;
  const title = input.tooltipTitle ?? ((c: string) => c);
  const endText = forecast ? (forecast.label ?? format(forecast.values[forecast.values.length - 1] ?? 0)) : showEnd ? format(input.values[last]) : '';
  const series: any[] = [{
    name: input.name,
    type: 'line',
    data: measured,
    color,
    // symbols at size 0 so the last point can carry its dot and its label
    showSymbol: true,
    symbol: 'circle',
    symbolSize: 0,
    lineStyle: { width: 2.2, cap: 'round', join: 'round' },
    itemStyle: { color, borderColor: k.surface, borderWidth: 2 },
    areaStyle: input.area === false ? undefined : { color: k.seriesSoft, opacity: 1 },
    emphasis: { disabled: true },
    animationDuration: motion.trace,
    animationDelay: motion.delay,
    animationEasing: 'cubicOut',
  }];
  if (forecast) {
    series.push({
      name: forecast.name,
      type: 'line',
      data: projected,
      color,
      showSymbol: true,
      symbolSize: 0,
      connectNulls: false,
      lineStyle: { width: 2, type: [4, 5], opacity: 0.75, cap: 'round' },
      itemStyle: { color },
      emphasis: { disabled: true },
      animationDuration: motion.trace,
      animationDelay: motion.delay + motion.trace,
      animationEasing: 'cubicOut',
    });
  }
  return {
    ...base,
    // the gutter fits the end label ("Prognose 140"): about 6.5 px a character at 11 px
    grid: { ...base.grid, right: endText ? Math.max(24, Math.ceil(endText.length * 6.5) + 14) : 12 },
    tooltip: {
      ...base.tooltip,
      axisPointer: { type: 'line', lineStyle: { color: k.textMuted, type: [2, 3], width: 1 } },
      formatter: (params: any) => {
        const list = (Array.isArray(params) ? params : [params]).filter((p: any) => p.value != null);
        if (!list.length) return '';
        const point = list.find((p: any) => p.seriesIndex === 0) ?? list[0];
        const value = typeof point.value === 'object' && point.value !== null ? point.value.value : point.value;
        return tooltipHtml(title(point.name), [{ color, name: point.seriesName, value: format(value) }]);
      },
    },
    xAxis: { ...base.xAxis, data: categories, boundaryGap: false },
    series,
  } as EChartsOption;
}

export interface PairedBarsInput {
  /** The buckets (days, weeks); at most 12 read at a glance. */
  categories: string[];
  /** The measure, in the series blue ("eröffnet"). */
  series: { name: string; values: number[] };
  /** The comparison, in grey ("gelöst"). */
  comparison: { name: string; values: number[] };
  format?: GlanceFormat;
  tooltipTitle?: (category: string) => string;
}

/** The most buckets a paired-bar glance chart should hold. */
export const PAIRED_BARS_MAX_BUCKETS = 12;

/** Two bars per bucket: the measure in blue beside its comparison in grey. */
export function pairedBarsOption(k: UixChartTokens, input: PairedBarsInput, motion: GlanceMotion = GLANCE_AT_REST): EChartsOption {
  const format = input.format ?? plain;
  const base = uixGlanceBase(k, motion) as Record<string, any>;
  const title = input.tooltipTitle ?? ((c: string) => c);
  const bar = (name: string, values: number[], color: string, offset: number) => ({
    name,
    type: 'bar',
    data: values,
    color,
    barMaxWidth: 16,
    barGap: '18%',
    barCategoryGap: '38%',
    itemStyle: { color, borderRadius: [3, 3, 0, 0] },
    emphasis: { disabled: true },
    animationDuration: motion.grow,
    animationDelay: (index: number) => motion.delay + index * motion.stagger + offset,
    animationEasing: 'cubicOut',
  });
  return {
    ...base,
    tooltip: {
      ...base.tooltip,
      axisPointer: { type: 'shadow', shadowStyle: { color: k.forecastBand } },
      formatter: (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        if (!list.length) return '';
        return tooltipHtml(title(list[0].name), list.map((p: any) => ({ color: p.color, name: p.seriesName, value: format(p.value) })));
      },
    },
    xAxis: { ...base.xAxis, data: input.categories },
    series: [
      bar(input.series.name, input.series.values, k.series, 0),
      bar(input.comparison.name, input.comparison.values, k.comparison, motion.stagger),
    ],
  } as EChartsOption;
}
