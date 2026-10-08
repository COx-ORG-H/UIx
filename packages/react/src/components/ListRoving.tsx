"use client";

import { useEffect, useRef } from 'react';
import type { FocusEvent, HTMLAttributes, KeyboardEvent } from 'react';
import { cx } from '../cx.js';
import { syncRovingStop } from '../roving.js';
import type { RovingStop } from '../roving.js';

/**
 * `List` with `roving`: the items of the list are one tab stop. ArrowUp and ArrowDown move
 * between them, Home and End go to the first and last, Enter and Space activate the focused
 * item (its `onClick`). A control inside an item keeps its own tab stop and its own keys.
 * Internal: rendered by `List`, which stays a server component without it.
 */
export function RovingList({ children, className, onKeyDown, onFocus, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  // The item that holds the tab stop, and its place, so the stop survives when that item is removed.
  const stop = useRef<RovingStop>({ node: null, index: 0 });
  // The items of this list, at any depth (a consumer may wrap them), but not those of a list inside an item.
  const items = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('.uix-list__item') ?? []).filter((element) => element.closest('.uix-list') === ref.current);
  const sync = (next?: HTMLElement) => {
    const all = items();
    for (const element of all) if (!element.hasAttribute('role')) element.setAttribute('role', 'listitem');
    stop.current = syncRovingStop(all, stop.current, next);
  };
  // After every render: items may have come or gone, and exactly one of them is the tab stop.
  useEffect(() => { sync(); });
  // Items rendered later by a child of the list (its own state, a suspended part) are seen too.
  useEffect(() => {
    const list = ref.current;
    if (!list || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => sync());
    observer.observe(list, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const all = items();
    // Only when the item itself has focus: a control inside an item keeps its own keys.
    const index = all.indexOf(event.target as HTMLElement);
    if (index === -1) return;
    const target = event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowUp' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? all.length - 1 : null;
    if (target !== null) {
      event.preventDefault();
      const next = all[Math.max(0, Math.min(all.length - 1, target))]!;
      sync(next);
      next.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      all[index]!.click();
    }
  };
  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    // The stop follows an item that takes focus itself. A control inside an item has its own stop
    // and does not move this one, so Tab and Shift+Tab pass the same stops.
    const item = items().find((element) => element === event.target);
    if (item) sync(item);
  };

  return <div ref={ref} role="list" {...props} className={cx('uix-list', 'uix-list--roving', className)} onKeyDown={handleKeyDown} onFocus={handleFocus}>{children}</div>;
}
