/* CommandPalette items mode (HAR-1378; MOTUS C-10, TENSOR B2) in Chromium: the palette in its own
 * native <dialog>, opened from a button or Ctrl+K, filtering with folded diacritics, the active
 * option through aria-activedescendant, Enter / Escape / a click outside, focus back on the
 * opener, the cap on a long list, 320 px and axe. German harness:
 * tests/command-palette-items/harness.tsx. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/command-palette-items/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#launch')).toBeVisible();
};
const dialog = (page) => page.locator('dialog[data-uix-cmdk-dialog]');
const activeText = (page, scope) => page.locator(scope).evaluate((root) => {
  const input = root.querySelector('input[role="combobox"]');
  return document.getElementById(input.getAttribute('aria-activedescendant'))?.querySelector('.uix-cmdk__label')?.textContent ?? null;
});

test('Ctrl+K opens it with focus in the field; type, arrow, Enter runs it, closes, and focus returns', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#launch').focus();
  await page.keyboard.press('Control+k');
  await expect(dialog(page)).toHaveJSProperty('open', true);
  const field = dialog(page).getByRole('combobox', { name: 'Befehle' });
  await expect(field).toBeFocused();
  await expect(dialog(page).locator('.uix-cmdk__group').first()).toHaveText('Zuletzt verwendet');
  await page.keyboard.type('zuweis');
  expect(await activeText(page, 'dialog[data-uix-cmdk-dialog]')).toBe('Mir zuweisen');
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toHaveJSProperty('open', false);
  await expect(page.locator('#launch')).toBeFocused();
  expect(await page.evaluate(() => window.__palette.chosen)).toEqual(['assign']);
  // Opened again, the query is gone and the chosen command leads the recent ones.
  await page.keyboard.press('Control+k');
  await expect(dialog(page).getByRole('combobox')).toHaveValue('');
  expect(await activeText(page, 'dialog[data-uix-cmdk-dialog]')).toBe('Mir zuweisen');
});

test('folded matching, the active option follows the arrows past a disabled one; a link item navigates', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#launch').click();
  await page.keyboard.type('strasse');
  await expect(dialog(page).getByRole('option')).toHaveText([/Straßenverzeichnis/]);
  await page.keyboard.press('Control+a');
  await page.keyboard.type('archiv');
  await expect(dialog(page).getByRole('option', { name: /Archiv/ })).toHaveAttribute('aria-disabled', 'true');
  expect(await activeText(page, 'dialog[data-uix-cmdk-dialog]'), 'a disabled item is never active').toBeNull();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('ubersicht');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.__palette.navigated)).toEqual(['/de/uebersicht']);
});

test('Escape and a click outside close it; neither runs anything', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#launch').click();
  await page.keyboard.type('ber');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveJSProperty('open', false);
  await expect(page.locator('#launch')).toBeFocused();
  await page.locator('#launch').click();
  await expect(dialog(page)).toHaveJSProperty('open', true);
  await page.mouse.click(5, 5);
  await expect(dialog(page)).toHaveJSProperty('open', false);
  expect(await page.evaluate(() => window.__palette)).toEqual({ chosen: [], navigated: [] });
});

test('it opens at once: a keyboard-triggered, many-times-a-day surface has no animation', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#launch').click();
  const running = await page.evaluate(() => document.getAnimations().length);
  expect(running).toBe(0);
});

test('a long list renders 100 rows and announces the true count', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await expect(page.locator('#many [role="option"]')).toHaveCount(100);
  await expect(page.locator('#many [role="status"]')).toHaveText('1200 Ergebnisse');
  await page.locator('#many input').fill('0999');
  await expect(page.locator('#many [role="option"]')).toHaveText(['Datensatz 0999']);
  await expect(page.locator('#many [role="status"]')).toHaveText('1 Ergebnis');
});

test('at 320 px nothing scrolls sideways, open or in place; axe in both', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 720 });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow()).toBe(0);
  const scan = async (selector) => {
    const results = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    return results.violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  };
  await page.locator('#inline input').fill('ber');
  expect(await scan('#inline')).toEqual([]);
  await page.locator('#launch').click();
  await page.keyboard.type('zzzz');
  await expect(dialog(page).locator('.uix-cmdk__empty')).toHaveText('Keine Treffer');
  const box = await dialog(page).locator('.uix-cmdk').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(await scan('dialog[data-uix-cmdk-dialog]')).toEqual([]);
});

test('forced colours: the active option keeps an outline (it was only a background tint)', async ({ page }, testInfo) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page, testInfo);
  await page.locator('#launch').click();
  const active = dialog(page).locator('[role="option"][data-active]');
  await expect(active).toHaveCount(1);
  expect(await active.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
});
