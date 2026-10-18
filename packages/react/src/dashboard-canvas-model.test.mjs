/* TENSOR HAR-1823 — the DashboardCanvas model: placement in grid units on twelve columns, the
 * push-down that keeps items from overlapping, the keyboard steps the item menu calls, and the
 * reading order the canvas collapses to on a narrow screen. Renders nothing; runs against the
 * BUILT dist — run `npm run build` first; CI does. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DASHBOARD_CANVAS_COLUMNS,
  canvasItemsOverlap,
  canvasMoveTarget,
  canvasReadingOrder,
  canvasResizeTarget,
  canvasRowCount,
  clampCanvasItem,
  compactCanvas,
  moveCanvasItem,
  normalizeCanvas,
  placeCanvasItem,
  resizeCanvasItem,
} from '../dist/dashboard-canvas-model.js';

const at = (id, col, row, w, h, extra = {}) => ({ id, col, row, w, h, ...extra });
const pos = (items) => Object.fromEntries(items.map(({ id, col, row, w, h }) => [id, [col, row, w, h]]));
const noOverlap = (items) => {
  for (const a of items) for (const b of items) assert.equal(canvasItemsOverlap(a, b), false, `${a.id} overlaps ${b.id}`);
};

test('twelve columns', () => {
  assert.equal(DASHBOARD_CANVAS_COLUMNS, 12);
});

test('clampCanvasItem keeps an item inside the columns and its own limits', () => {
  assert.deepEqual(pos([clampCanvasItem(at('a', 10, 0, 4, 2))]), { a: [8, 0, 4, 2] });
  assert.deepEqual(pos([clampCanvasItem(at('a', -3, -1, 20, 0))]), { a: [0, 0, 12, 1] });
  assert.deepEqual(pos([clampCanvasItem(at('a', 0, 0, 2, 9, { minW: 4, maxH: 3 }))]), { a: [0, 0, 4, 3] });
  assert.deepEqual(pos([clampCanvasItem(at('a', 1.4, 2.6, 3.5, 1.2))]), { a: [1, 3, 4, 1] });
  // A maximum below the minimum (an untyped caller) is raised to it: the minimum wins.
  assert.deepEqual(pos([clampCanvasItem(at('a', 0, 0, 3, 1, { minW: 8, maxW: 4 }))]), { a: [0, 0, 8, 1] });
  // An item already valid comes back as the same object.
  const valid = at('a', 0, 0, 4, 2);
  assert.equal(clampCanvasItem(valid), valid);
});

test('placeCanvasItem pushes what it lands on down, in reading order, and leaves the rest', () => {
  const items = [at('a', 0, 0, 6, 2), at('b', 6, 0, 6, 2), at('c', 0, 2, 12, 1)];
  const next = placeCanvasItem(items, 'b', { col: 0, row: 0 });
  // b takes a's place; a goes below b; c, now under a, goes below a.
  assert.deepEqual(pos(next), { a: [0, 2, 6, 2], b: [0, 0, 6, 2], c: [0, 4, 12, 1] });
  noOverlap(next);
  // The input order is kept, and an unknown id changes nothing.
  assert.deepEqual(next.map((item) => item.id), ['a', 'b', 'c']);
  assert.deepEqual(pos(placeCanvasItem(items, 'zz', { col: 3 })), pos(items));
});

test('a free canvas keeps the gaps a person leaves', () => {
  const items = [at('a', 0, 0, 4, 1), at('b', 4, 0, 4, 1)];
  assert.deepEqual(pos(placeCanvasItem(items, 'b', { row: 5 })), { a: [0, 0, 4, 1], b: [4, 5, 4, 1] });
});

test('keyboard moves step one cell and stop at the edges', () => {
  const items = [at('a', 0, 0, 4, 2), at('b', 0, 2, 4, 2)];
  assert.deepEqual(pos(moveCanvasItem(items, 'a', 'right')), { a: [1, 0, 4, 2], b: [0, 2, 4, 2] });
  assert.equal(canvasMoveTarget(items[0], 'left'), null);
  assert.equal(canvasMoveTarget(items[0], 'up'), null);
  assert.equal(canvasMoveTarget(at('r', 8, 0, 4, 1), 'right'), null);
  assert.deepEqual(pos(moveCanvasItem(items, 'a', 'left')), pos(items));
  // Down onto b: b is pushed below a. Up again: a is back on top.
  const down = moveCanvasItem(items, 'a', 'down');
  assert.deepEqual(pos(down), { a: [0, 1, 4, 2], b: [0, 3, 4, 2] });
  noOverlap(down);
  // Up into an item above swaps the two: b moves up onto a, which is pushed below it.
  const up = moveCanvasItem(items, 'b', 'up');
  assert.deepEqual(pos(up), { a: [0, 3, 4, 2], b: [0, 1, 4, 2] });
  noOverlap(up);
});

test('keyboard resizes step one cell within the limits', () => {
  const item = at('a', 0, 0, 4, 2, { minW: 3, maxW: 5, minH: 1, maxH: 3 });
  assert.deepEqual(canvasResizeTarget(item, 'wider'), { col: 0, row: 0, w: 5, h: 2 });
  assert.equal(canvasResizeTarget({ ...item, w: 5 }, 'wider'), null);
  assert.deepEqual(canvasResizeTarget(item, 'narrower'), { col: 0, row: 0, w: 3, h: 2 });
  assert.equal(canvasResizeTarget({ ...item, w: 3 }, 'narrower'), null);
  assert.deepEqual(canvasResizeTarget(item, 'taller'), { col: 0, row: 0, w: 4, h: 3 });
  assert.equal(canvasResizeTarget({ ...item, h: 3 }, 'taller'), null);
  assert.deepEqual(canvasResizeTarget(item, 'shorter'), { col: 0, row: 0, w: 4, h: 1 });
  assert.equal(canvasResizeTarget({ ...item, h: 1 }, 'shorter'), null);
  // At the right edge, wider grows to the left.
  assert.deepEqual(canvasResizeTarget(at('r', 8, 0, 4, 1), 'wider'), { col: 7, row: 0, w: 5, h: 1 });
  // No declared limits: up to the full width, and as tall as wanted.
  assert.equal(canvasResizeTarget(at('f', 0, 0, 12, 1), 'wider'), null);
  assert.deepEqual(canvasResizeTarget(at('t', 0, 0, 2, 40), 'taller'), { col: 0, row: 0, w: 2, h: 41 });
});

test('a resize that grows into a neighbour pushes it down', () => {
  const items = [at('a', 0, 0, 6, 1), at('b', 6, 0, 6, 1)];
  const next = resizeCanvasItem(items, 'a', 'wider');
  assert.deepEqual(pos(next), { a: [0, 0, 7, 1], b: [6, 1, 6, 1] });
  noOverlap(next);
});

test('normalizeCanvas settles a stored layout that overlaps, earlier in reading order first', () => {
  const next = normalizeCanvas([at('b', 2, 0, 4, 2), at('a', 0, 0, 4, 2), at('c', 0, 1, 12, 1)]);
  assert.deepEqual(pos(next), { b: [2, 2, 4, 2], a: [0, 0, 4, 2], c: [0, 4, 12, 1] });
  noOverlap(next);
});

test('reading order is row by row, left to right, and ties keep their order', () => {
  const items = [at('c', 6, 2, 6, 1), at('a', 6, 0, 6, 1), at('b', 0, 0, 6, 1), at('d', 0, 2, 6, 1), at('e', 0, 2, 6, 1)];
  assert.deepEqual(canvasReadingOrder(items).map((item) => item.id), ['b', 'a', 'd', 'e', 'c']);
  assert.equal(canvasRowCount(items), 3);
  assert.equal(canvasRowCount([]), 0);
});

test('compactCanvas closes gaps upward without changing columns or sizes', () => {
  const items = [at('a', 0, 3, 6, 2), at('b', 6, 1, 6, 1), at('c', 0, 7, 12, 1)];
  assert.deepEqual(pos(compactCanvas(items)), { a: [0, 0, 6, 2], b: [6, 0, 6, 1], c: [0, 2, 12, 1] });
});
