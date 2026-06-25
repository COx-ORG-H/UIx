"use client";
import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';

/** Fill color tone for the meter bar. Defaults to `success` (green). */
export type MeterTone = 'success' | 'warning' | 'danger' | 'attention' | 'overdue';

export interface MeterProps extends HTMLAttributes<HTMLDivElement> {
  /** Fill level 0–100. Clamped to this range. */
  value?: number;
  /** Threshold tone applied via `data-tone` on the fill element. `success` is the implicit default (no attribute). */
  tone?: MeterTone;
}

/** Horizontal utilization / threshold bar backed by `.uix-meter`. */
export function Meter({ value = 0, tone, className, ...props }: MeterProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx('uix-meter', className)}
      {...props}
    >
      <div
        className="uix-meter__fill"
        style={{ width: `${pct}%` }}
        {...(tone && tone !== 'success' ? { 'data-tone': tone } : {})}
      />
    </div>
  );
}
