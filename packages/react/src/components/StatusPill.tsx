import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export type PillTone =
  | 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'critical' | 'muted'
  // time-pressure tones (U1)
  | 'attention' | 'overdue'
  // SLA tones — ok / at-risk / breached (U4)
  | 'sla-ok' | 'sla-at-risk' | 'sla-breached'
  // priority / severity ramp P1 (critical) → P5 (neutral) (U4)
  | 'p1' | 'p2' | 'p3' | 'p4' | 'p5';
export type PillTreatment = 'filled' | 'outline';
export type PillSize = 'sm' | 'md' | 'lg';

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
  /** 'filled' (default) = tinted wash; 'outline' = transparent fill + tone-tinted border. */
  treatment?: PillTreatment;
  /**
   * `sm` for a dense table cell or beside small text, `lg` for a page header (the public status
   * page). Default `md`, the size every pill had before (HAR-1614).
   */
  size?: PillSize;
  dot?: boolean;
  children?: ReactNode;
}

export function StatusPill({ tone = 'neutral', treatment = 'filled', size = 'md', dot, children, className, ...props }: StatusPillProps) {
  return (
    <span
      className={cx('uix-pill', `uix-pill--${tone}`, treatment === 'outline' && 'uix-pill--outline', size === 'sm' && 'uix-pill--sm', size === 'lg' && 'uix-pill--lg', className)}
      {...props}
    >
      {dot && <span className="uix-pill__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
