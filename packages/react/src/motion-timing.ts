/* The kit's JavaScript timings for state feedback (motion standard §2.3, the latency ladder).
 * CSS durations come from the --uix-dur-* tokens; these are the waits and holds that only a
 * script can apply. One place, so a product's own feedback can match the kit's. */

/** Under this, a pending action shows nothing new: a spinner that would flash for 150 ms is noise. */
export const PENDING_DELAY_MS = 300;

/** Once a pending indicator appears, it stays at least this long so it never flickers. */
export const PENDING_MIN_VISIBLE_MS = 500;

/** How long an in-place result ("Saved", "Couldn't save") holds before the control returns. */
export const RESULT_HOLD_MS = 1500;
