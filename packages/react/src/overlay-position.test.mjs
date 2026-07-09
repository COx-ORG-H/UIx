/* Unit tests for the framework-agnostic overlay positioning engine (UIX-FIX-02).
 * Zero deps; Node strips the TS types on import (Node >= 22.18 / 24). Run: node --test
 * (from packages/react), or  npm test -w @tensor_1/react.
 *
 * These lock the flip/shift geometry the React hook (useAnchoredPosition) and the
 * vanilla styleguide both delegate to, so anchored overlays land identically across
 * browsers rather than relying on Chromium-only CSS anchor() positioning. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePosition } from './overlay-position.ts';

const VP = { width: 1000, height: 800 };

test('computePosition: bottom-start places below and left-aligned to the anchor', () => {
  const anchor = { x: 100, y: 100, width: 80, height: 30 };
  const r = computePosition(anchor, { width: 200, height: 120 }, VP, { placement: 'bottom-start', offset: 6 });
  assert.equal(r.side, 'bottom');
  assert.equal(r.y, 100 + 30 + 6); // just below the anchor
  assert.equal(r.x, 100);          // left edges aligned
  assert.equal(r.placement, 'bottom-start');
});

test('computePosition: a bare side centers on the cross axis', () => {
  const anchor = { x: 400, y: 100, width: 80, height: 30 };
  const r = computePosition(anchor, { width: 200, height: 100 }, VP, { placement: 'bottom' });
  assert.equal(r.align, 'center');
  assert.equal(r.x, 400 + (80 - 200) / 2); // centered on the anchor
  assert.equal(r.placement, 'bottom');
});

test('computePosition: bottom-end aligns right edges', () => {
  const anchor = { x: 300, y: 100, width: 120, height: 30 };
  const r = computePosition(anchor, { width: 200, height: 80 }, VP, { placement: 'bottom-end' });
  assert.equal(r.x, 300 + 120 - 200); // right edges aligned
  assert.equal(r.placement, 'bottom-end');
});

test('computePosition: flips to top when there is no room below', () => {
  const anchor = { x: 100, y: 720, width: 80, height: 30 }; // near the bottom edge
  const r = computePosition(anchor, { width: 200, height: 120 }, VP, { placement: 'bottom-start', offset: 6 });
  assert.equal(r.side, 'top');
  assert.equal(r.y, 720 - 120 - 6); // now above the anchor
  assert.equal(r.placement, 'top-start');
});

test('computePosition: flips to bottom when there is no room above', () => {
  const anchor = { x: 100, y: 20, width: 80, height: 30 };
  const r = computePosition(anchor, { width: 200, height: 120 }, VP, { placement: 'top-start', offset: 6 });
  assert.equal(r.side, 'bottom');
  assert.equal(r.y, 20 + 30 + 6);
});

test('computePosition: flip picks the roomier side when neither fully fits', () => {
  const shortVp = { width: 1000, height: 200 };
  const anchor = { x: 100, y: 120, width: 80, height: 30 }; // more room above (120) than below (~50)
  const r = computePosition(anchor, { width: 200, height: 300 }, shortVp, { placement: 'bottom-start' });
  assert.equal(r.side, 'top');
});

test('computePosition: shift clamps a right-overflowing overlay back into the viewport', () => {
  const anchor = { x: 950, y: 100, width: 40, height: 30 }; // hard against the right edge
  const r = computePosition(anchor, { width: 200, height: 80 }, VP, { placement: 'bottom-start', padding: 8 });
  assert.equal(r.x, 1000 - 200 - 8); // 792 — flush to the padded right edge, not off-screen at 950
  assert.equal(r.side, 'bottom');    // still below; shift is cross-axis only
});

test('computePosition: shift clamps a left-overflowing overlay to the left padding', () => {
  const anchor = { x: 4, y: 100, width: 40, height: 30 };
  const r = computePosition(anchor, { width: 200, height: 80 }, VP, { placement: 'bottom-end', padding: 8 });
  assert.equal(r.x, 8); // would be negative (right-aligned to a left-edge anchor) → clamped to padding
});

test('computePosition: an overlay wider than the viewport clamps to the padding (no negative x)', () => {
  const anchor = { x: 100, y: 100, width: 80, height: 30 };
  const r = computePosition(anchor, { width: 1200, height: 80 }, VP, { placement: 'bottom-start', padding: 8 });
  assert.equal(r.x, 8);
});

test('computePosition: left / right sides place on the main axis and align on the vertical cross axis', () => {
  const anchor = { x: 400, y: 300, width: 80, height: 40 };
  const right = computePosition(anchor, { width: 120, height: 60 }, VP, { placement: 'right', offset: 6 });
  assert.equal(right.x, 400 + 80 + 6);
  assert.equal(right.y, 300 + (40 - 60) / 2); // vertically centered
  const left = computePosition(anchor, { width: 120, height: 60 }, VP, { placement: 'left-start', offset: 6 });
  assert.equal(left.x, 400 - 120 - 6);
  assert.equal(left.y, 300); // top edges aligned
});

test('computePosition: flip disabled keeps the preferred side even when it overflows', () => {
  const anchor = { x: 100, y: 720, width: 80, height: 30 };
  const r = computePosition(anchor, { width: 200, height: 120 }, VP, { placement: 'bottom-start', flip: false });
  assert.equal(r.side, 'bottom'); // overflows, but not flipped
});

test('computePosition: shift disabled leaves the cross axis unclamped', () => {
  const anchor = { x: 950, y: 100, width: 40, height: 30 };
  const r = computePosition(anchor, { width: 200, height: 80 }, VP, { placement: 'bottom-start', shift: false });
  assert.equal(r.x, 950); // off-screen, but shift was turned off
});
