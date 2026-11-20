"use client";
import { useId, useRef } from 'react';
import type { ReactNode, HTMLAttributes, KeyboardEvent, SyntheticEvent } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { MoreHorizontalIcon } from '../icons/components.js';
import { useUixLabels } from '../labels-context.js';
import { Menu, MenuItem, MenuItemRadio, MenuRadioGroup, MenuSeparator } from './Menu.js';

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

/** Every word a `KanbanCard`'s Move menu says. `{label}` is the card's name. */
export interface KanbanLabels {
  /** The Move menu button's name. */
  moveMenu: string;
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  /** Heading over the column choices (`moveColumns`). */
  moveTo: string;
}

export const DEFAULT_KANBAN_LABELS: KanbanLabels = {
  moveMenu: 'Move {label}',
  moveUp: 'Move up',
  moveDown: 'Move down',
  moveLeft: 'Move left',
  moveRight: 'Move right',
  moveTo: 'Move to',
};

/** A column a card can be moved to from its Move menu. */
export interface KanbanMoveColumn {
  id: string;
  label: string;
}

export interface KanbanCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  meta?: ReactNode;
  /**
   * Keyboard move contract (UIX-A11Y-2): when provided, Alt+Arrow on the focused card
   * calls it — the same accelerator convention as NavFavourites row moves. Pair with
   * the board-level `announcement` so SR users hear the result. It also gives the card a
   * Move menu (see `moveMenu`).
   */
  onMove?: (dir: KanbanMoveDirection) => void;
  /**
   * The board's columns, for "Move to" in the card's Move menu; pair with `column` and `onMoveTo`.
   * Without them the menu offers Move left / Move right (`onMove`).
   */
  moveColumns?: readonly KanbanMoveColumn[];
  /** The id of the column the card is in now: checked in the Move menu's column list. */
  column?: string;
  /** A column picked in the Move menu. Set the board's `announcement` here as for `onMove`. */
  onMoveTo?: (columnId: string) => void;
  /** Directions that would go nowhere (the first card has no up): shown disabled in the Move menu. */
  disabledMoves?: readonly KanbanMoveDirection[];
  /**
   * A ⋯ Move button on the card with Move up / Move down and Move left / Move right (or the
   * columns), so a card moves with single clicks, never only by a drag or the keyboard
   * (WCAG 2.5.7). On by default when `onMove` or `onMoveTo` is given; `false` for a product whose
   * own card menu already offers the same moves.
   */
  moveMenu?: boolean;
  /** The card's name in the Move button's label. Default: `title` when it is text. */
  moveLabel?: string;
  /**
   * The card's stable id. After a move from the Move menu focus returns to this card's Move
   * button, also when the move mounts the card in another column.
   */
  itemId?: string;
  /** The card is being dragged with the pointer: it lifts (HAR-2590). Call `settleDrop(card)` when it lands. */
  dragging?: boolean;
  children?: ReactNode;
}

/** Presses inside the Move menu (trigger and items) are not presses on the card: no drag, no open. */
const stop = (event: SyntheticEvent) => event.stopPropagation();

export function KanbanCard({
  title, meta, children, className, onMove, onKeyDown, dragging,
  moveColumns, column, onMoveTo, disabledMoves, moveMenu, moveLabel, itemId, ...props
}: KanbanCardProps) {
  const labels = { ...DEFAULT_KANBAN_LABELS, ...useUixLabels().kanban };
  // Menu sets its own ref on the trigger, so the button is found through its wrapper.
  const moveWrap = useRef<HTMLSpanElement | null>(null);
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (!onMove || !e.altKey || e.defaultPrevented) return;
    const dir = MOVE_KEYS[e.key];
    if (dir) {
      e.preventDefault();
      onMove(dir);
    }
  };

  const columns = moveColumns && onMoveTo ? moveColumns : undefined;
  const showMenu = (moveMenu ?? true) && (onMove !== undefined || columns !== undefined);
  /**
   * Run a move, then give focus back to this card's Move button once the board has re-rendered:
   * a card moved down is re-inserted (which drops focus) and one moved to another column is a new
   * element there, found by `itemId`.
   */
  const run = (action: () => void) => {
    const board = moveWrap.current?.closest('.uix-kanban') ?? document;
    action();
    setTimeout(() => {
      const own = moveWrap.current?.querySelector<HTMLElement>('[data-uix-kanban-move], button');
      const el = own?.isConnected
        ? own
        : itemId !== undefined
          ? Array.from(board.querySelectorAll<HTMLElement>('[data-uix-kanban-move]')).find((candidate) => candidate.dataset.uixKanbanMove === itemId)
          : undefined;
      if (el && document.activeElement !== el) el.focus();
    }, 0);
  };
  const disabled = (dir: KanbanMoveDirection) => disabledMoves?.includes(dir) ?? false;
  const name = moveLabel ?? (typeof title === 'string' || typeof title === 'number' ? String(title) : '');

  return (
    <div
      role="listitem"
      tabIndex={0}
      className={cx('uix-kanban__card', showMenu && 'uix-kanban__card--movable', className)}
      onKeyDown={handleKeyDown}
      data-uix-drag={dragging ? 'lifted' : undefined}
      {...props}
    >
      {title && <div className="uix-kanban__card-title">{title}</div>}
      {meta && <div className="uix-kanban__card-meta">{meta}</div>}
      {children}
      {showMenu && (
        <span ref={moveWrap} className="uix-kanban__card-move" onPointerDown={stop} onMouseDown={stop} onClick={stop} onDoubleClick={stop} onKeyDown={(event) => { if (!event.altKey) event.stopPropagation(); }}>
          <Menu
            placement="bottom-end"
            trigger={(
              <button
                type="button"
                className="uix-btn uix-btn--ghost uix-btn--sm uix-btn--icon"
                aria-label={fillLabel(labels.moveMenu, { label: name }).trim()}
                data-uix-kanban-move={itemId}
              >
                <MoreHorizontalIcon size="sm" aria-hidden="true" />
              </button>
            )}
          >
            {onMove && (
              <>
                <MenuItem disabled={disabled('up')} onSelect={() => run(() => onMove('up'))}>{labels.moveUp}</MenuItem>
                <MenuItem disabled={disabled('down')} onSelect={() => run(() => onMove('down'))}>{labels.moveDown}</MenuItem>
              </>
            )}
            {columns ? (
              <>
                {onMove && <MenuSeparator />}
                <MenuRadioGroup label={labels.moveTo} value={column} onValueChange={(id) => { if (id !== column) run(() => onMoveTo!(id)); }}>
                  {columns.map((col) => <MenuItemRadio key={col.id} value={col.id}>{col.label}</MenuItemRadio>)}
                </MenuRadioGroup>
              </>
            ) : onMove && (
              <>
                <MenuItem disabled={disabled('left')} onSelect={() => run(() => onMove('left'))}>{labels.moveLeft}</MenuItem>
                <MenuItem disabled={disabled('right')} onSelect={() => run(() => onMove('right'))}>{labels.moveRight}</MenuItem>
              </>
            )}
          </Menu>
        </span>
      )}
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
