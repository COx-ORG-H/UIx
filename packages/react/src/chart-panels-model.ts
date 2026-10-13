/*
 * ChartPanels model (HAR-1554, charts C3): two or more variables with different units, read together
 * as aligned panels on ONE x axis with ONE crosshair. One ECharts instance, N grids; the event lane
 * (C2) sits on top and its lines run through every panel. Pure: no DOM, no React.
 *
 * A dual y-axis is impossible by construction: a panel has one unit and one y axis, and the spec has
 * no field that adds a second one.
 */
import type {
  BarSeriesOption,
  EChartsOption,
  GridComponentOption,
  LineSeriesOption,
  ScatterSeriesOption,
  XAXisComponentOption,
  YAXisComponentOption,
} from 'echarts';
import { uixChartAreaGradient } from './chart-theme.js';
import type { UixChartTokens } from './chart-theme.js';
import {
  DEFAULT_ANALYTIC_LABELS,
  combineMarks,
  comparisonSeries,
  crossingPoints,
  eventMarks,
  forecastSeries,
  partialPeriod,
  thresholdMarks,
} from './chart-analytic-model.js';
import type { ChartAnalyticLabels, ChartComparison, ChartEvent, ChartForecast, ChartMarks, ChartThreshold, ChartX } from './chart-analytic-model.js';

/** One variable in a panel. `values` align with `x.values`. */
export interface ChartPanelSeries {
  id: string;
  label: string;
  values: (number | null)[];
  /** Slot in the categorical palette (0-based). Defaults to the series' index in its panel. */
  colorIndex?: number;
}

/** One panel: one unit, one y axis. */
export interface ChartPanel {
  id: string;
  title: string;
  /** Written after values ("h", "%", "items"). `%` is attached, anything else follows a space. */
  unit?: string;
  /** Plot height in px (without the title row). Default 112. */
  height?: number;
  kind: 'line' | 'bar' | 'area';
  series: ChartPanelSeries[];
  thresholds?: ChartThreshold[];
  /** A projection of the panel's first series. */
  forecast?: ChartForecast;
  comparison?: ChartComparison;
}

export interface ChartPanelsX {
  type: 'category' | 'time';
  values: ChartX[];
}

/** Words ChartPanels draws or writes into its tables, on top of the overlay words. */
export interface ChartPanelsLabels extends ChartAnalyticLabels {
  /** Header of the x column in each panel's data table. */
  x: string;
  /** A panel table's caption. */
  table: (panelTitle: string) => string;
  formatValue: (value: number, unit?: string) => string;
}

const defaultNumber = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });

export const DEFAULT_CHART_PANELS_LABELS: ChartPanelsLabels = {
  ...DEFAULT_ANALYTIC_LABELS,
  x: 'Period',
  table: (title) => `${title} — data table`,
  formatValue: (value, unit) => {
    const text = defaultNumber.format(value);
    if (!unit) return text;
    return unit === '%' ? `${text}%` : `${text} ${unit}`;
  },
};

export interface ChartPanelsSpec {
  x: ChartPanelsX;
  panels: ChartPanel[];
  /** One event lane on top; lines through every panel. */
  events?: ChartEvent[];
  /** The last x is a period still filling up: shaded and labelled in every panel. */
  partialLast?: boolean;
  /** Linked inside zoom (wheel / pinch) on every panel. */
  zoom?: boolean;
}

/** A legend entry: identity is never colour alone (dataviz), so the swatch shape says the role. */
export interface ChartPanelsLegendItem {
  label: string;
  color: string;
  swatch: 'line' | 'dash' | 'block';
}

export interface ChartPanelsTable {
  caption: string;
  headers: string[];
  rows: Record<string, string | number>[];
}

export interface ChartPanelsModel {
  option: EChartsOption;
  /** Total chart height in px, from the panels. */
  height: number;
  legend: ChartPanelsLegendItem[];
  tables: ChartPanelsTable[];
  /** The x positions on the axis: `x.values` plus forecast positions past them. */
  categories: ChartX[];
  /** Series id → panel id, for click handling. */
  seriesPanel: Record<string, string>;
  /** The id of the event lane's series ('' when there are no events). */
  laneSeriesId: string;
}

export const CHART_PANELS_LAYOUT = {
  top: 8,
  lane: 14,
  laneGap: 10,
  title: 22,
  panelHeight: 112,
  panelGap: 14,
  axisBand: 30,
  left: 52,
  right: 16,
  gutter: 100,
} as const;

/** A "nice" upper bound (1, 2, 2.5, 5 × 10ⁿ) at or above `value`. */
export function niceCeil(value: number): number {
  if (!(value > 0)) return value === 0 ? 1 : value;
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (step * base >= value - 1e-12) return step * base;
  }
  return 10 * base;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

const finite = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

const sameX = (a: ChartX, b: ChartX) => String(a) === String(b);

/** Build the panels' option, height, legend and tables from typed data. */
export function chartPanelsModel(spec: ChartPanelsSpec, tokens: UixChartTokens, labelOverrides?: Partial<ChartPanelsLabels>): ChartPanelsModel {
  const labels: ChartPanelsLabels = { ...DEFAULT_CHART_PANELS_LABELS, ...labelOverrides };
  const L = CHART_PANELS_LAYOUT;
  const events = spec.events ?? [];
  const hasLane = events.length > 0;
  const hasGutter = spec.panels.some((panel) => panel.thresholds?.length);
  const right = hasGutter ? L.gutter : L.right;
  const anyBar = spec.panels.some((panel) => panel.kind === 'bar');

  // x positions: the actual ones, then forecast positions past them, in order
  const categories: ChartX[] = [...spec.x.values];
  for (const panel of spec.panels) {
    for (const point of panel.forecast?.points ?? []) {
      if (!categories.some((x) => sameX(x, point.x))) categories.push(point.x);
    }
  }
  const lastActual = spec.x.values[spec.x.values.length - 1];
  const previousActual = spec.x.values[spec.x.values.length - 2];

  const grids: GridComponentOption[] = [];
  const xAxes: XAXisComponentOption[] = [];
  const yAxes: YAXisComponentOption[] = [];
  const series: (LineSeriesOption | BarSeriesOption | ScatterSeriesOption)[] = [];
  const seriesPanel: Record<string, string> = {};
  const legend: ChartPanelsLegendItem[] = [];
  let cursor = L.top;

  const xAxisBase = (gridIndex: number, showLabels: boolean): XAXisComponentOption => {
    const common = {
      gridIndex,
      axisLabel: {
        show: showLabels,
        hideOverlap: true,
        showMaxLabel: true,
        formatter: (value: string | number) => labels.formatX(value),
      },
      axisLine: { show: true },
      splitLine: { show: false },
    };
    return spec.x.type === 'time'
      ? ({ type: 'time', ...common } as XAXisComponentOption)
      : ({ type: 'category', data: categories.map(String), boundaryGap: anyBar, ...common } as XAXisComponentOption);
  };

  let laneSeriesId = '';
  let eventFragment: ChartMarks | null = null;
  if (hasLane) {
    grids.push({ top: cursor, height: L.lane, left: L.left, right, containLabel: false });
    xAxes.push({ ...xAxisBase(0, false), axisLine: { show: false } } as XAXisComponentOption);
    yAxes.push({ type: 'value', gridIndex: 0, min: -1, max: 1, show: false });
    const marks = eventMarks(events, { tokens, xAxisIndex: 0, yAxisIndex: 0, seriesId: 'uix-event-lane' });
    laneSeriesId = 'uix-event-lane';
    series.push(marks.lane.series);
    eventFragment = { markLine: marks.markLine, markArea: marks.markArea };
    cursor += L.lane + L.laneGap;
  }

  const tables: ChartPanelsTable[] = [];

  spec.panels.forEach((panel, panelIndex) => {
    const gridIndex = grids.length;
    const isLast = panelIndex === spec.panels.length - 1;
    const height = panel.height ?? L.panelHeight;
    cursor += L.title;
    grids.push({ top: cursor, height, left: L.left, right, containLabel: false });
    cursor += height + (isLast ? L.axisBand : L.panelGap);

    // the y extent covers data, the comparison, the forecast band and every threshold, so nothing is clipped
    const values: number[] = [];
    for (const s of panel.series) values.push(...s.values.filter(finite));
    values.push(...(panel.comparison?.values.filter(finite) ?? []));
    for (const p of panel.forecast?.points ?? []) values.push(p.lower, p.upper, p.y);
    for (const t of panel.thresholds ?? []) values.push(t.value, ...(finite(t.to) ? [t.to] : []));
    const usable = values.filter(Number.isFinite);
    const dataMax = usable.length ? Math.max(...usable) : 1;
    const dataMin = usable.length ? Math.min(...usable) : 0;
    const max = niceCeil(dataMax * 1.08);
    const min = dataMin < 0 ? -niceCeil(-dataMin * 1.08) : 0;

    xAxes.push(xAxisBase(gridIndex, isLast));
    yAxes.push({
      type: 'value',
      gridIndex,
      min,
      max,
      splitNumber: 2,
      name: panel.unit ? `${panel.title} (${panel.unit})` : panel.title,
      nameLocation: 'end',
      nameGap: 8,
      nameTextStyle: { align: 'left', padding: [0, 0, 0, -L.left + 4], color: tokens.text, fontFamily: tokens.fontSans, fontSize: 12, fontWeight: 600, width: 320, overflow: 'truncate' },
      axisLabel: { formatter: (value: number) => labels.formatValue(value, panel.unit === '%' ? '%' : undefined) },
    } as YAXisComponentOption);

    const axes = { xAxisIndex: gridIndex, yAxisIndex: gridIndex };
    const pairs = (vals: (number | null)[]) => spec.x.values.map((x, i) => [x, vals[i] ?? null] as [ChartX, number | null]);

    panel.series.forEach((s, seriesIndex) => {
      const colorIndex = s.colorIndex ?? seriesIndex;
      const color = tokens.palette[colorIndex % tokens.palette.length];
      const id = `${panel.id}:${s.id}`;
      seriesPanel[id] = panel.id;
      const isPrimary = seriesIndex === 0;
      let marks: ChartMarks = {};
      if (isPrimary) {
        const crossings = (panel.thresholds ?? [])
          .filter((t) => t.kind !== 'target' && (t.badSide || t.kind === 'limit' || t.kind === 'budget' || t.kind === 'floor'))
          .slice(0, 1)
          .map((t) => crossingPoints(s.values.slice(0, spec.x.values.length), t, { x: spec.x.values, tokens, labels }));
        marks = combineMarks(
          panel.thresholds?.length ? thresholdMarks(panel.thresholds, { tokens, extent: [min, max] }) : null,
          eventFragment,
          spec.partialLast && lastActual != null ? partialPeriod(lastActual, { tokens, from: previousActual, labels }) : null,
          ...crossings,
        );
      }
      if (panel.kind === 'bar') {
        series.push({
          id,
          name: s.label,
          type: 'bar',
          ...axes,
          data: pairs(s.values),
          barMaxWidth: 24,
          itemStyle: { color, borderRadius: [4, 4, 0, 0], borderColor: tokens.surface, borderWidth: 1 },
          animation: false,
          z: 2,
          ...marks,
        });
      } else {
        series.push({
          id,
          name: s.label,
          type: 'line',
          ...axes,
          data: pairs(s.values),
          symbol: 'circle',
          symbolSize: 8,
          showSymbol: false,
          connectNulls: false,
          lineStyle: { color, width: 2, type: 'solid' },
          itemStyle: { color, borderColor: tokens.surface, borderWidth: 2 },
          ...(panel.kind === 'area' ? { areaStyle: { color: uixChartAreaGradient(color) } } : {}),
          emphasis: { focus: 'none' },
          animation: false,
          z: 2,
          ...marks,
        });
      }
      if (panel.series.length > 1) legend.push({ label: s.label, color, swatch: panel.kind === 'bar' ? 'block' : 'line' });
    });

    if (panel.comparison) {
      const id = `${panel.id}:comparison`;
      seriesPanel[id] = panel.id;
      series.push(comparisonSeries(panel.comparison, { x: spec.x.values, tokens, ...axes, id }));
      if (!legend.some((item) => item.label === panel.comparison!.label)) legend.push({ label: panel.comparison.label, color: tokens.comparison, swatch: 'line' });
    }

    if (panel.forecast && panel.series[0]) {
      const primary = panel.series[0];
      const fromIndex = spec.x.values.findIndex((x) => sameX(x, panel.forecast!.from));
      const fromValue = fromIndex >= 0 ? primary.values[fromIndex] ?? null : null;
      const colorIndex = primary.colorIndex ?? 0;
      const fc = forecastSeries(panel.forecast, { name: primary.label, colorIndex, tokens, labels, fromValue, ...axes, idPrefix: `${panel.id}:forecast` });
      for (const s of fc) seriesPanel[String(s.id)] = panel.id;
      series.push(...fc);
      if (!legend.some((item) => item.swatch === 'dash')) {
        legend.push({ label: labels.projection, color: tokens.palette[colorIndex % tokens.palette.length], swatch: 'dash' });
        legend.push({ label: labels.range(panel.forecast.level), color: tokens.forecastBand, swatch: 'block' });
      }
    }

    tables.push(panelTable(spec, panel, categories, events, labels));
  });

  const allX = xAxes.map((_, i) => i);
  const option: EChartsOption = {
    animation: false,
    grid: grids,
    xAxis: xAxes,
    yAxis: yAxes,
    axisPointer: { link: [{ xAxisIndex: 'all' }], label: { show: false } },
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'line' },
      formatter: (params: unknown) => tooltipHtml(params, spec, categories, events, labels),
    },
    series: series as EChartsOption['series'],
    ...(spec.zoom ? { dataZoom: [{ type: 'inside', xAxisIndex: allX, filterMode: 'none' }] } : {}),
  };

  return { option, height: cursor, legend, tables, categories, seriesPanel, laneSeriesId };
}

function panelTable(spec: ChartPanelsSpec, panel: ChartPanel, categories: ChartX[], events: ChartEvent[], labels: ChartPanelsLabels): ChartPanelsTable {
  const headers = [labels.x, ...panel.series.map((s) => s.label)];
  if (panel.comparison) headers.push(panel.comparison.label);
  if (panel.forecast) headers.push(labels.projection, labels.lower, labels.upper);
  for (const t of panel.thresholds ?? []) headers.push(`${labels.threshold}: ${t.label}`);
  if (events.length) headers.push(labels.event);
  const unit = panel.unit;
  const fmt = (v: number | null | undefined) => (finite(v) ? labels.formatValue(v, unit) : '');
  const rows = categories.map((x, i) => {
    const row: Record<string, string | number> = { [labels.x]: labels.formatX(x) };
    for (const s of panel.series) row[s.label] = i < spec.x.values.length ? fmt(s.values[i]) : '';
    if (panel.comparison) row[panel.comparison.label] = i < spec.x.values.length ? fmt(panel.comparison.values[i]) : '';
    if (panel.forecast) {
      const p = panel.forecast.points.find((point) => sameX(point.x, x));
      row[labels.projection] = fmt(p?.y);
      row[labels.lower] = fmt(p?.lower);
      row[labels.upper] = fmt(p?.upper);
    }
    for (const t of panel.thresholds ?? []) row[`${labels.threshold}: ${t.label}`] = finite(t.to) ? `${fmt(t.value)}–${fmt(t.to)}` : fmt(t.value);
    if (events.length) row[labels.event] = events.filter((e) => sameX(e.at, x)).map((e) => e.label).join('; ');
    return row;
  });
  return { caption: labels.table(panel.title), headers, rows };
}

interface AxisParam {
  axisValue?: string | number;
  dataIndex?: number;
  value?: unknown;
}

/** One tooltip for every panel at the hovered x: each variable, the comparison, the projection and its range, the events. */
function tooltipHtml(params: unknown, spec: ChartPanelsSpec, categories: ChartX[], events: ChartEvent[], labels: ChartPanelsLabels): string {
  const list = (Array.isArray(params) ? params : [params]) as AxisParam[];
  const first = list[0];
  if (!first) return '';
  const axisValue = first.axisValue ?? (Array.isArray(first.value) ? (first.value as unknown[])[0] : undefined);
  const index = categories.findIndex((x) => sameX(x, axisValue as ChartX));
  if (index < 0) return '';
  const x = categories[index];
  const lines: string[] = [`<div style="font-weight:600;margin-bottom:4px">${escapeHtml(labels.formatX(x))}</div>`];
  const row = (name: string, value: string) =>
    `<div style="display:flex;justify-content:space-between;gap:16px"><span>${escapeHtml(name)}</span><span style="font-variant-numeric:tabular-nums">${escapeHtml(value)}</span></div>`;
  for (const panel of spec.panels) {
    for (const s of panel.series) {
      const v = index < spec.x.values.length ? s.values[index] : null;
      if (finite(v)) lines.push(row(s.label, labels.formatValue(v, panel.unit)));
    }
    const c = panel.comparison && index < spec.x.values.length ? panel.comparison.values[index] : null;
    if (panel.comparison && finite(c)) lines.push(row(panel.comparison.label, labels.formatValue(c, panel.unit)));
    const p = panel.forecast?.points.find((point) => sameX(point.x, x));
    if (p && panel.forecast) {
      lines.push(row(`${labels.projection} (${panel.forecast.method})`, labels.formatValue(p.y, panel.unit)));
      lines.push(row(labels.range(panel.forecast.level), `${labels.formatValue(p.lower, panel.unit)} – ${labels.formatValue(p.upper, panel.unit)}`));
    }
  }
  for (const e of events.filter((event) => sameX(event.at, x))) lines.push(row(e.kind, e.label));
  if (spec.partialLast && index === spec.x.values.length - 1) lines.push(`<div style="opacity:.75">${escapeHtml(labels.partial)}</div>`);
  return lines.join('');
}
