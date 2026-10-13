"use client";

import { useEffect, useId, useRef } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { ECharts, EChartsOption } from 'echarts';
import { cx } from '../cx.js';
import { mergeChartTheme, uixChartTheme, uixChartTokens } from '../chart-theme.js';
import type { UixChartTokens } from '../chart-theme.js';

export interface ChartEngine {
  init(element: HTMLElement, theme?: string | null, options?: { renderer?: 'svg' | 'canvas' }): ECharts;
  /** Optional: links charts that share a `group` (one crosshair and tooltip across cards). */
  connect?(group: string): void;
}

/** An option, or a function that builds it from the chart tokens of the current theme (re-run on a theme flip). */
export type ChartOption = EChartsOption | ((tokens: UixChartTokens) => EChartsOption);

/** A further text alternative: one visually hidden table (ChartPanels gives one per panel). */
export interface ChartTable {
  caption: string;
  headers: string[];
  rows: ChartTableRow[];
}

/** An ECharts event handler; `params` is ECharts' event object. */
export type ChartEventHandler = (params: unknown) => void;

function readToken(name: string): string {
  if (typeof getComputedStyle === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function uixChartPalette(): string[] {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((i) => readToken(`--uix-chart-${i}`));
}

/** The option ECharts receives: the consumer's, over the UIx theme read from the chart's own element
    (so a scoped `.dark` subtree themes its charts too). */
function themed(option: ChartOption, theme: 'uix' | 'none', element: Element): EChartsOption {
  const resolved = typeof option === 'function' ? option(uixChartTokens(element)) : option;
  return theme === 'none' ? resolved : mergeChartTheme(uixChartTheme(element), resolved);
}

/** Merge `animation: false` when the user prefers reduced motion. Only called from effects (client-side),
    but guard matchMedia anyway for SSR safety (UIX-A11Y-4). */
function motionSafe(option: EChartsOption): EChartsOption {
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return { ...option, animation: false };
  }
  return option;
}

export interface ChartTableRow {
  [key: string]: string | number;
}

/**
 * Every word the chart renders itself (TENSOR RX-125, UIX-04 / UIX-05). The
 * loading text used to live in CSS `content:`, where nothing could translate it.
 */
export interface ChartLabels {
  /** Shown (and announced inside the busy region) while `loading`. */
  loading: ReactNode;
  /** Accessible name when neither `ariaLabel` nor `title` is given. */
  chart: string;
  /** Appended to the chart's name for its data-table alternative. */
  dataTableSuffix: string;
}

export const DEFAULT_CHART_LABELS: ChartLabels = {
  loading: 'Loading chart…',
  chart: 'Chart',
  dataTableSuffix: 'data table',
};

export interface ChartProps {
  /** The ECharts option, or a function of the theme's chart tokens (re-run when the theme flips). */
  option: ChartOption;
  title?: string;
  subtitle?: string;
  height?: string | number;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  tableData?: ChartTableRow[];
  tableHeaders?: string[];
  onReady?: (chart: ECharts) => void;
  header?: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  empty?: ReactNode;
  /** Translatable words; English defaults in {@link DEFAULT_CHART_LABELS}. */
  labels?: Partial<ChartLabels>;
  /**
   * `'uix'` (default) merges {@link uixChartTheme} under `option` — token palette, fonts, a solid hairline
   * grid and the UIx tooltip — and re-applies it when the page theme changes. `'none'` renders `option` as is.
   */
  theme?: 'uix' | 'none';
  /** Charts with the same group share one crosshair and tooltip (`echarts.connect`). */
  group?: string;
  /** ECharts event handlers by event name (`click` for drill-down). */
  onEvents?: Record<string, ChartEventHandler>;
  /** Further hidden data tables (after `tableData`), each named in the chart's description. */
  tables?: ChartTable[];
}

interface ChartCoreProps extends ChartProps {
  engine: ChartEngine;
}

/** Shared chart lifecycle. Runtime adapters only choose the ECharts build. */
export function ChartCore({
  engine,
  option,
  title,
  subtitle,
  height = 280,
  className,
  style,
  ariaLabel,
  tableData,
  tableHeaders,
  onReady,
  header,
  headerAction,
  footer,
  loading = false,
  empty,
  labels: labelOverrides,
  theme = 'uix',
  group,
  onEvents,
  tables,
}: ChartCoreProps) {
  const labels: ChartLabels = { ...DEFAULT_CHART_LABELS, ...labelOverrides };
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const appliedOptionRef = useRef<ChartOption | null>(null);
  const onEventsRef = useRef(onEvents);
  onEventsRef.current = onEvents;
  const latestOptionRef = useRef(option);
  const onReadyRef = useRef(onReady);
  const tableId = useId();
  const hasEmpty = empty != null;
  const hasTextAlternative = Boolean(ariaLabel || title || tableData?.length || tables?.length);
  const hasTextAlternativeRef = useRef(hasTextAlternative);
  const themeRef = useRef(theme);
  latestOptionRef.current = option;
  themeRef.current = theme;
  onReadyRef.current = onReady;
  hasTextAlternativeRef.current = hasTextAlternative;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const chart = engine.init(element, null, { renderer: 'svg' });
    chartRef.current = chart;
    chart.setOption(motionSafe(themed(latestOptionRef.current, themeRef.current, element)));
    appliedOptionRef.current = latestOptionRef.current;
    onReadyRef.current?.(chart);

    // Re-read the tokens when the page theme flips (class / data-theme on <html>, or the OS scheme),
    // so a mounted chart recolours in place instead of remounting.
    const retheme = () => {
      if (themeRef.current === 'none') return;
      chart.setOption(motionSafe(themed(latestOptionRef.current, themeRef.current, element)));
    };
    const themeObserver = typeof MutationObserver === 'undefined' ? null : new MutationObserver(retheme);
    themeObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    const scheme = typeof matchMedia === 'undefined' ? null : matchMedia('(prefers-color-scheme: dark)');
    scheme?.addEventListener?.('change', retheme);

    // once per mount: the role="img" fallback name ("Chart") tells AT users nothing (UIX-A11Y-4)
    if (!hasTextAlternativeRef.current) {
      console.warn('[uix] Chart has no text alternative — provide ariaLabel, title, or tableData.');
    }

    let frame = 0;
    let width = element.clientWidth;
    let height = element.clientHeight;
    const observer = new ResizeObserver(() => {
      const nextWidth = element.clientWidth;
      const nextHeight = element.clientHeight;
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        chart.resize();
      });
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      themeObserver?.disconnect();
      scheme?.removeEventListener?.('change', retheme);
      if (frame) cancelAnimationFrame(frame);
      chart.dispose();
      chartRef.current = null;
      appliedOptionRef.current = null;
    };
  }, [engine, hasEmpty]);

  // handlers are re-bound when the set of event names changes; each call reads the latest handler
  const eventNames = Object.keys(onEvents ?? {}).sort().join('|');
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !eventNames) return;
    const bound = eventNames.split('|').map((name) => {
      const handler = (params: unknown) => onEventsRef.current?.[name]?.(params);
      chart.on(name, handler);
      return [name, handler] as const;
    });
    return () => {
      // the init effect's cleanup may have disposed the instance first (unmount, StrictMode)
      if (chart.isDisposed()) return;
      for (const [name, handler] of bound) chart.off(name, handler);
    };
  }, [engine, hasEmpty, eventNames]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !group) return;
    chart.group = group;
    engine.connect?.(group);
    return () => {
      if (!chart.isDisposed()) chart.group = '';
    };
  }, [engine, hasEmpty, group]);

  useEffect(() => {
    const chart = chartRef.current;
    const element = containerRef.current;
    if (!chart || !element || appliedOptionRef.current === option) return;
    chart.setOption(motionSafe(themed(option, theme, element)), { notMerge: false });
    appliedOptionRef.current = option;
  }, [option, theme]);

  const heightValue = typeof height === 'number' ? `${height}px` : height;
  const effectiveAriaLabel = ariaLabel ?? title ?? labels.chart;
  const hasTable = Boolean(tableData?.length && tableHeaders?.length);
  const extraTables = (tables ?? []).filter((table) => table.headers.length && table.rows.length);
  const describedBy = [hasTable ? tableId : null, ...extraTables.map((_, index) => `${tableId}-${index}`)].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('uix-chart', className)} style={style}>
      {(title != null || subtitle != null || header != null || headerAction != null) ? (
        <div className="uix-chart__header">
          <div className="uix-chart__heading">
            {header}
            {title ? <div className="uix-chart__title">{title}</div> : null}
            {subtitle ? <div className="uix-chart__subtitle">{subtitle}</div> : null}
          </div>
          {headerAction}
        </div>
      ) : null}
      {hasEmpty ? (
        <div className="uix-chart__plot" data-empty>{empty}</div>
      ) : (
        <div className="uix-chart__plot" data-loading={loading || undefined} aria-busy={loading || undefined}>
          {loading ? <span className="uix-chart__loading">{labels.loading}</span> : null}
          <div
            ref={containerRef}
            style={{ height: heightValue }}
            role="img"
            aria-label={effectiveAriaLabel}
            aria-describedby={describedBy}
          />
        </div>
      )}
      {hasTable ? (
        <table id={tableId} className="uix-visually-hidden" aria-label={`${effectiveAriaLabel} — ${labels.dataTableSuffix}`}>
          <thead><tr>{tableHeaders!.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>
            {tableData!.map((row, index) => (
              <tr key={index}>{tableHeaders!.map((label) => <td key={label}>{row[label]}</td>)}</tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {extraTables.map((table, index) => (
        <table key={index} id={`${tableId}-${index}`} className="uix-visually-hidden" aria-label={table.caption}>
          <thead><tr>{table.headers.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>{table.headers.map((label) => <td key={label}>{row[label]}</td>)}</tr>
            ))}
          </tbody>
        </table>
      ))}
      {footer != null && <div className="uix-chart__footer">{footer}</div>}
    </div>
  );
}

export interface ChartMetricProps extends HTMLAttributes<HTMLDivElement> {
  value: ReactNode;
  label?: ReactNode;
  delta?: ReactNode;
  deltaTone?: 'neutral' | 'positive' | 'negative' | 'warning';
}

export function ChartMetric({ value, label, delta, deltaTone = 'neutral', className, ...props }: ChartMetricProps) {
  return (
    <div className={cx('uix-chart__metric', className)} {...props}>
      <div className="uix-chart__metric-value">{value}</div>
      {label != null && <div className="uix-chart__metric-label">{label}</div>}
      {delta != null && <div className="uix-chart__delta" data-tone={deltaTone}>{delta}</div>}
    </div>
  );
}

export interface ChartLegendProps extends HTMLAttributes<HTMLUListElement> {
  children?: ReactNode;
}

export function ChartLegend({ children, className, ...props }: ChartLegendProps) {
  return <ul className={cx('uix-legend', className)} {...props}>{children}</ul>;
}

export interface ChartLegendItemProps extends HTMLAttributes<HTMLLIElement> {
  label: ReactNode;
  color?: string;
  swatch?: 'block' | 'line' | 'dash';
}

export function ChartLegendItem({ label, color, swatch = 'block', className, style, ...props }: ChartLegendItemProps) {
  const mergedStyle = color ? ({ '--legend-color': color, ...style } as CSSProperties) : style;
  return (
    <li className={cx('uix-legend__item', className)} style={mergedStyle} {...props}>
      <span className={cx('uix-legend__swatch', swatch !== 'block' && `uix-legend__swatch--${swatch}`)} aria-hidden="true" />
      {label}
    </li>
  );
}
