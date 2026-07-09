"use client";

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { computePosition } from '../overlay-position.js';
import type { PositionOptions } from '../overlay-position.js';

export interface UseOverlayPositionOptions extends PositionOptions {
  /** Turn positioning on/off without unmounting (default true). */
  enabled?: boolean;
}

/**
 * Keep a native-popover overlay flipped/shifted into the viewport and attached to
 * its trigger — a cross-browser replacement for CSS anchor positioning (which is
 * Chromium-only and clips/detaches elsewhere). Wire the trigger and the `[popover]`
 * element via refs: the overlay is positioned when it opens (its `beforetoggle`
 * event) and re-positioned on scroll/resize while open. It is placed with
 * `position: fixed; left; top` — the popover lives in the top layer, so those are
 * viewport coordinates and no `overflow` ancestor can clip it.
 *
 * The overlay element must use the native Popover API (a `popover` attribute); the
 * trigger is typically its `popoverTarget`. See `computePosition` for the math.
 */
export function useOverlayPosition(
  triggerRef: RefObject<HTMLElement | null>,
  overlayRef: RefObject<HTMLElement | null>,
  options: UseOverlayPositionOptions = {},
): void {
  const { enabled = true, side, align, gap, padding, flip, shift } = options;

  useEffect(() => {
    const trigger = triggerRef.current;
    const overlay = overlayRef.current;
    if (!enabled || !trigger || !overlay) return;

    const reposition = () => {
      const anchor = trigger.getBoundingClientRect();
      const size = { width: overlay.offsetWidth, height: overlay.offsetHeight };
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const { x, y } = computePosition(anchor, size, viewport, { side, align, gap, padding, flip, shift });
      overlay.style.position = 'fixed';
      overlay.style.margin = '0';
      overlay.style.inset = 'auto';
      overlay.style.left = `${x}px`;
      overlay.style.top = `${y}px`;
    };

    // capture:true so a scroll on ANY ancestor scroll container re-pins the overlay
    const follow = () => {
      window.addEventListener('scroll', reposition, { capture: true, passive: true });
      window.addEventListener('resize', reposition);
    };
    const unfollow = () => {
      window.removeEventListener('scroll', reposition, { capture: true });
      window.removeEventListener('resize', reposition);
    };

    const onToggle = (e: Event) => {
      if ((e as Event & { newState?: string }).newState === 'open') { reposition(); follow(); }
      else unfollow();
    };

    overlay.addEventListener('beforetoggle', onToggle);
    if (overlay.matches(':popover-open')) { reposition(); follow(); } // already open on mount

    return () => {
      overlay.removeEventListener('beforetoggle', onToggle);
      unfollow();
    };
  }, [triggerRef, overlayRef, enabled, side, align, gap, padding, flip, shift]);
}
