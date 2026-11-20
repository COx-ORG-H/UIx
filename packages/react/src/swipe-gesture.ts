/* The kit's swipe-to-dismiss constants (HAR-2578, the 2.60 animate-ui study), shared by the Toast,
 * the Drawer and the side Peek so every swipe in UIx feels the same. Internal: not in index.ts. */

/** px per ms: a release faster than this, the way it was dragged, carries on out and closes. */
export const SWIPE_VELOCITY = 0.11;

/** px of travel before a press becomes a drag, so a tap stays a tap. */
export const SWIPE_SLOP = 6;

/** ms of movement the release velocity is measured over. */
export const SWIPE_WINDOW = 100;

/** One pointer sample along the swipe axis: `p` in px, `t` the event's timeStamp in ms. */
export interface SwipeSample { p: number; t: number }

/** px/ms over the last SWIPE_WINDOW before `t`; 0 when the pointer stood still that long. */
export function releaseVelocity(samples: readonly SwipeSample[], p: number, t: number): number {
  const recent = samples.filter((s) => t - s.t <= SWIPE_WINDOW);
  if (recent.length === 0) return 0;
  return (p - recent[0].p) / Math.max(1, t - recent[0].t);
}
