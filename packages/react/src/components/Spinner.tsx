import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: 'md' | 'lg';
  accent?: boolean;
}

export function Spinner({ size = 'md', accent, className, ...props }: SpinnerProps) {
  return (
    <span
      className={cx('uix-spinner', accent && 'uix-spinner--accent', size === 'lg' && 'uix-spinner--lg', className)}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
}
