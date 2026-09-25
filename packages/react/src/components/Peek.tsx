"use client";

import { useId } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { useDialog } from '../hooks/useDialog.js';
import { backdropDismiss } from '../hooks/backdropDismiss.js';

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

const ChevronUp = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M2 8l4-4 4 4" />
  </svg>
);

const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M2 4l4 4 4-4" />
  </svg>
);

export interface PeekProps extends Omit<HTMLAttributes<HTMLDialogElement>, 'title'> {
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  previousLabel?: string;
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  nextLabel?: string;
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  closeLabel?: string;
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onNavPrev?: () => void;
  onNavNext?: () => void;
  hint?: string;
}

export function Peek({ open, onClose, title, children, footer, onNavPrev, onNavNext, hint, previousLabel = 'Previous record', nextLabel = 'Next record', closeLabel = 'Close preview', className, onClick, ...rest }: PeekProps) {
  const ref = useDialog(open, onClose);
  const hasNav = onNavPrev != null || onNavNext != null;
  // Accessible name: the title labels the dialog; an <h2> so SR users can navigate to it (UIX-A11Y-1).
  const titleId = useId();

  return (
    <dialog ref={ref} className={cx('uix-peek', className)} aria-labelledby={title ? titleId : undefined} {...rest} onClick={backdropDismiss(onClose, onClick)}>
      <div className="uix-peek__header">
        {hasNav && (
          <div className="uix-peek__nav">
            {/* aria-disabled (not disabled) at the boundary keeps the button focusable, so focus
                isn't stranded when the last record makes it unavailable (UIX-A11Y-1). */}
            <button className="uix-peek__navbtn" onClick={() => onNavPrev?.()} aria-disabled={onNavPrev ? undefined : true} aria-label={previousLabel}>
              <ChevronUp />
            </button>
            <button className="uix-peek__navbtn" onClick={() => onNavNext?.()} aria-disabled={onNavNext ? undefined : true} aria-label={nextLabel}>
              <ChevronDown />
            </button>
          </div>
        )}
        {title && <h2 className="uix-peek__title" id={titleId}>{title}</h2>}
        {hint && <span className="uix-peek__hint">{hint}</span>}
        {onClose && (
          <button className="uix-peek__close" onClick={onClose} aria-label={closeLabel}>
            <CloseIcon />
          </button>
        )}
      </div>
      {children != null && <div className="uix-peek__body">{children}</div>}
      {footer != null && <div className="uix-peek__footer">{footer}</div>}
    </dialog>
  );
}
