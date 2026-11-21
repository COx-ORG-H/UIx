"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import { getStickyInsets, registerStickyLayer, subscribeStickyInsets } from '../sticky-layers.js';
import type { StickyEdge } from '../sticky-layers.js';

const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

export interface UseStickyLayerOptions {
  /** The viewport edge the layer stays at. */
  edge: StickyEdge;
  /** `false` takes the layer out (it is not shown). Default: `true`. */
  enabled?: boolean;
}

/**
 * Registers a fixed layer that content scrolls under (WCAG 2.2 SC 2.4.11): a product's own fixed
 * header, a floating bar. Its height is kept in `--uix-sticky-top` / `--uix-sticky-bottom` on
 * `<html>`, the page's scrollers take it as `scroll-padding`, and a keyboard focus that lands under
 * it is scrolled clear. The kit's Toaster and TaskTray register themselves; `TableWrap` keeps its
 * sticky header clear on its own.
 */
export function useStickyLayer(ref: RefObject<HTMLElement | null>, { edge, enabled = true }: UseStickyLayerOptions): void {
  const registered = useRef<{ el: HTMLElement; edge: StickyEdge; release: () => void } | null>(null);
  // Every commit: the element can mount later than the hook (a portal) or be replaced.
  useIsomorphicLayoutEffect(() => {
    const el = enabled ? ref.current : null;
    const current = registered.current;
    if (current && current.el === el && current.edge === edge) return;
    current?.release();
    registered.current = el ? { el, edge, release: registerStickyLayer(el, edge) } : null;
  });
  useIsomorphicLayoutEffect(() => () => {
    registered.current?.release();
    registered.current = null;
  }, []);
}

const NO_INSETS = { top: 0, bottom: 0 } as const;

/**
 * How far the registered fixed layers reach in from the viewport's top and bottom edges, live
 * (`--uix-sticky-top` / `--uix-sticky-bottom` as numbers). A windowed list adds the bottom reach as
 * room after its last row, so that row can scroll clear of the layers.
 */
export function useStickyInsets(): { readonly top: number; readonly bottom: number } {
  return useSyncExternalStore(subscribeStickyInsets, getStickyInsets, () => NO_INSETS);
}
