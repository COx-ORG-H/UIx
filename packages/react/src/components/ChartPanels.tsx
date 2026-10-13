"use client";

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ChartCore, ChartLegend, ChartLegendItem } from './ChartCore.js';
import type { ChartEngine, ChartLabels } from './ChartCore.js';
import { chartPanelsModel } from '../chart-panels-model.js';
import type { ChartPanelsLabels, ChartPanelsSpec } from '../chart-panels-model.js';
import type { ChartEvent, ChartX } from '../chart-analytic-model.js';
import type { UixChartTokens } from '../chart-theme.js';
import { DEFAULT_CORRELATION_SCATTER_LABELS, correlationScatterModel } from '../correlation-scatter-model.js';
import type { CorrelationPoint, CorrelationScatterLabels, CorrelationScatterSpec } from '../correlation-scatter-model.js';

/** Chart tokens as CSS custom properties: for the HTML parts (legend swatches), which re-theme by themselves. */
const CSS_VAR_TOKENS: UixChartTokens = {
  palette: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--uix-chart-${i})`),
  neutral: 'var(--uix-chart-neutral)',
  grid: 'var(--uix-chart-grid)',
  axis: 'var(--uix-chart-axis)',
  reference: 'var(--uix-chart-reference)',
  zoneWarning: 'var(--uix-chart-zone-warning)',
  zoneDanger: 'var(--uix-chart-zone-danger)',
  forecastBand: 'var(--uix-chart-forecast-band)',
  event: 'var(--uix-chart-event)',
  partial: 'var(--uix-chart-partial)',
  comparison: 'var(--uix-chart-comparison)',
  warning: 'var(--uix-warning)',
  danger: 'var(--uix-danger)',
  surface: 'var(--uix-surface)',
  text: 'var(--uix-text)',
  textMuted: 'var(--uix-text-muted)',
  border: 'var(--uix-border-strong)',
  fontSans: 'inherit',
  fontMono: 'inherit',
};

interface ChartFrameProps {
  /** Accessible name of the whole chart. Required: a chart without one tells a screen reader nothing. */
  ariaLabel: string;
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  empty?: ReactNode;
  className?: string;
  /** Charts with the same group share one crosshair across cards. */
  group?: string;
}

export interface ChartPanelsProps extends ChartPanelsSpec, ChartFrameProps {
  labels?: Partial<ChartPanelsLabels> & Partial<ChartLabels>;
  /** A click on a panel's point. */
  onPointClick?: (panelId: string, x: ChartX) => void;
  /** A click on an event pin. Without a handler, an event with `href` navigates there. */
  onEventClick?: (event: ChartEvent) => void;
  /** Show the legend (series of multi-series panels, comparison, projection). Default: when there is one. */
  legend?: boolean;
}

interface ClickParams {
  seriesId?: string;
  value?: unknown;
  name?: string;
}

/** Aligned panels on one time axis with one crosshair (HAR-1554). Different units never share an axis. */
export function ChartPanelsCore({
  engine,
  x,
  panels,
  events,
  partialLast,
  zoom,
  ariaLabel,
  title,
  subtitle,
  header,
  headerAction,
  footer,
  loading,
  empty,
  className,
  group,
  labels,
  onPointClick,
  onEventClick,
  legend,
}: ChartPanelsProps & { engine: ChartEngine }) {
  const spec = useMemo<ChartPanelsSpec>(() => ({ x, panels, events, partialLast, zoom }), [x, panels, events, partialLast, zoom]);
  const layout = useMemo(() => chartPanelsModel(spec, CSS_VAR_TOKENS, labels), [spec, labels]);
  const option = useMemo(() => (tokens: UixChartTokens) => chartPanelsModel(spec, tokens, labels).option, [spec, labels]);
  const onEvents = useMemo(() => ({
    click: (raw: unknown) => {
      const params = raw as ClickParams;
      const value = Array.isArray(params.value) ? params.value : [];
      if (params.seriesId && params.seriesId === layout.laneSeriesId) {
        const event = spec.events?.[Number(value[2])];
        if (!event) return;
        if (onEventClick) onEventClick(event);
        else if (event.href && typeof window !== 'undefined') window.location.assign(event.href);
        return;
      }
      const panelId = params.seriesId ? layout.seriesPanel[params.seriesId] : undefined;
      if (panelId && onPointClick) onPointClick(panelId, (value[0] ?? params.name) as ChartX);
    },
  }), [layout, spec.events, onEventClick, onPointClick]);
  const showLegend = legend ?? layout.legend.length > 0;
  const legendNode = showLegend && layout.legend.length ? (
    <ChartLegend>
      {layout.legend.map((item) => <ChartLegendItem key={`${item.swatch}:${item.label}`} label={item.label} color={item.color} swatch={item.swatch} />)}
    </ChartLegend>
  ) : null;
  const footerNode = legendNode || footer != null ? <>{legendNode}{footer}</> : undefined;
  return (
    <ChartCore
      engine={engine}
      option={option}
      height={layout.height}
      ariaLabel={ariaLabel}
      title={title}
      subtitle={subtitle}
      header={header}
      headerAction={headerAction}
      footer={footerNode}
      loading={loading}
      empty={empty}
      className={className}
      group={group}
      labels={labels}
      onEvents={onEvents}
      tables={layout.tables}
    />
  );
}

export interface CorrelationScatterProps extends CorrelationScatterSpec, ChartFrameProps {
  labels?: Partial<CorrelationScatterLabels> & Partial<ChartLabels>;
  /** Show r, n and "association, not cause" under the plot. Default true. */
  showStats?: boolean;
  /** Plot height in px. Default 280. */
  height?: number;
  /** A click on a point. Without a handler, a point with `href` navigates there. */
  onPointClick?: (point: CorrelationPoint) => void;
}

/** How two variables move together: dots, a trend line, r and n, and an optional breaking point (HAR-1554). */
export function CorrelationScatterCore({
  engine,
  points,
  xLabel,
  yLabel,
  trend,
  percentiles,
  thresholds,
  breakpoint,
  minPoints,
  ariaLabel,
  title,
  subtitle,
  header,
  headerAction,
  footer,
  loading,
  empty,
  className,
  group,
  labels,
  showStats = true,
  height = 280,
  onPointClick,
}: CorrelationScatterProps & { engine: ChartEngine }) {
  const spec = useMemo<CorrelationScatterSpec>(
    () => ({ points, xLabel, yLabel, trend, percentiles, thresholds, breakpoint, minPoints }),
    [points, xLabel, yLabel, trend, percentiles, thresholds, breakpoint, minPoints],
  );
  const layout = useMemo(() => correlationScatterModel(spec, CSS_VAR_TOKENS, labels), [spec, labels]);
  const option = useMemo(() => (tokens: UixChartTokens) => correlationScatterModel(spec, tokens, labels).option, [spec, labels]);
  const usable = useMemo(() => spec.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), [spec.points]);
  const onEvents = useMemo(() => ({
    click: (raw: unknown) => {
      const params = raw as ClickParams;
      if (params.seriesId !== layout.hitSeriesId || !Array.isArray(params.value)) return;
      const point = usable[Number(params.value[2])];
      if (!point) return;
      if (onPointClick) onPointClick(point);
      else if (point.href && typeof window !== 'undefined') window.location.assign(point.href);
    },
  }), [layout.hitSeriesId, usable, onPointClick]);
  const notEnough = !layout.enough
    ? <span className="uix-chart__insufficient">{(labels?.notEnough ?? DEFAULT_CORRELATION_SCATTER_LABELS.notEnough)(layout.n, layout.minPoints)}</span>
    : null;
  const stats = showStats && layout.enough ? <p className="uix-chart__stats">{layout.statsText}</p> : null;
  const footerNode = stats || footer != null ? <>{stats}{footer}</> : undefined;
  return (
    <ChartCore
      engine={engine}
      option={option}
      height={height}
      ariaLabel={ariaLabel}
      title={title}
      subtitle={subtitle}
      header={header}
      headerAction={headerAction}
      footer={footerNode}
      loading={loading}
      empty={empty ?? notEnough ?? undefined}
      className={className}
      group={group}
      labels={labels}
      onEvents={onEvents}
      tableHeaders={layout.table.headers}
      tableData={layout.table.rows}
    />
  );
}
