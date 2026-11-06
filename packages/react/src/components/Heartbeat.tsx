import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

export type HeartbeatState = 'live' | 'idle' | 'warning' | 'danger';

export interface HeartbeatProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /**
   * `live` (default): a green dot. `warning` / `danger`: the same in that tone. `idle`: a grey
   * dot. The dot is still (2.57): say the state in words beside it.
   */
  state?: HeartbeatState;
  /**
   * What the dot means, for assistive technology ("Live", "Connection lost"). Without it the
   * dot is decorative (`aria-hidden`): say the state in text beside it, as `LiveIndicator` does.
   */
  label?: string;
}

/**
 * The status dot over `.uix-heartbeat` (HAR-1606), so products stop hand-writing its spans.
 * Decorative unless it has a `label`. Still since 2.57 (Rules for apps: no pulsing on status);
 * the ring span is kept in the markup for compatibility and is not drawn.
 */
export function Heartbeat({ state = 'live', label, className, ...props }: HeartbeatProps) {
  return (
    <span
      className={cx('uix-heartbeat', state !== 'live' && `uix-heartbeat--${state}`, className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    >
      <span className="uix-heartbeat__ping" />
      <span className="uix-heartbeat__dot" />
    </span>
  );
}

export interface LiveIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  state?: HeartbeatState;
  /** The state in words: "Live", "Paused", "Reconnecting…". It is what a screen reader gets. */
  children?: ReactNode;
}

/** A `Heartbeat` with its state in text beside it, over `.uix-live`. */
export function LiveIndicator({ state = 'live', children, className, ...props }: LiveIndicatorProps) {
  return (
    <span className={cx('uix-live', className)} {...props}>
      <Heartbeat state={state} />
      {children}
    </span>
  );
}
