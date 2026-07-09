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
  const { placement = 'bottom-start', offset = 6, padding = 8, flip = true, shift = true } = options;
  const { side: preferred, align } = parsePlacement(placement);

  // 1. flip — keep the preferred side unless it doesn't fit and the opposite side is better
  let side = preferred;
  if (flip && !fitsOn(side, anchor, floating, viewport, offset, padding)) {
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

  return {
    x: x!,
    y: y!,
    placement: (align === 'center' ? side : `${side}-${align}`) as Placement,
    side,
    align,
  };
}
