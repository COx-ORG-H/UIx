import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  /** `sm` 16 px (inline, beside text or inside a 24 px control), `md` 20 px (default), `lg` 32 px. */
  size?: 'sm' | 'md' | 'lg';
  accent?: boolean;
  /** Announced loading text (default "Loading…"). */
  label?: string;
}

export function Spinner({ size = 'md', accent, label, className, ...props }: SpinnerProps) {
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
