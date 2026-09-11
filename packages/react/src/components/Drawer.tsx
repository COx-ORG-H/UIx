"use client";

import { useId } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { useDialog } from '../hooks/useDialog.js';

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export interface DrawerProps extends Omit<HTMLAttributes<HTMLDialogElement>, 'title'> {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ open, onClose, title, children, footer, className, ...rest }: DrawerProps) {
  const ref = useDialog(open, onClose);
  // Accessible name: the title labels the dialog; an <h2> so SR users can navigate to it. The
  // inherit resets neutralize the base h2 heading font/tracking/leading so it renders exactly
  // like the old <div> (UIX-A11Y-1).
  const titleId = useId();

  return (
    <dialog ref={ref} className={cx('uix-drawer', className)} aria-labelledby={title ? titleId : undefined} {...rest}>
      {(title != null || onClose) && (
        <div className="uix-drawer__header">
          {title && (
            <h2 id={titleId} style={{ fontWeight: 600, fontSize: 'var(--uix-text-h3)', fontFamily: 'inherit', letterSpacing: 'inherit', lineHeight: 'inherit' }}>
              {title}
            </h2>
          )}
          {onClose && (
            <button
              style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: 'var(--uix-text-muted)', cursor: 'pointer', width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 'var(--uix-radius-sm)' }}
              onClick={onClose}
              aria-label="Close drawer"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      )}
      {children != null && <div className="uix-drawer__body">{children}</div>}
      {footer != null && <div className="uix-drawer__footer">{footer}</div>}
    </dialog>
  );
}
