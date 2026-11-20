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

/** Every row back in its place at once, no glide (makeRoom switched off, reduced motion turned on). */
export function clearRows(list: HTMLElement, rowSelector: string): void {
  for (const row of rowsOf(list, rowSelector)) { row.removeAttribute(ROOM_ATTRIBUTE); row.style.translate = ''; }
}

/** The list's `onTransitionEnd`: a finished glide drops its marker, so a later change is instant. */
export function endRoomGlide(list: HTMLElement | null, target: EventTarget, propertyName: string): void {
  const row = target as HTMLElement;
  if (propertyName === 'translate' && row.parentElement === list && !row.style.translate) row.removeAttribute(ROOM_ATTRIBUTE);
}

interface Other { el: HTMLElement; index: number; mid: number; shift: number }
interface Drag {
  id: string; list: HTMLElement; row: HTMLElement;
  /** The pointer that started the drag: another finger neither moves nor drops it. */
  pointerId: number;
  /** The dragged row's place: its index, its top and height in the list, its height plus the gap. */
  from: number; top: number; height: number; pitch: number;
  /** Where the pointer holds the row, from its top; and where the pointer is now, in the viewport. */
  grab: number; clientY: number;
  others: Other[]; target: number;
}

export interface MakeRoomDragHandlers {
  /**
   * The row was let go; `index` is where it lands (its own index when it did not move). Return
   * `true` once a new order is committed (the rows then glide from where they are drawn); anything
   * else and the rows glide back.
   */
  drop: (id: string, index: number) => boolean | void;
  /** Escape, the browser took the pointer, or `cancel()`: the rows have already started back. */
  cancel?: (id: string) => void;
}

/**
 * Where every row is now (`offsetTop` ignores the glides), keeping what the drag already knows:
 * the pointer's hold on the row. `null` when the row is no longer in the list.
 */
function measureDrag(list: HTMLElement, row: HTMLElement, rowSelector: string) {
  const rows = rowsOf(list, rowSelector);
  const from = rows.indexOf(row);
  if (from < 0) return null;
  const view = list.ownerDocument.defaultView;
  const gap = (view && parseFloat(view.getComputedStyle(list).rowGap)) || 0;
  return {
    from, top: row.offsetTop, height: row.offsetHeight, pitch: row.offsetHeight + gap, target: from,
    // NaN: every neighbour's shift is written again on the next placing
    others: rows.flatMap((el, index) => (el === row ? [] : [{ el, index, mid: el.offsetTop + el.offsetHeight / 2, shift: Number.NaN }])),
  };
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
  /** Ends the drag in progress as cancelled (the list's order changed under it, its row went). */
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!dragging) return undefined;
    const place = () => {
      const d = drag.current;
      if (!d) return;
      const y = d.clientY - d.list.getBoundingClientRect().top;
      // the row stays inside the list: it can be dropped first or last, not outside
      const dy = Math.max(-d.top, Math.min(d.list.clientHeight - d.top - d.height, y - d.grab - d.top));
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
      const remeasured = d.others.some((o) => Number.isNaN(o.shift));
      if (target === d.target && !remeasured) return;
      d.target = target;
      for (const o of d.others) {
        const shift = o.index > d.from && o.index <= target ? -d.pitch : o.index < d.from && o.index >= target ? d.pitch : 0;
        if (shift === o.shift) continue;
        o.shift = shift;
        o.el.setAttribute(ROOM_ATTRIBUTE, '');
        o.el.style.translate = shift ? `0 ${shift}px` : '';
      }
    };
    const finish = (kind: 'drop' | 'cancel') => {
      const d = drag.current;
      drag.current = null;
      setDragging(null);
      if (!d) return;
      if (kind === 'drop' && latest.current.drop(d.id, d.target) === true) return;
      releaseRows(d.list, rowSelector);
      if (kind === 'cancel') latest.current.cancel?.(d.id);
    };
    cancelRef.current = () => finish('cancel');
    // A row that grows or shrinks mid-drag (an image loading, a wrap at a new width) moves the
    // others: read every place again, keep the pointer's hold, and place the gap from there.
    const resized = () => {
      const d = drag.current;
      if (!d) return;
      const now = measureDrag(d.list, d.row, rowSelector);
      if (!now) { finish('cancel'); return; }
      Object.assign(d, now);
      place();
    };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resized) : null;
    if (observer && drag.current) {
      observer.observe(drag.current.list);
      for (const el of rowsOf(drag.current.list, rowSelector)) observer.observe(el);
    }
    const mine = (event: globalThis.PointerEvent) => drag.current !== null && event.pointerId === drag.current.pointerId;
    const move = (event: globalThis.PointerEvent) => {
      if (!mine(event) || !drag.current) return;
      drag.current.clientY = event.clientY;
      place();
    };
    const end = (event: globalThis.PointerEvent) => { if (mine(event)) finish('drop'); };
    const cancel = (event: globalThis.PointerEvent) => { if (mine(event)) finish('cancel'); };
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
      observer?.disconnect();
      cancelRef.current = () => {};
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', escape, true);
      window.removeEventListener('scroll', scrolled, true);
    };
  }, [dragging, rowSelector]);

  const start = (event: PointerEvent<HTMLElement>, id: string) => {
    // one drag at a time: a second finger does not take over the first one's row
    if (drag.current) return;
    const row = event.currentTarget.closest('li');
    const list = row?.parentElement;
    if (!row || !list) return;
    // a glide still running (a keyboard move a moment ago) ends here: places are read without it
    for (const r of rowsOf(list, rowSelector)) { r.removeAttribute(ROOM_ATTRIBUTE); r.style.translate = ''; }
    const place = measureDrag(list, row, rowSelector);
    if (!place) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      id, list, row, pointerId: event.pointerId, ...place,
      grab: event.clientY - list.getBoundingClientRect().top - place.top, clientY: event.clientY,
    };
    for (const o of drag.current.others) o.shift = 0;
    setDragging(id);
  };

  return { dragging, start, cancel: () => cancelRef.current() };
}
