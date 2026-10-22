/* The motion policy in a real browser (HAR-2578; docs → Foundations → Motion).
 *
 *   - Reduced motion removes movement and keeps fades: a modal still fades, with no transform in
 *     its transitions; without the preference the same modal moves.
 *   - Looping "still working" indicators stay alive under reduced motion: Spinner, Button loading,
 *     Skeleton, indeterminate Progress, SaveStatus and Heartbeat run the `uix-pulse` opacity loop
 *     (--uix-loop-pulse) instead of freezing; without the preference they turn, sweep or ping.
 *   - Keyboard-initiated surfaces open with zero duration: a Modal with `instant`, a Modal that
 *     holds a CommandPalette (it marks its dialog itself) and the legacy [data-uix-cmdk-dialog].
 *   - A Meter moves on transform, never width.
 *   - Row actions hide until hover only on a fine pointer; on a touch screen they stay visible.
 *   - useReducedMotion() follows the preference live.
 * Harness: tests/motion/harness.tsx, bundled from source in globalSetup. */
import { test, expect } from '@playwright/test';

const HARNESS = '/tests/motion/harness.html';

const open = async (page) => {
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('#open-modal')).toBeVisible();
};

/** The transitions and animations running on `selector` (and its pseudo-elements) right now. */
const motionOf = (page, selector) => page.locator(selector).evaluate((el) => el.getAnimations({ subtree: true }).map((a) => ({
  name: a.animationName ?? null,
  property: a.transitionProperty ?? null,
  duration: a.effect.getTiming().duration,
  iterations: a.effect.getTiming().iterations,
  state: a.playState,
})));

/** Click `trigger`, then read the dialog's transitions in the same task as the open. */
const openAndRead = (page, trigger, dialog) => page.evaluate(([t, d]) => new Promise((resolve) => {
  document.querySelector(t).click();
  const read = () => {
    const el = document.querySelector(d);
    if (!el?.open) { requestAnimationFrame(read); return; }
    getComputedStyle(el).opacity; // flush style so the enter transitions exist
    resolve({
      transitions: el.getAnimations().map((a) => a.transitionProperty),
      property: getComputedStyle(el).transitionProperty,
      backdrop: getComputedStyle(el, '::backdrop').transitionProperty,
    });
  };
  read();
}), [trigger, dialog]);

test.describe('reduced motion removes movement and keeps fades', () => {
  test('a modal moves and fades by default', async ({ page }) => {
    await open(page);
    const { transitions } = await openAndRead(page, '#open-modal', '#modal');
    expect(transitions).toEqual(expect.arrayContaining(['opacity', 'transform']));
  });

  test('under reduced motion the same modal only fades', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const { transitions } = await openAndRead(page, '#open-modal', '#modal');
    expect(transitions).toContain('opacity');
    expect(transitions).not.toContain('transform');
    await expect.poll(() => page.locator('#modal').evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  });
});

const LOOPS = [
  ['Spinner', '#spinner', 'uix-spin'],
  ['Button loading', '#loading-button', 'uix-spin'],
  ['Skeleton', '#skeleton', 'uix-shimmer'],
  ['indeterminate Progress', '#progress', 'uix-progress-slide'],
  ['SaveStatus', '#save-status', 'uix-spin'],
  ['Heartbeat', '#heartbeat', 'uix-ping'],
];

test.describe('looping indicators stay alive', () => {
  for (const [name, selector, loop] of LOOPS) {
    test(`${name} runs ${loop} by default`, async ({ page }) => {
      await open(page);
      const motion = await motionOf(page, selector);
      expect(motion.map((m) => m.name)).toContain(loop);
      expect(motion.find((m) => m.name === loop)).toMatchObject({ iterations: Infinity, state: 'running' });
    });

    test(`${name} pulses instead of freezing under reduced motion`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page);
      const motion = await motionOf(page, selector);
      expect(motion.map((m) => m.name)).not.toContain(loop);
      const pulse = motion.find((m) => m.name === 'uix-pulse');
      expect(pulse, `${name} has a running pulse`).toMatchObject({ iterations: Infinity, state: 'running', duration: 2000 });
    });
  }
});

test.describe('keyboard-initiated surfaces open with zero duration', () => {
  for (const [name, trigger, dialog] of [
    ['a Modal with instant', '#open-instant', '#instant'],
    ['a Modal holding a CommandPalette', '#open-palette', '#palette'],
    ['the legacy data-uix-cmdk-dialog', '#open-legacy', '#legacy-cmdk'],
  ]) {
    test(`${name} has no transition`, async ({ page }) => {
      await open(page);
      const read = await openAndRead(page, trigger, dialog);
      expect(read.transitions).toEqual([]);
      expect(read.property).toBe('none');
      expect(read.backdrop).toBe('none');
    });
  }

  test('the CommandPalette marks its dialog, and the plain modal stays animated', async ({ page }) => {
    await open(page);
    await expect(page.locator('#palette')).toHaveAttribute('data-uix-instant', '');
    await expect(page.locator('#modal')).not.toHaveAttribute('data-uix-instant');
  });
});

test('a Meter moves on transform, never width', async ({ page }) => {
  await open(page);
  const track = await page.locator('#meter').evaluate((el) => el.getBoundingClientRect().width);
  await page.locator('#meter-step').click();
  const transitions = await page.locator('#meter .uix-meter__fill').evaluate((el) => el.getAnimations().map((a) => a.transitionProperty));
  expect(transitions).toEqual(['transform']);
  const fillWidth = await page.locator('#meter .uix-meter__fill').evaluate((el) => parseFloat(getComputedStyle(el).width));
  expect(Math.abs(fillWidth - track)).toBeLessThan(1);
  await expect.poll(() => page.locator('#meter .uix-meter__fill').evaluate((el) => {
    const r = el.getBoundingClientRect();
    const t = el.parentElement.getBoundingClientRect();
    return Math.round(((r.right - t.left) / t.width) * 100);
  })).toBe(80);
});

test.describe('row actions', () => {
  test('a fine pointer reveals them on hover', async ({ page }) => {
    await open(page);
    const opacity = () => page.locator('#rowact').evaluate((el) => getComputedStyle(el).opacity);
    expect(await opacity()).toBe('0');
    await page.locator('#rowact').locator('xpath=ancestor::tr').hover();
    await expect.poll(opacity).toBe('1');
  });

  test('a touch screen shows them without hover', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await open(page);
    expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(false);
    expect(await page.locator('#rowact').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await context.close();
  });
});

test('useReducedMotion follows the preference live', async ({ page }) => {
  await open(page);
  await expect(page.locator('#reduced-state')).toHaveText('Reduced motion: off');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#reduced-state')).toHaveText('Reduced motion: on');
});
