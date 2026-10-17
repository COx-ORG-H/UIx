/**
 * Pure model for `DashboardCanvas` (TENSOR HAR-1823): a free dashboard layout on a 12-column
 * grid. Every item has a place and a size in grid units — `col` and `row` (0-based), `w`
 * columns wide and `h` rows tall — and may declare the smallest and largest size it accepts.
 *
 * The canvas is free: an item stays where it is put, and nothing floats up into a gap. When a
 * move or a resize lands on other items, they are pushed down below it, in reading order, and
 * whatever they then land on is pushed in turn. `compactCanvas` is the separate, explicit
 * "close the gaps" step for a product that wants one (after removing a widget, say).
 *
 * The same functions back the pointer drag in the component and the keyboard alternative a
 * product puts in each item's menu (Move up / down / left / right, Wider / Narrower, Taller /
 * Shorter), so dragging is never the only way to arrange the canvas (WCAG 2.5.7).
 */

/** The canvas has twelve columns: 12 divides into halves, thirds, quarters and sixths. */
export const DASHBOARD_CANVAS_COLUMNS = 12;

export interface DashboardCanvasItem {
  /** Stable id: the key of the cell and of every change reported for it. */
  readonly id: string;
  /** First column, 0-based (0 – 11). */
  readonly col: number;
  /** First row, 0-based. */
  readonly row: number;
  /** Width in columns. */
  readonly w: number;
  /** Height in rows. */
  readonly h: number;
  /** Narrowest the item may be, in columns. Default 1. */
  readonly minW?: number;
  /** Widest the item may be, in columns. Default 12. */
  readonly maxW?: number;
  /** Shortest the item may be, in rows. Default 1. */
  readonly minH?: number;
  /** Tallest the item may be, in rows. Default: no limit. */
  readonly maxH?: number;
}

/** A keyboard move: one column or one row at a time. */
export type DashboardCanvasDirection = 'up' | 'down' | 'left' | 'right';

/** A keyboard resize: one column or one row at a time. */
export type DashboardCanvasResize = 'wider' | 'narrower' | 'taller' | 'shorter';

/** Where and how big an item is, in grid units. */
export interface DashboardCanvasPlacement {
  readonly col: number;
  readonly row: number;
  readonly w: number;
  readonly h: number;
}

const whole = (value: number | undefined, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;

const clampTo = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

/** An item's size limits, made sane: whole numbers, inside the canvas, minimum never above maximum. */
export function canvasItemLimits(item: DashboardCanvasItem): {
  readonly minW: number;
  readonly maxW: number;
  readonly minH: number;
  readonly maxH: number;
} {
  const minW = clampTo(whole(item.minW, 1), 1, DASHBOARD_CANVAS_COLUMNS);
  const maxW = clampTo(whole(item.maxW, DASHBOARD_CANVAS_COLUMNS), minW, DASHBOARD_CANVAS_COLUMNS);
  const minH = Math.max(1, whole(item.minH, 1));
  const maxH = Math.max(minH, whole(item.maxH, Number.POSITIVE_INFINITY));
  return { minW, maxW, minH, maxH };
}

/**
 * The item made valid: whole numbers, its size inside its own limits and the canvas, and its
 * place inside the twelve columns (a too-wide item at the right edge moves left). Limits from
 * an untyped caller are made sane too: a maximum below the minimum is raised to it.
 */
export function clampCanvasItem<T extends DashboardCanvasItem>(item: T): T {
  const { minW, maxW, minH, maxH } = canvasItemLimits(item);
  const w = clampTo(whole(item.w, minW), minW, maxW);
  const h = clampTo(whole(item.h, minH), minH, maxH);
  const col = clampTo(whole(item.col, 0), 0, DASHBOARD_CANVAS_COLUMNS - w);
  const row = Math.max(0, whole(item.row, 0));
  if (col === item.col && row === item.row && w === item.w && h === item.h) return item;
  return { ...item, col, row, w, h };
}

/** True when two different items share at least one cell. */
export function canvasItemsOverlap(a: DashboardCanvasPlacement & { readonly id: string }, b: DashboardCanvasPlacement & { readonly id: string }): boolean {
  return a.id !== b.id && a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h;
}

/**
 * Reading order: row by row from the top, left to right in a row. Ties keep the order they
 * came in. This is the order the canvas collapses to on a narrow screen and the order a
 * screen reader meets the items in.
 */
export function canvasReadingOrder<T extends DashboardCanvasItem>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.row - b.item.row || a.item.col - b.item.col || a.index - b.index)
    .map(({ item }) => item);
}

/** The number of rows the canvas uses: one past the lowest item's last row. */
export function canvasRowCount(items: readonly DashboardCanvasItem[]): number {
  return items.reduce((rows, item) => Math.max(rows, item.row + item.h), 0);
}

/**
 * Settles every item that overlaps another, in reading order: the first stays, and each later
 * one that lands on something already settled moves down just below it. `fixed` items are
 * settled first and never move.
 */
function settle<T extends DashboardCanvasItem>(fixed: readonly T[], rest: readonly T[]): T[] {
  const settled: T[] = [...fixed];
  for (const item of canvasReadingOrder(rest)) {
    let candidate = item;
    for (;;) {
      const below = settled
        .filter((other) => canvasItemsOverlap(candidate, other))
        .reduce((lowest, other) => Math.max(lowest, other.row + other.h), -1);
      if (below < 0) break;
      candidate = { ...candidate, row: below };
    }
    settled.push(candidate);
  }
  return settled;
}

/** The input's order, with each item replaced by its settled version. */
const inInputOrder = <T extends DashboardCanvasItem>(items: readonly T[], settled: readonly T[]): T[] => {
  const byId = new Map(settled.map((item) => [item.id, item]));
  return items.map((item) => byId.get(item.id) ?? item);
};

/**
 * A layout with every item valid and no two sharing a cell. Use it on a stored layout before
 * showing it: an overlap someone saved elsewhere is settled the same way a move settles one.
 */
export function normalizeCanvas<T extends DashboardCanvasItem>(items: readonly T[]): T[] {
  const clamped = items.map((item) => clampCanvasItem(item));
  return inInputOrder(clamped, settle([], clamped));
}

/**
 * Puts one item at a new place and size (clamped to its limits and the canvas) and pushes
 * what it lands on down. Every other item keeps its place unless it had to move. Returns the
 * items in the order they came in; an unknown id returns them unchanged.
 */
export function placeCanvasItem<T extends DashboardCanvasItem>(
  items: readonly T[],
  id: string,
  placement: Partial<DashboardCanvasPlacement>,
): T[] {
  const target = items.find((item) => item.id === id);
  if (!target) return [...items];
  const moved = clampCanvasItem({ ...target, ...placement });
  const others = items.filter((item) => item.id !== id).map((item) => clampCanvasItem(item));
  return inInputOrder(items, settle([moved], others));
}

/** One step of a keyboard move, as a new place. Null when the item is already at that edge. */
export function canvasMoveTarget(item: DashboardCanvasItem, direction: DashboardCanvasDirection): DashboardCanvasPlacement | null {
  const current = clampCanvasItem(item);
  const col = current.col + (direction === 'left' ? -1 : direction === 'right' ? 1 : 0);
  const row = current.row + (direction === 'up' ? -1 : direction === 'down' ? 1 : 0);
  if (col < 0 || col + current.w > DASHBOARD_CANVAS_COLUMNS || row < 0) return null;
  return { col, row, w: current.w, h: current.h };
}

/**
 * One step of a keyboard resize, as a new place and size. `wider` grows to the right, or to the
 * left when the item already touches the right edge. Null when the item is at its limit.
 */
export function canvasResizeTarget(item: DashboardCanvasItem, change: DashboardCanvasResize): DashboardCanvasPlacement | null {
  const current = clampCanvasItem(item);
  const limits = canvasItemLimits(current);
  if (change === 'wider') {
    if (current.w >= limits.maxW) return null;
    const col = current.col + current.w < DASHBOARD_CANVAS_COLUMNS ? current.col : current.col - 1;
    return { col, row: current.row, w: current.w + 1, h: current.h };
  }
  if (change === 'narrower') {
    return current.w <= limits.minW ? null : { col: current.col, row: current.row, w: current.w - 1, h: current.h };
  }
  if (change === 'taller') {
    return current.h >= limits.maxH ? null : { col: current.col, row: current.row, w: current.w, h: current.h + 1 };
  }
  return current.h <= limits.minH ? null : { col: current.col, row: current.row, w: current.w, h: current.h - 1 };
}

/** Moves an item one column or row. At an edge the items come back unchanged. */
export function moveCanvasItem<T extends DashboardCanvasItem>(items: readonly T[], id: string, direction: DashboardCanvasDirection): T[] {
  const item = items.find((candidate) => candidate.id === id);
  const target = item ? canvasMoveTarget(item, direction) : null;
  return target ? placeCanvasItem(items, id, target) : [...items];
}

/** Resizes an item by one column or row. At a limit the items come back unchanged. */
export function resizeCanvasItem<T extends DashboardCanvasItem>(items: readonly T[], id: string, change: DashboardCanvasResize): T[] {
  const item = items.find((candidate) => candidate.id === id);
  const target = item ? canvasResizeTarget(item, change) : null;
  return target ? placeCanvasItem(items, id, target) : [...items];
}

/**
 * Closes the gaps: in reading order, each item rises as far as it can without landing on one
 * above it. Columns and sizes never change. Not called by the canvas itself — a free canvas
 * keeps the gaps a person leaves — but by a product that wants a tidy layout.
 */
export function compactCanvas<T extends DashboardCanvasItem>(items: readonly T[]): T[] {
  const settled: T[] = [];
  for (const item of canvasReadingOrder(normalizeCanvas(items))) {
    let row = item.row;
    while (row > 0 && !settled.some((other) => canvasItemsOverlap({ ...item, row: row - 1 }, other))) row -= 1;
    settled.push(row === item.row ? item : { ...item, row });
  }
  return inInputOrder(items, settled);
}
