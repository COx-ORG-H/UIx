/**
 * uix overlay positioner — framework-agnostic, dependency-free collision math for
 * anchored overlays (popover / menu / select / tooltip). Pure functions only (no DOM),
 * so the same core drives the React hook (useOverlayPosition), the vanilla styleguide,
 * and any consumer. Deterministic and unit-tested (see overlay-position.test.mjs).
 *
 * Why this exists: the overlays were positioned with CSS anchor positioning
 * (`anchor()` / `position-anchor`), which is Chromium-only and has no collision
 * fallback — on Firefox/Safari they detach from the trigger, and at a viewport edge
 * they clip. This computes a flipped/shifted, in-viewport placement in plain JS that
 * a caller applies as `position: fixed; left; top` on a top-layer element.
 */

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';

/** A rectangle in viewport coordinates (matches DOMRect / getBoundingClientRect). */
export interface Rect { x: number; y: number; width: number; height: number; }
export interface Size { width: number; height: number; }

export interface PositionOptions {
  /** preferred side of the anchor to place the overlay on (default 'bottom'). */
  side?: Side;
  /** cross-axis alignment to the anchor (default 'start'). */
  align?: Align;
  /** gap between anchor and overlay, px (default 6). */
  gap?: number;
  /** minimum distance to keep from the viewport edge, px (default 8). */
  padding?: number;
  /** flip to the opposite side when the preferred side lacks room (default true). */
  flip?: boolean;
  /** shift/clamp along the cross axis to stay in the viewport (default true). */
  shift?: boolean;
}

export interface PositionResult {
  x: number;
  y: number;
  /** the side actually used (may differ from the requested side after a flip). */
  side: Side;
  align: Align;
}

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
const isVertical = (s: Side): boolean => s === 'top' || s === 'bottom';

/** Cross-axis start coordinate for an alignment against the anchor's cross extent. */
function alignStart(align: Align, anchorStart: number, anchorSize: number, overlaySize: number): number {
  if (align === 'center') return anchorStart + anchorSize / 2 - overlaySize / 2;
  if (align === 'end') return anchorStart + anchorSize - overlaySize;
  return anchorStart; // 'start'
}

/**
 * Compute an in-viewport, anchor-attached position for an overlay. Returns the
 * top-left `{x, y}` (viewport coords, for `position: fixed`) plus the resolved
 * `side` — which may differ from the requested side after a flip. Deterministic:
 * no DOM reads, so callers pass measured rects and apply the result.
 */
export function computePosition(anchor: Rect, overlay: Size, viewport: Size, opts: PositionOptions = {}): PositionResult {
  const side0 = opts.side ?? 'bottom';
  const align = opts.align ?? 'start';
  const gap = opts.gap ?? 6;
  const padding = opts.padding ?? 8;
  const doFlip = opts.flip ?? true;
  const doShift = opts.shift ?? true;

  // ── main-axis flip: switch to the opposite side only when the preferred side
  //    lacks room AND the opposite side has more. ────────────────────────────────
  let side = side0;
  if (doFlip) {
    if (isVertical(side0)) {
      const below = viewport.height - (anchor.y + anchor.height) - gap - padding;
      const above = anchor.y - gap - padding;
      if (side0 === 'bottom' && overlay.height > below && above > below) side = 'top';
      else if (side0 === 'top' && overlay.height > above && below > above) side = 'bottom';
    } else {
      const right = viewport.width - (anchor.x + anchor.width) - gap - padding;
      const left = anchor.x - gap - padding;
      if (side0 === 'right' && overlay.width > right && left > right) side = 'left';
      else if (side0 === 'left' && overlay.width > left && right > left) side = 'right';
    }
  }

  // ── main-axis placement for the chosen side. ──────────────────────────────────
  let x = 0;
  let y = 0;
  if (side === 'bottom') y = anchor.y + anchor.height + gap;
  else if (side === 'top') y = anchor.y - gap - overlay.height;
  else if (side === 'right') x = anchor.x + anchor.width + gap;
  else /* left */ x = anchor.x - gap - overlay.width;

  // ── cross-axis alignment. ─────────────────────────────────────────────────────
  if (isVertical(side)) x = alignStart(align, anchor.x, anchor.width, overlay.width);
  else y = alignStart(align, anchor.y, anchor.height, overlay.height);

  // ── shift/clamp both axes to keep the whole box inside the viewport padding.
  //    (clamp(min,max) with min > max — overlay bigger than viewport — returns the
  //    padding edge, so an oversized overlay pins to the top-left rather than
  //    vanishing off-screen.) ─────────────────────────────────────────────────────
  if (doShift) {
    x = clamp(x, padding, viewport.width - overlay.width - padding);
    y = clamp(y, padding, viewport.height - overlay.height - padding);
  }

  return { x: Math.round(x), y: Math.round(y), side, align };
}
