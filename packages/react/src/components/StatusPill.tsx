import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export type PillTone =
  | 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'critical' | 'muted'
  // in flight: the same blue as `info` (HAR-1563)
  | 'progress'
  // time-pressure tones (U1)
  | 'attention' | 'overdue'
  // SLA tones — ok / at-risk / breached (U4)
  | 'sla-ok' | 'sla-at-risk' | 'sla-breached'
  // priority / severity ramp P1 (critical) → P5 (neutral) (U4)
  | 'p1' | 'p2' | 'p3' | 'p4' | 'p5';
/**
 * How loud the pill is (HAR-1563). `soft` (default) is the tinted wash; `filled` is its old name
 * and still works. `dot` is the quiet one for tables: no fill, a neutral label and a coloured dot.
 * `outline` is a neutral hairline with a hushed label and a dot; only `critical` keeps a toned
 * border.
 */
export type PillTreatment = 'soft' | 'filled' | 'dot' | 'outline';
export type PillSize = 'sm' | 'md' | 'lg';

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
  /**
   * `soft` (default; `filled` is an alias) = tinted wash; `dot` = a coloured dot beside a neutral
   * label, for dense tables; `outline` = a neutral hairline, a hushed label and a dot. `dot` and
   * `outline` always draw the dot.
   */
  treatment?: PillTreatment;
  /**
   * `sm` for a dense table cell or beside small text, `lg` for a page header (the public status
   * page). Default `md`, the size every pill had before (HAR-1614).
   */
  size?: PillSize;
  /** Draws the tone's dot before the label. Always on for the `dot` and `outline` treatments. */
  dot?: boolean;
  children?: ReactNode;
}

export function StatusPill({ tone = 'neutral', treatment = 'soft', size = 'md', dot, children, className, ...props }: StatusPillProps) {
  const quiet = treatment === 'dot' || treatment === 'outline';
  return (
    <span
      className={cx(
        'uix-pill', `uix-pill--${tone}`, quiet && `uix-pill--${treatment}`,
        size === 'sm' && 'uix-pill--sm', size === 'lg' && 'uix-pill--lg', className,
      )}
      {...props}
    >
      {(dot || quiet) && <span className="uix-pill__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
