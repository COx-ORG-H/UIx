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
  /** A dragged card would land in this column: the column body is tinted and outlined (HAR-2590). */
  dropTarget?: boolean;
  children?: ReactNode;
}

export function KanbanColumn({ title, count, dropTarget, children, className, ...props }: KanbanColumnProps) {
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
      <div className="uix-kanban__body" role="list" aria-labelledby={hasHead ? headId : undefined} data-uix-drop-target={dropTarget || undefined}>
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
  /** The card is being dragged with the pointer: it lifts (HAR-2590). Call `settleDrop(card)` when it lands. */
  dragging?: boolean;
  children?: ReactNode;
}

export function KanbanCard({ title, meta, children, className, onMove, onKeyDown, dragging, ...props }: KanbanCardProps) {
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
      data-uix-drag={dragging ? 'lifted' : undefined}
      {...props}
    >
      {title && <div className="uix-kanban__card-title">{title}</div>}
      {meta && <div className="uix-kanban__card-meta">{meta}</div>}
      {children}
    </div>
  );
}

export type KanbanDropLineProps = HTMLAttributes<HTMLDivElement>;

/**
 * Where a dragged card would land between two cards (HAR-2590): an accent line with an end mark.
 * Render it in the column at the insertion point while a drag is over it (also after the last
 * card); it is decorative (the keyboard path and the board's `announcement` say where it goes).
 */
export function KanbanDropLine({ className, ...props }: KanbanDropLineProps) {
  return <div {...props} className={cx('uix-drop-line', className)} aria-hidden="true" />;
}
