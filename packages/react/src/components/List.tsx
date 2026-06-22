import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface ListProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Bordered, rounded list container over `.uix-list`. */
export function List({ children, className, ...props }: ListProps) {
  return (
    <div className={cx('uix-list', className)} {...props}>
      {children}
    </div>
  );
}

export interface ListItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  meta?: ReactNode;
  /** Right-aligned trailing content (status, actions). */
  trail?: ReactNode;
  /** Leading content (icon/avatar) rendered before the title block. */
  leading?: ReactNode;
  children?: ReactNode;
}

/** A single `.uix-list__item`. Provide `title`/`meta`, or arbitrary `children`. */
export function ListItem({ title, meta, trail, leading, children, className, ...props }: ListItemProps) {
  const hasTitleBlock = title != null || meta != null;
  return (
    <div className={cx('uix-list__item', className)} {...props}>
      {leading}
      {hasTitleBlock && (
        <div style={{ minWidth: 0 }}>
          {title != null && <div className="uix-list__title">{title}</div>}
          {meta != null && <div className="uix-list__meta">{meta}</div>}
        </div>
      )}
      {children}
      {trail != null && <div className="uix-list__trail">{trail}</div>}
    </div>
  );
}
