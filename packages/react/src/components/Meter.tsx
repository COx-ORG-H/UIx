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
  /** Accessible name — rendered as `aria-label` (an explicit `aria-label` prop wins). */
  label?: string;
}

/** Spoken tone suffix — the fill colour is the only visual tone cue (UIX-A11Y-4). */
const toneText: Record<Exclude<MeterTone, 'success'>, string> = {
  warning: 'warning',
  danger: 'critical',
  attention: 'needs attention',
  overdue: 'overdue',
};

/** Horizontal utilization / threshold bar backed by `.uix-meter`. */
export function Meter({ value = 0, tone, label, className, ...props }: MeterProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      // non-default tones are colour-only on screen; speak them via aria-valuetext (UIX-A11Y-4)
      aria-valuetext={tone && tone !== 'success' ? `${pct}%, ${toneText[tone]}` : undefined}
      aria-label={label}
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
