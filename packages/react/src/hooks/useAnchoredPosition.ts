"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { computePosition } from '../overlay-position.js';
import type { Placement } from '../overlay-position.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

export interface UseAnchoredPositionOptions {
  /** Reposition while true, and (re)attach scroll/resize listeners. */
  open: boolean;
  placement?: Placement;
  offset?: number;
  padding?: number;
}

type AnchorArg = RefObject<HTMLElement | null> | HTMLElement | null | undefined;

const resolve = (a: AnchorArg): HTMLElement | null =>
  a && typeof a === 'object' && 'current' in a ? a.current : (a ?? null);

/**
 * Position a floating element (a native-popover overlay) against an anchor with
 * cross-browser flip/shift — the DOM half of the overlay-position engine (UIX-FIX-02).
 *
 * Measures both elements with getBoundingClientRect, applies `position: fixed` + left/top
 * (overriding the popover's default centered `inset:0; margin:auto`), and keeps the overlay
 * glued to its anchor on scroll/resize while `open`. Returns a `reposition` fn for callers
 * that want to nudge it manually (e.g. right when a native popover's `toggle` fires).
 */
export function useAnchoredPosition(
  anchor: RefObject<HTMLElement | null> | HTMLElement | null | undefined,
  floatingRef: RefObject<HTMLElement | null>,
  { open, placement = 'bottom-start', offset = 6, padding = 8 }: UseAnchoredPositionOptions,
): () => void {
  // keep latest options in a ref so `reposition`'s identity is stable across renders
  const opts = useRef({ placement, offset, padding });
  opts.current = { placement, offset, padding };

  const reposition = useCallback(() => {
    const anchorEl = resolve(anchor);
    const floating = floatingRef.current;
    if (!anchorEl || !floating) return;
    const s = floating.style;
    // Reset to natural sizing BEFORE measuring: a native popover's UA default is
    // inset:0; margin:auto, which stretches it and yields a wrong width/height.
    s.position = 'fixed';
    s.inset = 'auto';
    s.margin = '0';
    const a = anchorEl.getBoundingClientRect();
    const { placement: p, offset: o, padding: pad } = opts.current;
    const pos = computePosition(
      { x: a.x, y: a.y, width: a.width, height: a.height },
      { width: floating.offsetWidth, height: floating.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      { placement: p, offset: o, padding: pad },
    );
    s.left = `${Math.round(pos.x)}px`;
    s.top = `${Math.round(pos.y)}px`;
    floating.dataset.placement = pos.placement;
  }, [anchor, floatingRef]);

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    reposition();
    // capture:true catches scrolls in any nested scroll container, not just the window
    const onScroll = () => reposition();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, reposition]);

  return reposition;
}
