import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: 'md' | 'lg';
  accent?: boolean;
  /** Announced loading text (default "Loading…"). */
  label?: string;
}

export function Spinner({ size = 'md', accent, label, className, ...props }: SpinnerProps) {
  return (
    <span
      className={cx('uix-spinner', accent && 'uix-spinner--accent', size === 'lg' && 'uix-spinner--lg', className)}
      role="status"
      {...props}
    >
      {/* real text inside the live region — inserting the spinner announces reliably, unlike a bare
          aria-label; the ring itself is border-drawn CSS with nothing for AT to read (UIX-A11Y-4) */}
      <span className="uix-visually-hidden">{label ?? 'Loading…'}</span>
    </span>
  );
}
