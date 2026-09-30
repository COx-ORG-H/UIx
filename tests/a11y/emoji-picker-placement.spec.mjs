/* Emoji picker placement in a real browser (TENSOR HAR-993: "the emoji card jumps when a category
 * is selected and there is not enough space below", "slow to follow the page scroll", "better if
 * it closes when the editor is not visible any more").
 *
 * - the picker is one size loading, loaded, searching with no results and failed, so the side it
 *   opened on stays right;
 * - opened near the bottom it opens on top, and a category click scrolls the grid only: the
 *   picker does not move and the page does not scroll;
 * - it stays attached while the page scrolls, closes once its trigger is scrolled out of view,
 *   and focus is not pulled back to that trigger (the page does not scroll back);
 * - the enter motion moves away from the trigger (from below when it opens on top), and not at
 *   all under prefers-reduced-motion.
 * Placement runs twice: with CSS anchor positioning (Chromium) and with it reported missing, the
 * fixed left/top path every browser without it takes. Uses the rich-text harness
 * (tests/rich-text/harness.tsx), bundled from source in globalSetup.
 */
import { test, expect } from '@playwright/test';

test.setTimeout(60_000);

const HARNESS = '/tests/rich-text/harness.html';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); localStorage.removeItem('uix-emoji-recent'); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('#standalone-picker')).toBeVisible();
});

/** Report CSS anchor positioning as unsupported, as in a browser without it. */
const withoutAnchoring = async (page) => {
  await page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    CSS.supports = (...args) => (/anchor/.test(args.join(' ')) ? false : supports(...args));
  });
  await page.reload({ waitUntil: 'networkidle' });
};

/** Scroll the page so `selector`'s bottom edge sits `fromBottom` px above the viewport's bottom. */
const putTrigger = (page, selector, fromBottom) => page.evaluate(({ sel, gap }) => {
  const r = document.querySelector(sel).getBoundingClientRect();
  window.scrollBy(0, r.bottom - (window.innerHeight - gap));
}, { sel: selector, gap: fromBottom });

const frames = (page, n = 2) => page.evaluate((count) => new Promise((resolve) => {
  let left = count;
  const tick = () => { left -= 1; if (left <= 0) resolve(); else requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}), n);

/** Wait for the enter motion to finish, then read the box and where the page is. */
const measure = async (page, pop) => {
  await expect.poll(() => pop.evaluate((el) => el.getAnimations().length)).toBe(0);
  return pop.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      box: { x: r.x, y: r.y, width: r.width, height: r.height },
      placement: el.dataset.placement,
      scrollY: window.scrollY,
      anchored: /anchor\(/.test(el.style.top) && el.style.getPropertyValue('position-anchor') !== '',
    };
  });
};

test('the picker is one size loading, loaded, searching with no results and failed', async ({ page }) => {
  const trigger = page.locator('#gated-picker');
  const pop = page.getByRole('dialog', { name: 'Gated emoji picker' });
  const size = async () => (await measure(page, pop)).box;
  await putTrigger(page, '#gated-picker', 500);
  await trigger.click();
  await expect(pop.getByRole('status')).toHaveText('Loading emoji…');
  const loading = await size();
  expect(loading.height).toBeGreaterThan(300);

  await page.evaluate(() => window.__rte.emojiGate.release());
  await expect(pop.getByRole('group', { name: 'Emoji categories' }).getByRole('button').first()).toBeVisible();
  await expect(pop.getByRole('status')).toBeHidden();
  expect(await size(), 'loaded').toEqual(loading);

  await expect(pop.getByRole('searchbox')).toBeFocused();
  await page.keyboard.type('zzqqxxvv');
  await expect(pop.getByRole('status')).toHaveText('No emoji found');
  expect(await size(), 'searching, no results').toEqual(loading);
  await page.keyboard.press('Escape');
  await expect(pop).toBeHidden();

  // A fresh picker whose data fails to load.
  await page.reload({ waitUntil: 'networkidle' });
  await putTrigger(page, '#gated-picker', 500);
  await trigger.click();
  await expect(pop.getByRole('status')).toHaveText('Loading emoji…');
  await page.evaluate(() => window.__rte.emojiGate.fail());
  await expect(pop.getByRole('status')).toHaveText('Emoji could not be loaded.');
  expect(await size(), 'failed').toEqual(loading);
});

for (const anchoring of [true, false]) {
  const mode = anchoring ? 'CSS anchor positioning' : 'fixed fallback';

  test(`near the bottom it opens on top, and a category click moves only the grid (${mode})`, async ({ page }) => {
    if (!anchoring) await withoutAnchoring(page);
    await putTrigger(page, '#standalone-picker', 120);
    await page.locator('#standalone-picker').click();
    const pop = page.getByRole('dialog', { name: 'Emoji auswählen' });
    const categories = pop.getByRole('group', { name: 'Emoji categories' }).getByRole('button');
    await expect(categories.nth(5)).toBeVisible();
    const before = await measure(page, pop);
    expect(before.placement, 'not enough room below: on top from the start').toBe('top-start');
    expect(before.anchored).toBe(anchoring);

    for (const index of [5, 2, 7]) {
      await categories.nth(index).click();
      await expect(pop.locator('.uix-emoji-picker__btn:focus')).toHaveCount(1);
      await frames(page, 3);
      const after = await measure(page, pop);
      expect(after.box, `category ${index}: the picker did not move`).toEqual(before.box);
      expect(after.placement).toBe('top-start');
      expect(after.scrollY, `category ${index}: the page did not scroll`).toBe(before.scrollY);
    }
    // the grid scrolled so the chosen category's heading is at its top
    const heading = await pop.evaluate((el) => {
      const grid = el.querySelector('.uix-emoji-picker__grid');
      const focused = el.querySelector('.uix-emoji-picker__btn:focus').closest('section');
      return { scrolled: grid.scrollTop, offset: focused.getBoundingClientRect().top - grid.getBoundingClientRect().top };
    });
    expect(heading.scrolled).toBeGreaterThan(0);
    expect(Math.abs(heading.offset)).toBeLessThanOrEqual(1);
  });

  test(`it follows the page scroll and closes once the trigger is scrolled away (${mode})`, async ({ page }) => {
    if (!anchoring) await withoutAnchoring(page);
    const trigger = page.locator('#standalone-picker');
    await putTrigger(page, '#standalone-picker', 700);
    await trigger.click();
    const pop = page.getByRole('dialog', { name: 'Emoji auswählen' });
    await expect(pop.getByRole('searchbox')).toBeFocused();
    const gap = () => page.evaluate(() => {
      const t = document.querySelector('#standalone-picker').getBoundingClientRect();
      const p = document.querySelector('[role="dialog"][aria-label="Emoji auswählen"]').getBoundingClientRect();
      return Math.round(p.top - t.bottom);
    });
    const opened = await measure(page, pop);
    expect(opened.placement).toBe('bottom-start');
    expect(await gap()).toBe(6);

    // A wheel over the page (not over the picker, whose grid would take it).
    await page.mouse.move(20, 880);
    await page.mouse.wheel(0, 120);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(opened.scrollY);
    await frames(page, 2);
    expect(await gap(), 'still attached after scrolling').toBe(6);
    await expect(pop).toBeVisible();

    // Scroll the trigger out of the top of the viewport.
    await page.mouse.wheel(0, 700);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(pop).toBeHidden();
    await expect(trigger).not.toBeFocused();
    // focus was not sent back to the trigger, so nothing scrolled it back into view
    await frames(page, 6);
    expect(await trigger.evaluate((el) => el.getBoundingClientRect().bottom), 'the trigger stays scrolled away').toBeLessThan(0);
    // nothing of the anchoring is left behind
    const leftovers = await page.evaluate(() => ({
      anchorName: document.querySelector('.uix-emoji-picker__anchor').style.getPropertyValue('anchor-name'),
      positionAnchor: document.querySelector('[role="dialog"][aria-label="Emoji auswählen"]').style.getPropertyValue('position-anchor'),
    }));
    expect(leftovers).toEqual({ anchorName: '', positionAnchor: '' });
  });
}

/** Open the standalone picker and return where its enter motion starts, from its first frames. */
const enterMotion = (page) => page.evaluate(async () => {
  const pop = document.querySelector('[role="dialog"][aria-label="Emoji auswählen"]');
  document.querySelector('#standalone-picker').click();
  for (let i = 0; i < 30; i += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const move = pop.getAnimations().find((a) => a.transitionProperty === 'transform');
    if (move) {
      const [from] = move.effect.getKeyframes();
      const y = from.transform === 'none' ? 0 : new DOMMatrixReadOnly(from.transform).m42;
      return { placement: pop.dataset.placement, fromY: y, duration: move.effect.getTiming().duration };
    }
    if (pop.matches(':popover-open') && !pop.hasAttribute('data-uix-placing') && i > 10) break;
  }
  return { placement: pop.dataset.placement, fromY: null, duration: 0 };
});

test('the enter motion moves away from the trigger, and not at all with reduced motion', async ({ page }) => {
  await putTrigger(page, '#standalone-picker', 120);
  const search = page.getByRole('searchbox', { name: 'Emoji suchen' });
  const top = await enterMotion(page);
  expect(top.placement).toBe('top-start');
  expect(top.fromY, 'on top: rises from 4px below').toBe(4);
  await expect(search).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Emoji auswählen' })).toBeHidden();

  await putTrigger(page, '#standalone-picker', 700);
  const below = await enterMotion(page);
  expect(below.placement).toBe('bottom-start');
  expect(below.fromY, 'below: drops from 4px above').toBe(-4);
  await expect(search).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(search).toBeHidden();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await enterMotion(page);
  expect(reduced.duration, 'no visible motion').toBeLessThanOrEqual(1);
});
