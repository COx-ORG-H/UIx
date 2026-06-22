import { useRef, useEffect, useId } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
import { cx } from '../cx.js';

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

export function Chart({
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
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const tableId = useId();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = echarts.init(el, null, { renderer: 'svg' });
    chartRef.current = chart;
    chart.setOption(option);
    onReady?.(chart);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  // option is intentionally excluded — updates handled in second effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: false });
  }, [option]);

  const heightVal = typeof height === 'number' ? `${height}px` : height;
  const effectiveAriaLabel = ariaLabel ?? title ?? 'Chart';
  const hasTable = tableData && tableData.length > 0 && tableHeaders && tableHeaders.length > 0;

  return (
    <div className={cx('uix-chart', className)} style={style}>
      {(title != null || subtitle != null || header != null) && (
        <div>
          {header}
          {title && <div className="uix-chart__title">{title}</div>}
          {subtitle && <div className="uix-chart__subtitle">{subtitle}</div>}
        </div>
      )}
      <div
        ref={containerRef}
        style={{ height: heightVal }}
        role="img"
        aria-label={effectiveAriaLabel}
        aria-describedby={hasTable ? tableId : undefined}
      />
      {hasTable && (
        <table
          id={tableId}
          className="sr-only"
          aria-label={`${effectiveAriaLabel} — data table`}
        >
          <thead>
            <tr>
              {tableHeaders!.map((h) => <th key={h} scope="col">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {tableData!.map((row, i) => (
              <tr key={i}>
                {tableHeaders!.map((h) => <td key={h}>{row[h]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
