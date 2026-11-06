import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';

/**
 * The signal ladder of a glance page (calm kit 2.56): `neutral` (a fact, in ink), `info`
 * (selected, unread, new), `warning` (drifting: a deadline within two hours, a value under its
 * target, a degraded service) and `critical` (broken now and yours to act on). `success` is for
 * a service list that says "in Betrieb". `danger` is an alias of `critical`.
 */
export type StatusDotTone = 'neutral' | 'info' | 'success' | 'warning' | 'critical' | 'danger';

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusDotTone;
  /** The word in ink and only the dot in the tone's hue: a list of services, a key line. */
  quiet?: boolean;
  size?: 'sm' | 'md';
  /** The word. A dot without one says nothing to anyone who cannot see the hue. */
  children: ReactNode;
}

/**
 * A dot and a word, no box (calm kit 2.56). The quiet default for status on a glance page,
 * in place of a solid red pill: "Läuft gerade", "SLA seit 2 Std. überschritten", "eingeschränkt".
 * The words wear the tone's text role (AA on the surface and on its tint), the dot its solid role
 * (≥ 3:1). It never pulses. For a status in a table cell use `StatusPill treatment="dot"`.
 */
export function StatusDot({ tone = 'neutral', quiet = false, size = 'md', className, children, ...props }: StatusDotProps) {
  const resolved = tone === 'danger' ? 'critical' : tone;
  return (
    <span
      className={cx('uix-status-dot', `uix-status-dot--${resolved}`, quiet && 'uix-status-dot--quiet', size === 'sm' && 'uix-status-dot--sm', className)}
      {...props}
    >
      {children}
    </span>
  );
}
