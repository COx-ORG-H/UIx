/*
 * CorrelationScatter model (HAR-1554, charts C3): how two variables move together — one dot per
 * observation, an OLS trend line, r and n, optional percentile lines, thresholds on either axis and
 * a breaking point. Pure: no DOM, no React.
 *
 * Honesty rules built in: below `minPoints` there is no trend (the component shows "not enough
 * data"), and the stats always say "association, not cause".
 */
import type { EChartsOption, LineSeriesOption, MarkLineComponentOption, ScatterSeriesOption } from 'echarts';
import type { UixChartTokens } from './chart-theme.js';
import { linearFit, quantiles } from './chart-stats.js';
import type { LinearFit } from './chart-stats.js';
import { combineMarks, thresholdMarks } from './chart-analytic-model.js';
import type { ChartMarks, ChartThreshold } from './chart-analytic-model.js';
import { niceCeil } from './chart-panels-model.js';

export interface CorrelationPoint {
  x: number;
  y: number;
  label: string;
  href?: string;
  /** A point that matters (a breach): a status hue AND a distinct shape, never colour alone. */
  emphasis?: 'danger' | 'warning';
}

export interface CorrelationScatterLabels {
  /** The stats caption. `r` is null when it is undefined (y constant). */
  stats: (stats: { r: number | null; n: number }) => string;
  notEnough: (n: number, min: number) => string;
  percentile: (p: number) => string;
  trend: string;
  /** Header of the label column in the data table. */
  point: string;
  formatX: (x: number) => string;
  formatY: (y: number) => string;
}

const defaultNumber = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });

/** r to two decimals, truncated toward zero so an imperfect fit never reads "r = 1.00". */
export function formatCorrelation(r: number): string {
  const shown = Math.abs(r) < 1 ? Math.trunc(r * 100) / 100 : Math.sign(r);
  return shown.toFixed(2);
}

export const DEFAULT_CORRELATION_SCATTER_LABELS: CorrelationScatterLabels = {
  stats: ({ r, n }) => `${r == null ? '' : `r = ${formatCorrelation(r)} · `}n = ${n} · association, not cause`,
  notEnough: (n, min) => `Not enough data (n = ${n} of ${min})`,
  percentile: (p) => `p${p}`,
  trend: 'Trend',
  point: 'Point',
  formatX: (x) => defaultNumber.format(x),
  formatY: (y) => defaultNumber.format(y),
};

export interface CorrelationScatterSpec {
  points: CorrelationPoint[];
  xLabel: string;
  yLabel: string;
  trend?: 'linear' | 'none';
  /** Percentile lines of y, in percent (e.g. [50, 90]). */
  percentiles?: number[];
  thresholds?: { x?: ChartThreshold[]; y?: ChartThreshold[] };
  breakpoint?: { x: number; label: string };
  /** Below this many points there is no trend and no stats. Default 8. */
  minPoints?: number;
}

export interface CorrelationScatterModel {
  /** False below `minPoints`: render the "not enough data" state instead of a trend. */
  enough: boolean;
  n: number;
  minPoints: number;
  fit: LinearFit | null;
  option: EChartsOption;
  statsText: string;
  table: { headers: string[]; rows: Record<string, string | number>[] };
  /** Index into `points` for each data item of the hit series. */
  hitSeriesId: string;
}

/** Hit target for every point, in px: above the 24 px accessible minimum (WCAG 2.5.8) with the 2 px gap around it. */
export const SCATTER_HIT_SIZE = 26;
const DOT_SIZE = 9;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

const niceRange = (values: number[]): [number, number] => {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const max = niceCeil(hi > 0 ? hi * 1.08 : hi || 1);
  const min = lo >= 0 ? 0 : -niceCeil(-lo * 1.08);
  return [min, max];
};

export function correlationScatterModel(
  spec: CorrelationScatterSpec,
  tokens: UixChartTokens,
  labelOverrides?: Partial<CorrelationScatterLabels>,
): CorrelationScatterModel {
  const labels = { ...DEFAULT_CORRELATION_SCATTER_LABELS, ...labelOverrides };
  const minPoints = Math.max(2, spec.minPoints ?? 8);
  const points = spec.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const n = points.length;
  const enough = n >= minPoints;
  const fit = enough && spec.trend !== 'none' ? linearFit(points) : null;
  const statsText = labels.stats({ r: fit?.r ?? null, n });

  const xs = [...points.map((p) => p.x), ...(spec.thresholds?.x ?? []).map((t) => t.value), ...(spec.breakpoint ? [spec.breakpoint.x] : [])];
  const ys = [...points.map((p) => p.y), ...(spec.thresholds?.y ?? []).map((t) => t.value)];
  const [xMin, xMax] = xs.length ? niceRange(xs) : [0, 1];
  const [yMin, yMax] = ys.length ? niceRange(ys) : [0, 1];

  const dotData = points.map((p) => ({
    value: [p.x, p.y],
    symbol: p.emphasis === 'danger' ? 'diamond' : p.emphasis === 'warning' ? 'triangle' : 'circle',
    symbolSize: p.emphasis ? DOT_SIZE + 3 : DOT_SIZE,
    itemStyle: {
      color: p.emphasis === 'danger' ? tokens.danger : p.emphasis === 'warning' ? tokens.warning : tokens.palette[0],
      borderColor: tokens.surface,
      borderWidth: 2,
      opacity: 1,
    },
  }));

  // y percentile lines and thresholds live in the right gutter; x thresholds and the breakpoint label at the top
  const pcts = (spec.percentiles ?? []).filter((p) => p > 0 && p < 100);
  const pctValues = quantiles(points.map((p) => p.y), pcts.map((p) => p / 100));
  const percentileLines: ChartMarks = enough && pcts.length
    ? {
        markLine: {
          silent: true,
          symbol: 'none',
          animation: false,
          data: pcts.flatMap((p, i) => {
            const value = pctValues[i];
            return value == null ? [] : [{
              yAxis: value,
              lineStyle: { color: tokens.reference, width: 1, type: 'solid', opacity: 0.6 },
              label: { show: true, position: 'end', formatter: labels.percentile(p), color: tokens.textMuted, fontFamily: tokens.fontSans, fontSize: 11, distance: 6 },
            }];
          }) as MarkLineComponentOption['data'],
        },
      }
    : {};
  const xLines: ChartMarks = {
    markLine: {
      silent: true,
      symbol: 'none',
      animation: false,
      data: [
        ...(spec.thresholds?.x ?? []).map((t) => ({
          xAxis: t.value,
          lineStyle: { color: tokens.reference, width: 1, type: 'solid' },
          label: { show: true, position: 'end', formatter: t.label, color: tokens.textMuted, fontFamily: tokens.fontSans, fontSize: 11 },
        })),
        ...(spec.breakpoint && enough
          ? [{
              xAxis: spec.breakpoint.x,
              lineStyle: { color: tokens.text, width: 1, type: 'solid' },
              label: { show: true, position: 'end', formatter: spec.breakpoint.label, color: tokens.text, fontFamily: tokens.fontSans, fontSize: 11, fontWeight: 600 },
            }]
          : []),
      ] as MarkLineComponentOption['data'],
    },
  };
  const marks = combineMarks(
    spec.thresholds?.y?.length ? thresholdMarks(spec.thresholds.y, { tokens, extent: [yMin, yMax] }) : null,
    percentileLines,
    (xLines.markLine?.data as unknown[]).length ? xLines : null,
  );

  const series: (ScatterSeriesOption | LineSeriesOption)[] = [
    {
      id: 'points',
      name: spec.yLabel,
      type: 'scatter',
      data: dotData,
      silent: true,
      animation: false,
      z: 3,
      ...marks,
    },
    {
      // the hit layer: transparent 24 px targets over the dots carry the tooltip and the click
      id: 'points-hit',
      name: spec.yLabel,
      type: 'scatter',
      data: points.map((p, index) => ({ value: [p.x, p.y, index] })),
      symbol: 'circle',
      symbolSize: SCATTER_HIT_SIZE,
      itemStyle: { color: 'rgba(0,0,0,0)' },
      emphasis: { itemStyle: { color: 'rgba(0,0,0,0)', borderColor: tokens.text, borderWidth: 1 } },
      cursor: 'pointer',
      animation: false,
      z: 4,
    },
  ];
  if (fit) {
    series.push({
      id: 'trend',
      name: labels.trend,
      type: 'line',
      data: [[xMin, fit.intercept + fit.slope * xMin], [xMax, fit.intercept + fit.slope * xMax]],
      symbol: 'none',
      silent: true,
      lineStyle: { color: tokens.reference, width: 1.5, type: 'solid' },
      tooltip: { show: false },
      animation: false,
      clip: true,
      z: 2,
    });
  }

  const option: EChartsOption = {
    animation: false,
    grid: { top: 28, right: (spec.thresholds?.y?.length || pcts.length) ? 100 : 20, bottom: 44, left: 52, containLabel: false },
    xAxis: {
      type: 'value',
      min: xMin,
      max: xMax,
      name: spec.xLabel,
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { color: tokens.textMuted, fontFamily: tokens.fontSans, fontSize: 12 },
      axisLabel: { formatter: (v: number) => labels.formatX(v) },
      splitLine: { show: true },
    },
    yAxis: {
      type: 'value',
      min: yMin,
      max: yMax,
      name: spec.yLabel,
      nameLocation: 'end',
      nameGap: 10,
      nameTextStyle: { align: 'left', padding: [0, 0, 0, -48], color: tokens.textMuted, fontFamily: tokens.fontSans, fontSize: 12 },
      axisLabel: { formatter: (v: number) => labels.formatY(v) },
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: unknown) => {
        const p = params as { seriesId?: string; value?: unknown[] };
        if (p.seriesId !== 'points-hit' || !Array.isArray(p.value)) return '';
        const point = points[Number(p.value[2])];
        if (!point) return '';
        return `<div style="font-weight:600;margin-bottom:4px">${escapeHtml(point.label)}</div>`
          + `<div>${escapeHtml(spec.xLabel)}: ${escapeHtml(labels.formatX(point.x))}</div>`
          + `<div>${escapeHtml(spec.yLabel)}: ${escapeHtml(labels.formatY(point.y))}</div>`;
      },
    },
    series: series as EChartsOption['series'],
  };

  const headers = [labels.point, spec.xLabel, spec.yLabel];
  const rows = points.map((p) => ({ [labels.point]: p.label, [spec.xLabel]: labels.formatX(p.x), [spec.yLabel]: labels.formatY(p.y) }));
  return { enough, n, minPoints, fit, option, statsText, table: { headers, rows }, hitSeriesId: 'points-hit' };
}
