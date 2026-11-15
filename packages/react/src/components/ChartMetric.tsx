import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

/** A body-only metric; importing it from the root loads no chart engine. */
export interface ChartMetricProps extends HTMLAttributes<HTMLDivElement> {
  value: ReactNode;
  label?: ReactNode;
  delta?: ReactNode;
  /** Sentiment is independent of whether the numerical delta rises or falls. */
  deltaTone?: 'neutral' | 'positive' | 'negative' | 'warning';
  /** Omit to retain the responsive chart-header default. */
  align?: 'start' | 'end';
}

export function ChartMetric({ value, label, delta, deltaTone = 'neutral', align, className, ...props }: ChartMetricProps) {
  return (
    <div className={cx('uix-chart__metric', className)} data-align={align} {...props}>
      <div className="uix-chart__metric-value">{value}</div>
      {label != null && <div className="uix-chart__metric-label">{label}</div>}
      {delta != null && <div className="uix-chart__delta" data-tone={deltaTone}>{delta}</div>}
    </div>
  );
}
