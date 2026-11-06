"use client";

import { useEffect, useRef, useState } from 'react';
import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { prefersReducedMotion } from '../hooks/useReducedMotion.js';
import { tokenMs } from '../motion.js';
import { useArrive } from './Arrive.js';

export interface CountProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The number shown. */
  value: number;
  /**
   * Formats the number, e.g. `n > 99 ? '99+' : String(n)` or your i18n formatter. The default is
   * `toLocaleString()` in the runtime's locale: pass `format` when the server renders it, so the
   * server's and the browser's thousands separators cannot differ.
   */
  format?: (value: number) => string;
  /**
   * Count up from zero while the enclosing `Arrive` stage plays its arrival (calm kit 2.56):
   * --uix-dur-arrive-count (600 ms), starting with its card. Only then: after the arrival, and
   * outside a stage, a change still ticks once. Under reduced motion the number is simply there.
   */
  arrive?: boolean;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * A number that ticks once when it changes (HAR-2587, motion standard §2.8): a badge count, a
 * stat tile's value, an unread total. The new figure slides 4 px in from below when it went
 * up and from above when it went down, with a fade; never on the first render, never a loop,
 * never a count-up through the numbers between — except the one arrival count-up of `arrive`.
 * Tabular figures, so neighbours do not shift. Under reduced motion it only fades. It announces
 * nothing: say what changed where it matters (a toast, `ChangeHighlight announce`).
 */
export function Count({ value, format, arrive = false, className, ...props }: CountProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const { playing } = useArrive();
  const [rolling, setRolling] = useState<number | null>(null);
  // once the count-up has run (or was cut short by a new value), it never runs again: a value
  // that goes 20 -> 0 -> 20 while the stage still plays ticks, it does not count up a second time
  const counted = useRef(false);
  const countUp = arrive && playing && !counted.current && Number.isFinite(value) && value !== 0;

  // the arrival count-up: once, from 0, starting when its card starts
  useEffect(() => {
    const el = ref.current;
    if (!countUp || !el || prefersReducedMotion()) return undefined;
    const index = Number.parseFloat(getComputedStyle(el).getPropertyValue('--uix-arrive-i')) || 0;
    const delay = index * tokenMs('--uix-stagger-arrive', 45, el);
    const duration = tokenMs('--uix-dur-arrive-count', 600, el);
    const target = value;
    let frame = 0;
    let start = 0;
    setRolling(0);
    const step = (now: number) => {
      if (!start) start = now + delay;
      counted.current = true;
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      setRolling(t >= 1 ? null : Math.round(target * easeOut(t)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    // a cleanup before the first frame (React's strict-mode double effect) leaves `counted` false,
    // so the re-run still counts up
    return () => { cancelAnimationFrame(frame); setRolling(null); };
    // only the first play: a value that changes mid-roll lands on the new value at the end
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countUp]);

  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    const el = ref.current;
    if (!el || Object.is(before, value) || !Number.isFinite(value) || !Number.isFinite(before)) return;
    if (el.hasAttribute('data-uix-tick')) {
      el.removeAttribute('data-uix-tick');
      void el.offsetWidth; // restart a tick that is still running
    }
    el.setAttribute('data-uix-tick', value > before ? 'up' : 'down');
  }, [value]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const done = (event: Event) => { if (event.target === el) el.removeAttribute('data-uix-tick'); };
    el.addEventListener('animationend', done);
    return () => el.removeEventListener('animationend', done);
  }, []);
  const shown = rolling ?? value;
  return (
    <span ref={ref} className={cx('uix-count', className)} {...props}>
      {format ? format(shown) : shown.toLocaleString()}
    </span>
  );
}
