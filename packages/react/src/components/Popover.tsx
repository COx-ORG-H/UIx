"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, HTMLAttributes, RefObject } from 'react';
import { cx } from '../cx.js';
import { resolveAnchor, useAnchoredPosition } from '../hooks/useAnchoredPosition.js';
import type { Placement } from '../overlay-position.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Set from `beforetoggle` until the opening popover is placed: popover.css holds it at its
 * starting frame, so the enter motion starts on the side it was placed on (away from the anchor).
 */
const PLACING = 'data-uix-placing';

const isPopoverOpen = (el: Element): boolean => {
  try { return el.matches(':popover-open'); } catch { return false; }
};

/** Start the enter motion from the placed side: commit the held frame there, then let go. */
const settle = (el: HTMLElement) => {
  if (!el.hasAttribute(PLACING)) return;
  getComputedStyle(el).getPropertyValue('transform');
  el.removeAttribute(PLACING);
};

export interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Native popover behavior. Defaults to `"auto"` (light-dismiss). A trigger
   * wires to it via `popoverTarget={id}`. Pass `"manual"` to control open state yourself.
   */
  popover?: 'auto' | 'manual';
  /**
   * Element (or ref) to anchor against. When set, the popover is placed with
   * cross-browser JS positioning — flip when it won't fit, shift to stay on-screen.
   * Where the browser supports CSS anchor positioning, the placement is written as an
   * offset from the anchor, so it stays attached while the page scrolls; elsewhere it
   * follows scroll from JS. The native Popover API still provides the top layer (so it
   * escapes `overflow` clipping) and light-dismiss.
   */
  anchor?: RefObject<HTMLElement | null> | HTMLElement | null;
  /** Preferred placement when `anchor` is set. Default `'bottom-start'`. */
  placement?: Placement;
  /** Gap between the trigger and the popover, in px. Default 6. */
  offset?: number;
  /**
   * Close the popover once its `anchor` has scrolled completely out of view (outside the
   * viewport or a clipping ancestor), e.g. a picker opened from an editor that the user
   * scrolls away from. Focus inside the popover is let go rather than sent back to the
   * hidden anchor. Needs `anchor`. Default `false`.
   */
  closeWhenAnchorHidden?: boolean;
  /** Called when `closeWhenAnchorHidden` is about to close the popover. */
  onAnchorHidden?: () => void;
  children?: ReactNode;
}

/**
 * Anchored surface over `.uix-popover`, using the native Popover API. Compose ITSM
 * things like a filter popover, menu, or rich select by putting controls inside.
 * Pass `anchor` to get collision-aware, cross-browser placement (UIX-FIX-02).
 */
export function Popover({
  popover = 'auto', anchor, placement = 'bottom-start', offset = 6, closeWhenAnchorHidden = false, onAnchorHidden,
  className, children, ...props
}: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const onAnchorHiddenRef = useRef(onAnchorHidden);
  onAnchorHiddenRef.current = onAnchorHidden;
  // `popover` is a valid HTML attribute but absent from React 18's DOM types.
  const popoverAttr = { popover } as Record<string, string>;

  const reposition = useAnchoredPosition(anchor ?? null, ref, {
    open: open && !!anchor, placement, offset,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !anchor) return;
    const hold = (event: Event) => {
      if ((event as Event & { newState?: string }).newState !== 'open') return;
      el.setAttribute(PLACING, '');
      // Whatever happens next, it is never left invisible: the normal release comes far sooner.
      window.setTimeout(() => settle(el), 150);
    };
    // Track open state for the scroll/resize listeners, and place it the instant it opens.
    const sync = () => {
      if (!isPopoverOpen(el)) {
        el.removeAttribute(PLACING);
        setOpen(false);
        return;
      }
      reposition();
      // The consumer's own `toggle` listener may render the content now (React renders each
      // listener's update in its own microtask, and ours runs first). Start the open session
      // after the whole toggle task, so its first placement — the side it keeps — and the enter
      // motion use the real size. Until then it is held, invisible, at its starting frame.
      window.setTimeout(() => {
        if (!isPopoverOpen(el)) return;
        if (!openRef.current) {
          setOpen(true);
          return;
        }
        // Already open in state (a hide + show in one task): no render follows.
        reposition();
        settle(el);
      }, 0);
    };
    el.addEventListener('beforetoggle', hold);
    el.addEventListener('toggle', sync);
    return () => {
      el.removeEventListener('beforetoggle', hold);
      el.removeEventListener('toggle', sync);
      el.removeAttribute(PLACING);
    };
  }, [anchor, reposition]);

  // Runs right after the anchored-position hook placed it for the new session: let go of the hold.
  useIsomorphicLayoutEffect(() => {
    openRef.current = open;
    if (open && ref.current) settle(ref.current);
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    const anchorEl = resolveAnchor(anchor);
    if (!closeWhenAnchorHidden || !open || !el || !anchorEl || typeof IntersectionObserver !== 'function') return;
    // The implicit root is the viewport, clipped by every overflow ancestor of the anchor.
    const observer = new IntersectionObserver((entries) => {
      const latest = entries[entries.length - 1];
      if (!latest || latest.isIntersecting || !isPopoverOpen(el)) return;
      onAnchorHiddenRef.current?.();
      // Blur first: hiding a popover that holds focus would send focus back to its invoker,
      // which is the anchor that just scrolled away.
      const active = el.ownerDocument.activeElement as HTMLElement | null;
      if (active && el.contains(active)) active.blur();
      el.hidePopover();
    });
    observer.observe(anchorEl);
    return () => observer.disconnect();
  }, [closeWhenAnchorHidden, open, anchor]);

  return (
    <div ref={ref} className={cx('uix-popover', className)} {...popoverAttr} {...props}>
      {children}
    </div>
  );
}
