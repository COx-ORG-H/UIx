import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { DelayedRender } from './DelayedRender.js';
import { PENDING_DELAY_MS } from '../motion-timing.js';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  /** `sm` 16 px (inline, beside text or inside a 24 px control), `md` 20 px (default), `lg` 32 px. */
  size?: 'sm' | 'md' | 'lg';
  accent?: boolean;
  /** Announced loading text (default "Loading…"). */
  label?: string;
  /**
   * Show the spinner only after it has been mounted this long: `true` is 300 ms, a number is
   * milliseconds (HAR-2580). Work that ends sooner never flashes a spinner. To also hold it at
   * least 500 ms once shown, mount it from `useDelayedPending(pending)` instead.
   */
  delay?: boolean | number;
}

export function Spinner({ delay, ...props }: SpinnerProps) {
  if (delay === undefined || delay === false || delay === 0) return <SpinnerRing {...props} />;
  return <DelayedRender delay={delay === true ? PENDING_DELAY_MS : delay}><SpinnerRing {...props} /></DelayedRender>;
}

function SpinnerRing({ size = 'md', accent, label, className, ...props }: Omit<SpinnerProps, 'delay'>) {
  return (
    <span
      className={cx('uix-spinner', accent && 'uix-spinner--accent', size === 'sm' && 'uix-spinner--sm', size === 'lg' && 'uix-spinner--lg', className)}
      role="status"
      {...props}
    >
      {/* real text inside the live region — inserting the spinner announces reliably, unlike a bare
          aria-label; the ring itself is border-drawn CSS with nothing for AT to read (UIX-A11Y-4) */}
      <span className="uix-visually-hidden">{label ?? 'Loading…'}</span>
    </span>
  );
}
