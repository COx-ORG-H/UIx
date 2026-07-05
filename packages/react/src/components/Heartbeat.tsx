import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export type HeartbeatTone = 'warning' | 'danger' | 'idle';

export interface HeartbeatProps extends HTMLAttributes<HTMLSpanElement> {
  /** Colour + behaviour: default (success, pulsing), `warning`, `danger`, or `idle` (no ping). */
  tone?: HeartbeatTone;
}

/** Live-status heartbeat over `.uix-heartbeat` — a pulsing dot that goes still under
 *  `prefers-reduced-motion`. Purely visual: pair it with a text label for assistive tech. */
export function Heartbeat({ tone, className, ...props }: HeartbeatProps) {
  return (
    <span className={cx('uix-heartbeat', tone && `uix-heartbeat--${tone}`, className)} {...props}>
      <span className="uix-heartbeat__ping" aria-hidden="true" />
      <span className="uix-heartbeat__dot" aria-hidden="true" />
    </span>
  );
}
