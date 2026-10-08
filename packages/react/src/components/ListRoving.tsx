"use client";

import { useEffect, useRef } from 'react';
import type { FocusEvent, HTMLAttributes, KeyboardEvent } from 'react';
import { cx } from '../cx.js';
import { syncRovingStop } from '../roving.js';
import type { RovingStop } from '../roving.js';

/**
 * `List` with `roving`: the list is one tab stop. ArrowUp and ArrowDown move between its
 * items, Home and End go to the first and last, Enter and Space activate the focused item
 * (its `onClick`). Internal: rendered by `List`, which stays a server component without it.
 */
export function RovingList({ children, className, onKeyDown, onFocus, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  // The item that holds the tab stop, and its place, so the stop survives when that item is removed.
  const stop = useRef<RovingStop>({ node: null, index: 0 });
  const items = () => (Array.from(ref.current?.children ?? []) as HTMLElement[]).filter((element) => element.classList.contains('uix-list__item'));
  const sync = (next?: HTMLElement) => {
    const all = items();
    for (const element of all) if (!element.hasAttribute('role')) element.setAttribute('role', 'listitem');
    stop.current = syncRovingStop(all, stop.current, next);
  };
  // After every render: items may have come or gone, and exactly one of them is the tab stop.
  useEffect(() => { sync(); });

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
    const item = items().find((element) => element.contains(event.target as Node));
    if (item) sync(item);
  };

  return <div ref={ref} role="list" {...props} className={cx('uix-list', 'uix-list--roving', className)} onKeyDown={handleKeyDown} onFocus={handleFocus}>{children}</div>;
}
