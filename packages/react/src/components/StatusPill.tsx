import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export type PillTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'critical' | 'muted';
export type PillTreatment = 'filled' | 'outline';

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
  /** 'filled' (default) = tinted wash; 'outline' = transparent fill + tone-tinted border. */
  treatment?: PillTreatment;
  dot?: boolean;
  children?: ReactNode;
}

export function StatusPill({ tone = 'neutral', treatment = 'filled', dot, children, className, ...props }: StatusPillProps) {
  return (
    <span
      className={cx('uix-pill', `uix-pill--${tone}`, treatment === 'outline' && 'uix-pill--outline', className)}
      {...props}
    >
      {dot && <span className="uix-pill__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
