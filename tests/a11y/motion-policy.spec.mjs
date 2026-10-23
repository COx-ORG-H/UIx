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
  // clicked and read in the same task as the change, so a loaded machine cannot finish it first
  const transitions = await transitionsAfter(page, '#meter-step', '#meter .uix-meter__fill');
  expect(Object.keys(transitions)).toEqual(['transform']);
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

/* ── Part B: overlay timing ─────────────────────────────────────────────────────────────── */

/** Hold every animation the page starts from now on at its first frame (CDP), so a test can read
 *  a transition that would otherwise be over before Playwright gets back. */
const freeze = async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
  return () => cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
};

/** Click `act` (in the page, no pointer events) and read the first transitions that appear on `target`. */
const transitionsAfter = (page, act, target) => page.evaluate(([a, t]) => new Promise((resolve) => {
  document.querySelector(a).click();
  let frames = 0;
  const read = () => {
    const el = document.querySelector(t);
    const list = el ? el.getAnimations().filter((x) => x.transitionProperty) : [];
    if (list.length || ++frames > 30) {
      resolve(Object.fromEntries(list.map((x) => [x.transitionProperty, x.effect.getTiming().duration])));
      return;
    }
    requestAnimationFrame(read);
  };
  read();
}), [act, target]);

test.describe('exits are faster than enters', () => {
  test('modal: 240 ms in, 160 ms out', async ({ page }) => {
    await open(page);
    expect((await transitionsAfter(page, '#open-modal', '#modal')).opacity).toBe(240);
    await page.waitForTimeout(400);
    expect((await transitionsAfter(page, '#modal .uix-dialog__close', '#modal')).opacity).toBe(160);
  });

  test('drawer: 240 ms in, 160 ms out', async ({ page }) => {
    await open(page);
    expect((await transitionsAfter(page, '#open-drawer', '#drawer')).transform).toBe(240);
    await page.waitForTimeout(400);
    expect((await transitionsAfter(page, '#drawer .uix-drawer__close', '#drawer')).transform).toBe(160);
  });

  test('menu: 120 ms in, 80 ms out', async ({ page }) => {
    await open(page);
    const menu = '[role="menu"]';
    const enter = await transitionsAfter(page, '#menu-trigger', menu);
    expect(enter).toMatchObject({ opacity: 120, transform: 120 });
    await expect(page.locator(menu)).toBeVisible();
    await page.waitForTimeout(300);
    const exit = await transitionsAfter(page, '#menu-trigger', menu);
    expect(exit).toMatchObject({ opacity: 80, transform: 80 });
  });
});

test('a menu grows out of its trigger: scale(.95) about the anchor point', async ({ page }) => {
  await open(page);
  const resume = await freeze(page);
  await page.locator('#menu-trigger').click();
  await expect(page.locator('[role="menu"]')).toBeAttached();
  await expect.poll(() => page.locator('[role="menu"]').evaluate((el) => !el.hasAttribute('data-uix-placing'))).toBe(true);
  const read = await page.locator('[role="menu"]').evaluate((el) => {
    const transition = el.getAnimations().find((a) => a.transitionProperty === 'transform');
    const t = document.getElementById('menu-trigger').getBoundingClientRect();
    return {
      origin: getComputedStyle(el).transformOrigin,
      // layout box (the hook placed it at fixed left/top), not the scaled one
      expectX: Math.round(t.left + t.width / 2 - parseFloat(el.style.left || '0')),
      anchored: el.style.left.startsWith('round('),
      from: transition?.effect.getKeyframes()[0].transform,
    };
  });
  await resume();
  const [x, y] = read.origin.split(' ').map(parseFloat);
  if (!read.anchored) expect(Math.abs(x - read.expectX)).toBeLessThanOrEqual(1);
  expect(x).toBeGreaterThan(0);
  expect(y).toBe(0); // it opens below its trigger, so it grows from its top edge
  expect(read.from).toMatch(/^(scale\(0\.95\)|matrix\(0\.95, 0, 0, 0\.95)/);
});

test.describe('keyboard-opened surfaces open with no animation', () => {
  test('a menu opened with ↓ carries data-uix-key-opened and has no transition', async ({ page }) => {
    await open(page);
    await page.locator('#menu-trigger').focus();
    await page.keyboard.press('ArrowDown');
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('data-uix-key-opened', '');
    expect(await menu.evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('none');
  });

  test('a menu opened with a click animates', async ({ page }) => {
    await open(page);
    await page.locator('#menu-trigger').click();
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible();
    await expect(menu).not.toHaveAttribute('data-uix-key-opened');
  });

  test('a modal opened with Enter opens instantly', async ({ page }) => {
    await open(page);
    await page.locator('#open-modal').focus();
    await page.keyboard.press('Enter');
    const modal = page.locator('#modal');
    await expect(modal).toHaveAttribute('data-uix-key-opened', '');
    expect(await modal.evaluate((el) => [el.getAnimations().length, getComputedStyle(el).transitionProperty])).toEqual([0, 'none']);
  });
});

test.describe('tooltip delay group', () => {
  const bubble = (page, id) => page.locator(`.uix-tooltip:has(#${id}) .uix-tooltip__bubble`);
  const isOpen = (loc) => loc.evaluate((el) => el.matches(':popover-open'));

  test('hover waits --uix-delay-tooltip; a neighbour then opens at once; the group cools down', async ({ page }) => {
    await open(page);
    await page.locator('#tip-a').hover();
    await page.waitForTimeout(150);
    expect(await isOpen(bubble(page, 'tip-a')), 'not before the delay').toBe(false);
    await expect.poll(() => isOpen(bubble(page, 'tip-a')), { timeout: 1500 }).toBe(true);

    await page.locator('#tip-b').hover();
    expect(await isOpen(bubble(page, 'tip-b')), 'a neighbour opens at once').toBe(true);
    await expect(bubble(page, 'tip-b')).toHaveAttribute('data-uix-instant', '');

    await page.mouse.move(5, 5);
    await page.waitForTimeout(800); // past the close delay and --uix-delay-tooltip-skip
    await page.locator('#tip-c').hover();
    await page.waitForTimeout(150);
    expect(await isOpen(bubble(page, 'tip-c')), 'the group has cooled: the delay applies again').toBe(false);
    await expect.poll(() => isOpen(bubble(page, 'tip-c')), { timeout: 1500 }).toBe(true);
    await expect(bubble(page, 'tip-c')).not.toHaveAttribute('data-uix-instant');
  });

  test('keyboard focus opens at once, without motion', async ({ page }) => {
    await open(page);
    await page.locator('#tip-b').focus();
    await page.keyboard.press('Shift+Tab');
    expect(await isOpen(bubble(page, 'tip-a'))).toBe(true);
    await expect(bubble(page, 'tip-a')).toHaveAttribute('data-uix-key-opened', '');
  });
});

test.describe('toasts', () => {
  const toasts = (page) => page.locator('.uix-toaster [data-toast-id]');

  test('enter on a transition, leave in --uix-dur-exit, and the stack glides', async ({ page }) => {
    await open(page);
    await page.locator('#toast-add').click();
    await expect(toasts(page)).toHaveCount(1);
    expect(await toasts(page).first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await page.waitForTimeout(400);

    // a second toast below pushes the first up: it glides (a Web Animation on transform)
    const glide = page.evaluate(() => new Promise((resolve) => {
      const el = document.querySelector('.uix-toaster [data-toast-id]');
      let frames = 0;
      const look = () => {
        const a = el.getAnimations().find((x) => !x.transitionProperty && !x.animationName);
        if (a || ++frames > 60) { resolve(a ? a.effect.getTiming().duration : null); return; }
        requestAnimationFrame(look);
      };
      look();
    }));
    await page.locator('#toast-add').click();
    expect(await glide).toBe(160);
    await page.waitForTimeout(400);

    const exit = await transitionsAfter(page, '#toast-dismiss-first', '.uix-toaster [data-leaving]');
    expect(exit.opacity).toBe(110);
    await expect(toasts(page)).toHaveCount(1);
  });

  test('a swipe dismisses a toast', async ({ page }) => {
    await open(page);
    await page.locator('#toast-add').click();
    const t = toasts(page).first();
    await expect(t).toBeVisible();
    await page.waitForTimeout(400);
    const box = await t.locator('.uix-toast__body').boundingBox();
    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 40, box.y + box.height / 2, { steps: 3 });
    await page.mouse.move(box.x + 240, box.y + box.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect(toasts(page)).toHaveCount(0);
  });

  test('a short, slow drag snaps back and keeps the toast', async ({ page }) => {
    await open(page);
    await page.locator('#toast-add').click();
    const t = toasts(page).first();
    await page.waitForTimeout(400);
    const box = await t.locator('.uix-toast__body').boundingBox();
    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 30, box.y + box.height / 2, { steps: 10 });
    await page.waitForTimeout(200); // no fling
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(toasts(page)).toHaveCount(1);
    expect(await t.evaluate((el) => el.style.translate)).toBe('');
  });
});

test('search suggestions enter once per opening, not on every reappearance while typing', async ({ page }) => {
  await open(page);
  const field = page.getByRole('combobox', { name: 'Search settings' });
  const popup = page.locator('#suggest .uix-search-suggest__popup');
  // focus opens the list (an empty query shows every result): that is the opening, and it enters
  const resume = await freeze(page);
  await field.focus();
  await expect(popup).toBeVisible();
  expect(await popup.evaluate((el) => el.getAnimations().map((a) => a.transitionProperty).sort())).toEqual(['opacity', 'transform']);
  await resume();
  await field.fill('ma');
  await field.fill('m'); // no results: the list hides
  await expect(popup).toBeHidden();
  await expect(popup).toHaveAttribute('data-settled', '');
  await freeze(page);
  await field.fill('ma');
  await expect(popup).toBeVisible();
  expect(await popup.evaluate((el) => el.getAnimations().length), 'it reappears in place').toBe(0);
});
