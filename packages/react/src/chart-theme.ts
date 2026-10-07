/*
 * The UIx ECharts theme (HAR-1552). Every chart reads its colours, fonts, grid, axes and tooltip from
 * --uix-* tokens, so a chart with no styling of its own looks like UIx in both themes. Pure functions:
 * no ECharts import, no DOM beyond reading computed custom properties, so the vanilla styleguide
 * (packages/tokens/guide/chart-theme.js) ports this module 1:1 and chart-theme.test.mjs locks the two.
 *
 * Rules carried here, from the dataviz method:
 * - the grid is a SOLID hairline; dashes mean projection or threshold, never "gridline";
 * - text wears text tokens (axis labels muted, tooltip text primary), never a series colour;
 * - categorical colour comes from --uix-chart-1..8 in fixed order.
 */
import type { EChartsOption } from 'echarts';

/** Where tokens are read from: an element (its computed style), or a reader for tests and non-DOM use. */
export type ChartTokenSource = Element | ((token: string) => string);

function reader(source?: ChartTokenSource): (token: string) => string {
  if (typeof source === 'function') return source;
  if (typeof getComputedStyle === 'undefined' || typeof document === 'undefined') return () => '';
  const style = getComputedStyle(source ?? document.documentElement);
  return (token) => style.getPropertyValue(token).trim();
}

/** The analytic chart roles: reference lines, threshold zones, forecast bands, events, partial periods. */
export interface UixChartTokens {
  palette: string[];
  neutral: string;
  grid: string;
  axis: string;
  reference: string;
  zoneWarning: string;
  zoneDanger: string;
  forecastBand: string;
  event: string;
  partial: string;
  comparison: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  fontSans: string;
  fontMono: string;
}

/** Resolve the chart tokens once (current theme). */
export function uixChartTokens(source?: ChartTokenSource): UixChartTokens {
  const read = reader(source);
  const t = (name: string) => read(`--uix-${name}`);
  const unquote = (font: string) => font.replace(/"/g, '');
  return {
    palette: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => t(`chart-${i}`)),
    neutral: t('chart-neutral'),
    grid: t('chart-grid'),
    axis: t('chart-axis'),
    reference: t('chart-reference'),
    zoneWarning: t('chart-zone-warning'),
    zoneDanger: t('chart-zone-danger'),
    forecastBand: t('chart-forecast-band'),
    event: t('chart-event'),
    partial: t('chart-partial'),
    comparison: t('chart-comparison'),
    surface: t('surface'),
    text: t('text'),
    textMuted: t('text-muted'),
    border: t('border-strong'),
    fontSans: unquote(t('font-sans')),
    fontMono: unquote(t('font-mono')),
  };
}

/**
 * The base option every UIx chart merges under the consumer's option (the consumer wins).
 * Axis defaults apply to every x/y axis, whether the consumer passes one axis or an array.
 */
export function uixChartTheme(source?: ChartTokenSource): EChartsOption {
  const k = uixChartTokens(source);
  const read = reader(source);
  const axis = {
    axisLine: { lineStyle: { color: k.axis } },
    axisTick: { show: false },
    axisLabel: { color: k.textMuted, fontFamily: k.fontMono, fontSize: 11 },
    splitLine: { lineStyle: { color: k.grid, type: 'solid', width: 1 } },
  };
  return {
    color: k.palette,
    backgroundColor: 'transparent',
    textStyle: { color: k.textMuted, fontFamily: k.fontSans, fontSize: 12 },
    title: { textStyle: { color: k.text, fontFamily: k.fontSans }, subtextStyle: { color: k.textMuted, fontFamily: k.fontSans } },
    legend: { textStyle: { color: k.textMuted, fontFamily: k.fontSans, fontSize: 12 }, icon: 'roundRect', itemWidth: 10, itemHeight: 6, itemGap: 12 },
    tooltip: {
      backgroundColor: k.surface,
      borderColor: k.border,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: k.text, fontFamily: k.fontSans, fontSize: 12 },
      extraCssText: `border-radius:${read('--uix-radius-sm')};box-shadow:${read('--uix-shadow-popover')}`,
      axisPointer: { lineStyle: { color: k.reference, width: 1 }, crossStyle: { color: k.reference }, shadowStyle: { color: k.forecastBand } },
    },
    xAxis: axis,
    yAxis: axis,
  } as EChartsOption;
}

/** A vertical area fill that fades the series colour (28 % → 6 % → 0) toward the baseline. */
export function uixChartAreaGradient(color: string) {
  const alpha = (opacity: number) => {
    const hex = color.replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
    const [r, g, b] = hex.match(/.{2}/g)!.map((channel) => Number.parseInt(channel, 16));
    return `rgba(${r},${g},${b},${opacity})`;
  };
  return {
    type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [{ offset: 0, color: alpha(0.28) }, { offset: 0.72, color: alpha(0.06) }, { offset: 1, color: alpha(0) }],
  };
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

function deepMerge(base: unknown, over: unknown): unknown {
  if (over === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(over)) return over;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(over)) out[key] = deepMerge(base[key], over[key]);
  return out;
}

/** Components the theme only styles: present in the merge only when the consumer's option has them
    (a theme `legend` or `xAxis` alone would make ECharts draw one). */
const STYLED_ONLY = ['xAxis', 'yAxis', 'legend', 'title'];

/**
 * Merge the theme under a consumer option: plain objects merge deeply, everything else (arrays,
 * series, data, functions) is the consumer's. Array-valued components (`xAxis: [...]`, `title: [...]`)
 * take the theme entry per element.
 */
export function mergeChartTheme(theme: EChartsOption, option: EChartsOption): EChartsOption {
  const merged = deepMerge(theme, option) as Record<string, unknown>;
  const source = option as Record<string, unknown>;
  const base = theme as Record<string, unknown>;
  for (const key of STYLED_ONLY) {
    if (Array.isArray(source[key])) merged[key] = (source[key] as unknown[]).map((axis) => deepMerge(base[key], axis));
    else if (!(key in source)) delete merged[key];
  }
  return merged as EChartsOption;
}
