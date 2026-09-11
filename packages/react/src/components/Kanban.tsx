"use client";
import { useId } from 'react';
import type { ReactNode, HTMLAttributes, KeyboardEvent } from 'react';
import { cx } from '../cx.js';

export interface KanbanProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Polite live-region text for keyboard moves (UIX-A11Y-2). `onMove` implementations
   * should set it, e.g. "Card X moved to Doing, position 2 of 4".
   */
  announcement?: string;
  children?: ReactNode;
}

export function Kanban({ announcement, children, className, ...props }: KanbanProps) {
  return (
    <div className={cx('uix-kanban', className)} {...props}>
      {announcement != null && (
        <div role="status" className="uix-visually-hidden">{announcement}</div>
      )}
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
  // The card container is a named list so SRs report "N items" per column (UIX-A11Y-2).
  const headId = useId();
  const hasHead = title != null || count != null;
  return (
    <div className={cx('uix-kanban__col', className)} {...props}>
      {hasHead && (
        <div className="uix-kanban__head" id={headId}>
          {title}
          {count != null && <span className="uix-kanban__count">{count}</span>}
        </div>
      )}
      <div className="uix-kanban__body" role="list" aria-labelledby={hasHead ? headId : undefined}>
        {children}
      </div>
    </div>
  );
}

export type KanbanMoveDirection = 'up' | 'down' | 'left' | 'right';

const MOVE_KEYS: Record<string, KanbanMoveDirection | undefined> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
};

export interface KanbanCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  meta?: ReactNode;
  /**
   * Keyboard move contract (UIX-A11Y-2): when provided, Alt+Arrow on the focused card
   * calls it — the same accelerator convention as NavFavourites row moves. Pair with
   * the board-level `announcement` so SR users hear the result.
   */
  onMove?: (dir: KanbanMoveDirection) => void;
  children?: ReactNode;
}

export function KanbanCard({ title, meta, children, className, onMove, onKeyDown, ...props }: KanbanCardProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (!onMove || !e.altKey || e.defaultPrevented) return;
    const dir = MOVE_KEYS[e.key];
    if (dir) {
      e.preventDefault();
      onMove(dir);
    }
  };
  return (
    <div
      role="listitem"
      tabIndex={0}
      className={cx('uix-kanban__card', className)}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {title && <div className="uix-kanban__card-title">{title}</div>}
      {meta && <div className="uix-kanban__card-meta">{meta}</div>}
      {children}
    </div>
  );
}
