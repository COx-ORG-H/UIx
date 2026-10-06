/* Axe measures colours as painted. An overlay scanned mid-fade (a [popover].uix-popover enter
 * transition, the search-suggest keyframe, a dialog's @starting-style) blends its text with
 * whatever is behind it, and color-contrast fails at random under load. Call this after opening
 * an overlay and before `analyze()`: it waits until no finite animation or transition in the
 * document is still running. Infinite ones (spinners) never finish and are skipped, so they stay
 * on screen for axe exactly as a user sees them — unlike emulating reduced motion, which the
 * global guard in motion.css turns into a different rendering.
 */
import { expect } from '@playwright/test';

export const settleAnimations = (page) => expect.poll(() => page.evaluate(() => document.getAnimations()
  .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity)
  .map((a) => a.animationName || a.transitionProperty || a.id || 'animation')), {
  message: 'finite animations still running before the axe scan',
}).toEqual([]);
