import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface StatTrend {
  direction: 'up' | 'down';
  label: ReactNode;
}

export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  /** Optional icon shown at the trailing edge of the label row. */
  icon?: ReactNode;
  /** Supporting line under the value (e.g. "vs last week"). */
  meta?: ReactNode;
  /** Trend chip rendered before the meta text. */
  trend?: StatTrend;
}

/** KPI / stat tile over `.uix-stat`. */
export function Stat({ label, value, icon, meta, trend, className, ...props }: StatProps) {
  return (
    <div className={cx('uix-stat', className)} {...props}>
      <div className="uix-stat__label">
        <span>{label}</span>
        {icon}
      </div>
      <div className="uix-stat__value">{value}</div>
      {(meta != null || trend != null) && (
        <div className="uix-stat__meta">
          {trend != null && (
            <span className={cx('uix-stat__trend', `uix-stat__trend--${trend.direction}`)}>
              {/* direction glyph + hidden text — the chip is otherwise colour-only (UIX-A11Y-4) */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {trend.direction === 'up' ? <path d="M12 19V5m-6 6 6-6 6 6" /> : <path d="M12 5v14m6-6-6 6-6-6" />}
              </svg>
              <span className="uix-visually-hidden">{trend.direction === 'up' ? 'up' : 'down'}</span>
              {trend.label}
            </span>
          )}
          {meta}
        </div>
      )}
    </div>
  );
}
