import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface NotificationCenterProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional header row (title + actions) rendered in `.uix-notifs__head`. */
  heading?: ReactNode;
  children?: ReactNode;
}

/** Notification list over `.uix-notifs`. Contains `NotificationItem`s. */
export function NotificationCenter({ heading, className, children, ...props }: NotificationCenterProps) {
  return (
    <div className={cx('uix-notifs', className)} {...props}>
      {heading != null && <div className="uix-notifs__head">{heading}</div>}
      {children}
    </div>
  );
}

export interface NotificationItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Show the unread indicator (`data-unread`). */
  unread?: boolean;
  /** Secondary meta line (e.g. relative time), rendered in `.uix-notif__meta`. */
  meta?: ReactNode;
  children?: ReactNode;
}

/** One notification over `.uix-notif` — an unread dot, the body, and optional meta. */
export function NotificationItem({ unread, meta, className, children, ...props }: NotificationItemProps) {
  return (
    <div className={cx('uix-notif', className)} data-unread={unread || undefined} {...props}>
      <span className="uix-notif__dot" aria-hidden="true" />
      <div>
        <div>{children}</div>
        {meta != null && <div className="uix-notif__meta">{meta}</div>}
      </div>
    </div>
  );
}
