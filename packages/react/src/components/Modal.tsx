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
}

export function Modal({ open, onClose, title, children, footer, className, ...rest }: ModalProps) {
  const ref = useDialog(open, onClose);
  // Accessible name: the title labels the dialog; an <h2> so SR users can navigate to it (UIX-A11Y-1).
  const titleId = useId();

  return (
    <dialog ref={ref} className={cx('uix-dialog', className)} aria-labelledby={title ? titleId : undefined} {...rest}>
      {(title != null || onClose) && (
        <div className="uix-dialog__header">
          {title && <h2 className="uix-dialog__title" id={titleId}>{title}</h2>}
          {onClose && (
            <button className="uix-dialog__close" onClick={onClose} aria-label="Close dialog">
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
