"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FocusEvent, PointerEvent } from 'react';

type Key = string | number;

export interface UseDeferredReorderResult<T> {
  /** The items to render: the new data, in the order that was showing while the list is held. */
  items: T[];
  /** A new order is waiting until the pointer and focus leave the list. Say so if it matters ("New order — move away to apply"). */
  held: boolean;
  /** Spread on the list element. */
  listProps: {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
    onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
    onFocus: (event: FocusEvent<HTMLElement>) => void;
    onBlur: (event: FocusEvent<HTMLElement>) => void;
  };
}

/**
 * Never re-sort under the pointer (HAR-2586, motion standard §2.5). While a mouse pointer is
 * over the list, or keyboard focus is inside it, a new order from live data waits: rows keep
 * their places (their content still updates), new rows join at the end, removed rows still go.
 * When the pointer and keyboard focus leave, the new order applies — with `MotionList`, as a
 * glide. A click alone does not hold the list (focus from a click is not keyboard focus), and
 * a hold whose focused row disappeared lets go.
 *
 * ```tsx
 * const queue = useDeferredReorder(liveRows, (row) => row.id);
 * <MotionList {...queue.listProps} items={queue.items} getKey={(row) => row.id} renderItem={…} />
 * ```
 */
export function useDeferredReorder<T>(items: readonly T[], getKey: (item: T) => Key): UseDeferredReorderResult<T> {
  const [pointer, setPointer] = useState(false);
  const [focus, setFocus] = useState(false);
  const holding = pointer || focus;
  const keyOf = useRef(getKey);
  keyOf.current = getKey;
  const shownOrder = useRef<Key[]>(items.map(getKey));
  const list = useRef<HTMLElement | null>(null);

  // A new array only when the items or the hold change (an inline getKey is fine).
  const shown = useMemo(() => {
    const key = keyOf.current;
    if (!holding) return [...items];
    const byKey = new Map(items.map((item) => [key(item), item]));
    const kept = shownOrder.current.filter((k) => byKey.has(k)).map((k) => byKey.get(k) as T);
    const keptKeys = new Set(shownOrder.current);
    const added = items.filter((item) => !keptKeys.has(key(item)));
    return [...kept, ...added];
  }, [items, holding]);
  shownOrder.current = shown.map((item) => keyOf.current(item));

  const held = holding && shown.some((item, i) => keyOf.current(item) !== keyOf.current(items[i] as T));

  // Focus that left with a removed row fires no blur in every browser: check again.
  useEffect(() => {
    if (focus && list.current && !list.current.contains(document.activeElement)) setFocus(false);
  }, [items, focus]);

  const onPointerEnter = useCallback((event: PointerEvent<HTMLElement>) => {
    list.current = event.currentTarget;
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') setPointer(true);
  }, []);
  const onPointerLeave = useCallback(() => setPointer(false), []);
  const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    list.current = event.currentTarget;
    const target = event.target as Element;
    let keyboard = true;
    try { keyboard = target.matches(':focus-visible'); } catch { /* no :focus-visible: hold */ }
    if (keyboard) setFocus(true);
  }, []);
  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocus(false);
  }, []);

  return { items: shown, held, listProps: { onPointerEnter, onPointerLeave, onFocus, onBlur } };
}
