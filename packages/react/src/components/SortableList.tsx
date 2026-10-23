"use client";

import { useEffect, useRef, useState } from 'react';
import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { placeId, sameOrder, useRowDrag } from '../reorder.js';
import { EditorIcon } from './EditorIcons.js';
import { settleDrop } from '../hooks/useKeyboardGrab.js';

/** Every word `SortableList` renders or announces. `{label}` is the row's name. */
export interface SortableListLabels {
  /** The drag grip's name. */
  grip: string;
  moveUp: string;
  moveDown: string;
  /** Polite announcement after a move: `{label}`, `{position}`, `{count}`. */
  moved: string;
}

export const DEFAULT_SORTABLE_LIST_LABELS: SortableListLabels = {
  grip: 'Drag to reorder: {label}',
  moveUp: 'Move {label} up',
  moveDown: 'Move {label} down',
  moved: '{label} moved to position {position} of {count}',
};

/** What `renderItem` receives besides the item. */
export interface SortableListItemContext {
  index: number;
  count: number;
  /** This row is being dragged. */
  dragging: boolean;
}

export interface SortableListProps<T> extends Omit<HTMLAttributes<HTMLUListElement>, 'children' | 'onChange'> {
  items: readonly T[];
  getId: (item: T) => string;
  /** The row's name in the grip, the move buttons and the announcement. Default: its id. */
  getLabel?: (item: T) => string;
  renderItem: (item: T, context: SortableListItemContext) => ReactNode;
  /** Called with the full new order of ids after each keyboard move, and once when a drag ends. */
  onReorder: (orderedIds: string[]) => void;
  /** Rows show no grip and no move buttons. */
  disabled?: boolean;
  /** Each word defaults to `UixLabelsProvider` `sortableList`, then to English. */
  labels?: Partial<SortableListLabels>;
}

const ArrowIcon = ({ dir }: { dir: 'up' | 'down' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={dir === 'up' ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'} />
  </svg>
);

type Part = 'grip' | 'up' | 'down' | 'row';

/**
 * A list the person reorders (HAR-1375; MOTUS C-16 photo order, TENSOR preset and start-page
 * order): media, priorities, steps. Each row has a grip to drag with a pointer, and Move up /
 * Move down buttons that are always there (a drag is never the only way). With focus anywhere
 * in a row, Alt+↑ / Alt+↓ move it; a focused grip moves with ↑ / ↓ alone. Focus stays with the
 * moved row, and a polite status says where it went. Keyboard moves are instant; a drag lifts
 * the row (drag.css), places it under the pointer frame by frame, and it settles when dropped. Shares its order model with `ViewMenu`,
 * `SavedViewMenu` and `NavFavourites`.
 */
export function SortableList<T>({
  items, getId, getLabel, renderItem, onReorder, disabled = false, labels: labelOverrides, className, ...props
}: SortableListProps<T>) {
  const labels = { ...DEFAULT_SORTABLE_LIST_LABELS, ...useUixLabels().sortableList, ...labelOverrides };
  const ids = items.map(getId);
  const orderKey = ids.join('\u0000');
  // The order being dragged, only while the drag lasts: after a move the list shows the consumer's
  // items, so an order the consumer refuses never stays on screen (PR #168 review).
  const [draft, setDraft] = useState<readonly string[] | null>(null);
  useEffect(() => setDraft(null), [orderKey]);
  const order = draft && sameOrder([...draft].sort(), [...ids].sort()) ? draft : ids;
  const byId = new Map(items.map((item) => [getId(item), item] as const));
  const nameOf = (id: string) => { const item = byId.get(id); return item !== undefined && getLabel ? getLabel(item) : id; };

  const [announcement, setAnnouncement] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  /** Where focus goes after a move: the moved row's control that was used (or its sibling, at an end). */
  const refocus = useRef<{ id: string; part: Part; el?: HTMLElement } | null>(null);
  useEffect(() => {
    const target = refocus.current;
    refocus.current = null;
    if (!target) return;
    // React re-inserts a row that moves down, which drops focus: give it back to what had it.
    if (target.el) { if (target.el.isConnected && document.activeElement !== target.el) target.el.focus(); return; }
    const row = Array.from(listRef.current?.children ?? []).find((child) => (child as HTMLElement).dataset.id === target.id) as HTMLElement | undefined;
    if (!row) return;
    const want = target.part === 'up' ? '.uix-sortable__move--up' : target.part === 'down' ? '.uix-sortable__move--down' : target.part === 'grip' ? '.uix-sortable__grip' : null;
    const other = target.part === 'up' ? '.uix-sortable__move--down' : '.uix-sortable__move--up';
    const button = want ? row.querySelector<HTMLButtonElement>(want) : null;
    // A row moved to an end has its button for that direction disabled: the other one takes focus.
    const el = button && !button.disabled ? button : row.querySelector<HTMLButtonElement>(other);
    if (el && document.activeElement !== el) el.focus();
  });

  const commit = (next: readonly string[], id: string) => {
    setDraft(null);
    onReorder([...next]);
    setAnnouncement(fillLabel(labels.moved, { label: nameOf(id), position: next.indexOf(id) + 1, count: next.length }));
  };
  const move = (id: string, delta: -1 | 1, part: Part, el?: HTMLElement) => {
    const next = placeId(order, id, order.indexOf(id) + delta);
    if (next === order) return;
    refocus.current = { id, part, el };
    commit(next, id);
  };

  // A row dropped by the pointer settles into place once the new order is on screen (HAR-2590).
  const settleId = useRef<string | null>(null);
  useEffect(() => {
    const id = settleId.current;
    if (id === null || draft !== null) return;
    settleId.current = null;
    const row = Array.from(listRef.current?.children ?? []).find((child) => (child as HTMLElement).dataset.id === id) as HTMLElement | undefined;
    settleDrop(row);
  });

  const dragStart = useRef<readonly string[] | null>(null);
  const { dragging, start } = useRowDrag('.uix-sortable__row', {
    over: (id, index) => {
      const next = placeId(order, id, index);
      if (next !== order) setDraft(next);
    },
    drop: (id) => {
      const begin = dragStart.current;
      dragStart.current = null;
      settleId.current = id;
      if (begin && !sameOrder(begin, order)) commit(order, id);
      else setDraft(null);
    },
    cancel: () => { dragStart.current = null; setDraft(null); },
  });

  const onRowKeyDown = (event: KeyboardEvent<HTMLLIElement>, id: string) => {
    if (disabled || !event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    // In a text field Alt/Option + arrow moves the caret (macOS): the field keeps it.
    if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    // Focus stays on what had it in the row (a move button that is now disabled hands it to the other).
    const target = event.target as HTMLElement;
    const part: Part = target.closest('.uix-sortable__move--up') ? 'up' : target.closest('.uix-sortable__move--down') ? 'down' : target.closest('.uix-sortable__grip') ? 'grip' : 'row';
    move(id, event.key === 'ArrowUp' ? -1 : 1, part, part === 'row' ? target : undefined);
  };

  return (
    <>
      <ul ref={listRef} className={cx('uix-sortable', className)} data-dragging={dragging ? '' : undefined} {...props}>
        {order.map((id, index) => {
          const item = byId.get(id);
          if (item === undefined) return null;
          const name = nameOf(id);
          return (
            <li key={id} className="uix-sortable__row" data-id={id} data-dragging={dragging === id || undefined} data-uix-drag={dragging === id ? 'lifted' : undefined} onKeyDown={(event) => onRowKeyDown(event, id)}>
              {!disabled && (
                <button
                  type="button"
                  className="uix-sortable__grip"
                  // Pointer-first: Move up / Move down are the keyboard path, so the grip stays out of
                  // the tab order; once clicked it still moves with ↑ / ↓.
                  tabIndex={-1}
                  aria-label={fillLabel(labels.grip, { label: name })}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault(); // no text selection; it also blocks focus, so focus by hand
                    event.currentTarget.focus({ preventScroll: true });
                    dragStart.current = order;
                    start(event, id);
                  }}
                  onKeyDown={(event) => {
                    if (event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
                    event.preventDefault();
                    move(id, event.key === 'ArrowUp' ? -1 : 1, 'grip');
                  }}
                >
                  <EditorIcon name="grip" />
                </button>
              )}
              <div className="uix-sortable__content">{renderItem(item, { index, count: order.length, dragging: dragging === id })}</div>
              {!disabled && (
                <span className="uix-sortable__moves">
                  <button type="button" className="uix-sortable__move uix-sortable__move--up" aria-label={fillLabel(labels.moveUp, { label: name })} disabled={index === 0} onClick={() => move(id, -1, 'up')}>
                    <ArrowIcon dir="up" />
                  </button>
                  <button type="button" className="uix-sortable__move uix-sortable__move--down" aria-label={fillLabel(labels.moveDown, { label: name })} disabled={index === order.length - 1} onClick={() => move(id, 1, 'down')}>
                    <ArrowIcon dir="down" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <span className="uix-visually-hidden" role="status">{announcement}</span>
    </>
  );
}
