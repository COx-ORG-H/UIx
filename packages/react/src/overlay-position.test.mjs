/* Unit tests for the framework-agnostic overlay positioner. Zero deps; Node strips
 * the TS types on import (Node >= 22.18 / 24). Run: node --test  (from packages/react).
 *
 * These lock the collision math (flip on the main axis, shift/clamp on the cross axis)
 * that the React hook AND the vanilla styleguide both delegate to (UIX-FIX-02), so an
 * anchored overlay stays in-viewport and attached across browsers without CSS anchor
 * positioning. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePosition } from './overlay-position.ts';

const VP = { width: 1000, height: 800 };

test('computePosition: places below-start with a gap when it fits (no flip/shift)', () => {
  const r = computePosition({ x: 100, y: 100, width: 80, height: 30 }, { width: 200, height: 150 }, VP);
  assert.deepEqual(r, { x: 100, y: 136, side: 'bottom', align: 'start' }); // y = 100+30+6
});

test('computePosition: flips bottom → top when there is no room below', () => {
  // anchor near the bottom edge; a 150-tall overlay cannot fit in the sliver below it
  const r = computePosition({ x: 100, y: 720, width: 80, height: 30 }, { width: 200, height: 150 }, VP, { gap: 6, padding: 8 });
  assert.equal(r.side, 'top');
  assert.equal(r.y, 720 - 6 - 150); // 564, above the anchor
});

test('computePosition: flips top → bottom when there is no room above', () => {
  const r = computePosition({ x: 100, y: 40, width: 80, height: 30 }, { width: 200, height: 150 }, VP, { side: 'top' });
  assert.equal(r.side, 'bottom');
  assert.equal(r.y, 40 + 30 + 6); // 76
});

test('computePosition: does not flip when the preferred side fits, even if the other side is roomier', () => {
  // room below (170) is less than room above but still enough for a 120-tall overlay → stay
  const r = computePosition({ x: 100, y: 600, width: 80, height: 30 }, { width: 200, height: 120 }, VP, { side: 'bottom' });
  assert.equal(r.side, 'bottom');
});

test('computePosition: shifts left to stay in-viewport when the overlay overflows the right edge', () => {
  // anchor.x=900, overlay 200 wide → start would be 900; clamp to 1000-200-8 = 792
  const r = computePosition({ x: 900, y: 100, width: 80, height: 30 }, { width: 200, height: 100 }, VP, { padding: 8 });
  assert.equal(r.x, 792);
  assert.equal(r.side, 'bottom');
});

test('computePosition: shifts right to stay in-viewport when the overlay overflows the left edge', () => {
  // align:end pulls the overlay left of the viewport; clamp back to padding (8)
  const r = computePosition({ x: 10, y: 100, width: 40, height: 30 }, { width: 200, height: 100 }, VP, { align: 'end', padding: 8 });
  assert.equal(r.x, 8);
});

test('computePosition: align center/end position the cross axis relative to the anchor', () => {
  const center = computePosition({ x: 400, y: 100, width: 100, height: 30 }, { width: 60, height: 40 }, VP, { align: 'center' });
  assert.equal(center.x, 420); // 400 + 100/2 - 60/2
  const end = computePosition({ x: 400, y: 100, width: 100, height: 30 }, { width: 60, height: 40 }, VP, { align: 'end' });
  assert.equal(end.x, 440); // 400 + 100 - 60
});

test('computePosition: side:right places to the right; flips to left near the right edge', () => {
  const right = computePosition({ x: 100, y: 100, width: 80, height: 30 }, { width: 120, height: 60 }, VP, { side: 'right' });
  assert.equal(right.side, 'right');
  assert.equal(right.x, 100 + 80 + 6); // 186
  const flipped = computePosition({ x: 860, y: 100, width: 80, height: 30 }, { width: 120, height: 60 }, VP, { side: 'right' });
  assert.equal(flipped.side, 'left');
  assert.equal(flipped.x, 860 - 6 - 120); // 734
});

test('computePosition: an overlay larger than the viewport clamps to the padding edge (stays visible)', () => {
  const r = computePosition({ x: 100, y: 100, width: 80, height: 30 }, { width: 1200, height: 100 }, VP, { padding: 8 });
  assert.equal(r.x, 8); // pinned to the left padding rather than pushed off-screen
});

test('computePosition: main-axis clamps onto the screen when neither side fully fits', () => {
  // overlay taller than the viewport minus padding: keep its top edge at the padding line
  const r = computePosition({ x: 100, y: 400, width: 80, height: 30 }, { width: 200, height: 900 }, VP, { padding: 8 });
  assert.equal(r.y, 8);
});

test('computePosition: flip:false honors the requested side even when it overflows', () => {
  const r = computePosition({ x: 100, y: 760, width: 80, height: 30 }, { width: 200, height: 150 }, VP, { flip: false, shift: false });
  assert.equal(r.side, 'bottom');
  assert.equal(r.y, 760 + 30 + 6); // 796 — not flipped, not clamped
});

test('computePosition: custom gap and integer rounding', () => {
  const r = computePosition({ x: 100.4, y: 100.6, width: 80, height: 30.2 }, { width: 200, height: 100 }, VP, { gap: 12 });
  assert.equal(r.y, Math.round(100.6 + 30.2 + 12)); // 143
  assert.equal(Number.isInteger(r.x) && Number.isInteger(r.y), true);
});
