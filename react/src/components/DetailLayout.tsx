import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface DetailLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** The narrow trailing column (record meta, side panels). */
  side?: ReactNode;
  /** The main column content. */
  children?: ReactNode;
}

/**
 * Two-column record layout over `.uix-detail` (main + side meta).
 * Collapses to a single column below 820px.
 */
export function DetailLayout({ side, children, className, ...props }: DetailLayoutProps) {
  return (
    <div className={cx('uix-detail', className)} {...props}>
      <div className="uix-detail__main">{children}</div>
      {side != null && <div className="uix-detail__side">{side}</div>}
    </div>
  );
}
