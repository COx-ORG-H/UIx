import type { CSSProperties, HTMLAttributes } from 'react';
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
  toneLabels?: Partial<Record<Exclude<MeterTone, 'success' | 'neutral' | 'accent'>, string>>;
  /**
   * A goal on the same 0–100 scale (calm kit 2.56): a thin ink mark across the track, so
   * "42 %, target 95 %" reads from the bar itself. Clamped to 0–100.
   */
  target?: number;
  /** How the target is said after the value, e.g. "Ziel 95 %". Default `target ${target}%`. */
  targetLabel?: string;
}

/** Spoken tone suffix — the fill colour is the only visual tone cue (UIX-A11Y-4). */
const toneText: Record<SpokenMeterTone, string> = {
  warning: 'warning',
  danger: 'critical',
  attention: 'needs attention',
  overdue: 'overdue',
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Horizontal utilization / threshold bar backed by `.uix-meter`. Inside an `Arrive` stage the
 * fill slides in from its start edge on the first paint (`.uix-arrive__slide`).
 */
export function Meter({ value = 0, tone, label, toneLabels, target, targetLabel, className, ...props }: MeterProps) {
  const spoken: Partial<Record<MeterTone, string>> = { ...toneText, ...toneLabels };
  const pct = clamp(value);
  const toneWord = tone ? spoken[tone] : undefined;
  const hasTarget = typeof target === 'number' && Number.isFinite(target);
  const goal = hasTarget ? clamp(target) : 0;
  const goalWords = hasTarget ? (targetLabel ?? `target ${goal}%`) : undefined;
  const valueText = [toneWord || goalWords ? `${pct}%` : null, toneWord, goalWords].filter(Boolean).join(', ');
  const fill = (
    <div
      className="uix-meter__fill uix-arrive__slide"
      // --val slides the fill on transform (meter.css); width never animates
      style={{ '--val': pct / 100 } as CSSProperties}
      {...(tone && tone !== 'success' ? { 'data-tone': tone } : {})}
    />
  );
  return (
    <div
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      // non-default tones are colour-only on screen; speak them via aria-valuetext (UIX-A11Y-4)
      aria-valuetext={valueText || undefined}
      aria-label={label}
      className={cx('uix-meter', hasTarget && 'uix-meter--target', className)}
      {...props}
      style={hasTarget ? ({ '--target': goal / 100, ...props.style } as CSSProperties) : props.style}
    >
      {hasTarget ? (
        <>
          <div className="uix-meter__clip">{fill}</div>
          <span className="uix-meter__target" aria-hidden="true" />
        </>
      ) : fill}
    </div>
  );
}
