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
   * cross-browser JS positioning — flip when it won't fit, shift to stay on-screen. A popover
   * that fits neither above nor below slides over its anchor rather than leave the viewport.
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
  /**
   * Cap the popover's height to the viewport (minus 8 px at each edge) and scroll inside it,
   * for content that can be taller than a phone screen. Needs `anchor`. Default `false`.
   */
  capHeight?: boolean;
  /**
   * Open while the pointer is over the `anchor` or the anchor has keyboard focus, and close
   * when both have left the anchor and the popover — a hover card (HAR-1614). The pointer can
   * travel from the anchor into the popover, and focus can move into it, without closing it;
   * Escape closes it. Touch does not hover: open it from the anchor's own click there.
   * `true` waits 300 ms before opening and 150 ms before closing; pass the delays to change
   * them. Needs `anchor`; `popover` then defaults to `"manual"`, so a hover card does not
   * dismiss a menu or dialog that is open.
   */
  openOnHover?: boolean | { openDelay?: number; closeDelay?: number };
  children?: ReactNode;
}

/**
 * Anchored surface over `.uix-popover`, using the native Popover API. Compose ITSM
 * things like a filter popover, menu, or rich select by putting controls inside.
 * Pass `anchor` to get collision-aware, cross-browser placement (UIX-FIX-02).
 */
export function Popover({
  popover: popoverProp, anchor, placement = 'bottom-start', offset = 6, closeWhenAnchorHidden = false, onAnchorHidden,
  capHeight = false, openOnHover = false, className, children, ...props
}: PopoverProps) {
  const hover = !!openOnHover && !!anchor;
  const popover = popoverProp ?? (hover ? 'manual' : 'auto');
  const openDelay = typeof openOnHover === 'object' ? openOnHover.openDelay ?? 300 : 300;
  const closeDelay = typeof openOnHover === 'object' ? openOnHover.closeDelay ?? 150 : 150;
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const onAnchorHiddenRef = useRef(onAnchorHidden);
  onAnchorHiddenRef.current = onAnchorHidden;
  // `popover` is a valid HTML attribute but absent from React 18's DOM types.
  const popoverAttr = { popover } as Record<string, string>;

  const reposition = useAnchoredPosition(anchor ?? null, ref, {
    open: open && !!anchor, placement, offset, capHeight,
    onAnchorHidden: closeWhenAnchorHidden ? () => {
      const el = ref.current;
      if (!el || !isPopoverOpen(el)) return;
      onAnchorHiddenRef.current?.();
      // Blur first: hiding a popover that holds focus would send focus back to its invoker,
      // which is the anchor that just scrolled away.
      const active = el.ownerDocument.activeElement as HTMLElement | null;
      if (active && el.contains(active)) active.blur();
      el.hidePopover();
    } : undefined,
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

  // openOnHover: the anchor and the popover are one hover / focus area.
  useEffect(() => {
    const el = ref.current as (HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void }) | null;
    const anchorEl = resolveAnchor(anchor);
    if (!hover || !el || !anchorEl) return;
    let timer: number | undefined;
    const inside = (node: Element | null): boolean => !!node && (anchorEl.contains(node) || el.contains(node));
    const stillWanted = (): boolean => {
      try {
        return anchorEl.matches(':hover') || el.matches(':hover') || inside(el.ownerDocument.activeElement);
      } catch { return false; }
    };
    const show = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { if (!isPopoverOpen(el)) { try { el.showPopover?.(); } catch { /* not connected */ } } }, delay);
    };
    const hide = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (isPopoverOpen(el) && !stillWanted()) { try { el.hidePopover?.(); } catch { /* already closed */ } }
      }, delay);
    };
    const onEnter = (event: Event) => { if ((event as PointerEvent).pointerType !== 'touch') show(openDelay); };
    const onLeave = (event: Event) => { if ((event as PointerEvent).pointerType !== 'touch') hide(closeDelay); };
    const onFocusIn = () => show(0);
    const onFocusOut = (event: Event) => { if (!inside((event as FocusEvent).relatedTarget as Element | null)) hide(closeDelay); };
    const onKeyDown = (event: Event) => {
      if ((event as KeyboardEvent).key !== 'Escape' || !isPopoverOpen(el)) return;
      window.clearTimeout(timer);
      // Focus that was inside goes back to the anchor; the card must not reopen from that.
      const hadFocus = el.contains(el.ownerDocument.activeElement);
      try { el.hidePopover?.(); } catch { /* already closed */ }
      if (hadFocus) { anchorEl.removeEventListener('focusin', onFocusIn); anchorEl.focus(); anchorEl.addEventListener('focusin', onFocusIn); }
    };
    for (const node of [anchorEl, el]) {
      node.addEventListener('pointerenter', onEnter);
      node.addEventListener('pointerleave', onLeave);
      node.addEventListener('focusout', onFocusOut);
      node.addEventListener('keydown', onKeyDown);
    }
    anchorEl.addEventListener('focusin', onFocusIn);
    return () => {
      window.clearTimeout(timer);
      for (const node of [anchorEl, el]) {
        node.removeEventListener('pointerenter', onEnter);
        node.removeEventListener('pointerleave', onLeave);
        node.removeEventListener('focusout', onFocusOut);
        node.removeEventListener('keydown', onKeyDown);
      }
      anchorEl.removeEventListener('focusin', onFocusIn);
    };
  }, [hover, anchor, openDelay, closeDelay]);

  // Runs right after the anchored-position hook placed it for the new session: let go of the hold.
  useIsomorphicLayoutEffect(() => {
    openRef.current = open;
    if (open && ref.current) settle(ref.current);
  }, [open]);

  return (
    <div ref={ref} className={cx('uix-popover', className)} {...popoverAttr} {...props}>
      {children}
    </div>
  );
}
