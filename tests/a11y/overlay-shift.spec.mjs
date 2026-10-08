/* The anchored-overlay engine at phone size, in a real browser (HAR-1613).
 *
 * TENSOR /incidents at 320 × 640, the columns menu: the trigger sits at top 302 / bottom 338 and
 * the panel is 304 × 384, so it fits neither above (302 px) nor below (302 px). UIx 2.31.0 chose
 * the top and placed the panel at a negative top, where it could not be reached.
 *
 *   - the panel stays inside the viewport (8 px padding), covering its trigger if it has to;
 *   - that holds on the first frame painted after every page scroll (read in the first animation
 *     frame, which runs after the scroll event and before the paint) and again two frames later,
 *     and after a resize;
 *   - a panel taller than the viewport starts at the padding, and with `capHeight` it is capped
 *     to the viewport and scrolls inside;
 *   - once the trigger has left the viewport the panel goes with it, and `onAnchorHidden` fires
 *     for a consumer that positions with `useAnchoredPosition` itself.
 * Every placement test runs twice: with CSS anchor positioning (Chromium) and with it reported
 * missing (fixed left/top, every other browser). With anchor positioning the browser moves the
 * box with its anchor AFTER resolving `top`, so no written value can hold it at the viewport
 * limit; the hook therefore writes fixed coordinates while the panel is held at the limit or
 * within 64 px of it, and the last test pins that hand-over.
 * Harness: tests/overlay/harness.tsx, bundled from source in globalSetup. */
import { test, expect } from '@playwright/test';
import { settleOverlay } from './settle.mjs';

const HARNESS = '/tests/overlay/harness.html';
const PAD = 8;
const VIEW = { width: 320, height: 640 };

test.use({ viewport: VIEW });
test.setTimeout(60_000);

const ENGINES = [
  { name: 'CSS anchor positioning', blocked: null },
  { name: 'fixed left/top', blocked: 'anchor' },
];

/** Report CSS anchor positioning as unsupported, as in a browser without it. */
const block = (page, pattern) => page.addInitScript((source) => {
  if (!source) return;
  const re = new RegExp(source);
  const supports = CSS.supports.bind(CSS);
  CSS.supports = (...args) => (re.test(args.join(' ')) ? false : supports(...args));
}, pattern);

const open = async (page, pattern) => {
  await block(page, pattern);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('#columns')).toBeVisible();
};

/** Scroll the page so `selector`'s top edge is `top` px below the viewport's top. */
const putTrigger = (page, selector, top) => page.evaluate(({ sel, y }) => {
  window.scrollBy(0, document.querySelector(sel).getBoundingClientRect().top - y);
}, { sel: selector, y: top });

const frames = (page, n = 2) => page.evaluate((count) => new Promise((resolve) => {
  let left = count;
  const tick = () => { left -= 1; if (left <= 0) resolve(); else requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}), n);

const settled = (_page, pop) => settleOverlay(pop);

const box = (pop) => pop.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, vh: window.innerHeight, vw: window.innerWidth };
});

const expectInside = (b, label) => {
  expect(b.top, `${label}: top`).toBeGreaterThanOrEqual(PAD - 0.5);
  expect(b.bottom, `${label}: bottom`).toBeLessThanOrEqual(b.vh - PAD + 0.5);
  expect(b.left, `${label}: left`).toBeGreaterThanOrEqual(PAD - 0.5);
  expect(b.right, `${label}: right`).toBeLessThanOrEqual(b.vw - PAD + 0.5);
};

for (const engine of ENGINES) {
  test.describe(engine.name, () => {
    test('a panel that fits neither above nor below its trigger stays inside the viewport', async ({ page }) => {
      await open(page, engine.blocked);
      await putTrigger(page, '#columns', 302);
      const trigger = await page.locator('#columns').evaluate((el) => el.getBoundingClientRect().toJSON());
      expect(Math.round(trigger.top)).toBe(302);
      expect(trigger.top, 'room above is less than the panel').toBeLessThan(384 + PAD);
      expect(VIEW.height - trigger.bottom, 'room below is less than the panel').toBeLessThan(384 + PAD);

      await page.locator('#columns').click();
      const pop = page.locator('#panel');
      await expect(pop).toBeVisible();
      await settled(page, pop);
      const b = await box(pop);
      expect(Math.round(b.height)).toBe(384);
      expectInside(b, 'at open');
      expect(b.top < trigger.bottom && b.bottom > trigger.top, 'it covers the trigger rather than leave the viewport').toBe(true);
    });

    test('it is inside on the first frame after every page scroll, with no stale frame', async ({ page }) => {
      await open(page, engine.blocked);
      await putTrigger(page, '#columns', 302);
      await page.locator('#columns').click();
      const pop = page.locator('#panel');
      await settled(page, pop);
      // Walk the trigger up to the top edge, down to the bottom edge and back, in view throughout.
      const steps = [-60, -60, -60, -60, -50, 90, 90, 90, 90, 90, 90, 80, -110, -110, -70];
      for (const [i, dy] of steps.entries()) {
        // The first animation frame after the scroll: the scroll event has been handled and
        // nothing has been painted yet. For a panel held with fixed coordinates (every state at
        // or near the viewport limit) this is exactly what the first painted frame shows; for an
        // anchored one script reads the previous frame's box here, and the read two frames
        // later is the one that counts.
        const first = await page.evaluate((d) => new Promise((resolve) => {
          window.scrollBy(0, -d);
          requestAnimationFrame(() => {
            const r = document.getElementById('panel').getBoundingClientRect();
            const t = document.getElementById('columns').getBoundingClientRect();
            resolve({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, vh: window.innerHeight, vw: window.innerWidth, trigger: t.top });
          });
        }), dy);
        expect(first.trigger > -36 && first.trigger < VIEW.height, `step ${i}: the trigger is still in view`).toBe(true);
        expectInside(first, `step ${i} (trigger at ${Math.round(first.trigger)}), first frame`);
        await frames(page);
        expectInside(await box(pop), `step ${i}, two frames later`);
      }
    });

    test('it is inside after a resize, and starts at the padding when the viewport is shorter than it', async ({ page }) => {
      await open(page, engine.blocked);
      await putTrigger(page, '#columns', 302);
      await page.locator('#columns').click();
      const pop = page.locator('#panel');
      await settled(page, pop);

      await page.setViewportSize({ width: 320, height: 500 });
      await putTrigger(page, '#columns', 230);
      await frames(page);
      expectInside(await box(pop), '320 × 500');

      await page.setViewportSize({ width: 320, height: 380 });
      await putTrigger(page, '#columns', 170);
      await frames(page);
      const short = await box(pop);
      expect(Math.round(short.top), 'taller than the viewport: it starts at the padding').toBe(PAD);

      // Room again: back flush against the trigger, on the side that fits.
      await page.setViewportSize({ width: 320, height: 900 });
      await putTrigger(page, '#columns', 100);
      await frames(page);
      const roomy = await box(pop);
      const trigger = await page.locator('#columns').evaluate((el) => el.getBoundingClientRect().toJSON());
      expect(Math.round(roomy.top)).toBe(Math.round(trigger.bottom) + 6);
      expectInside(roomy, '320 × 900');
    });

    test('capHeight: a panel taller than the viewport is capped to it and scrolls inside', async ({ page }) => {
      await open(page, engine.blocked);
      await putTrigger(page, '#tall-trigger', 302);
      await page.locator('#tall-trigger').click();
      const pop = page.locator('#tall');
      await expect(pop).toBeVisible();
      await settled(page, pop);
      const b = await box(pop);
      expectInside(b, 'capped');
      expect(Math.round(b.height)).toBe(VIEW.height - 2 * PAD);
      const scroll = await pop.evaluate((el) => {
        el.scrollTop = 300;
        return { top: el.scrollTop, overflowY: getComputedStyle(el).overflowY, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
      });
      expect(scroll.overflowY).toBe('auto');
      expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
      expect(scroll.top, 'the content scrolls inside the panel').toBe(300);
      await frames(page);
      expectInside(await box(pop), 'after scrolling inside');

      // A shorter viewport caps it again; closing gives the max-height back.
      await page.setViewportSize({ width: 320, height: 400 });
      await putTrigger(page, '#tall-trigger', 180);
      await frames(page);
      const small = await box(pop);
      expect(Math.round(small.height)).toBe(400 - 2 * PAD);
      expectInside(small, '320 × 400');
      // the capped panel covers its trigger here, so the pointer cannot reach it: activate it directly
      await page.locator('#tall-trigger').evaluate((el) => el.click());
      await expect(pop).toBeHidden();
      expect(await pop.evaluate((el) => el.style.maxHeight)).toBe('');
    });

    test('once the trigger leaves the viewport the panel goes with it', async ({ page }) => {
      await open(page, engine.blocked);
      await putTrigger(page, '#columns', 302);
      await page.locator('#columns').click();
      const pop = page.locator('#panel');
      await settled(page, pop);
      await putTrigger(page, '#columns', -500);
      await frames(page, 3);
      const b = await box(pop);
      expect(b.bottom, 'not held at the padding once its trigger is gone').toBeLessThan(PAD);
    });

    test('onAnchorHidden closes a panel placed with useAnchoredPosition', async ({ page }) => {
      await open(page, engine.blocked);
      await putTrigger(page, '#hook-trigger', 302);
      await page.locator('#hook-trigger').click();
      const pop = page.locator('#hook-panel');
      await expect(pop).toBeVisible();
      await settled(page, pop);
      const trigger = await page.locator('#hook-trigger').evaluate((el) => el.getBoundingClientRect().toJSON());
      expect(Math.round((await box(pop)).top), 'placed by the hook, below its trigger').toBe(Math.round(trigger.bottom) + 6);
      expect(await page.evaluate(() => window.__overlay.hookHidden)).toBe(0);

      await putTrigger(page, '#hook-trigger', 120);
      await frames(page);
      await expect(pop, 'a scroll that keeps the trigger in view does not close it').toBeVisible();

      await putTrigger(page, '#hook-trigger', -400);
      await expect.poll(() => page.evaluate(() => window.__overlay.hookHidden)).toBe(1);
      await expect(pop).toBeHidden();
    });
  });
}

test('with CSS anchor positioning: fixed coordinates at and near the viewport limit, anchored where there is room', async ({ page }) => {
  await open(page, null);
  test.skip(!(await page.evaluate(() => CSS.supports('top', 'round(anchor(bottom) + 1px, 1px)'))), 'no anchor positioning in this browser');
  const pop = page.locator('#panel');
  const written = () => pop.evaluate((el) => ({ top: el.style.top, anchor: el.style.getPropertyValue('position-anchor') }));

  // held at the limit: a viewport coordinate, and no position-anchor (with one set, Chromium
  // offsets even a plain px inset)
  await putTrigger(page, '#columns', 302);
  await page.locator('#columns').click();
  await settled(page, pop);
  expect(await written()).toEqual({ top: '248px', anchor: '' });

  // 20 px inside the limit: still fixed, one frame of scrolling could carry it across
  await putTrigger(page, '#columns', 186);
  await frames(page);
  expect(await written()).toEqual({ top: '228px', anchor: '' });

  // room on both sides of the flush position: anchored, so the browser keeps it on its trigger
  await putTrigger(page, '#columns', 100);
  await frames(page);
  const roomy = await written();
  expect(roomy.top).toMatch(/anchor\(bottom\)/);
  expect(roomy.anchor).toMatch(/^--uix-anchor-\d+$/);
  // (script sees an anchored box's rect one rendering update late — the browser paints it in
  // place, but getBoundingClientRect catches up a frame after the scroll — so read two frames on)
  await page.evaluate(() => window.scrollBy(0, 20));
  await frames(page);
  const glued = await page.evaluate(() => {
    const r = document.getElementById('panel').getBoundingClientRect();
    const t = document.getElementById('columns').getBoundingClientRect();
    return { gap: r.top - t.bottom, top: document.getElementById('panel').style.top };
  });
  expect(Math.round(glued.gap), 'still flush on its trigger after a scroll').toBe(6);
  expect(glued.top, 'and nothing had to be rewritten for that: the browser moved it').toBe(roomy.top);

  // and back to fixed coordinates when it comes near the top limit
  await putTrigger(page, '#columns', 10);
  await frames(page);
  expect(await written()).toEqual({ top: '52px', anchor: '' });
});
