"use client";

import { useId } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { useDialog } from '../hooks/useDialog.js';

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
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onNavPrev?: () => void;
  onNavNext?: () => void;
  hint?: string;
}

export function Peek({ open, onClose, title, children, footer, onNavPrev, onNavNext, hint, className, onClick, ...rest }: PeekProps) {
  const ref = useDialog(open, onClose);
  const hasNav = onNavPrev != null || onNavNext != null;
  // Accessible name: the title labels the dialog; an <h2> so SR users can navigate to it (UIX-A11Y-1).
  const titleId = useId();

  // Light-dismiss: a native <dialog> closes on Escape + the close button, but
  // NOT on a backdrop click. The peek panel is right-aligned (width
  // --uix-peek-w); the ::backdrop dims the rest. A click whose coordinates fall
  // outside the panel's box is a backdrop click → close. (Clicks on the panel
  // body keep it open.) Guarded so a zero-size rect — e.g. the click that fired
  // while the dialog is mid-close — never spuriously re-triggers onClose.
  const onBackdropClick = (e: ReactMouseEvent<HTMLDialogElement>) => {
    onClick?.(e);
    if (!onClose || e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width === 0) return;
    const outside =
      e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (outside) onClose();
  };

  return (
    <dialog ref={ref} className={cx('uix-peek', className)} aria-labelledby={title ? titleId : undefined} {...rest} onClick={onBackdropClick}>
      <div className="uix-peek__header">
        {hasNav && (
          <div className="uix-peek__nav">
            {/* aria-disabled (not disabled) at the boundary keeps the button focusable, so focus
                isn't stranded when the last record makes it unavailable (UIX-A11Y-1). */}
            <button className="uix-peek__navbtn" onClick={() => onNavPrev?.()} aria-disabled={onNavPrev ? undefined : true} aria-label="Previous record">
              <ChevronUp />
            </button>
            <button className="uix-peek__navbtn" onClick={() => onNavNext?.()} aria-disabled={onNavNext ? undefined : true} aria-label="Next record">
              <ChevronDown />
            </button>
          </div>
        )}
        {title && <h2 className="uix-peek__title" id={titleId}>{title}</h2>}
        {hint && <span className="uix-peek__hint">{hint}</span>}
        {onClose && (
          <button className="uix-peek__close" onClick={onClose} aria-label="Close preview">
            <CloseIcon />
          </button>
        )}
      </div>
      {children != null && <div className="uix-peek__body">{children}</div>}
      {footer != null && <div className="uix-peek__footer">{footer}</div>}
    </dialog>
  );
}
