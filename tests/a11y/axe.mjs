/* The one AxeBuilder every test uses (tests/spec-lint.test.mjs holds that: nothing else imports
 * '@axe-core/playwright'). It is the library's builder with one change: `analyze()` first waits
 * until the page's short animations have finished.
 *
 * Why: axe measures colours as painted. A menu, popover or dialog scanned while it is still
 * fading in blends its text with what is behind it, and color-contrast fails at random under
 * load (single-pointer.spec's Kanban Move menu, 2026-11-20, #323). settle.mjs has the same wait
 * for the specs that called it by hand; the specs that did not were the ones that flaked.
 *
 * What it waits for: running animations and transitions on the document timeline that end within
 * SETTLE_MAX_MS. An enter or exit motion is a few hundred milliseconds; anything longer is a
 * progress or countdown (the undo toast's bar runs for the toast's whole life) and infinite ones
 * are spinners, so those stay on screen for axe exactly as a person sees them. Scroll-driven
 * animations (scroll-edge.css) are on a scroll timeline and are skipped too. */
import { expect } from '@playwright/test';
import AxeBuilderBase from '@axe-core/playwright';

/** The longest animation `analyze()` waits for: twice the slowest motion token, with room to spare. */
export const SETTLE_MAX_MS = 1000;

/** Wait until no animation that ends within SETTLE_MAX_MS is still running. */
export const settleShortAnimations = (page) => expect.poll(() => page.evaluate((max) => document.getAnimations()
  .filter((a) => a.timeline === document.timeline && a.playState === 'running' && (a.effect?.getComputedTiming().endTime ?? Infinity) <= max)
  .map((a) => a.animationName || a.transitionProperty || a.id || 'animation'), SETTLE_MAX_MS), {
  message: 'short animations still running before the axe scan',
  timeout: 4000,
}).toEqual([]);

export default class AxeBuilder extends AxeBuilderBase {
  #page;

  constructor(options) {
    super(options);
    this.#page = options.page;
  }

  async analyze() {
    await settleShortAnimations(this.#page);
    return super.analyze();
  }
}
