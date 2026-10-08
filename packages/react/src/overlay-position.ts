/**
 * uix overlay positioning — framework-agnostic, dependency-free anchored placement.
 *
 * Pure geometry (no DOM): given the anchor's rect, the floating element's size, and
 * the viewport, compute where to put the floating element with two behaviours:
 *   • flip  — if the preferred side doesn't fit, use the opposite side (or whichever
 *             side has more room);
 *   • shift — slide along the cross axis so the element stays within the viewport.
 *
 * The React hook (useAnchoredPosition) and the vanilla styleguide both feed this
 * getBoundingClientRect() values, so anchored overlays land in the same place in every
 * browser — instead of relying on CSS anchor() positioning, which is Chromium-only and
 * silently detaches the overlay from its trigger everywhere else (UIX-FIX-02).
 *
 * Everything here is deterministic and unit-tested (see overlay-position.test.mjs).
 */

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';
export type Placement = Side | `${Side}-${Align}`;

/** A viewport-space rectangle, as returned by getBoundingClientRect(). */
export interface Rect { x: number; y: number; width: number; height: number; }
export interface Size { width: number; height: number; }

export interface PositionOptions {
  /** Preferred placement. Default `'bottom-start'`; a bare side (e.g. `'top'`) centers on the cross axis. */
  placement?: Placement;
  /** Gap between the anchor and the floating element, in px. Default 6. */
  offset?: number;
  /** Minimum gap kept from each viewport edge when shifting, in px. Default 8. */
  padding?: number;
  /** Flip to the opposite side when the preferred one doesn't fit. Default true. */
  flip?: boolean;
  /** Slide along the cross axis to stay on-screen. Default true. */
  shift?: boolean;
  /**
   * Also keep the element inside the viewport on the main axis (the side it hangs off) when it
   * fits on neither side; it then covers part of the anchor instead of leaving the viewport.
   * Not applied once the anchor itself is outside the viewport on that axis: the element then
   * follows its anchor out, as an element that fits does. Default true.
   */
  shiftMainAxis?: boolean;
  /**
   * The side the element is already on, while it stays open. It is kept unless it no longer
   * fits AND the opposite side does, so a size change or a small scroll never flips an open
   * overlay back and forth. Ignored when it is not on `placement`'s axis. Unset = decide from
   * `placement` alone (an overlay that is opening).
   */
  stickySide?: Side;
}

export interface PositionResult {
  /** Viewport-space left, for `position: fixed`. */
  x: number;
  /** Viewport-space top, for `position: fixed`. */
  y: number;
  /** The placement actually used (after any flip). */
  placement: Placement;
  side: Side;
  align: Align;
  /**
   * The main-axis coordinate (`y` for top/bottom, `x` for left/right) before the main-axis
   * shift: flush against the anchor. Equal to `y` / `x` when nothing was shifted.
   */
  mainAxisNatural: number;
  /**
   * The `[min, max]` the main-axis coordinate is kept in, or `null` when the main-axis shift is
   * off or the anchor has left the viewport. `min === max` for an element larger than the
   * viewport: it starts at the padding and has to be capped or scrolled.
   */
  mainAxisRange: [number, number] | null;
  /** Largest size that fits the viewport inside the padding: the cap for an oversized element. */
  available: Size;
}

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

function parsePlacement(p: Placement): { side: Side; align: Align } {
  const [side, align] = p.split('-') as [Side, Align | undefined];
  return { side, align: align ?? 'center' }; // a bare side centers on the cross axis
}

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

/** Free space (px) between the anchor and the viewport edge on a given side, minus the offset. */
function spaceOn(side: Side, a: Rect, vp: Size, offset: number): number {
  switch (side) {
    case 'top':    return a.y - offset;
    case 'bottom': return vp.height - (a.y + a.height) - offset;
    case 'left':   return a.x - offset;
    case 'right':  return vp.width - (a.x + a.width) - offset;
  }
}

/** Does the floating element fit on `side` without overflowing the viewport (accounting for padding)? */
function fitsOn(side: Side, a: Rect, f: Size, vp: Size, offset: number, padding: number): boolean {
  const need = side === 'top' || side === 'bottom' ? f.height : f.width;
  return spaceOn(side, a, vp, offset) >= need + padding;
}

/**
 * Compute the floating element's viewport-space position anchored to `anchor`.
 * Coordinates are for `position: fixed` (same space as getBoundingClientRect).
 */
export function computePosition(anchor: Rect, floating: Size, viewport: Size, options: PositionOptions = {}): PositionResult {
  const { placement = 'bottom-start', offset = 6, padding = 8, flip = true, shift = true, shiftMainAxis = true, stickySide } = options;
  const { side: preferred, align } = parsePlacement(placement);

  // 1. flip
  let side = preferred;
  const sticky = stickySide === preferred || stickySide === OPPOSITE[preferred] ? stickySide : undefined;
  if (flip && sticky) {
    // already open: stay put while the current side fits, or while the other side is no better
    side = sticky;
    const opp = OPPOSITE[side];
    if (!fitsOn(side, anchor, floating, viewport, offset, padding) && fitsOn(opp, anchor, floating, viewport, offset, padding)) side = opp;
  } else if (flip && !fitsOn(side, anchor, floating, viewport, offset, padding)) {
    // opening: keep the preferred side unless it doesn't fit and the opposite side is better
    const opp = OPPOSITE[side];
    if (fitsOn(opp, anchor, floating, viewport, offset, padding) || spaceOn(opp, anchor, viewport, offset) > spaceOn(side, anchor, viewport, offset)) {
      side = opp;
    }
  }

  // 2. main axis — place the element just outside the anchor on the chosen side
  let x: number, y: number;
  const horizontal = side === 'top' || side === 'bottom'; // cross axis runs left↔right

  if (side === 'top') y = anchor.y - floating.height - offset;
  else if (side === 'bottom') y = anchor.y + anchor.height + offset;
  else if (side === 'left') x = anchor.x - floating.width - offset;
  else /* right */ x = anchor.x + anchor.width + offset;

  // 3. cross axis — align start / center / end to the anchor
  if (horizontal) {
    const start = anchor.x;
    const end = anchor.x + anchor.width - floating.width;
    const center = anchor.x + (anchor.width - floating.width) / 2;
    x = align === 'start' ? start : align === 'end' ? end : center;
    if (shift) x = clamp(x, padding, Math.max(padding, viewport.width - floating.width - padding));
  } else {
    const start = anchor.y;
    const end = anchor.y + anchor.height - floating.height;
    const center = anchor.y + (anchor.height - floating.height) / 2;
    y = align === 'start' ? start : align === 'end' ? end : center;
    if (shift) y = clamp(y, padding, Math.max(padding, viewport.height - floating.height - padding));
  }

  // 4. main axis � an element that fits on neither side slides over the anchor to stay on-screen
  const mainAxisNatural = horizontal ? y! : x!;
  const anchorInView = horizontal
    ? anchor.y + anchor.height > 0 && anchor.y < viewport.height
    : anchor.x + anchor.width > 0 && anchor.x < viewport.width;
  let mainAxisRange: [number, number] | null = null;
  if (shiftMainAxis && anchorInView) {
    const extent = horizontal ? viewport.height - floating.height : viewport.width - floating.width;
    mainAxisRange = [padding, Math.max(padding, extent - padding)];
    if (horizontal) y = clamp(y!, mainAxisRange[0], mainAxisRange[1]);
    else x = clamp(x!, mainAxisRange[0], mainAxisRange[1]);
  }

  return {
    x: x!,
    y: y!,
    placement: (align === 'center' ? side : `${side}-${align}`) as Placement,
    side,
    align,
    mainAxisNatural,
    mainAxisRange,
    available: {
      width: Math.max(0, viewport.width - 2 * padding),
      height: Math.max(0, viewport.height - 2 * padding),
    },
  };
}
