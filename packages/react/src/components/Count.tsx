"use client";

import { useEffect, useRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface CountProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The number shown. */
  value: number;
  /** Formats the number (default `toLocaleString()` of the page's locale), e.g. `n > 99 ? '99+' : String(n)`. */
  format?: (value: number) => string;
}

/**
 * A number that ticks once when it changes (HAR-2587, motion standard §2.8): a badge count, a
 * stat tile's value, an unread total. The new figure slides 4 px in from below when it went
 * up and from above when it went down, with a fade; never on the first render, never a loop,
 * never a count-up through the numbers between. Tabular figures, so neighbours do not shift.
 * Under reduced motion it only fades. It announces nothing: say what changed where it
 * matters (a toast, `ChangeHighlight announce`).
 */
export function Count({ value, format, className, ...props }: CountProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    const el = ref.current;
    if (!el || Object.is(before, value)) return;
    el.removeAttribute('data-uix-tick');
    void el.offsetWidth; // restart a tick that is still running
    el.setAttribute('data-uix-tick', value > before ? 'up' : 'down');
  }, [value]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const done = (event: Event) => { if (event.target === el) el.removeAttribute('data-uix-tick'); };
    el.addEventListener('animationend', done);
    return () => el.removeEventListener('animationend', done);
  }, []);
  return (
    <span ref={ref} className={cx('uix-count', className)} {...props}>
      {format ? format(value) : value.toLocaleString()}
    </span>
  );
}
