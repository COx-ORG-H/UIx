"use client";

import { useEffect, useId } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { useDialog } from '../hooks/useDialog.js';
import { backdropDismiss } from '../hooks/backdropDismiss.js';
import { useDrawerSwipe } from './Drawer.js';
import { ButtonLink } from './Button.js';
import type { UixRenderLink } from '../link.js';

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

const OpenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 3h4v4M13 3 7.5 8.5M12 9.5V12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h2.5" />
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
  /**
   * The record's ID (HAR-3089), shown with the title in the meta size with tabular figures, so the
   * person previewing a row sees which record it is ("INC-1042"). It is part of the dialog's name.
   */
  recordId?: ReactNode;
  /**
   * Open the record in full (HAR-3089): a secondary link button in the header row, with the close
   * control, right after the title in the Tab order. The product passes its words and the href;
   * `renderLink` is the router's link, as on `ButtonLink`.
   */
  openAction?: { label: string; href: string; renderLink?: UixRenderLink; onClick?: () => void };
}

/**
 * The record quick view beside a list. Since 2.68 (HAR-4659) it is the side Drawer's panel: the same
 * floating frame, slide, blurred scrim and swipe-to-close on touch (drawer.css styles `.uix-peek`
 * with `.uix-drawer`), plus what a peek adds: the ↑/↓ record arrows, the hint line and the footer.
 */
export function Peek({ open, onClose, title, children, footer, onNavPrev, onNavNext, hint, recordId, openAction, previousLabel: previousLabelProp, nextLabel: nextLabelProp, closeLabel: closeLabelProp, className, onClick, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, ...rest }: PeekProps) {
  const uixLabels = useUixLabels();
  const previousLabel = previousLabelProp ?? uixLabels.peek?.previous ?? 'Previous record';
  const nextLabel = nextLabelProp ?? uixLabels.peek?.next ?? 'Next record';
  const closeLabel = closeLabelProp ?? uixLabels.peek?.close ?? 'Close preview';
  const ref = useDialog(open, onClose);
  const hasNav = onNavPrev != null || onNavNext != null;
  // Accessible name: the title labels the dialog; an <h2> so SR users can navigate to it (UIX-A11Y-1).
  const titleId = useId();
  // Swipe toward the right edge closes it, like the Drawer (touch and pen only; the mouse keeps
  // the close button, Escape and the backdrop).
  const swipe = useDrawerSwipe('end', !!onClose, () => { onClose?.(); return true; });
  // a panel thrown out stays out until the dialog has closed; reopening starts clean
  useEffect(() => { const el = ref.current; if (open && el) swipe.settle(el); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <dialog
      ref={ref}
      className={cx('uix-peek', className)}
      aria-labelledby={title || recordId != null ? titleId : undefined}
      {...rest}
      onClick={backdropDismiss(onClose, onClick)}
      onPointerDown={(event) => { onPointerDown?.(event); swipe.handlers.onPointerDown(event); }}
      onPointerMove={(event) => { onPointerMove?.(event); swipe.handlers.onPointerMove(event); }}
      onPointerUp={(event) => { onPointerUp?.(event); swipe.handlers.onPointerUp(event); }}
      onPointerCancel={(event) => { onPointerCancel?.(event); swipe.handlers.onPointerCancel(event); }}
    >
      <div className="uix-peek__header">
        {hasNav && (
          <div className="uix-peek__nav">
            {/* aria-disabled (not disabled) at the boundary keeps the button focusable, so focus
                isn't stranded when the last record makes it unavailable (UIX-A11Y-1). */}
            <button type="button" className="uix-peek__navbtn" onClick={() => onNavPrev?.()} aria-disabled={onNavPrev ? undefined : true} aria-label={previousLabel}>
              <ChevronUp />
            </button>
            <button type="button" className="uix-peek__navbtn" onClick={() => onNavNext?.()} aria-disabled={onNavNext ? undefined : true} aria-label={nextLabel}>
              <ChevronDown />
            </button>
          </div>
        )}
        {/* The ID shows even before the title has loaded (#277 review). */}
        {(title || recordId != null) && (
          <h2 className="uix-peek__title" id={titleId}>
            {recordId != null && <><span className="uix-peek__record-id">{recordId}</span>{' '}</>}
            {title}
          </h2>
        )}
        {/* After the title in the DOM, so Tab reaches "open" right after it; the grid puts the
            controls on the first row, at the end. */}
        {(openAction || onClose) && (
          <div className="uix-peek__controls">
            {openAction && (
              <ButtonLink className="uix-peek__open" href={openAction.href} renderLink={openAction.renderLink} onClick={openAction.onClick} variant="secondary" size="sm">
                <OpenIcon />
                {openAction.label}
              </ButtonLink>
            )}
            {onClose && (
              <button type="button" className="uix-peek__close" onClick={onClose} aria-label={closeLabel}>
                <CloseIcon />
              </button>
            )}
          </div>
        )}
        {hint && <span className="uix-peek__hint">{hint}</span>}
      </div>
      {children != null && <div className="uix-peek__body">{children}</div>}
      {footer != null && <div className="uix-peek__footer">{footer}</div>}
    </dialog>
  );
}
