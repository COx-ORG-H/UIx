"use client";

import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode, ReactElement, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { useAnchoredPosition } from '../hooks/useAnchoredPosition.js';
import type { Placement } from '../overlay-position.js';

export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Tooltip text. */
  label: string;
  /** Preferred placement. Default `'top'`. */
  placement?: Placement;
  children?: ReactNode;
}

/**
 * Tooltip whose bubble renders in the top layer via the native Popover API, so it
 * escapes any `overflow: hidden/scroll` ancestor that would clip the old CSS-only
 * `[data-uix-tip]` tooltip (UIX-FIX-02). Positioned by the shared overlay engine
 * (flip/shift), shown on hover and keyboard focus, dismissed on blur or Escape
 * (document-level, per WCAG 1.4.13), and hoverable: the bubble stays open while
 * the pointer is over it (UIX-A11Y-1).
 */
export function Tooltip({ label, placement = 'top', className, children, ...props }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const id = useId();

  useAnchoredPosition(triggerRef, bubbleRef, { open, placement, offset: 6 });

  const cancelClose = () => {
    if (closeTimer.current != null) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const show = () => {
    cancelClose();
    const b = bubbleRef.current;
    if (b && !b.matches(':popover-open')) { try { b.showPopover(); } catch { /* already open */ } }
    setOpen(true);
  };
  const hide = () => {
    cancelClose();
    const b = bubbleRef.current;
    if (b && b.matches(':popover-open')) { try { b.hidePopover(); } catch { /* already closed */ } }
    setOpen(false);
  };
  // Small close delay so the pointer can cross the offset gap into the bubble (1.4.13 hoverable);
  // entering trigger or bubble cancels it.
  const scheduleHide = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(hide, 100);
  };

  // Esc dismisses without moving focus (1.4.13 dismissible), even when focus is elsewhere.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // hide the top-layer bubble if the trigger unmounts while shown
  useEffect(() => () => {
    if (closeTimer.current != null) clearTimeout(closeTimer.current);
    const b = bubbleRef.current;
    if (b && b.matches(':popover-open')) { try { b.hidePopover(); } catch { /* noop */ } }
  }, []);

  // `popover` is a valid HTML attribute but absent from React 18's DOM types.
  const bubbleAttr = { popover: 'manual' } as Record<string, string>;

  // aria-describedby belongs on the focusable child, not the wrapper, so SRs announce it from
  // the control itself; existing describedby values are preserved (same merge as Field —
  // UIX-A11Y-1). Non-element children (plain text/icon) keep it on the wrapper, which becomes
  // focusable so the tooltip is keyboard-reachable.
  const single = isValidElement(children);
  const child = single
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        'aria-describedby': [((children as ReactElement).props as Record<string, unknown>)['aria-describedby'], id]
          .filter(Boolean).join(' '),
      })
    : children;

  return (
    <span
      ref={triggerRef}
      className={cx('uix-tooltip', className)}
      aria-describedby={single ? undefined : id}
      tabIndex={single ? undefined : 0}
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => { if (e.key === 'Escape') hide(); }}
      {...props}
    >
      {child}
      <span
        ref={bubbleRef}
        id={id}
        role="tooltip"
        className="uix-tooltip__bubble"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleHide}
        {...bubbleAttr}
      >
        {label}
      </span>
    </span>
  );
}
