/* Roving tab stop over a set of elements (HAR-1527): exactly one of them is in the tab order,
 * and it follows the focus. Plain DOM, shared by `List roving` and the calendar agenda. */

export interface RovingStop {
  /** The element that holds the tab stop. */
  node: HTMLElement | null;
  /** Its place, so the stop survives when that element is removed. */
  index: number;
}

/**
 * Makes one of `all` the tab stop and takes the others out of the tab order. The stop is
 * `next` when given, else the element that held it, else the element now in its place.
 */
export function syncRovingStop(all: readonly HTMLElement[], stop: RovingStop, next?: HTMLElement): RovingStop {
  if (all.length === 0) return { node: null, index: 0 };
  const kept = stop.node && all.includes(stop.node) ? stop.node : all[Math.min(stop.index, all.length - 1)]!;
  const current = next && all.includes(next) ? next : kept;
  for (const element of all) element.tabIndex = element === current ? 0 : -1;
  return { node: current, index: all.indexOf(current) };
}

/** Runs `task` once the next frame has been painted (the rows a scroll brings in are mounted by then). */
export function afterNextPaint(task: () => void): void {
  if (typeof requestAnimationFrame !== 'function') { setTimeout(task, 0); return; }
  requestAnimationFrame(() => requestAnimationFrame(task));
}
