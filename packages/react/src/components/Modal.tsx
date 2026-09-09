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

export interface ModalProps extends Omit<HTMLAttributes<HTMLDialogElement>, 'title'> {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Accessible name for the close button (default "Close dialog"). */
  closeLabel?: string;
  role?: 'dialog' | 'alertdialog';
}

export function Modal({ open, onClose, title, children, footer, className, closeLabel = 'Close dialog', role = 'dialog', ...rest }: ModalProps) {
  // onClose also fires on a native close (Esc / method="dialog") via the hook, so the dialog
  // carries no onClose prop of its own — that would double-fire (UIX-A11Y-1).
  const ref = useDialog(open, onClose);
  // Accessible name: the title labels the dialog; an <h2> so SR users can navigate to it (UIX-A11Y-1).
  const titleId = useId();

  return (
    <dialog ref={ref} className={cx('uix-dialog', className)} role={role} aria-labelledby={title != null ? titleId : undefined} {...rest}>
      {(title != null || onClose) && (
        <div className="uix-dialog__header">
          {title && <h2 className="uix-dialog__title" id={titleId}>{title}</h2>}
          {onClose && (
            <button type="button" className="uix-dialog__close" onClick={onClose} aria-label={closeLabel}>
              <CloseIcon />
            </button>
          )}
        </div>
      )}
      {children != null && <div className="uix-dialog__body">{children}</div>}
      {footer != null && <div className="uix-dialog__footer">{footer}</div>}
    </dialog>
  );
}
