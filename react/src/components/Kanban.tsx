import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface KanbanProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Kanban({ children, className, ...props }: KanbanProps) {
  return (
    <div className={cx('uix-kanban', className)} {...props}>
      {children}
    </div>
  );
}

export interface KanbanColumnProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  count?: number;
  children?: ReactNode;
}

export function KanbanColumn({ title, count, children, className, ...props }: KanbanColumnProps) {
  return (
    <div className={cx('uix-kanban__col', className)} {...props}>
      {(title != null || count != null) && (
        <div className="uix-kanban__head">
          {title}
          {count != null && <span className="uix-kanban__count">{count}</span>}
        </div>
      )}
      <div className="uix-kanban__body">{children}</div>
    </div>
  );
}

export interface KanbanCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
}

export function KanbanCard({ title, meta, children, className, ...props }: KanbanCardProps) {
  return (
    <div className={cx('uix-kanban__card', className)} {...props}>
      {title && <div className="uix-kanban__card-title">{title}</div>}
      {meta && <div className="uix-kanban__card-meta">{meta}</div>}
      {children}
    </div>
  );
}
