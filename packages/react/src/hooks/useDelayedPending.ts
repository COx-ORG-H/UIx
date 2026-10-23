"use client";

import { useEffect, useRef, useState } from 'react';
import { PENDING_DELAY_MS, PENDING_MIN_VISIBLE_MS } from '../motion-timing.js';

export interface DelayedPendingOptions {
  /** Wait this long before showing anything (default 300 ms). `0` shows at once. */
  delay?: number;
  /** Once shown, keep showing at least this long (default 500 ms). */
  minVisible?: number;
}

/**
 * Whether to show a pending indicator for `pending` (motion standard §2.3): nothing for the
 * first 300 ms, so a fast action never flashes a spinner; once shown, held at least 500 ms
 * after it appeared, so it never flickers off the moment the work ends.
 *
 * ```tsx
 * const showSpinner = useDelayedPending(query.isFetching);
 * {showSpinner && <Spinner />}
 * ```
 *
 * Use the raw `pending` for behaviour (blocking a second submit); use the result for what
 * people see. Returns `false` on the server and on the first client render unless `delay` is 0.
 */
export function useDelayedPending(pending: boolean, { delay = PENDING_DELAY_MS, minVisible = PENDING_MIN_VISIBLE_MS }: DelayedPendingOptions = {}): boolean {
  const [shown, setShown] = useState(() => pending && delay <= 0);
  const shownAt = useRef(shown ? now() : 0);

  useEffect(() => {
    if (pending) {
      if (shown) return undefined;
      const show = () => { shownAt.current = now(); setShown(true); };
      if (delay <= 0) { show(); return undefined; }
      const timer = setTimeout(show, delay);
      return () => clearTimeout(timer);
    }
    if (!shown) return undefined;
    const remaining = minVisible - (now() - shownAt.current);
    if (remaining <= 0) { setShown(false); return undefined; }
    const timer = setTimeout(() => setShown(false), remaining);
    return () => clearTimeout(timer);
  }, [pending, shown, delay, minVisible]);

  return shown;
}

// Date.now, not performance.now: node:test's mock timers advance Date, which keeps the hook testable.
const now = () => Date.now();
