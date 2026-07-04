import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface AttachmentListProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** File-attachment list over `.uix-attachments`. Contains `Attachment`s. */
export function AttachmentList({ className, children, ...props }: AttachmentListProps) {
  return (
    <div className={cx('uix-attachments', className)} {...props}>
      {children}
    </div>
  );
}

export interface AttachmentProps extends HTMLAttributes<HTMLDivElement> {
  /** Leading file-type icon (decorative). */
  icon?: ReactNode;
  /** File name, rendered in `.uix-attachment__name`. */
  name?: ReactNode;
  /** File size, rendered in `.uix-attachment__size`. */
  size?: ReactNode;
  /** Trailing actions (download, remove …), rendered in `.uix-attachment__actions`. */
  actions?: ReactNode;
  children?: ReactNode;
}

/** One attachment over `.uix-attachment` — icon, name/size, optional actions. */
export function Attachment({ icon, name, size, actions, className, children, ...props }: AttachmentProps) {
  return (
    <div className={cx('uix-attachment', className)} {...props}>
      {icon != null && <span className="uix-attachment__icon">{icon}</span>}
      <span>
        {name != null && <div className="uix-attachment__name">{name}</div>}
        {size != null && <div className="uix-attachment__size">{size}</div>}
      </span>
      {children}
      {actions != null && <span className="uix-attachment__actions">{actions}</span>}
    </div>
  );
}
