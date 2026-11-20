"use client";

/* EXPERIMENT (Tier 3 item 16, phone-OS motion study): neighbours make room while a row is dragged,
 * as iOS 27's `.reorderable()` lists do. Used by `SortableList` when `makeRoom` is set; the
 * default drag (`useRowDrag` in reorder.ts) reorders the rows live with no motion of its own.
 *
 * While the pointer drags a row, the DOM keeps its order: the dragged row follows the pointer
 * (`translate`, no transition) and the rows between its place and where it would land move aside
 * by its height (`translate` with `[data-uix-room]`, a CSS transition, so a new target retargets a
 * shift from where it is). The order is committed once, on drop; `flipRows` then lets the dropped
 * row glide from where it was let go into the gap, and lets any other order change (a keyboard
 * move, the consumer's own) glide the same way. Transform only: nothing here changes layout. */
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

/** On a row while its `translate` may glide. Cleared on `transitionend` (see `endRoomGlide`). */
export const ROOM_ATTRIBUTE = 'data-uix-room';

const rowsOf = (list: HTMLElement, rowSelector: string) => Array.from(list.querySelectorAll<HTMLElement>(`:scope > ${rowSelector}`));

/** Each row's top as drawn (a running glide included), relative to the list, by `data-id`. */
export function measureRows(list: HTMLElement, rowSelector: string): Map<string, number> {
  const origin = list.getBoundingClientRect().top;
  const tops = new Map<string, number>();
  for (const row of rowsOf(list, rowSelector)) {
    const id = row.dataset.id;
    if (id !== undefined) tops.set(id, row.getBoundingClientRect().top - origin);
  }
  return tops;
}

/**
 * FLIP after the rows' order changed: every row that is drawn somewhere other than its new place
 * starts there and glides home. Three passes (read, write, start), so the browser lays out once.
 */
export function flipRows(list: HTMLElement, rowSelector: string, before: ReadonlyMap<string, number>): void {
  const rows = rowsOf(list, rowSelector);
  for (const row of rows) { row.removeAttribute(ROOM_ATTRIBUTE); row.style.translate = ''; }
  const origin = list.getBoundingClientRect().top;
  const moves: [HTMLElement, number][] = [];
  for (const row of rows) {
    const from = before.get(row.dataset.id ?? '');
    if (from === undefined) continue;
    const dy = from - (row.getBoundingClientRect().top - origin);
    if (Math.abs(dy) >= 0.5) moves.push([row, dy]);
  }
  for (const [row, dy] of moves) row.style.translate = `0 ${dy}px`;
  if (moves.length) void list.offsetWidth;
  for (const [row] of moves) { row.setAttribute(ROOM_ATTRIBUTE, ''); row.style.translate = ''; }
}

/** Every row that is drawn away from its place glides back to it (a cancel, or an order refused). */
export function releaseRows(list: HTMLElement, rowSelector: string): void {
  for (const row of rowsOf(list, rowSelector)) {
    if (!row.style.translate) continue;
    row.setAttribute(ROOM_ATTRIBUTE, '');
    row.style.translate = '';
  }
}

/** The list's `onTransitionEnd`: a finished glide drops its marker, so a later change is instant. */
export function endRoomGlide(list: HTMLElement | null, target: EventTarget, propertyName: string): void {
  const row = target as HTMLElement;
  if (propertyName === 'translate' && row.parentElement === list && !row.style.translate) row.removeAttribute(ROOM_ATTRIBUTE);
}

interface Other { el: HTMLElement; index: number; mid: number; shift: number }
interface Drag {
  id: string; list: HTMLElement; row: HTMLElement;
  /** The dragged row's place: its index, its top and height in the list, its height plus the gap. */
  from: number; top: number; height: number; pitch: number;
  /** Where the pointer went down, in the list; and where it is now, in the viewport. */
  startY: number; clientY: number;
  others: Other[]; target: number;
}

export interface MakeRoomDragHandlers {
  /** The row was let go; `index` is where it lands (its own index when it did not move). */
  drop: (id: string, index: number) => void;
  /** Escape, or the browser took the pointer: the rows have already started back. */
  cancel?: (id: string) => void;
}

/**
 * The pointer drag of a `makeRoom` list. The list must be the rows' offset parent
 * (`position: relative`), so `offsetTop` reads each row's place without its glide.
 */
export function useMakeRoomDrag(rowSelector: string, handlers: MakeRoomDragHandlers) {
  const [dragging, setDragging] = useState<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    if (!dragging) return undefined;
    const place = () => {
      const d = drag.current;
      if (!d) return;
      const y = d.clientY - d.list.getBoundingClientRect().top;
      // the row stays inside the list: it can be dropped first or last, not outside
      const dy = Math.max(-d.top, Math.min(d.list.clientHeight - d.top - d.height, y - d.startY));
      d.row.style.translate = `0 ${dy}px`;
      // A neighbour gives way once the dragged row covers half of it: going down, the row's lower
      // edge passes the neighbour's middle; going up, its upper edge does.
      const upper = d.top + dy;
      const lower = upper + d.height;
      let target = d.from;
      for (const o of d.others) {
        if (o.index > d.from && o.mid < lower) target += 1;
        else if (o.index < d.from && o.mid > upper) target -= 1;
      }
      if (target === d.target) return;
      d.target = target;
      for (const o of d.others) {
        const shift = o.index > d.from && o.index <= target ? -d.pitch : o.index < d.from && o.index >= target ? d.pitch : 0;
        if (shift === o.shift) continue;
        o.shift = shift;
        o.el.setAttribute(ROOM_ATTRIBUTE, '');
        o.el.style.translate = shift ? `0 ${shift}px` : '';
      }
    };
    const move = (event: globalThis.PointerEvent) => {
      if (!drag.current) return;
      drag.current.clientY = event.clientY;
      place();
    };
    const finish = (kind: 'drop' | 'cancel') => {
      const d = drag.current;
      drag.current = null;
      setDragging(null);
      if (!d) return;
      if (kind === 'cancel' || d.target === d.from) releaseRows(d.list, rowSelector);
      if (kind === 'drop') latest.current.drop(d.id, d.target);
      else latest.current.cancel?.(d.id);
    };
    const end = () => finish('drop');
    const cancel = () => finish('cancel');
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      finish('cancel');
    };
    // a scroll under a still pointer (wheel, a scroll container) moves the list, not the pointer
    const scrolled = () => place();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', escape, true);
    window.addEventListener('scroll', scrolled, true);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', escape, true);
      window.removeEventListener('scroll', scrolled, true);
    };
  }, [dragging, rowSelector]);

  const start = (event: PointerEvent<HTMLElement>, id: string) => {
    const row = event.currentTarget.closest('li');
    const list = row?.parentElement;
    if (!row || !list) return;
    const rows = rowsOf(list, rowSelector);
    const from = rows.indexOf(row);
    if (from < 0) return;
    // a glide still running (a keyboard move a moment ago) ends here: places are read without it
    for (const r of rows) { r.removeAttribute(ROOM_ATTRIBUTE); r.style.translate = ''; }
    const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
    const listTop = list.getBoundingClientRect().top;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      id, list, row, from, top: row.offsetTop, height: row.offsetHeight, pitch: row.offsetHeight + gap,
      startY: event.clientY - listTop, clientY: event.clientY, target: from,
      others: rows.flatMap((el, index) => (el === row ? [] : [{ el, index, mid: el.offsetTop + el.offsetHeight / 2, shift: 0 }])),
    };
    setDragging(id);
  };

  return { dragging, start };
}
