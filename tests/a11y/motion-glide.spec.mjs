/* The 2.60 motion in a real browser (the animate-ui study, rebuilt natively in UIx). The harness is
 * tests/motion-glide/harness.tsx. Each check proves what moves, that it settles where it should, and
 * that reduced motion and the keyboard get none of it:
 *   - the sidebar's hover mark glides (clip-path on the glide spring) and the current-page tint slides;
 *   - a tooltip glides to its neighbour and lands exactly where a fresh one would (no jump);
 *   - a select list's rows arrive staggered, clearing from a short blur, from a pointer and from the
 *     keyboard (operator, 2026-11-08);
 *   - the side drawer floats 8 px in from the edges and keeps a fade under reduced motion;
 *   - an `animate`d icon plays on hover only; an icon without it never moves;
 *   - axe finds nothing serious in either theme.
 * The markup contract is unit-tested in packages/react/src/motion-glide-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/motion-glide/harness.html';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ } }, theme);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(HARNESS);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#nav')).toBeVisible();
});

const row = (page, name) => page.locator('#nav .uix-navitem', { hasText: name });
const clipTop = (page) => page.locator('#nav > .uix-glide').evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);
/**
 * Record `read()` (a function body run in the page) every animation frame for `ms`, timed in the page:
 * a sample taken after a Playwright sleep is late by however long the machine took, and on a loaded
 * one the motion has already ended. Start it, act, then `await` the returned promise.
 */
const record = async (page, read, ms = 700) => {
  await page.evaluate(([body, span]) => {
    const fn = new Function(body);
    window.__frames = [];
    const t0 = performance.now();
    const tick = () => {
      const t = performance.now() - t0;
      window.__frames.push({ t, v: fn() });
      if (t < span) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [read, ms]);
  return async () => {
    await page.waitForFunction((span) => window.__frames.length && window.__frames.at(-1).t >= span, ms);
    return page.evaluate(() => window.__frames);
  };
};

test('the sidebar hover mark glides between rows; reduced motion jumps', async ({ page }) => {
  await row(page, 'Übersicht').hover();
  await expect(page.locator('#nav')).toHaveAttribute('data-uix-glide', '');
  // the layer has faded in before it can glide
  await expect(page.locator('#nav > .uix-glide')).toHaveAttribute('data-shown', '');
  const start = await clipTop(page);
  const frames = await record(page, "return new DOMMatrixReadOnly(getComputedStyle(document.querySelector('#nav > .uix-glide')).transform).m42;", 600);
  await row(page, 'Teams').hover();
  const end = await row(page, 'Teams').evaluate((el) => el.offsetTop);
  const tops = (await frames()).map((f) => f.v);
  expect(tops.some((y) => y > start + 1 && y < end - 1), `part way there on some frame: ${tops.map(Math.round).join(' ')}`).toBe(true);
  await expect.poll(() => clipTop(page)).toBeCloseTo(end, 0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const property = await page.locator('#nav > .uix-glide').evaluate((el) => getComputedStyle(el).transitionProperty);
  expect(property, 'reduced motion drops the glide, keeps the fade').not.toContain('transform');
});

test('the glide layer never makes a list scroll (no overflow of its own)', async ({ page }) => {
  const size = (sel) => page.locator(sel).evaluate((el) => `${el.scrollWidth}x${el.scrollHeight} ${el.clientWidth}x${el.clientHeight}`);
  const nav = await size('#nav');
  for (const name of ['Übersicht', 'Teams', 'Posteingang']) await row(page, name).hover();
  expect(await size('#nav')).toBe(nav);
  await page.locator('#team').click();
  await expect(page.locator('.uix-select__popup')).toBeVisible();
  // rows arriving 8 px from the inline end overflow for a moment: the list must clip sideways, so no
  // classic scrollbar ever appears (it shifted the rows mid-click in Linux WebKit)
  expect(await page.locator('.uix-select__listbox').evaluate((el) => getComputedStyle(el).overflowX)).toBe('hidden');
  await expect.poll(() => page.locator('.uix-select__popup').evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length)).toBe(0);
  const list = await size('.uix-select__listbox');
  for (const o of ['Netzwerk', 'Telefonie', 'Service Desk']) await page.locator('.uix-select__popup [role="option"]', { hasText: o }).hover();
  expect(await size('.uix-select__listbox')).toBe(list);
});

test('the current-page tint slides to a clicked row and hands back at rest; the keyboard jumps', async ({ page }) => {
  const mark = page.locator('#nav > .uix-sidebar__mark');
  await row(page, 'Teams').click();
  await expect(mark).toBeVisible();
  await expect(mark).toBeHidden({ timeout: 1500 });
  await expect(row(page, 'Teams')).toHaveAttribute('aria-current', 'page');
  await row(page, 'Störungen').focus();
  await page.keyboard.press('Enter');
  await expect(row(page, 'Störungen')).toHaveAttribute('aria-current', 'page');
  await expect(mark).toBeHidden();
});

const bubbleTop = (page) => page.evaluate(() => {
  const b = [...document.querySelectorAll('.uix-tooltip__bubble')].find((x) => x.matches(':popover-open'));
  return b ? { top: Math.round(b.getBoundingClientRect().top), morph: b.hasAttribute('data-morph') } : null;
});

test('a tooltip glides to its neighbour and lands where a fresh one would', async ({ page }) => {
  const button = (name) => page.locator('#toolbar').getByRole('button', { name });
  // where a freshly opened "Kopieren" sits
  await button('Kopieren').hover();
  await expect.poll(async () => (await bubbleTop(page))?.top ?? null).not.toBeNull();
  await page.waitForTimeout(400);
  const fresh = (await bubbleTop(page)).top;
  await page.mouse.move(5, 5);
  await page.waitForTimeout(800);
  // wider → narrower (the case that used to jump 10 px up)
  await button('Link einfügen').hover();
  await page.waitForTimeout(700);
  await button('Kopieren').hover();
  await page.waitForTimeout(40);
  expect((await bubbleTop(page)).morph, 'gliding from the neighbour').toBe(true);
  // The jump came from the UA's popover overflow:auto: the scaled background raised a classic
  // scrollbar (10 px) mid-glide and the engine placed the bubble that much higher. Headless Chromium
  // draws overlay scrollbars (no height), so check the cause directly: the bubble never scrolls.
  const overflow = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.uix-tooltip__bubble')].find((x) => x.matches(':popover-open'));
    return `${getComputedStyle(b).overflowX} ${getComputedStyle(b).overflowY}`;
  });
  expect(overflow).toBe('visible visible');
  await expect.poll(async () => (await bubbleTop(page)).morph).toBe(false);
  expect((await bubbleTop(page)).top).toBe(fresh);
});

test('under reduced motion a neighbour swaps at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const button = (name) => page.locator('#toolbar').getByRole('button', { name });
  await button('Suchen').hover();
  await page.waitForTimeout(700);
  await button('Link einfügen').hover();
  await page.waitForTimeout(30);
  expect((await bubbleTop(page)).morph).toBe(false);
});

const opacities = (page) => page.locator('.uix-select__popup .uix-listbox__option').evaluateAll((els) => els.map((e) => Number(getComputedStyle(e).opacity)));
const filters = (page) => page.locator('.uix-select__popup .uix-listbox__option').evaluateAll((els) => els.map((e) => getComputedStyle(e).filter));

/** One frame of the open list: each row's opacity and filter. */
const ROWS = "const o = [...document.querySelectorAll('.uix-select__popup:popover-open .uix-listbox__option')]; return o.map((e) => [Number(getComputedStyle(e).opacity), getComputedStyle(e).filter]);";
/** Some frame shows the rows arriving top to bottom (the first ahead of the last) with the last still blurred. */
const arriving = (frames) => frames.some(({ v }) => v.length > 2 && v[0][0] > v.at(-1)[0] && v.at(-1)[1].includes('blur'));

test('select rows arrive top to bottom, clearing from a blur, from a pointer and from the keyboard', async ({ page }) => {
  let frames = await record(page, ROWS);
  await page.locator('#team').click();
  expect(arriving(await frames()), 'the rows arrive top to bottom, the later ones still blurred').toBe(true);
  await expect.poll(async () => Math.min(...(await opacities(page)))).toBe(1);
  // the fade takes --uix-dur-fade-in, the blur the whole arrival: wait for it to clear
  await expect.poll(async () => [...new Set(await filters(page))], { message: 'at rest every row is sharp' }).toEqual(['none']);
  await page.keyboard.press('Escape');
  await page.locator('#team').focus();
  // the list holds open --uix-hold-pick after a pointer pick; an Escape closed it at once
  await expect(page.locator('.uix-select__popup')).toBeHidden();
  // 2.60 (operator 2026-11-08, as animate-ui): the keyboard gets the same arrival
  frames = await record(page, ROWS);
  await page.keyboard.press('ArrowDown');
  expect(arriving(await frames()), 'opened from the keyboard, the rows arrive too, clearing from a blur').toBe(true);
  await expect.poll(async () => Math.min(...(await opacities(page)))).toBe(1);
});

test('the side drawer floats 8 px in from the edges and still fades under reduced motion', async ({ page }) => {
  await page.locator('#open-drawer').click();
  const dialog = page.locator('dialog.uix-drawer');
  await expect(dialog).toHaveJSProperty('open', true);
  await page.waitForTimeout(400);
  const box = await dialog.boundingBox();
  expect(Math.round(box.y)).toBe(8);
  expect(Math.round(1280 - (box.x + box.width))).toBe(8);
  // an Escape close is a keyboard close: instant ([data-uix-key-opened]), so reopen with the pointer
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveJSProperty('open', false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#open-drawer').click();
  await expect(dialog).toHaveJSProperty('open', true);
  const property = await dialog.evaluate((el) => getComputedStyle(el).transitionProperty);
  expect(property, 'reduced motion keeps the fade').toContain('opacity');
  expect(property, 'and drops the slide').not.toContain('transform');
});

const animations = (page, id) => page.locator(`#${id} svg`).evaluate((svg) => svg.getAnimations({ subtree: true }).length);
/** Does the hover rule give the icon (or a part of it) an animation? Steadier than counting running ones. */
const playing = (page, id) => page.locator(`#${id} svg`).evaluate((svg) => [svg, ...svg.querySelectorAll('*')].some((e) => getComputedStyle(e).animationName !== 'none'));

test('an animated icon plays on hover only; a still icon and the keyboard never move one', async ({ page }) => {
  await page.locator('#icon-refresh').hover();
  expect(await playing(page, 'icon-refresh')).toBe(true);
  await page.locator('#icon-still').hover();
  expect(await animations(page, 'icon-still')).toBe(0);
  await page.mouse.move(5, 5);
  await page.locator('#icon-next').focus();
  expect(await animations(page, 'icon-next'), 'keyboard focus is not a hover').toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#icon-refresh').hover();
  expect(await playing(page, 'icon-refresh')).toBe(false);
});

test('nothing serious for axe, at rest and with a list open', async ({ page }) => {
  await page.locator('#team').click();
  await expect(page.locator('.uix-select__popup')).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  const gated = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(gated).toEqual([]);
});
