/* Drawer and Peek light-dismiss in a real browser (TENSOR HAR-547).
 *
 * jsdom has no layout or top layer, so drawer-dom.test.mjs stubs the panel rect; this runs the
 * real thing: showModal(), the ::backdrop, the UA modal max-width. On a phone the panel stops
 * 2em + 6px short of the left edge (34 px at 320), and a tap on that strip must close it too.
 * The harness (tests/drawer/harness.tsx) is bundled from source in globalSetup. Runs in both
 * theme projects.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/drawer/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#open-drawer')).toBeVisible();
});

const closes = (page) => page.evaluate(() => ({ ...window.__drawer }));
/** Open a panel and wait for its slide-in to finish, so its box is final. */
const openPanel = async (page, button, id) => {
  await page.locator(`#${button}`).click();
  const dialog = page.locator(`dialog#${id}`);
  await expect(dialog).toHaveJSProperty('open', true);
  await expect.poll(() => dialog.evaluate((d) => getComputedStyle(d).transform)).toBe('none');
  return dialog;
};

for (const [button, id, key] of [['open-drawer', 'drawer', 'drawer'], ['open-peek', 'peek', 'peek']]) {
  test(`${id}: a click on the backdrop closes it once; a click inside does not`, async ({ page }) => {
    const dialog = await openPanel(page, button, id);
    const box = await dialog.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // inside the panel
    await expect(dialog).toHaveJSProperty('open', true);
    await page.mouse.click(Math.max(4, box.x / 2), box.height / 2); // the dimmed backdrop
    await expect(dialog).toHaveJSProperty('open', false);
    expect((await closes(page))[key]).toBe(1);
  });
}

test('form drawer (dismissOnBackdrop={false}): the backdrop keeps it open; Escape still closes', async ({ page }) => {
  const dialog = await openPanel(page, 'open-form', 'form');
  const box = await dialog.boundingBox();
  await page.mouse.click(Math.max(4, box.x / 2), box.height / 2);
  await expect(dialog).toHaveJSProperty('open', true);
  expect((await closes(page)).form).toBe(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveJSProperty('open', false);
  expect((await closes(page)).form).toBe(1);
});

test('axe: open drawer', async ({ page }, testInfo) => {
  await openPanel(page, 'open-drawer', 'drawer');
  const { violations } = await new AxeBuilder({ page })
    .include('dialog#drawer')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const gated = violations.filter((v) => GATED.has(v.impact));
  expect(gated.map((v) => `[${v.impact}] ${v.id}: ${v.help}`)).toEqual([]);
});

for (const width of [320, 360, 375, 390, 414]) {
  test(`phone ${width} px: drawer and peek fit, leave a backdrop strip, and a tap on it closes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 780 });
    for (const [button, id, key] of [['open-drawer', 'drawer', 'drawer'], ['open-peek', 'peek', 'peek']]) {
      const dialog = await openPanel(page, button, id);
      const box = await dialog.boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
      expect(box.x, 'a strip of backdrop stays tappable').toBeGreaterThanOrEqual(24);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const close = await dialog.getByRole('button', { name: /^Close/ }).boundingBox();
      expect(close.x + close.width).toBeLessThanOrEqual(width);
      await page.mouse.click(box.x / 2, box.height / 2);
      await expect(dialog).toHaveJSProperty('open', false);
      expect((await closes(page))[key]).toBe(1);
    }
  });
}
