"use client";

import { useEffect, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes, RefObject } from 'react';
import { cx } from '../cx.js';
import { useAnchoredPosition } from '../hooks/useAnchoredPosition.js';
import type { Placement } from '../overlay-position.js';

export interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Native popover behavior. Defaults to `"auto"` (light-dismiss). A trigger
   * wires to it via `popoverTarget={id}`. Pass `"manual"` to control open state yourself.
   */
  popover?: 'auto' | 'manual';
  /**
   * Element (or ref) to anchor against. When set, the popover is placed with
   * cross-browser JS positioning — flip when it won't fit, shift to stay on-screen —
   * instead of relying on CSS `anchor()`, which is Chromium-only and detaches the
   * popover from its trigger everywhere else. The native Popover API still provides
   * the top layer (so it escapes `overflow` clipping) and light-dismiss.
   */
  anchor?: RefObject<HTMLElement | null> | HTMLElement | null;
  /** Preferred placement when `anchor` is set. Default `'bottom-start'`. */
  placement?: Placement;
  /** Gap between the trigger and the popover, in px. Default 6. */
  offset?: number;
  children?: ReactNode;
}

/**
 * Anchored surface over `.uix-popover`, using the native Popover API. Compose ITSM
 * things like a filter popover, menu, or rich select by putting controls inside.
 * Pass `anchor` to get collision-aware, cross-browser placement (UIX-FIX-02).
 */
export function Popover({
  popover = 'auto', anchor, placement = 'bottom-start', offset = 6, className, children, ...props
}: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // `popover` is a valid HTML attribute but absent from React 18's DOM types.
  const popoverAttr = { popover } as Record<string, string>;

  const reposition = useAnchoredPosition(anchor ?? null, ref, {
    open: open && !!anchor, placement, offset,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !anchor) return;
    // Position the instant it opens (the CSS fade-in from opacity:0 hides this first frame,
    // so there's no visible jump), and track open state for the scroll/resize listeners.
    const sync = () => {
      const isOpen = el.matches(':popover-open');
      if (isOpen) reposition();
      setOpen(isOpen);
    };
    el.addEventListener('toggle', sync);
    return () => el.removeEventListener('toggle', sync);
  }, [anchor, reposition]);

  return (
    <div ref={ref} className={cx('uix-popover', className)} {...popoverAttr} {...props}>
      {children}
    </div>
  );
}
