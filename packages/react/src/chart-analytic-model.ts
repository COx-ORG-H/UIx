/*
 * Analytic chart overlays (HAR-1553, charts C2): thresholds, events, forecasts, a previous-period
 * comparison, a partial last period and threshold crossings, as typed data in and ECharts option
 * fragments out. Pure: type imports from ECharts only, no DOM, no React. The consumer (or ChartPanels)
 * merges the fragments; UIx computes nothing domain-specific — a forecast arrives as data.
 *
 * Mark rules (dataviz method):
 * - only a projection is dashed; thresholds, events, the grid and the comparison are solid;
 * - threshold labels sit in the right gutter, outside the plot, never on the line;
 * - events carry no rotated text: unlabeled lines through the plot plus a pin lane above it,
 *   which owns the tooltip and the click-through;
 * - every colour is a chart token, read per theme (the caller passes the resolved tokens).
 */
import type {
  LineSeriesOption,
  MarkAreaComponentOption,
  MarkLineComponentOption,
  MarkPointComponentOption,
  ScatterSeriesOption,
} from 'echarts';
import type { UixChartTokens } from './chart-theme.js';

/** A position on the x axis: a category name, or a time value (ms or ISO string) on a time axis. */
export type ChartX = string | number;

/** A target line, a limit or a zone. `to` turns a line into a zone between `value` and `to`. */
export interface ChartThreshold {
  value: number;
  to?: number;
  kind: 'target' | 'limit' | 'floor' | 'budget';
  tone: 'neutral' | 'warning' | 'danger';
  label: string;
  /** The side that is bad: shades from the line to the edge of the axis on that side. */
  badSide?: 'above' | 'below';
}

/** Something that happened at (or from `at` to `to`) on the time axis. */
export interface ChartEvent {
  at: ChartX;
  to?: ChartX;
  kind: string;
  label: string;
  href?: string;
  tone?: 'neutral' | 'warning' | 'danger';
}

/** A projection with its uncertainty, computed by the consumer. `from` is the last actual x. */
export interface ChartForecast {
  from: ChartX;
  points: { x: ChartX; y: number; lower: number; upper: number }[];
  /** Central coverage of the band, 0–1 (0.8 = 80 %). */
  level: number;
  /** How it was computed, for the tooltip and the table ("linear over 8 weeks"). */
  method: string;
}

/** The previous period's values on the same x positions (a ghost line). */
export interface ChartComparison {
  label: string;
  values: (number | null)[];
}

/** Every word the overlays draw. English defaults in {@link DEFAULT_ANALYTIC_LABELS}. */
export interface ChartAnalyticLabels {
  projection: string;
  /** The band's name in the legend, the tooltip and the table, e.g. "80 % range". */
  range: (level: number) => string;
  partial: string;
  crossed: (x: string) => string;
  lower: string;
  upper: string;
  threshold: string;
  event: string;
  /** How an x value is written in labels and tables. */
  formatX: (x: ChartX) => string;
}

export const DEFAULT_ANALYTIC_LABELS: ChartAnalyticLabels = {
  projection: 'Projection',
  range: (level) => `${Math.round(level * 100)}% range`,
  partial: 'Partial',
  crossed: (x) => `Crossed ${x}`,
  lower: 'Lower',
  upper: 'Upper',
  threshold: 'Threshold',
  event: 'Event',
  formatX: (x) => String(x),
};

/** Series-level mark fragments; spread into one series, or combine several with {@link combineMarks}. */
export interface ChartMarks {
  markLine?: MarkLineComponentOption;
  markArea?: MarkAreaComponentOption;
  markPoint?: MarkPointComponentOption;
}

type MarkLineData = NonNullable<MarkLineComponentOption['data']>;
type MarkAreaData = NonNullable<MarkAreaComponentOption['data']>;
type MarkPointData = NonNullable<MarkPointComponentOption['data']>;

const GUTTER_LABEL_WIDTH = 88;

const markLineBase = (data: MarkLineData): MarkLineComponentOption => ({
  silent: true,
  symbol: 'none',
  animation: false,
  data,
});

const markAreaBase = (data: MarkAreaData): MarkAreaComponentOption => ({ silent: true, animation: false, data });

/** Merge mark fragments into one (a series carries one markLine, one markArea and one markPoint). */
export function combineMarks(...fragments: (ChartMarks | null | undefined)[]): ChartMarks {
  const lines: unknown[] = [];
  const areas: unknown[] = [];
  const points: unknown[] = [];
  for (const fragment of fragments) {
    if (!fragment) continue;
    if (fragment.markLine?.data) lines.push(...(fragment.markLine.data as unknown[]));
    if (fragment.markArea?.data) areas.push(...(fragment.markArea.data as unknown[]));
    if (fragment.markPoint?.data) points.push(...(fragment.markPoint.data as unknown[]));
  }
  const out: ChartMarks = {};
  if (lines.length) out.markLine = markLineBase(lines as MarkLineData);
  if (areas.length) out.markArea = markAreaBase(areas as MarkAreaData);
  if (points.length) out.markPoint = { animation: false, data: points as MarkPointData };
  return out;
}

const zoneColor = (tone: ChartThreshold['tone'], tokens: UixChartTokens) =>
  tone === 'danger' ? tokens.zoneDanger : tone === 'warning' ? tokens.zoneWarning : tokens.forecastBand;

/**
 * Threshold lines and zones. A line is solid reference ink with its label in the right gutter
 * (the plot needs `grid.right` ≥ 96 px; ChartPanels reserves it). A zone (`to`, or `badSide` with an
 * axis `extent`) is a token wash. Lines never take a status hue: the zone carries the tone.
 */
export function thresholdMarks(
  thresholds: readonly ChartThreshold[],
  options: { tokens: UixChartTokens; extent?: [number, number] },
): ChartMarks {
  const { tokens, extent } = options;
  const lines: MarkLineData = [];
  const areas: MarkAreaData = [];
  for (const threshold of thresholds) {
    if (!Number.isFinite(threshold.value)) continue;
    const zoneTo = threshold.to ?? (threshold.badSide && extent ? (threshold.badSide === 'above' ? extent[1] : extent[0]) : undefined);
    if (zoneTo != null && Number.isFinite(zoneTo) && zoneTo !== threshold.value) {
      areas.push([
        { yAxis: Math.min(threshold.value, zoneTo), itemStyle: { color: zoneColor(threshold.tone, tokens) } },
        { yAxis: Math.max(threshold.value, zoneTo) },
      ]);
    }
    lines.push({
      yAxis: threshold.value,
      lineStyle: { color: tokens.reference, width: 1, type: 'solid' },
      label: {
        show: true,
        position: 'end',
        formatter: threshold.label,
        color: tokens.textMuted,
        fontFamily: tokens.fontSans,
        fontSize: 11,
        width: GUTTER_LABEL_WIDTH,
        overflow: 'truncate',
        distance: 6,
      },
    });
  }
  return combineMarks(
    lines.length ? { markLine: markLineBase(lines) } : null,
    areas.length ? { markArea: markAreaBase(areas) } : null,
  );
}

/** One pin in the event lane: [x, 0, index into the events]. */
export type ChartEventPin = [ChartX, number, number];

/** The event lane: a thin row above the plot that owns the events' tooltip and click-through. */
export interface ChartEventLane {
  series: ScatterSeriesOption;
}

const PIN_SYMBOL: Record<NonNullable<ChartEvent['tone']>, string> = {
  neutral: 'circle',
  warning: 'triangle',
  danger: 'diamond',
};

/**
 * Events: unlabeled solid lines through the plot (ranges as a light wash) plus the pins of the lane.
 * The tone is carried by the pin's shape (circle, triangle, diamond) in event ink, never by a status
 * hue, so the lane stays calm. Put `lane.series` on the lane's grid (ChartPanels does).
 */
export function eventMarks(
  events: readonly ChartEvent[],
  options: { tokens: UixChartTokens; xAxisIndex?: number; yAxisIndex?: number; seriesId?: string },
): ChartMarks & { lane: ChartEventLane } {
  const { tokens } = options;
  const lines: MarkLineData = [];
  const areas: MarkAreaData = [];
  events.forEach((event) => {
    if (event.to != null) {
      areas.push([{ xAxis: event.at, itemStyle: { color: tokens.forecastBand } }, { xAxis: event.to }]);
    }
    lines.push({ xAxis: event.at, lineStyle: { color: tokens.event, width: 1, type: 'solid', opacity: 0.7 }, label: { show: false } });
  });
  const lane: ChartEventLane = {
    series: {
      id: options.seriesId ?? 'uix-event-lane',
      type: 'scatter',
      xAxisIndex: options.xAxisIndex ?? 0,
      yAxisIndex: options.yAxisIndex ?? 0,
      data: events.map((event, index) => ({
        value: [event.at, 0, index] as ChartEventPin,
        symbol: PIN_SYMBOL[event.tone ?? 'neutral'],
      })),
      symbolSize: 10,
      itemStyle: { color: tokens.event, borderColor: tokens.surface, borderWidth: 2 },
      emphasis: { scale: 1.3 },
      cursor: 'pointer',
      animation: false,
      z: 5,
    },
  };
  return {
    ...combineMarks(
      lines.length ? { markLine: markLineBase(lines) } : null,
      areas.length ? { markArea: markAreaBase(areas) } : null,
    ),
    lane,
  };
}

/**
 * A forecast as three series: a hidden lower bound, the band stacked on it (upper − lower) in
 * `--uix-chart-forecast-band`, and the dashed centre line in the series colour, starting at `from`.
 * The centre carries a "Projection" label over the projected stretch, unless `regionLabel` is
 * false — ChartPanels turns it off, because its legend already names the dashed line and, in a
 * narrow panel, the label collides with a threshold's gutter label.
 */
export function forecastSeries(
  forecast: ChartForecast,
  options: {
    name: string;
    colorIndex?: number;
    tokens: UixChartTokens;
    labels?: Partial<ChartAnalyticLabels>;
    /** The last actual value, so the dashed line starts where the solid one ends. */
    fromValue?: number | null;
    xAxisIndex?: number;
    yAxisIndex?: number;
    idPrefix?: string;
    /** Label the projected stretch "Projection" inside the plot (default true). */
    regionLabel?: boolean;
  },
): LineSeriesOption[] {
  const labels = { ...DEFAULT_ANALYTIC_LABELS, ...options.labels };
  const { tokens } = options;
  const color = tokens.palette[(options.colorIndex ?? 0) % tokens.palette.length] || tokens.palette[0];
  const stack = `${options.idPrefix ?? 'forecast'}-band`;
  const axes = { xAxisIndex: options.xAxisIndex ?? 0, yAxisIndex: options.yAxisIndex ?? 0 };
  const points = forecast.points.filter((p) => [p.y, p.lower, p.upper].every(Number.isFinite));
  const start = options.fromValue != null && Number.isFinite(options.fromValue) ? [{ x: forecast.from, y: options.fromValue, lower: options.fromValue, upper: options.fromValue }] : [];
  const all = [...start, ...points];
  const last = points[points.length - 1];
  const prefix = options.idPrefix ?? 'forecast';
  return [
    {
      id: `${prefix}-lower`,
      name: `${options.name} · ${labels.lower}`,
      type: 'line',
      ...axes,
      stack,
      data: all.map((p) => [p.x, p.lower]),
      lineStyle: { opacity: 0 },
      symbol: 'none',
      silent: true,
      tooltip: { show: false },
      animation: false,
      z: 1,
    },
    {
      id: `${prefix}-band`,
      name: `${options.name} · ${labels.range(forecast.level)}`,
      type: 'line',
      ...axes,
      stack,
      data: all.map((p) => [p.x, p.upper - p.lower]),
      lineStyle: { opacity: 0 },
      areaStyle: { color: tokens.forecastBand, opacity: 1 },
      symbol: 'none',
      silent: true,
      tooltip: { show: false },
      animation: false,
      z: 1,
    },
    {
      id: `${prefix}-centre`,
      name: `${options.name} · ${labels.projection}`,
      type: 'line',
      ...axes,
      data: all.map((p) => [p.x, p.y]),
      lineStyle: { color, width: 2, type: 'dashed' },
      itemStyle: { color },
      symbol: 'none',
      animation: false,
      z: 3,
      ...(last && options.regionLabel !== false
        ? {
            markArea: markAreaBase([[
              {
                xAxis: forecast.from,
                itemStyle: { color: 'transparent' },
                label: { show: true, position: 'insideTop', formatter: labels.projection, color: tokens.textMuted, fontFamily: tokens.fontSans, fontSize: 11 },
              },
              { xAxis: last.x },
            ]] as MarkAreaData),
          }
        : {}),
    },
  ];
}

/** The previous period as a thin SOLID ghost line (dashes are reserved for projections). */
export function comparisonSeries(
  comparison: ChartComparison,
  options: { x: readonly ChartX[]; tokens: UixChartTokens; xAxisIndex?: number; yAxisIndex?: number; id?: string },
): LineSeriesOption {
  return {
    id: options.id ?? 'comparison',
    name: comparison.label,
    type: 'line',
    xAxisIndex: options.xAxisIndex ?? 0,
    yAxisIndex: options.yAxisIndex ?? 0,
    data: options.x.map((x, i) => [x, comparison.values[i] ?? null]),
    lineStyle: { color: options.tokens.comparison, width: 1.5, type: 'solid' },
    itemStyle: { color: options.tokens.comparison },
    symbol: 'none',
    connectNulls: false,
    animation: false,
    z: 1,
  };
}

/**
 * The last, still-filling period: a shaded wash from the previous bucket (`from`) to `lastX`,
 * labelled "Partial" at the foot of the plot. On a category line axis the points sit on the
 * categories, so the wash spans the segment that leads into the partial point.
 */
export function partialPeriod(
  lastX: ChartX,
  options: { tokens: UixChartTokens; from?: ChartX; labels?: Partial<ChartAnalyticLabels> },
): ChartMarks {
  const labels = { ...DEFAULT_ANALYTIC_LABELS, ...options.labels };
  return {
    markArea: markAreaBase([[
      {
        xAxis: options.from ?? lastX,
        itemStyle: { color: options.tokens.partial },
        label: { show: true, position: 'insideBottom', formatter: labels.partial, color: options.tokens.textMuted, fontFamily: options.tokens.fontSans, fontSize: 11 },
      },
      { xAxis: lastX },
    ]] as MarkAreaData),
  };
}

/**
 * Indexes where the series first enters the bad side of a threshold (after being on the good side
 * or at the start of a run of nulls). `badSide` defaults to `above` (`floor` thresholds: `below`).
 */
export function findCrossings(values: readonly (number | null)[], threshold: Pick<ChartThreshold, 'value' | 'badSide' | 'kind'>): number[] {
  const side = threshold.badSide ?? (threshold.kind === 'floor' ? 'below' : 'above');
  const bad = (v: number) => (side === 'above' ? v > threshold.value : v < threshold.value);
  const out: number[] = [];
  let previous: boolean | null = null;
  values.forEach((value, index) => {
    if (value == null || !Number.isFinite(value)) {
      previous = null;
      return;
    }
    const isBad = bad(value);
    if (isBad && previous === false) out.push(index);
    previous = isBad;
  });
  return out;
}

/**
 * A ringed point at each first crossing. Only the latest carries a visible "Crossed <x>" label (it is
 * the one a headline's "since" names); earlier crossings show theirs on hover, so a series that
 * crosses repeatedly never stacks colliding labels along the line.
 */
export function crossingPoints(
  values: readonly (number | null)[],
  threshold: ChartThreshold,
  options: { x: readonly ChartX[]; tokens: UixChartTokens; labels?: Partial<ChartAnalyticLabels> },
): ChartMarks {
  const labels = { ...DEFAULT_ANALYTIC_LABELS, ...options.labels };
  const crossings = findCrossings(values, threshold);
  const label = (text: string, show: boolean) => ({
    show,
    position: 'top' as const,
    distance: 8,
    formatter: text,
    color: options.tokens.text,
    fontFamily: options.tokens.fontSans,
    fontSize: 11,
  });
  const data: MarkPointData = crossings.map((index, i) => {
    const text = labels.crossed(labels.formatX(options.x[index]));
    const latest = i === crossings.length - 1;
    return {
      name: text,
      coord: [options.x[index], values[index] as number],
      symbol: 'circle',
      symbolSize: 10,
      itemStyle: { color: options.tokens.surface, borderColor: options.tokens.text, borderWidth: 2 },
      label: label(text, latest),
      ...(latest ? {} : { emphasis: { label: label(text, true) } }),
    };
  });
  return data.length ? { markPoint: { animation: false, data } } : {};
}
