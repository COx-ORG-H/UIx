"use client";

import { useEffect, useId, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { ECharts, EChartsOption } from 'echarts';
import { cx } from '../cx.js';

export interface ChartEngine {
  init(element: HTMLElement, theme?: string | null, options?: { renderer?: 'svg' | 'canvas' }): ECharts;
}

function readToken(name: string): string {
  if (typeof getComputedStyle === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function uixChartPalette(): string[] {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((i) => readToken(`--uix-chart-${i}`));
}

export interface ChartTableRow {
  [key: string]: string | number;
}

export interface ChartProps {
  option: EChartsOption;
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
}: ChartCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const appliedOptionRef = useRef<EChartsOption | null>(null);
  const latestOptionRef = useRef(option);
  const onReadyRef = useRef(onReady);
  const tableId = useId();
  latestOptionRef.current = option;
  onReadyRef.current = onReady;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const chart = engine.init(element, null, { renderer: 'svg' });
    chartRef.current = chart;
    chart.setOption(latestOptionRef.current);
    appliedOptionRef.current = latestOptionRef.current;
    onReadyRef.current?.(chart);

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
      if (frame) cancelAnimationFrame(frame);
      chart.dispose();
      chartRef.current = null;
      appliedOptionRef.current = null;
    };
  }, [engine]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || appliedOptionRef.current === option) return;
    chart.setOption(option, { notMerge: false });
    appliedOptionRef.current = option;
  }, [option]);

  const heightValue = typeof height === 'number' ? `${height}px` : height;
  const effectiveAriaLabel = ariaLabel ?? title ?? 'Chart';
  const hasTable = Boolean(tableData?.length && tableHeaders?.length);

  return (
    <div className={cx('uix-chart', className)} style={style}>
      {(title != null || subtitle != null || header != null) ? (
        <div>
          {header}
          {title ? <div className="uix-chart__title">{title}</div> : null}
          {subtitle ? <div className="uix-chart__subtitle">{subtitle}</div> : null}
        </div>
      ) : null}
      <div
        ref={containerRef}
        style={{ height: heightValue }}
        role="img"
        aria-label={effectiveAriaLabel}
        aria-describedby={hasTable ? tableId : undefined}
      />
      {hasTable ? (
        <table id={tableId} className="sr-only" aria-label={`${effectiveAriaLabel} — data table`}>
          <thead><tr>{tableHeaders!.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>
            {tableData!.map((row, index) => (
              <tr key={index}>{tableHeaders!.map((label) => <td key={label}>{row[label]}</td>)}</tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
