import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  children?: ReactNode;
}

/** Activity timeline container over `.uix-timeline`. Ordered list so AT reads entry count + sequence (UIX-A11Y-4). */
export function Timeline({ children, className, ...props }: TimelineProps) {
  return (
    <ol className={cx('uix-timeline', className)} {...props}>
      {children}
    </ol>
  );
}

export interface TimelineItemProps extends HTMLAttributes<HTMLLIElement> {
  /**
   * Custom rail node — an icon puck, an avatar, a tinted dot. Defaults to the
   * accent `.uix-timeline__node` dot. Supply this to make a heterogeneous feed
   * (comments + audit events) read on one rail with per-row node semantics.
   */
  node?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
}

/** A timeline entry over `.uix-timeline__item` (node + connecting line + body). */
export function TimelineItem({ node, meta, children, className, ...props }: TimelineItemProps) {
  return (
    <li className={cx('uix-timeline__item', className)} {...props}>
      {/* rail (node + connecting line) is purely decorative — meta/body carry the content (UIX-A11Y-4) */}
      <div className="uix-timeline__rail" aria-hidden="true">
        {node ?? <span className="uix-timeline__node" />}
        <span className="uix-timeline__line" />
      </div>
      <div className="uix-timeline__body">
        {meta != null && <div className="uix-timeline__meta">{meta}</div>}
        {children}
      </div>
    </li>
  );
}
