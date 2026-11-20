/* In-place text swaps go out, then in (docs → Foundations → Motion → Mechanics, "Text swaps go out,
 * then in"; One UI's motion basics): two texts fading over each other cannot be read mid-swap, so no
 * frame may show the old and the new text at once, and the swap still ends within the time the old
 * crossfade took. Frames are stepped on a frozen clock (tests/text-swap/stepper.mjs), so the check
 * does not depend on how loaded the machine is; tests/text-swap/frames.mjs draws the same frames
 * for review.
 *
 * Not checked here, on purpose: the tooltip hand-over (2.60, an operator pick) keeps its overlapping
 * slide; Count, SaveStatus and CopyButton change their text in one node at once. */
import { test, expect } from '@playwright/test';
import { SWAPS, freezeClock, overlap, runSwap, startStepper } from '../text-swap/stepper.mjs';

const HARNESS = '/tests/text-swap/harness.html';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name === 'dark' ? 'dark' : 'light';
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ } }, theme);
  await freezeClock(page);
  await page.goto(HARNESS);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#btn')).toBeVisible();
  await startStepper(page);
});

/** The swap's whole time: when the new text must be fully in. The token it took before, or the
 *  ms a wrapper retimed it to (shorter than the exit token, or a local swap-out). */
const BUDGET = {
  'button-result': '--uix-dur',
  'button-back': '--uix-dur',
  'button-short': 40,
  select: '--uix-dur-overlay',
  'select-local': 100,
  'file-drop': '--uix-dur-fast',
  'file-drop-back': '--uix-dur-fast',
  'file-drop-reenter': '--uix-dur-fast',
};
const ms = (page, token) => (typeof token === 'number' ? token
  : page.evaluate((t) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(t)), token));
const show = (frames) => frames.map((f) => `${f.t}:${f.old.toFixed(2)}/${f.new.toFixed(2)}`).join(' ');

for (const [id, token] of Object.entries(BUDGET)) {
  test(`${SWAPS[id].title}: the old text is gone before the new one shows, within ${typeof token === 'number' ? `${token} ms` : token}`, async ({ page }) => {
    const budget = await ms(page, token);
    const frames = await runSwap(page, SWAPS[id]);
    expect(overlap(frames), `both texts visible at once: ${show(frames)}`).toBeLessThanOrEqual(0.02);
    // the summary is emptied as a drag ends, so the way back starts with nothing to fade out
    if (id !== 'file-drop-back') expect(frames[0].old, 'the old text was on screen at the start').toBeGreaterThan(0.3);
    const settled = frames.find((f) => f.new >= 0.98);
    expect(settled, `the new text arrives: ${show(frames)}`).toBeTruthy();
    // one 10 ms step of slack: a frame lands on the step after the budget ends
    expect(settled.t, `fully in by ${budget} ms: ${show(frames)}`).toBeLessThanOrEqual(budget + 10);
  });
}

test('under reduced motion the button result still goes out, then in (fades stay)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const frames = await runSwap(page, SWAPS['button-result']);
  expect(overlap(frames), show(frames)).toBeLessThanOrEqual(0.02);
  expect(frames.at(-1).new).toBeGreaterThanOrEqual(0.98);
});
