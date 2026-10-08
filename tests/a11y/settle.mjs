/* Axe measures colours as painted. An overlay scanned mid-fade (a [popover].uix-popover enter
 * transition, the search-suggest keyframe, a dialog's @starting-style) blends its text with
 * whatever is behind it, and color-contrast fails at random under load. Call this after opening
 * an overlay and before `analyze()`: it waits until no finite animation or transition in the
 * document is still running. Infinite ones (spinners) never finish and are skipped, so they stay
 * on screen for axe exactly as a user sees them — unlike emulating reduced motion, which the
 * global guard in motion.css turns into a different rendering.
 */
import { expect } from '@playwright/test';

/**
 * Wait until an anchored overlay is where it stays: its held first frame was released
 * (`data-uix-placing` gone), nothing on it animates, and no enter transform is left.
 * `getAnimations().length === 0` alone is also true BEFORE the enter motion starts, while
 * popover.css holds the element at its starting frame, one `--uix-lift` away from its place.
 */
export const settleOverlay = (overlay) => expect.poll(() => overlay.evaluate((el) => {
  const transform = getComputedStyle(el).transform;
  return !el.hasAttribute('data-uix-placing') && el.getAnimations().length === 0 && (transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)');
}), { message: 'the overlay is still held or moving' }).toBe(true);

export const settleAnimations = (page) => expect.poll(() => page.evaluate(() => document.getAnimations()
  .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity)
  .map((a) => a.animationName || a.transitionProperty || a.id || 'animation')), {
  message: 'finite animations still running before the axe scan',
}).toEqual([]);
