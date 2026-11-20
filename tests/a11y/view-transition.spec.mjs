/* useViewTransition in a real browser (the smartphone-OS study, 2026-11: spatial continuity between
 * the states of an occasional surface). The harness is tests/view-transition/harness.tsx. Runs in
 * Chromium, Firefox and WebKit (CROSS_BROWSER_SPECS) and proves:
 *   - a pointer change morphs on the glide spring (280 ms, linear()), its pictures swap in 160 ms,
 *     and the hook takes its mark and its names back afterwards;
 *   - the keyboard, reduced motion (the OS or data-motion="reduce") and a browser without the API
 *     get the change at once;
 *   - repeat clicks never leave anything behind; a click elsewhere in the middle of a morph lands
 *     (the morphing part itself takes clicks again once it settles: the browser draws it from the
 *     held picture meanwhile), and a second start ends the running one;
 *   - DataWorkspace's Maximize morphs from the pointer and Escape restores at once;
 *   - a DashboardCanvas pointer drop morphs the cards, on the canvas itself where the engine can.
 * The hook's contract is unit-tested in packages/react/src/view-transition-dom.test.mjs. */
import { test, expect } from '@playwright/test';

const HARNESS = '/tests/view-transition/harness.html';
const themeOf = (name) => (name === 'dark' ? 'dark' : 'light');

test.beforeEach(async ({ page }, testInfo) => {
  const theme = themeOf(testInfo.project.name);
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ } }, theme);
  await page.setViewportSize({ width: 1280, height: 900 });
});

const open = async (page) => {
  await page.goto(HARNESS);
  await expect(page.locator('#list')).toBeVisible();
};

/**
 * Watch the next kit view transition, timed in the page: where it ran (the html element or a
 * scope), the timing of its pseudo-element animations, the names given while it ran, and whether
 * the mark came off again. Start it, act, then await the returned promise.
 */
const watch = async (page, ms = 1500) => {
  await page.evaluate((span) => {
    window.__watch = new Promise((resolve) => {
      const t0 = performance.now();
      const seen = { root: null, groups: [], images: [], names: new Set(), cleared: false };
      const tick = () => {
        const marked = document.querySelector('[data-uix-view-transition]');
        if (marked && !seen.root) seen.root = marked === document.documentElement ? 'html' : marked.id || marked.className;
        document.querySelectorAll('[style*="view-transition-name"]').forEach((el) => seen.names.add(el.id || el.dataset.canvasId || el.className));
        for (const a of document.getAnimations()) {
          const pseudo = a.effect?.pseudoElement ?? '';
          if (!pseudo.startsWith('::view-transition')) continue;
          // a CSS animation's timing function is on its keyframes; the effect's own easing is linear
          const entry = { pseudo, duration: a.effect.getComputedTiming().duration, easing: a.effect.getKeyframes()[0]?.easing ?? '' };
          (pseudo.startsWith('::view-transition-group') ? seen.groups : seen.images).push(entry);
        }
        if (seen.root && !marked) { seen.cleared = true; finish(); return; }
        if (performance.now() - t0 > span) { finish(); return; }
        requestAnimationFrame(tick);
      };
      const finish = () => resolve({ ...seen, names: [...seen.names], left: document.querySelectorAll('[style*="view-transition"]').length });
      requestAnimationFrame(tick);
    });
  }, ms);
  return () => page.evaluate(() => window.__watch);
};
const vt = (page) => page.evaluate(() => window.__vt);

test('a pointer opens the row into its detail on the glide spring, then takes its mark and names back', async ({ page }) => {
  await open(page);
  const seen = await watch(page);
  await page.locator('[data-open="INC-0413"]').click();
  const run = await seen();
  expect((await vt(page)).animated).toEqual([true]);
  expect(run.root).toBe('html');
  expect(run.cleared, 'the mark comes off when the morph ends').toBe(true);
  expect(run.left, 'no view-transition-name is left on the page').toBe(0);
  expect(run.names).toEqual(expect.arrayContaining(['detail']));
  await expect(page.locator('#detail')).toBeVisible();
  // the engine reports the pseudo-element animations: the box on the spring, the pictures faster
  const groups = run.groups.filter((g) => g.pseudo.includes('uix-vt-'));
  if (groups.length) {
    for (const g of groups) {
      expect(g.duration).toBe(280);
      expect(g.easing).toMatch(/^linear\(/);
    }
    for (const image of run.images.filter((i) => i.pseudo.includes('uix-vt-'))) {
      expect(image.duration).toBe(160);
      expect(image.easing).toMatch(/^cubic-bezier\(/);
    }
  }
  expect(Math.max(0, ...run.groups.map((g) => g.duration)), 'nothing runs past about 300 ms').toBeLessThanOrEqual(300);
  await page.locator('#back').click();
  await expect(page.locator('#list')).toBeVisible();
  await expect(page.locator('[data-uix-view-transition]')).toHaveCount(0);
});

test('the keyboard gets the change at once', async ({ page }) => {
  await open(page);
  await page.locator('[data-open="INC-0412"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#detail')).toBeVisible();
  expect((await vt(page)).animated).toEqual([false]);
  await page.locator('#back').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#list')).toBeVisible();
  expect((await vt(page)).animated).toEqual([false, false]);
  await expect(page.locator('[data-uix-view-transition]')).toHaveCount(0);
});

test('reduced motion, from the OS or data-motion="reduce", gets the change at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await page.locator('[data-open="INC-0412"]').click();
  await expect(page.locator('#detail')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => document.documentElement.setAttribute('data-motion', 'reduce'));
  await page.locator('#back').click();
  await expect(page.locator('#list')).toBeVisible();
  expect((await vt(page)).animated).toEqual([false, false]);
  await expect(page.locator('[data-uix-view-transition]')).toHaveCount(0);
});

test('without the View Transitions API the change happens at once', async ({ page }) => {
  await page.addInitScript(() => {
    delete Document.prototype.startViewTransition;
    delete Element.prototype.startViewTransition;
  });
  await open(page);
  expect(await page.evaluate(() => 'startViewTransition' in document)).toBe(false);
  await page.locator('[data-open="INC-0415"]').click();
  await expect(page.locator('#detail')).toBeVisible();
  await page.locator('#back').click();
  await expect(page.locator('#list')).toBeVisible();
  expect((await vt(page)).animated).toEqual([false, false]);
  await expect(page.locator('[data-uix-view-transition]')).toHaveCount(0);
});

test('repeat clicks leave nothing behind; a click elsewhere mid-morph lands; a second start ends the first', async ({ page }) => {
  await open(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // five changes, each click as soon as its control can take one
  for (let i = 0; i < 5; i++) await page.locator(i % 2 ? '#back' : '[data-open="INC-0413"]').click();
  await expect(page.locator('#detail'), 'five clicks from the list end on the detail').toBeVisible();
  await expect.poll(async () => (await vt(page)).finished, 'every start settles').toBe(5);
  expect((await vt(page)).animated).toEqual([true, true, true, true, true]);
  await expect(page.locator('[data-uix-view-transition]')).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelectorAll('[style*="view-transition"]').length)).toBe(0);

  // a click outside the morphing part while it runs: the held picture lets the pointer through.
  // The glide is stretched to 2 s here so "while it runs" does not depend on the machine's speed.
  await page.locator('#back').click();
  await expect(page.locator('#list')).toBeVisible();
  await expect(page.locator('[data-uix-view-transition]')).toHaveCount(0);
  await page.evaluate(() => document.documentElement.style.setProperty('--uix-dur-glide', '2000ms'));
  await page.evaluate(async () => {
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    document.querySelector('[data-open="INC-0412"]').click();
    // the live page has the new layout once the detail is there; the morph still runs
    await new Promise((resolve) => { const t = () => (document.documentElement.hasAttribute('data-uix-view-transition') && document.querySelector('#detail') ? resolve() : requestAnimationFrame(t)); t(); });
  });
  const more = await page.locator('#workspace').getByRole('button', { name: 'More' }).boundingBox();
  const markedAtClick = await page.evaluate(() => document.documentElement.hasAttribute('data-uix-view-transition'));
  await page.mouse.click(more.x + more.width / 2, more.y + more.height / 2);
  await expect(page.getByRole('menuitemcheckbox', { name: 'Maximize' }), 'the menu opened under the morph').toBeVisible();
  expect(markedAtClick, 'the click was made while the morph ran').toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#detail')).toContainText('INC-0412');
  await expect(page.locator('[data-uix-view-transition]')).toHaveCount(0);

  // a second start in the middle of a morph ends the first where it is and lands on the newest state
  await page.locator('#back').click();
  await expect(page.locator('#list')).toBeVisible();
  await expect(page.locator('[data-uix-view-transition]')).toHaveCount(0);
  const before = (await vt(page)).finished;
  await page.evaluate(async () => {
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    window.__records.go('INC-0415');
    await new Promise((resolve) => { const t = () => (document.documentElement.hasAttribute('data-uix-view-transition') && document.querySelector('#detail') ? resolve() : requestAnimationFrame(t)); t(); });
    window.__records.go(null);
  });
  await expect(page.locator('#list')).toBeVisible();
  await expect.poll(async () => (await vt(page)).finished - before, 'both starts settle').toBe(2);
  await expect(page.locator('[data-uix-view-transition]')).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelectorAll('[style*="view-transition"]').length)).toBe(0);
  expect(errors).toEqual([]);
});

test('DataWorkspace: Maximize from the pointer morphs the workspace, back too; Escape restores at once', async ({ page }) => {
  await open(page);
  const workspace = page.locator('#workspace');
  const more = () => workspace.getByRole('button', { name: 'More' });
  const maximize = () => page.getByRole('menuitemcheckbox', { name: 'Maximize' });

  let seen = await watch(page);
  await more().click();
  await maximize().click();
  let run = await seen();
  expect(run.root).toBe('html');
  expect(run.names).toEqual(['workspace']);
  expect(run.left).toBe(0);
  await expect(workspace).toHaveClass(/uix-data-workspace--maximized/);
  const full = await workspace.boundingBox();
  expect(full.width, 'it takes the window').toBeGreaterThan(1200);

  seen = await watch(page);
  await more().click();
  await maximize().click();
  run = await seen();
  expect(run.cleared).toBe(true);
  await expect(workspace).not.toHaveClass(/uix-data-workspace--maximized/);

  await more().click();
  await maximize().click();
  await expect(workspace).toHaveClass(/uix-data-workspace--maximized/);
  await expect(page.locator('[data-uix-view-transition]')).toHaveCount(0);
  seen = await watch(page, 400);
  await page.keyboard.press('Escape');
  await expect(workspace).not.toHaveClass(/uix-data-workspace--maximized/);
  run = await seen();
  expect(run.root, 'Escape: no transition').toBeNull();
});

test('DashboardCanvas: a pointer drop morphs the cards it moves, on the canvas where the engine can', async ({ page }) => {
  await open(page);
  const canvas = page.locator('#canvas');
  await canvas.scrollIntoViewIfNeeded();
  const scoped = await page.evaluate(() => typeof Element.prototype.startViewTransition === 'function');
  const handle = await page.getByRole('button', { name: 'Move Mir zugewiesen' }).boundingBox();
  const target = await page.getByRole('button', { name: 'Move Offene Störungen' }).boundingBox();
  const seen = await watch(page);
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + 10, handle.y - 10, { steps: 3 });
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
  await page.mouse.up();
  const run = await seen();
  expect(run.root).toBe(scoped ? 'canvas' : 'html');
  expect(run.names).toEqual(expect.arrayContaining(['open', 'sla', 'new', 'mine', 'done']));
  expect(run.left).toBe(0);
  expect(run.cleared).toBe(true);
  // the dropped card is at the top left now
  const mine = await page.locator('[data-canvas-id="mine"]').boundingBox();
  const canvasBox = await canvas.boundingBox();
  expect(Math.abs(mine.y - canvasBox.y)).toBeLessThan(24);
  // arrow keys stay instant
  const step = await watch(page, 400);
  await page.getByRole('button', { name: 'Move Neu heute' }).focus();
  await page.keyboard.press('ArrowLeft');
  expect((await step()).root).toBeNull();
});
