/* An annotating Lightbox (HAR-1826; TENSOR C12 capture viewer): toolbar actions, an overlay in
 * the picture's own box, and keys the consumer claims while a draft is open.
 *
 * Measured on a React harness (tests/lightbox-annotate/harness.tsx, German labels) in Chromium,
 * where a claimed Escape must really keep the native <dialog> open: jsdom cannot show that.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/lightbox-annotate/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await page.locator('#open').click();
  await expect(page.locator('dialog.uix-lightbox')).toHaveJSProperty('open', true);
  await expect(page.locator('.harness-area')).toHaveCount(1);
};
const dialog = (page) => page.locator('dialog.uix-lightbox');

test('Tab order in the toolbar: the actions, then Close; a single item has no counter or arrows', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await expect(page.getByRole('button', { name: 'Schließen' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Rückgängig' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Bereich ausblenden' })).toBeFocused();
  await expect(dialog(page).locator('.uix-lightbox__counter, .uix-lightbox__nav')).toHaveCount(0);
});

test('the overlay covers exactly the picture, fitted and at actual size', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 1280, height: 640 });
  const measure = () => page.evaluate(() => {
    const img = document.querySelector('.uix-lightbox__media').getBoundingClientRect();
    const o = document.querySelector('.uix-lightbox__overlay').getBoundingClientRect();
    return { img: { w: img.width, h: img.height, cx: img.left + img.width / 2, cy: img.top + img.height / 2 }, o: { w: o.width, h: o.height, cx: o.left + o.width / 2, cy: o.top + o.height / 2 }, reported: window.__lightbox.overlay, natural: window.__lightbox.natural };
  });
  const fitted = await measure();
  // A wide viewport letterboxes the 3:2 picture left and right: the overlay is narrower than the <img>.
  expect(fitted.o.w).toBeLessThan(fitted.img.w - 10);
  expect(fitted.o.w / fitted.o.h).toBeCloseTo(1200 / 800, 2);
  expect(Math.abs(fitted.o.cx - fitted.img.cx)).toBeLessThan(1);
  expect(Math.abs(fitted.o.cy - fitted.img.cy)).toBeLessThan(1);
  expect(fitted.reported.width).toBeCloseTo(fitted.o.w, 0);
  expect(fitted.natural).toEqual({ width: 1200, height: 800 });
  await page.getByRole('button', { name: 'Originalgröße' }).click();
  await expect.poll(async () => (await measure()).o.w).toBeCloseTo(1200, 0);
  const actual = await measure();
  expect(actual.o.h).toBeCloseTo(800, 0);
});

test('Escape with a draft open cancels the draft and keeps the viewer open; the next Escape closes', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.getByRole('button', { name: 'Bereich ausblenden' }).click();
  await expect(page.locator('.harness-draft')).toHaveCount(1);
  await expect(page.locator('.harness-draft')).toBeFocused();
  const before = await page.locator('.harness-draft').evaluate((el) => el.style.left);
  await page.keyboard.press('Shift+ArrowRight');
  expect(await page.locator('.harness-draft').evaluate((el) => el.style.left), 'arrow keys move the draft').not.toBe(before);
  await page.keyboard.press('Escape');
  await expect(page.locator('.harness-draft')).toHaveCount(0);
  // The close request of a claimed Escape never arrives; poll, a queued close would show late.
  await page.waitForTimeout(100);
  await expect(dialog(page)).toHaveJSProperty('open', true);
  expect(await page.evaluate(() => window.__lightbox.closes)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveJSProperty('open', false);
  await expect.poll(() => page.evaluate(() => window.__lightbox.closes)).toBe(1);
  await expect(page.locator('#open')).toBeFocused();
});

test('a drag on the overlay draws an area; it neither closes nor pages', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const box = await page.locator('.uix-lightbox__overlay').boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.75, { steps: 5 });
  await page.mouse.up();
  const draft = await page.locator('.harness-draft').evaluate((el) => ({ left: parseFloat(el.style.left), width: parseFloat(el.style.width) }));
  expect(draft.left).toBeCloseTo(60, 0);
  expect(draft.width).toBeCloseTo(20, 0);
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(page.locator('.harness-area')).toHaveCount(2);
  await expect(dialog(page)).toHaveJSProperty('open', true);
  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.locator('.harness-area')).toHaveCount(1);
});

test('the toolbar never covers the picture, on a desktop and on a phone', async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 640 }]) {
    await open(page, testInfo, viewport);
    const gap = await page.evaluate(() => {
      const bottom = Math.max(...[...document.querySelectorAll('.uix-lightbox__toolbar > *')].map((el) => el.getBoundingClientRect().bottom));
      return document.querySelector('.uix-lightbox__overlay').getBoundingClientRect().top - bottom;
    });
    expect(gap, `${viewport.width} px`).toBeGreaterThanOrEqual(0);
  }
});

test('axe: the open viewer with a draft', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.getByRole('button', { name: 'Bereich ausblenden' }).click();
  await page.mouse.move(0, 0);
  // axe measures colours: not mid-transition (a button that just appeared fades its colour in)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  const results = await new AxeBuilder({ page }).include('dialog.uix-lightbox').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
