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

/** `title` is the entry's event line (HAR-3086), not the native tooltip attribute. */
export interface TimelineItemProps extends Omit<HTMLAttributes<HTMLLIElement>, 'title'> {
  /**
   * Custom rail node — an icon puck, an avatar, a tinted dot. Defaults to the
   * accent `.uix-timeline__node` dot. Supply this to make a heterogeneous feed
   * (comments + audit events) read on one rail with per-row node semantics.
   */
  node?: ReactNode;
  meta?: ReactNode;
  /**
   * The event, one sentence: "Daniel Fischer changed the status from Assigned to In progress"
   * (HAR-3086). Drawn quieter than body copy (`.uix-timeline__title`, the hushed text colour) so a
   * feed reads as a list of events, not a block of paragraphs; wrap the actor in `<strong>` to keep
   * the name emphasised.
   */
  title?: ReactNode;
  /** A second line under the event, e.g. the comment or the old and new value (`.uix-timeline__detail`, meta size, muted). */
  detail?: ReactNode;
  /** A kit `StatusPill` or `Badge` beside the event, e.g. "Intern" or "Automatisch". */
  badge?: ReactNode;
  children?: ReactNode;
}

/** A timeline entry over `.uix-timeline__item` (node + connecting line + body). */
export function TimelineItem({ node, meta, title, detail, badge, children, className, ...props }: TimelineItemProps) {
  return (
    <li className={cx('uix-timeline__item', className)} {...props}>
      {/* rail (node + connecting line) is purely decorative — meta/body carry the content (UIX-A11Y-4) */}
      <div className="uix-timeline__rail" aria-hidden="true">
        {node ?? <span className="uix-timeline__node" />}
        <span className="uix-timeline__line" />
      </div>
      <div className="uix-timeline__body">
        {meta != null && <div className="uix-timeline__meta">{meta}</div>}
        {(title != null || badge != null) && (
          <div className="uix-timeline__head">
            {title != null && <p className="uix-timeline__title">{title}</p>}
            {badge != null && <span className="uix-timeline__badge">{badge}</span>}
          </div>
        )}
        {detail != null && <p className="uix-timeline__detail">{detail}</p>}
        {children}
      </div>
    </li>
  );
}
