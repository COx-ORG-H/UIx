"use client";

import { forwardRef, useCallback, useId, useRef } from 'react';
import type { ForwardedRef, MutableRefObject, ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { useGuardedDialog } from './DiscardPrompt.js';
import type { DialogCloseEvent, DiscardPromptLabels } from './DiscardPrompt.js';

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export interface ModalProps extends Omit<HTMLAttributes<HTMLDialogElement>, 'title'> {
  open: boolean;
  /**
   * Close the dialog. Gets the click that asked (the close button, a `DialogClose`, "Discard");
   * nothing when the browser closed it (Escape, `<form method="dialog">`).
   */
  onClose?: (event?: DialogCloseEvent) => void;
  /**
   * The dialog holds input that is not saved (HAR-2029). Escape, the close button and a
   * `DialogClose` then open an anchored "Discard changes?" step with focus on "Keep editing"
   * instead of calling `onClose`; "Discard" calls it. A clean dialog closes at once.
   */
  dirty?: boolean;
  /** A save is in flight: Escape, the close button and a `DialogClose` do nothing. */
  pending?: boolean;
  /** The words of the discard step. Default: `UixLabelsProvider` `discardPrompt`, then English. */
  discardLabels?: Partial<DiscardPromptLabels>;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Accessible name for the close button (default "Close dialog"). */
  closeLabel?: string;
  role?: 'dialog' | 'alertdialog';
  /**
   * Open and close with no animation (`[data-uix-instant]`). For a keyboard-initiated or
   * many-times-a-day dialog. A `CommandPalette` inside sets this on its own.
   */
  instant?: boolean;
}

/** A modal `<dialog>`; the ref reaches it (HAR-1831). */
export const Modal = forwardRef<HTMLDialogElement, ModalProps>(function Modal({
  open, onClose, dirty = false, pending = false, discardLabels, title, children, footer, className, closeLabel: closeLabelProp,
  role = 'dialog', instant = false, onKeyDown, ...rest
}, ref) {
  const uixLabels = useUixLabels();
  const closeLabel = closeLabelProp ?? uixLabels.modal?.close ?? 'Close dialog';
  const closeRef = useRef<HTMLButtonElement>(null);
  // onClose also fires on a native close (Esc / method="dialog") via the hook, so the dialog
  // carries no onClose prop of its own — that would double-fire (UIX-A11Y-1).
  const guard = useGuardedDialog({ open, onClose, dirty, pending, labels: discardLabels, closeRef });
  // Accessible name: the title labels the dialog; an <h2> so SR users can navigate to it (UIX-A11Y-1).
  const titleId = useId();
  const dialogRef = useMergedRef(guard.ref, ref);

  return (
    <dialog
      ref={dialogRef}
      className={cx('uix-dialog', className)}
      role={role}
      aria-labelledby={title != null ? titleId : undefined}
      data-uix-instant={instant ? '' : undefined}
      {...rest}
      onKeyDown={(event) => { onKeyDown?.(event); guard.onKeyDown(event); }}
    >
      {guard.provide(
        <>
          {(title != null || onClose) && (
            <div className="uix-dialog__header">
              {title && <h2 className="uix-dialog__title" id={titleId}>{title}</h2>}
              {onClose && (
                <button
                  ref={closeRef}
                  type="button"
                  className="uix-dialog__close"
                  onClick={(event) => guard.requestClose(event.currentTarget, event)}
                  aria-label={closeLabel}
                  aria-disabled={pending || undefined}
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          )}
          {children != null && <div className="uix-dialog__body">{children}</div>}
          {footer != null && <div className="uix-dialog__footer">{footer}</div>}
        </>,
      )}
      {guard.prompt}
    </dialog>
  );
});
Modal.displayName = 'Modal';

/** One callback ref that fills the dialog hook's ref and the consumer's. */
function useMergedRef<T>(own: { current: T | null }, forwarded: ForwardedRef<T>) {
  return useCallback((el: T | null) => {
    (own as MutableRefObject<T | null>).current = el;
    if (typeof forwarded === 'function') forwarded(el);
    else if (forwarded) forwarded.current = el;
  }, [own, forwarded]);
}
