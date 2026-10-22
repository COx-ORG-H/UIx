"use client";

/* The reorder model shared by every list whose rows the person can move (HAR-1375): `SortableList`,
 * the `ViewMenu` columns, `SavedViewMenu` and `NavFavourites`. Pure helpers for the order, and
 * the pointer drag of a list whose rows reorder live. */
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

/** Move `id` to `index` within `ids`. Returns `ids` itself when nothing moves. */
export function placeId(ids: readonly string[], id: string, index: number): readonly string[] {
  const from = ids.indexOf(id);
  const to = Math.max(0, Math.min(index, ids.length - 1));
  if (from < 0 || from === to) return ids;
  const next = ids.filter((other) => other !== id);
  next.splice(to, 0, id);
  return next;
}

/** True when two orders hold the same ids in the same order. */
export const sameOrder = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

/**
 * Where a dragged row lands: how many of the OTHER rows have their middle above the pointer.
 * The rows reorder live while dragging, so counting the dragged row itself would push it one
 * slot past the pointer every time it moves down.
 */
export function dropIndex(rows: readonly Element[], dragged: Element | null, clientY: number): number {
  let index = 0;
  for (const row of rows) {
    if (row === dragged) continue;
    const box = row.getBoundingClientRect();
    if (clientY > box.top + box.height / 2) index++;
  }
  return index;
}

export interface RowDragHandlers { over: (id: string, index: number) => void; drop: (id: string) => void }

/**
 * Pointer drag for a list whose rows reorder live. It listens on the window for the whole drag:
 * React moves the dragged row's DOM node when the order changes, which releases pointer capture on
 * its grip, so after the first move down the grip itself stops receiving move and up events.
 * Nothing animates: the row is placed where the pointer is, frame by frame.
 */
export function useRowDrag(rowSelector: string, handlers: RowDragHandlers) {
  const [dragging, setDragging] = useState<string | null>(null);
  const drag = useRef<{ id: string; list: Element; row: Element } | null>(null);
  const latest = useRef(handlers);
  latest.current = handlers;
  useEffect(() => {
    if (!dragging) return;
    const move = (event: MouseEvent) => {
      const current = drag.current;
      if (!current) return;
      latest.current.over(current.id, dropIndex(Array.from(current.list.querySelectorAll(`:scope > ${rowSelector}`)), current.row, event.clientY));
    };
    const end = () => {
      const current = drag.current;
      drag.current = null;
      setDragging(null);
      if (current) latest.current.drop(current.id);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [dragging, rowSelector]);
  const start = (event: PointerEvent<HTMLElement>, id: string) => {
    const row = event.currentTarget.closest('li');
    if (!row?.parentElement) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { id, list: row.parentElement, row };
    setDragging(id);
  };
  return { dragging, start };
}
