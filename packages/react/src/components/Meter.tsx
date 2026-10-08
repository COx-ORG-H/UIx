import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';

/**
 * Fill color tone for the meter bar. Defaults to `success` (green).
 * `neutral` and `accent` are for a plain proportion that is neither good nor bad (a poll
 * option's share of the votes): a grey or brand fill, and no tone word is spoken (HAR-1606).
 */
export type MeterTone = 'success' | 'warning' | 'danger' | 'attention' | 'overdue' | 'neutral' | 'accent';

/** The tones that mean something, and so are also said in words. */
type SpokenMeterTone = Exclude<MeterTone, 'success' | 'neutral' | 'accent'>;

export interface MeterProps extends HTMLAttributes<HTMLDivElement> {
  /** Fill level 0–100. Clamped to this range. */
  value?: number;
  /** Threshold tone applied via `data-tone` on the fill element. `success` is the implicit default (no attribute). */
  tone?: MeterTone;
  /** Accessible name — rendered as `aria-label` (an explicit `aria-label` prop wins). */
  label?: string;
  /** TENSOR RX-125 (UIX-04): the spoken tone words; English defaults. */
  toneLabels?: Partial<Record<SpokenMeterTone, string>>;
}

/** Spoken tone suffix — the fill colour is the only visual tone cue (UIX-A11Y-4). */
const toneText: Record<SpokenMeterTone, string> = {
  warning: 'warning',
  danger: 'critical',
  attention: 'needs attention',
  overdue: 'overdue',
};

/** Horizontal utilization / threshold bar backed by `.uix-meter`. */
export function Meter({ value = 0, tone, label, toneLabels, className, ...props }: MeterProps) {
  const spoken: Partial<Record<MeterTone, string>> = { ...toneText, ...toneLabels };
  const pct = Math.max(0, Math.min(100, value));
  const toneWord = tone ? spoken[tone] : undefined;
  return (
    <div
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      // non-default tones are colour-only on screen; speak them via aria-valuetext (UIX-A11Y-4)
      aria-valuetext={toneWord ? `${pct}%, ${toneWord}` : undefined}
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
