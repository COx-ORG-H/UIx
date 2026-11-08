"use client";

import { useEffect, useId, useRef } from 'react';
import type { ReactNode, HTMLAttributes, PointerEvent as ReactPointerEvent } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { isBackdropClick } from '../hooks/backdropDismiss.js';
import { useGuardedDialog } from './DiscardPrompt.js';
import type { DialogCloseEvent, DiscardPromptLabels } from './DiscardPrompt.js';
import { prefersReducedMotion } from '../hooks/useReducedMotion.js';

/* Swipe to dismiss (2.60, the animate-ui study). On a touch screen or with a pen, the panel follows
 * a drag toward its own edge (right for `end`, left for `start`, down for `bottom`) and the backdrop
 * lightens with it; released past a third of the panel, or flung faster than SWIPE_VELOCITY that
 * way, it carries on out and closes. Otherwise it settles back. A drag the other way does not move
 * it. The mouse keeps the close button, Escape and the backdrop: a mouse drag in a drawer selects
 * text. A drag never starts on a control, and on a bottom sheet only from the header or from a body
 * scrolled to its top, so scrolling stays scrolling. With unsaved changes (`dirty`) it settles back
 * and asks first, like every other way out; while `pending` it settles back. The same constants as
 * the Toast swipe. */
const SWIPE_VELOCITY = 0.11; // px per ms
const SWIPE_SLOP = 6; // px of travel before a press becomes a drag
const SWIPE_WINDOW = 100; // ms of movement the release velocity is measured over
const NOT_A_HANDLE = 'button, a, input, textarea, select, label, [role="button"], [role="slider"], [contenteditable=""], [contenteditable="true"]';

interface DrawerDrag { id: number; x0: number; y0: number; d: number; samples: { p: number; t: number }[]; active: boolean }

function useDrawerSwipe(side: 'end' | 'start' | 'bottom', canClose: boolean, dismiss: (event: ReactPointerEvent<HTMLDialogElement>) => boolean) {
  const drag = useRef<DrawerDrag | null>(null);
  const vertical = side === 'bottom';
  const sign = side === 'start' ? -1 : 1;
  const along = (e: { clientX: number; clientY: number }, d: DrawerDrag) => (vertical ? e.clientY - d.y0 : e.clientX - d.x0) * sign;
  const across = (e: { clientX: number; clientY: number }, d: DrawerDrag) => (vertical ? e.clientX - d.x0 : e.clientY - d.y0);
  const place = (el: HTMLElement, d: number) => {
    el.style.translate = vertical ? `0 ${d}px` : `${d * sign}px 0`;
    const size = vertical ? el.offsetHeight : el.offsetWidth;
    el.style.setProperty('--uix-drawer-swipe', String(Math.min(1, d / Math.max(1, size))));
  };
  const settle = (el: HTMLElement) => {
    el.removeAttribute('data-swiping');
    el.style.translate = '';
    el.style.removeProperty('--uix-drawer-swipe');
  };
  const end = (e: ReactPointerEvent<HTMLDialogElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    const el = e.currentTarget;
    const recent = d.samples.filter((s) => e.timeStamp - s.t <= SWIPE_WINDOW);
    const v = recent.length ? (along(e, d) - recent[0].p) / Math.max(1, e.timeStamp - recent[0].t) : 0;
    const size = vertical ? el.offsetHeight : el.offsetWidth;
    if (e.type === 'pointerup' && (v > SWIPE_VELOCITY || d.d > size / 3) && dismiss(e)) {
      // carry on out from where it was let go; under reduced motion it fades where it is
      el.removeAttribute('data-swiping');
      if (!prefersReducedMotion()) place(el, size + 32);
      return;
    }
    settle(el);
  };
  return {
    settle,
    handlers: {
      onPointerDown: (e: ReactPointerEvent<HTMLDialogElement>) => {
        if (!canClose || e.pointerType === 'mouse' || !e.isPrimary || e.target === e.currentTarget) return;
        const target = e.target as Element;
        if (target.closest(NOT_A_HANDLE)) return;
        if (vertical) {
          const body = e.currentTarget.querySelector('.uix-drawer__body');
          if (!target.closest('.uix-drawer__header') && body && body.contains(target) && body.scrollTop > 0) return;
        }
        drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, d: 0, samples: [{ p: 0, t: e.timeStamp }], active: false };
      },
      onPointerMove: (e: ReactPointerEvent<HTMLDialogElement>) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const a = along(e, d);
        if (!d.active) {
          if (Math.abs(a) < SWIPE_SLOP) return;
          // the other axis, or toward the screen's middle: not a dismiss gesture
          if (Math.abs(across(e, d)) > Math.abs(a) || a < 0) { drag.current = null; return; }
          d.active = true;
          try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* a pointer the browser no longer tracks */ }
          e.currentTarget.setAttribute('data-swiping', '');
        }
        d.samples = [...d.samples.filter((s) => e.timeStamp - s.t <= SWIPE_WINDOW), { p: a, t: e.timeStamp }];
        d.d = Math.max(0, a);
        place(e.currentTarget, d.d);
      },
      onPointerUp: end,
      onPointerCancel: end,
    },
  };
}

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export interface DrawerProps extends Omit<HTMLAttributes<HTMLDialogElement>, 'title'> {
  /** TENSOR RX-125 (UIX-04): translatable; English default. */
  closeLabel?: string;
  open: boolean;
  /**
   * Close the drawer. Gets the click that asked (the close button, the backdrop, a `DialogClose`,
   * "Discard"); nothing when the browser closed it (Escape, `<form method="dialog">`).
   */
  onClose?: (event?: DialogCloseEvent) => void;
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
  const swipe = useDrawerSwipe(side, !!onClose && !pending, (event) => {
    // only a clean close carries the panel out; unsaved changes settle it back and ask first
    if (dirty) { guard.requestClose(null, event); return false; }
    guard.requestClose(null, event);
    return true;
  });
  // a panel thrown out stays out until the dialog has closed; reopening starts clean
  useEffect(() => { const el = guard.ref.current; if (open && el) swipe.settle(el); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <dialog
      ref={guard.ref}
      className={cx('uix-drawer', side !== 'end' && `uix-drawer--${side}`, className)}
      aria-labelledby={title ? titleId : undefined}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (dismissOnBackdrop && onClose && isBackdropClick(event)) guard.requestClose(null, event);
      }}
      onKeyDown={(event) => { onKeyDown?.(event); guard.onKeyDown(event); }}
      onPointerDown={(event) => { rest.onPointerDown?.(event); swipe.handlers.onPointerDown(event); }}
      onPointerMove={(event) => { rest.onPointerMove?.(event); swipe.handlers.onPointerMove(event); }}
      onPointerUp={(event) => { rest.onPointerUp?.(event); swipe.handlers.onPointerUp(event); }}
      onPointerCancel={(event) => { rest.onPointerCancel?.(event); swipe.handlers.onPointerCancel(event); }}
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
                  onClick={(event) => guard.requestClose(event.currentTarget, event)}
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
