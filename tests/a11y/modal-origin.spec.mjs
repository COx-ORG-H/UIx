/* The from-trigger Modal EXPERIMENT (Modal origin="trigger"; phone OS motion study, Tier 3 item 13).
 * Opt-in only: the default Modal keeps today's centred rise. With origin="trigger", a pointer open
 * grows the dialog out of the pressed control from scale(.92) toward the centred place, and the exit
 * runs back toward it while it is on screen; a keyboard open, `instant`, reduced motion and an open
 * with no recent press keep today's behaviour.
 *
 * Harness: tests/modal-origin/harness.tsx, bundled from source in globalSetup. */
import { test, expect } from '@playwright/test';

const HARNESS = '/tests/modal-origin/harness.html';

const open = async (page, query = '?origin=trigger') => {
  await page.goto(`${HARNESS}${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator(query.includes('only=lazy') ? '#lazy' : '#new')).toBeVisible();
};

/** Hold every animation still, so a frame can be read mid-transition (Chromium). */
const freeze = async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
  return () => cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
};

/** The dialog's origin attribute, transform origin, layout box and its transitions (from → duration). */
const readDialog = (page, selector = '#dialog') => page.locator(selector).evaluate((el) => {
  const transitions = Object.fromEntries(el.getAnimations().filter((a) => a.transitionProperty).map((a) => [a.transitionProperty, {
    duration: a.effect.getTiming().duration,
    from: a.effect.getKeyframes()[0]?.[a.transitionProperty === 'transform' ? 'transform' : 'opacity'] ?? null,
    to: a.effect.getKeyframes().at(-1)?.[a.transitionProperty === 'transform' ? 'transform' : 'opacity'] ?? null,
  }]));
  return {
    origin: el.getAttribute('data-uix-origin'),
    keyOpened: el.hasAttribute('data-uix-key-opened'),
    transformOrigin: getComputedStyle(el).transformOrigin.split(' ').map(parseFloat),
    // the layout box, transforms ignored: the dialog is centred in the viewport
    left: (document.documentElement.clientWidth - el.offsetWidth) / 2,
    top: (window.innerHeight - el.offsetHeight) / 2,
    width: el.offsetWidth,
    height: el.offsetHeight,
    transitions,
  };
});

const centreOf = (page, selector) => page.locator(selector).evaluate((el) => {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
});

test('by default a Modal keeps today\'s centred rise', async ({ page }) => {
  await open(page, '');
  const resume = await freeze(page);
  await page.locator('#new').click();
  await expect(page.locator('#dialog')).toHaveAttribute('open', '');
  const d = await readDialog(page);
  await resume();
  expect(d.origin).toBeNull();
  expect(d.transformOrigin[0]).toBeCloseTo(d.width / 2, 0);
  expect(d.transformOrigin[1]).toBeCloseTo(d.height / 2, 0);
  expect(d.transitions.transform.from).toMatch(/translateY\(8px\) scale\(0\.98\)|matrix\(0\.98, 0, 0, 0\.98, 0, 8\)/);
});

test.describe('origin="trigger"', () => {
  for (const trigger of ['#new', '#edit']) {
    test(`a click on ${trigger} grows the dialog out of it, from scale(.92), on the rise's timing`, async ({ page }) => {
      await open(page);
      const [cx, cy] = await centreOf(page, trigger);
      const resume = await freeze(page);
      await page.locator(trigger).click();
      await expect(page.locator('#dialog')).toHaveAttribute('open', '');
      const d = await readDialog(page);
      await resume();
      expect(d.origin).toBe('trigger');
      expect(d.keyOpened).toBe(false);
      // the origin, in the dialog's own box, is the trigger's centre
      expect(Math.abs(d.transformOrigin[0] - (cx - d.left))).toBeLessThanOrEqual(1.5);
      expect(Math.abs(d.transformOrigin[1] - (cy - d.top))).toBeLessThanOrEqual(1.5);
      expect(d.transitions.transform).toMatchObject({ duration: 240 });
      expect(d.transitions.transform.from).toMatch(/^(scale\(0\.92\)|matrix\(0\.92, 0, 0, 0\.92, 0, 0\))$/);
      expect(d.transitions.opacity).toMatchObject({ duration: 240 });
    });
  }

  test('the exit runs back toward the trigger while it is on screen', async ({ page }) => {
    await open(page);
    await page.locator('#edit').click();
    await expect(page.locator('#dialog')).toHaveAttribute('open', '');
    await page.waitForTimeout(400);
    const [cx, cy] = await centreOf(page, '#edit');
    const resume = await freeze(page);
    await page.locator('#cancel').click();
    await expect(page.locator('#dialog')).not.toHaveAttribute('open', '');
    const d = await readDialog(page);
    await resume();
    expect(d.origin).toBe('trigger');
    expect(Math.abs(d.transformOrigin[0] - (cx - d.left))).toBeLessThanOrEqual(1.5);
    expect(Math.abs(d.transformOrigin[1] - (cy - d.top))).toBeLessThanOrEqual(1.5);
    expect(d.transitions.transform).toMatchObject({ duration: 160 });
    expect(d.transitions.transform.to).toMatch(/^(scale\(0\.92\)|matrix\(0\.92, 0, 0, 0\.92, 0, 0\))$/);
    expect(d.transitions.opacity).toMatchObject({ duration: 160 });
  });

  test('a trigger that is gone: the dialog grows from the tap point and leaves with today\'s exit', async ({ page }) => {
    await open(page);
    const [cx, cy] = await centreOf(page, '#vanish');
    const resume = await freeze(page);
    await page.locator('#vanish').click();
    await expect(page.locator('#dialog')).toHaveAttribute('open', '');
    const enter = await readDialog(page);
    await resume();
    expect(enter.origin).toBe('trigger');
    // Playwright clicks the middle of the button: the tap point is its centre
    expect(Math.abs(enter.transformOrigin[0] - (cx - enter.left))).toBeLessThanOrEqual(1.5);
    expect(Math.abs(enter.transformOrigin[1] - (cy - enter.top))).toBeLessThanOrEqual(1.5);
    await page.waitForTimeout(400);
    const resumeExit = await freeze(page);
    await page.locator('#cancel').click();
    await expect(page.locator('#dialog')).not.toHaveAttribute('open', '');
    const exit = await readDialog(page);
    await resumeExit();
    expect(exit.origin).toBeNull();
    expect(exit.transitions.transform?.to ?? 'translateY(8px) scale(0.98)').toMatch(/translateY\(8px\) scale\(0\.98\)|matrix\(0\.98, 0, 0, 0\.98, 0, 8\)/);
  });

  test('a keyboard open stays instant and centred', async ({ page }) => {
    await open(page);
    await page.locator('#new').focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator('#dialog');
    await expect(dialog).toHaveAttribute('data-uix-key-opened', '');
    const d = await readDialog(page);
    expect(d.origin).toBeNull();
    expect(Object.keys(d.transitions)).toEqual([]);
    expect(await dialog.evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('none');
  });

  test('`instant` stays instant', async ({ page }) => {
    await open(page);
    await page.locator('#open-instant').click();
    await expect(page.locator('#instant')).toHaveAttribute('open', '');
    const d = await readDialog(page, '#instant');
    expect(d.origin).toBeNull();
    expect(Object.keys(d.transitions)).toEqual([]);
  });

  for (const [trigger, when] of [['#soon', '400 ms'], ['#later', '1.5 s']]) {
    test(`a dialog a timer opens ${when} after the click opens centred`, async ({ page }) => {
      await open(page);
      await page.locator(trigger).click();
      await expect(page.locator('#dialog')).toHaveAttribute('open', '', { timeout: 5000 });
      expect((await readDialog(page)).origin).toBeNull();
    });
  }

  test('a programmatic click right after an unrelated pointer press opens centred', async ({ page }) => {
    await open(page);
    await page.locator('h1').click();
    await page.evaluate(() => document.getElementById('new').click());
    await expect(page.locator('#dialog')).toHaveAttribute('open', '');
    expect((await readDialog(page)).origin).toBeNull();
  });

  test('a tap on a label whose control opens the dialog grows it from the label', async ({ page }) => {
    await open(page);
    const [cx, cy] = await centreOf(page, '#label-open');
    const resume = await freeze(page);
    // the label's text, not its checkbox: the browser forwards a detail-0 click to the control
    await page.locator('#label-open').click({ position: { x: 40, y: 8 } });
    await expect(page.locator('#dialog')).toHaveAttribute('open', '');
    const d = await readDialog(page);
    await resume();
    expect(d.origin).toBe('trigger');
    expect(Math.abs(d.transformOrigin[0] - (cx - d.left))).toBeLessThanOrEqual(1.5);
    expect(Math.abs(d.transformOrigin[1] - (cy - d.top))).toBeLessThanOrEqual(1.5);
  });

  test('closed and reopened from inside the dialog ("Save and new"): the reopen is centred', async ({ page }) => {
    await open(page);
    await page.locator('#new').click();
    await expect(page.locator('#dialog')).toHaveAttribute('open', '');
    await page.waitForTimeout(400);
    await page.locator('#reopen').click();
    await expect(page.locator('#dialog')).not.toHaveAttribute('open', '');
    await expect(page.locator('#dialog')).toHaveAttribute('open', '');
    expect((await readDialog(page)).origin).toBeNull();
  });

  test('a clickable row inside a focusable main region grows from the row, not from the region', async ({ page }) => {
    await open(page);
    const [rx, ry] = await centreOf(page, '#row-click');
    const [mx, my] = await centreOf(page, '#root');
    const resume = await freeze(page);
    await page.locator('#row-click').click();
    await expect(page.locator('#dialog')).toHaveAttribute('open', '');
    const d = await readDialog(page);
    await resume();
    expect(d.origin).toBe('trigger');
    const [ox, oy] = [d.transformOrigin[0] + d.left, d.transformOrigin[1] + d.top];
    expect(Math.abs(ox - rx)).toBeLessThanOrEqual(4);
    expect(Math.abs(oy - ry)).toBeLessThanOrEqual(4);
    expect(Math.abs(oy - my) + Math.abs(ox - mx)).toBeGreaterThan(8);
  });

  test('the first click on a page mounts the Modal and still grows it from that button', async ({ page }) => {
    await open(page, '?only=lazy&origin=trigger');
    const [cx, cy] = await centreOf(page, '#lazy');
    const resume = await freeze(page);
    await page.locator('#lazy').click();
    await expect(page.locator('#lazy-dialog')).toHaveAttribute('open', '');
    const d = await readDialog(page, '#lazy-dialog');
    await resume();
    expect(d.origin).toBe('trigger');
    expect(Math.abs(d.transformOrigin[0] - (cx - d.left))).toBeLessThanOrEqual(1.5);
    expect(Math.abs(d.transformOrigin[1] - (cy - d.top))).toBeLessThanOrEqual(1.5);
  });

  for (const how of ['the OS setting', 'data-motion="reduce"']) {
    test(`reduced motion (${how}) only fades`, async ({ page }) => {
      if (how === 'the OS setting') await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page);
      if (how !== 'the OS setting') await page.evaluate(() => document.documentElement.setAttribute('data-motion', 'reduce'));
      const resume = await freeze(page);
      await page.locator('#new').click();
      await expect(page.locator('#dialog')).toHaveAttribute('open', '');
      const d = await readDialog(page);
      await resume();
      expect(d.origin).toBeNull();
      expect(d.transitions.opacity).toBeTruthy();
      expect(d.transitions.transform).toBeUndefined();
    });
  }

  test('reduced motion with the attribute set by hand: no scale on the way out either', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const transform = await page.locator('#dialog').evaluate((el) => {
      el.setAttribute('data-uix-origin', 'trigger');
      return getComputedStyle(el).transform;
    });
    expect(transform).toBe('none');
  });
});
