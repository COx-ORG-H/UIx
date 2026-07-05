import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface AuditLogProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Audit-trail list over `.uix-audit`. Contains `AuditLogItem` rows. */
export function AuditLog({ className, children, ...props }: AuditLogProps) {
  return (
    <div className={cx('uix-audit', className)} {...props}>
      {children}
    </div>
  );
}

export interface AuditLogItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Who acted. */
  actor?: ReactNode;
  /** What changed. */
  detail?: ReactNode;
  /** Relative time. */
  time?: ReactNode;
  children?: ReactNode;
}

/** One audit row over `.uix-audit__row` (actor · detail · time). */
export function AuditLogItem({ actor, detail, time, className, children, ...props }: AuditLogItemProps) {
  return (
    <div className={cx('uix-audit__row', className)} {...props}>
      {children != null ? (
        children
      ) : (
        <>
          {actor != null && <span className="uix-audit__actor">{actor}</span>}
          {detail != null && <span className="uix-audit__detail">{detail}</span>}
          {time != null && <span className="uix-audit__time">{time}</span>}
        </>
      )}
    </div>
  );
}
