"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { computePosition } from '../overlay-position.js';
import type { Placement, PositionResult, Side } from '../overlay-position.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

export interface UseAnchoredPositionOptions {
  /** Reposition while true, and (re)attach scroll/resize listeners. */
  open: boolean;
  placement?: Placement;
  offset?: number;
  padding?: number;
  /**
   * Keep the element inside the viewport on the side it hangs off as well: when it fits neither
   * above nor below (or left nor right) it slides over the anchor instead of leaving the
   * viewport. Once the anchor itself has left the viewport the element follows it out; pair
   * that with `onAnchorHidden` to close it. Default true.
   */
  shiftMainAxis?: boolean;
  /**
   * Cap the element's height to the viewport minus the padding on both edges, and let it scroll
   * (`overflow-y: auto`, unless its own CSS already sets an overflow). A `max-height` from the
   * element's own CSS still applies when it is smaller. Default false.
   */
  capHeight?: boolean;
  /**
   * Called when the anchor has scrolled completely out of view (outside the viewport or a
   * clipping ancestor) while `open`. Close the overlay here; `Popover closeWhenAnchorHidden`
   * is built on it.
   */
  onAnchorHidden?: () => void;
}

type AnchorArg = RefObject<HTMLElement | null> | HTMLElement | null | undefined;

/** @internal The element behind an anchor ref or element. */
export const resolveAnchor = (a: AnchorArg): HTMLElement | null =>
  a && typeof a === 'object' && 'current' in a ? a.current : (a ?? null);

let anchoringSupported: boolean | undefined;
/**
 * CSS anchor positioning with a default anchor (`position-anchor` + `anchor()` in `round()`).
 * Chromium 125+, Safari 26+. jsdom and older engines keep the fixed left/top path.
 */
function supportsAnchoring(): boolean {
  if (anchoringSupported === undefined) {
    try {
      const css = typeof CSS !== 'undefined' ? CSS : undefined;
      anchoringSupported = !!css && typeof css.supports === 'function'
        && css.supports('anchor-name', '--uix-a')
        && css.supports('position-anchor', '--uix-a')
        && css.supports('top', 'round(anchor(bottom) + 1px, 1px)');
    } catch {
      anchoringSupported = false;
    }
  }
  return anchoringSupported;
}

/**
 * How close (px) the flush position may come to the viewport limit before the element is
 * placed with fixed coordinates instead of anchor positioning (HAR-1613).
 *
 * An anchor-positioned box is moved with its anchor by the compositor, AFTER its `top` / `left`
 * were resolved — so no value, not even `max(8px, min(anchor(), …))`, can hold it inside the
 * viewport while the page scrolls; only the next scroll handler can, one frame late. A box with
 * fixed coordinates cannot move between two writes at all. So a box that is held at the limit,
 * or within this band of it, is written as fixed coordinates, and anchoring is used only where
 * there is room for a frame of scrolling.
 */
const ANCHOR_BAND = 64;

let anchorCount = 0;
const namesOf = (value: string): string[] =>
  value.split(',').map((n) => n.trim()).filter((n) => n.startsWith('--'));

/** Add `name` to the element's anchor names, keeping any it already has. */
function addAnchorName(el: HTMLElement, name: string): void {
  const names = namesOf(getComputedStyle(el).getPropertyValue('anchor-name'));
  if (!names.includes(name)) names.push(name);
  el.style.setProperty('anchor-name', names.join(', '));
}

function removeAnchorName(el: HTMLElement, name: string): void {
  const names = namesOf(el.style.getPropertyValue('anchor-name')).filter((n) => n !== name);
  if (names.length) el.style.setProperty('anchor-name', names.join(', '));
  else el.style.removeProperty('anchor-name');
}

/** The element's own CSS translation (its enter/exit motion), so a measurement can discount it. */
function translationOf(el: HTMLElement): { x: number; y: number } {
  const t = getComputedStyle(el).transform;
  if (!t || t === 'none' || typeof DOMMatrixReadOnly === 'undefined') return { x: 0, y: 0 };
  try {
    const m = new DOMMatrixReadOnly(t);
    return { x: m.m41, y: m.m42 };
  } catch {
    return { x: 0, y: 0 };
  }
}

const signed = (n: number): string => `${n < 0 ? '-' : '+'} ${Math.round(Math.abs(n) * 100) / 100}px`;

interface Anchoring {
  anchor: HTMLElement;
  name: string;
  /** The anchor edges the floating element hangs off, and its offset from each. */
  yEdge: 'top' | 'bottom';
  xEdge: 'left' | 'right';
  dy: number;
  dx: number;
  /** Checked once per open that the browser really put the element where the engine said. */
  verified: boolean;
}

/** Floating elements whose UA inset/margin were already replaced by our fixed box. */
const prepared = new WeakSet<HTMLElement>();

/** What `capHeight` replaced on the element, to give back when the overlay closes. */
interface HeightCap {
  inlineMaxHeight: string;
  inlineOverflowY: string;
  /** The element's own CSS max-height, which still applies when it is the smaller one. */
  ownMaxHeight: string;
  setOverflow: boolean;
  written: string;
}

/**
 * Position a floating element (a native-popover overlay) against an anchor with
 * cross-browser flip/shift — the DOM half of the overlay-position engine (UIX-FIX-02).
 *
 * The engine decides the side, alignment and viewport clamp from getBoundingClientRect.
 * Where the browser supports CSS anchor positioning, that result is written as an offset
 * from the anchor (`position-anchor` + `anchor()`), so the browser keeps the overlay glued
 * to its anchor while the page scrolls, with no frame of lag; elsewhere it is written as
 * `position: fixed` + left/top and follows scroll/resize from JS. While `open`, the side
 * chosen at open is kept until it no longer fits and the other side does, scrolls inside
 * the overlay itself are ignored, and a size change of either element re-places it.
 * An element that fits on neither side is kept inside the viewport (it covers the anchor).
 * While it is held there, or within `ANCHOR_BAND` of the limit, it is written as fixed
 * coordinates even where anchor positioning exists: those cannot drift while the page scrolls,
 * so it is inside on every frame, not one frame later (HAR-1613).
 * Returns a `reposition` fn for callers that want to nudge it manually (e.g. right when a
 * native popover's `toggle` fires).
 */
export function useAnchoredPosition(
  anchor: RefObject<HTMLElement | null> | HTMLElement | null | undefined,
  floatingRef: RefObject<HTMLElement | null>,
  { open, placement = 'bottom-start', offset = 6, padding = 8, shiftMainAxis = true, capHeight = false, onAnchorHidden }: UseAnchoredPositionOptions,
): () => void {
  // keep latest options in a ref so `reposition`'s identity is stable across renders
  const opts = useRef({ placement, offset, padding, shiftMainAxis, capHeight });
  opts.current = { placement, offset, padding, shiftMainAxis, capHeight };
  const onAnchorHiddenRef = useRef(onAnchorHidden);
  onAnchorHiddenRef.current = onAnchorHidden;
  const heightCap = useRef<HeightCap | null>(null);
  /** True between the open effect and its cleanup: only then does a result become sticky. */
  const session = useRef(false);
  /** The side of the current open session: kept while it fits (hysteresis, no flip-flop). */
  const side = useRef<Side | null>(null);
  /** The last inline position written, so an unchanged result writes nothing. */
  const written = useRef('');
  const anchoring = useRef<Anchoring | null>(null);
  /** Anchor positioning did not land where expected this session: use the fixed path. */
  const anchoringFailed = useRef(false);
  const anchorName = useRef('');

  /** Stop anchoring; with `keepPlace`, pin the element where it is now as fixed left/top. */
  const release = useCallback((keepPlace: boolean) => {
    const current = anchoring.current;
    if (!current) return;
    anchoring.current = null;
    written.current = '';
    const floating = floatingRef.current;
    if (floating) {
      const s = floating.style;
      if (keepPlace && current.anchor.isConnected) {
        // e.g. while the exit fade runs: stay put instead of dropping to a static position
        const a = current.anchor.getBoundingClientRect();
        s.top = `${Math.round((current.yEdge === 'bottom' ? a.bottom : a.top) + current.dy)}px`;
        s.left = `${Math.round((current.xEdge === 'right' ? a.right : a.left) + current.dx)}px`;
      }
      s.removeProperty('position-anchor');
    }
    removeAnchorName(current.anchor, current.name);
  }, [floatingRef]);

  /** Give back the max-height / overflow that `capHeight` wrote. */
  const uncap = useCallback(() => {
    const cap = heightCap.current;
    if (!cap) return;
    heightCap.current = null;
    const floating = floatingRef.current;
    if (!floating) return;
    floating.style.maxHeight = cap.inlineMaxHeight;
    if (cap.setOverflow) floating.style.overflowY = cap.inlineOverflowY;
  }, [floatingRef]);

  const reposition = useCallback(() => {
    const anchorEl = resolveAnchor(anchor);
    const floating = floatingRef.current;
    if (!anchorEl || !floating) return;
    const s = floating.style;
    if (!prepared.has(floating)) {
      // Once: replace a native popover's UA default (inset:0; margin:auto, centred in the
      // viewport) with a fixed box we place. Measure after this, never before.
      s.position = 'fixed';
      s.inset = 'auto';
      s.margin = '0';
      prepared.add(floating);
      written.current = '';
    }
    const { placement: p, offset: o, padding: pad, shiftMainAxis: keepInView, capHeight: cap } = opts.current;
    if (cap) {
      // Before measuring: the height that gets placed is the capped one.
      if (!heightCap.current) {
        const own = getComputedStyle(floating);
        const setOverflow = !own.overflowY || own.overflowY === 'visible';
        heightCap.current = {
          inlineMaxHeight: s.maxHeight,
          inlineOverflowY: s.overflowY,
          ownMaxHeight: own.maxHeight && own.maxHeight !== 'none' ? own.maxHeight : '',
          setOverflow,
          written: '',
        };
        if (setOverflow) s.overflowY = 'auto';
      }
      const room = `${Math.max(0, window.innerHeight - 2 * pad)}px`;
      const max = heightCap.current.ownMaxHeight ? `min(${room}, ${heightCap.current.ownMaxHeight})` : room;
      if (max !== heightCap.current.written) {
        s.maxHeight = max;
        heightCap.current.written = max;
      }
    } else if (heightCap.current) {
      uncap();
    }
    const a = anchorEl.getBoundingClientRect();
    const size = { width: floating.offsetWidth, height: floating.offsetHeight };
    const pos = computePosition(
      { x: a.x, y: a.y, width: a.width, height: a.height },
      size,
      { width: window.innerWidth, height: window.innerHeight },
      { placement: p, offset: o, padding: pad, shiftMainAxis: keepInView, stickySide: side.current ?? undefined },
    );
    // A hidden element measures 0 × 0; a pre-open call (a popover's toggle, before its
    // content rendered) is not the open decision either. Neither may become sticky.
    const measured = size.width > 0 || size.height > 0;
    if (measured && session.current) side.current = pos.side;
    if (floating.dataset.placement !== pos.placement) floating.dataset.placement = pos.placement;

    const writeFixed = (at: PositionResult) => {
      const left = `${Math.round(at.x)}px`;
      const top = `${Math.round(at.y)}px`;
      const key = `fixed ${left} ${top}`;
      if (key === written.current) return;
      s.left = left;
      s.top = top;
      written.current = key;
    };

    // Held at the viewport limit, or close enough that one frame of scrolling could carry it
    // across: fixed coordinates (see ANCHOR_BAND). `mainAxisRange` is null once the anchor has
    // left the viewport, where the element is meant to follow it out.
    const limit = pos.mainAxisRange;
    const nearLimit = limit !== null
      && (pos.mainAxisNatural < limit[0] + ANCHOR_BAND || pos.mainAxisNatural > limit[1] - ANCHOR_BAND);

    if (anchoringFailed.current || nearLimit || !supportsAnchoring()) {
      // position-anchor has to go too: with it set, Chromium offsets even a plain px inset.
      if (anchoring.current) release(false);
      writeFixed(pos);
      return;
    }

    if (anchoring.current && anchoring.current.anchor !== anchorEl) release(false);
    if (!anchoring.current) {
      anchorName.current ||= `--uix-anchor-${++anchorCount}`;
      addAnchorName(anchorEl, anchorName.current);
      s.setProperty('position-anchor', anchorName.current);
      anchoring.current = { anchor: anchorEl, name: anchorName.current, yEdge: 'bottom', xEdge: 'left', dy: 0, dx: 0, verified: false };
      written.current = '';
    }
    const current = anchoring.current;
    current.yEdge = pos.side === 'bottom' ? 'bottom' : 'top';
    current.xEdge = pos.side === 'right' ? 'right' : 'left';
    current.dy = pos.y - (current.yEdge === 'bottom' ? a.bottom : a.top);
    current.dx = pos.x - (current.xEdge === 'right' ? a.right : a.left);
    // round() lands on the same whole pixel as the fixed path's Math.round.
    const top = `round(anchor(${current.yEdge}) ${signed(current.dy)}, 1px)`;
    const left = `round(anchor(${current.xEdge}) ${signed(current.dx)}, 1px)`;
    const key = `anchored ${top} ${left}`;
    if (key !== written.current) {
      s.top = top;
      s.left = left;
      written.current = key;
    }

    if (!current.verified && measured) {
      // Once per open, check the browser really anchored it: an unusual anchor (display:
      // contents, a skipped subtree, a different containing block) makes anchor() invalid and
      // drops the box to its static position. Compare centres, discounting the element's own
      // enter motion (a translate, or a scale about the centre).
      current.verified = true;
      const box = floating.getBoundingClientRect();
      const t = translationOf(floating);
      const dxc = box.left + box.width / 2 - t.x - (pos.x + size.width / 2);
      const dyc = box.top + box.height / 2 - t.y - (pos.y + size.height / 2);
      if (Math.abs(dxc) > 2 || Math.abs(dyc) > 2) {
        anchoringFailed.current = true;
        release(false);
        writeFixed(pos);
      }
    }
  }, [anchor, floatingRef, release, uncap]);

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    session.current = true;
    reposition();
    const anchorEl = resolveAnchor(anchor);
    const floating = floatingRef.current;
    // capture:true catches scrolls in any nested scroll container, not just the window. Only a
    // scroll that can move the anchor matters: the overlay's own content scrolling (the emoji
    // grid, a long menu) must never re-place it.
    const onScroll = (event: Event) => {
      const target = event.target as Node | null;
      if (target && typeof target.contains === 'function') {
        if (floating?.contains(target)) return;
        if (anchorEl && !target.contains(anchorEl)) return;
      }
      reposition();
    };
    const onResize = () => reposition();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onResize);
    // Content that loads or changes after open, and an anchor that changes size, re-place it.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => reposition()) : null;
    if (floating) observer?.observe(floating);
    if (anchorEl) observer?.observe(anchorEl);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      // The session is over: the next open decides its side from scratch and may try anchoring again.
      session.current = false;
      side.current = null;
      anchoringFailed.current = false;
      release(true);
      uncap();
    };
  }, [open, reposition, anchor, floatingRef, release, uncap]);

  const watchAnchor = open && !!onAnchorHidden;
  useEffect(() => {
    const anchorEl = resolveAnchor(anchor);
    if (!watchAnchor || !anchorEl || typeof IntersectionObserver !== 'function') return;
    // The implicit root is the viewport, clipped by every overflow ancestor of the anchor.
    const observer = new IntersectionObserver((entries) => {
      const latest = entries[entries.length - 1];
      if (latest && !latest.isIntersecting) onAnchorHiddenRef.current?.();
    });
    observer.observe(anchorEl);
    return () => observer.disconnect();
  }, [watchAnchor, anchor]);

  // Unmount: take our anchor name off an anchor that outlives the overlay.
  useEffect(() => () => release(false), [release]);

  return reposition;
}
