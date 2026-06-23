import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** 0..max. Ignored when `indeterminate`. */
  value?: number;
  /** Default 100. */
  max?: number;
  /** Continuous slide animation when the amount of work is unknown. */
  indeterminate?: boolean;
}

export function Progress({ value = 0, max = 100, indeterminate, className, ...props }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / (max || 100)) * 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : value}
      className={cx('uix-progress', indeterminate && 'uix-progress--indeterminate', className)}
      {...props}
    >
      <div className="uix-progress__bar" style={indeterminate ? undefined : { width: `${pct}%` }} />
    </div>
  );
}
