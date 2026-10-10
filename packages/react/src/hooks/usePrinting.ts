"use client";

import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * `true` while the page is printed, or shown with print media.
 *
 * A view that mounts only the rows near its viewport uses this to mount all of them for the
 * paper. The browser lays the page out for print as soon as the `beforeprint` handlers return,
 * so the state is committed inside the event (`flushSync`), not in a later task.
 *
 * It cannot answer in time when `window.print()` is called from inside a React effect or
 * lifecycle method, on mount or later: React commits the change after the effect, which is
 * after the page was laid out. A page that prints itself that way turns windowing off through
 * the component's own prop instead, or calls `print()` from an event handler or a timer.
 */
export function usePrinting(enabled = true): boolean {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    const set = (next: boolean) => { flushSync(() => setPrinting(next)); };
    const before = () => set(true);
    const after = () => set(false);
    const query = typeof window.matchMedia === 'function' ? window.matchMedia('print') : null;
    const changed = (event: MediaQueryListEvent) => set(event.matches);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    query?.addEventListener?.('change', changed);
    // Also when listening starts again: the state may be left over from the last time it listened.
    setPrinting(Boolean(query?.matches));
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
      query?.removeEventListener?.('change', changed);
    };
  }, [enabled]);
  return enabled && printing;
}
