/* Row geometry of `SchedulingTimeline` (HAR-1521, U5). Pure, no imports, not exported from the
 * package: the component is its only reader.
 *
 * A timeline body is a list of rows: a group head, or a lane as tall as its sub-rows. With
 * fixed row heights every vertical position is a count of three CSS lengths (a sub-row, the
 * padding of a lane, a head), so a window can be clipped to its lanes and the rows above a
 * virtual window can be skipped without measuring anything. */

export type TimelineRowKind = 'lane' | 'head';

export interface TimelineRowSize {
  kind: TimelineRowKind;
  /** Sub-rows of a lane (at least 1). Not read for a head. */
  subRows?: number;
}

/** A height as counts of the three row units: sub-rows, lane paddings and group heads. */
export interface TimelineExtent {
  subRows: number;
  lanes: number;
  heads: number;
}

/**
 * Where each row starts, as a `TimelineExtent` from the top of the body. One more entry than
 * rows: the last is the height of the whole body.
 */
export function timelineRowExtents(rows: readonly TimelineRowSize[]): TimelineExtent[] {
  const extents: TimelineExtent[] = [{ subRows: 0, lanes: 0, heads: 0 }];
  for (const row of rows) {
    const above = extents[extents.length - 1]!;
    extents.push(row.kind === 'head'
      ? { subRows: above.subRows, lanes: above.lanes, heads: above.heads + 1 }
      : { subRows: above.subRows + Math.max(1, row.subRows ?? 1), lanes: above.lanes + 1, heads: above.heads });
  }
  return extents;
}

/** The half-open index runs `[from, to)` of consecutive `true` entries. */
export function timelineRuns(targets: readonly boolean[]): Array<{ from: number; to: number }> {
  const runs: Array<{ from: number; to: number }> = [];
  targets.forEach((target, index) => {
    if (!target) return;
    const last = runs[runs.length - 1];
    if (last && last.to === index) last.to = index + 1; else runs.push({ from: index, to: index + 1 });
  });
  return runs;
}

/**
 * The rows `[start, end)` to mount: those that touch `[top - overscan, bottom + overscan]`,
 * given where each row starts (`offsets`, one more entry than rows, in the unit of `top`).
 * Never more than `cap` rows, and never none while there are rows: a viewport past the end
 * mounts the last rows.
 */
export function timelineWindow(offsets: readonly number[], top: number, bottom: number, options: { overscan?: number; cap?: number } = {}): { start: number; end: number } {
  const count = Math.max(0, offsets.length - 1);
  if (count === 0) return { start: 0, end: 0 };
  const overscan = Math.max(0, options.overscan ?? 0);
  const cap = Math.max(1, options.cap ?? Infinity);
  const from = top - overscan;
  const to = bottom + overscan;
  // The first row that ends after `from`, by bisection on the row ends.
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid + 1]! > from) hi = mid; else lo = mid + 1;
  }
  const start = Math.min(lo, count - 1);
  let end = start + 1;
  while (end < count && offsets[end]! < to && end - start < cap) end++;
  return { start, end };
}
