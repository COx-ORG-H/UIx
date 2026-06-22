import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
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

export interface PeekProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onNavPrev?: () => void;
  onNavNext?: () => void;
  hint?: string;
  className?: string;
}

export function Peek({ open, onClose, title, children, footer, onNavPrev, onNavNext, hint, className }: PeekProps) {
  const ref = useDialog(open);
  const hasNav = onNavPrev != null || onNavNext != null;

  // Light-dismiss: a native <dialog> closes on Escape + the close button, but
  // NOT on a backdrop click. The peek panel is right-aligned (width
  // --uix-peek-w); the ::backdrop dims the rest. A click whose coordinates fall
  // outside the panel's box is a backdrop click → close. (Clicks on the panel
  // body keep it open.) Guarded so a zero-size rect — e.g. the click that fired
  // while the dialog is mid-close — never spuriously re-triggers onClose.
  const onBackdropClick = (e: ReactMouseEvent<HTMLDialogElement>) => {
    if (!onClose || e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width === 0) return;
    const outside =
      e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (outside) onClose();
  };

  return (
    <dialog ref={ref} className={cx('uix-peek', className)} onClose={onClose} onClick={onBackdropClick}>
      <div className="uix-peek__header">
        {hasNav && (
          <div className="uix-peek__nav">
            <button className="uix-peek__navbtn" onClick={onNavPrev} disabled={!onNavPrev} aria-label="Previous record">
              <ChevronUp />
            </button>
            <button className="uix-peek__navbtn" onClick={onNavNext} disabled={!onNavNext} aria-label="Next record">
              <ChevronDown />
            </button>
          </div>
        )}
        {title && <div className="uix-peek__title">{title}</div>}
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
