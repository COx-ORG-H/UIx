import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** 0..max. Ignored when `indeterminate`. */
  value?: number;
  /** Default 100. */
  max?: number;
  /** Continuous slide animation when the amount of work is unknown. */
  indeterminate?: boolean;
  /** Accessible name — rendered as `aria-label` (an explicit `aria-label` prop wins). */
  label?: string;
}

export function Progress({ value = 0, max = 100, indeterminate, label, className, ...props }: ProgressProps) {
  // one clamp feeds both the visual width and aria-valuenow, so AT never hears an out-of-range value (UIX-A11Y-4)
  const clamped = Math.max(0, Math.min(max || 100, value));
  const pct = (clamped / (max || 100)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-label={label}
      className={cx('uix-progress', indeterminate && 'uix-progress--indeterminate', className)}
      {...props}
    >
      <div className="uix-progress__bar" style={indeterminate ? undefined : { width: `${pct}%` }} />
    </div>
  );
}
