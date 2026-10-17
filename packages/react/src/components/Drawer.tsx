"use client";

import { useId, useRef } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { backdropDismiss } from '../hooks/backdropDismiss.js';
import { useGuardedDialog } from './DiscardPrompt.js';
import type { DiscardPromptLabels } from './DiscardPrompt.js';

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export interface DrawerProps extends Omit<HTMLAttributes<HTMLDialogElement>, 'title'> {
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  closeLabel?: string;
  open: boolean;
  onClose?: () => void;
  /**
   * The drawer holds input that is not saved (HAR-2029), e.g. react-hook-form's
   * `formState.isDirty`. Escape, the close button, a backdrop click and a `DialogClose` then open
   * an anchored "Discard changes?" step with focus on "Keep editing" instead of calling `onClose`;
   * "Discard" calls it. A clean drawer closes at once. A `<form method="dialog">` submit counts
   * as a way out too: save with your own handler instead.
   */
  dirty?: boolean;
  /** A save is in flight: Escape, the close button, a backdrop click and a `DialogClose` do nothing. */
  pending?: boolean;
  /** The words of the discard step. Default: `UixLabelsProvider` `discardPrompt`, then English. */
  discardLabels?: Partial<DiscardPromptLabels>;
  /**
   * A click on the dimmed backdrop calls `onClose`, like Escape and the close button
   * (TENSOR HAR-547), or asks first when the drawer is `dirty`. `false` ignores backdrop clicks
   * altogether. Default `true`.
   */
  dismissOnBackdrop?: boolean;
  /**
   * Edge the drawer slides from (HAR-1351). `end` (default) is the side sheet; `start` is
   * the phone navigation drawer; `bottom` is a bottom sheet capped at 85% of the viewport.
   */
  side?: 'end' | 'start' | 'bottom';
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

export function Drawer({
  open, onClose, dirty = false, pending = false, discardLabels, dismissOnBackdrop = true, side = 'end', title, children, footer,
  closeLabel: closeLabelProp, className, onClick, onKeyDown, ...rest
}: DrawerProps) {
  const uixLabels = useUixLabels();
  const closeLabel = closeLabelProp ?? uixLabels.drawer?.close ?? 'Close drawer';
  const closeRef = useRef<HTMLButtonElement>(null);
  const guard = useGuardedDialog({ open, onClose, dirty, pending, labels: discardLabels, closeRef });
  // Accessible name: the title labels the dialog; an <h2> so SR users can navigate to it. The
  // inherit resets neutralize the base h2 heading font/tracking/leading so it renders exactly
  // like the old <div> (UIX-A11Y-1).
  const titleId = useId();

  return (
    <dialog
      ref={guard.ref}
      className={cx('uix-drawer', side !== 'end' && `uix-drawer--${side}`, className)}
      aria-labelledby={title ? titleId : undefined}
      {...rest}
      onClick={backdropDismiss(onClose && (() => guard.requestClose()), onClick, dismissOnBackdrop)}
      onKeyDown={(event) => { onKeyDown?.(event); guard.onKeyDown(event); }}
    >
      {guard.provide(
        <>
          {(title != null || onClose) && (
            <div className="uix-drawer__header">
              {title && (
                <h2 id={titleId} style={{ fontWeight: 600, fontSize: 'var(--uix-text-h3)', fontFamily: 'inherit', letterSpacing: 'inherit', lineHeight: 'inherit' }}>
                  {title}
                </h2>
              )}
              {onClose && (
                <button
                  ref={closeRef}
                  type="button"
                  className="uix-drawer__close"
                  onClick={() => guard.requestClose()}
                  aria-label={closeLabel}
                  aria-disabled={pending || undefined}
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          )}
          {children != null && <div className="uix-drawer__body">{children}</div>}
          {footer != null && <div className="uix-drawer__footer">{footer}</div>}
        </>,
      )}
      {guard.prompt}
    </dialog>
  );
}
