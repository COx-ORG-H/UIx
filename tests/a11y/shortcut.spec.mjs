/* Keyboard shortcuts where people act (HAR-2031; TENSOR audit UXC-03, D-09): a Button's hint, a
 * Tooltip and a Menu row show the key with Kbd and set `aria-keyshortcuts`, so ~65 registered
 * shortcuts are no longer discoverable only through the "?" sheet.
 *
 * Measured on a React harness (tests/shortcut/harness.tsx), in both themes, with a Windows and a
 * macOS platform (⌘ vs Ctrl, Meta vs Control). A Button's hint leaves only an empty marker in the
 * button and portals its bubble, so the test also checks the button's text, name and geometry
 * stay as they were, and that focus a menu sends back after a mouse choice opens no hint.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleOverlay } from './settle.mjs';

const HARNESS = '/tests/shortcut/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, platform = 'Win32') => {
  await page.addInitScript(([t, p]) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
    Object.defineProperty(navigator, 'platform', { get: () => p });
    Object.defineProperty(navigator, 'userAgentData', { get: () => ({ platform: p === 'MacIntel' ? 'macOS' : 'Windows' }) });
  }, [testInfo.project.name, platform]);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#assign')).toBeVisible();
};
/** The Button hint that is open right now (each Button portals its own bubble). */
const openHint = (page) => page.locator('.uix-tooltip__bubble--hint:popover-open');

test('Button: aria-keyshortcuts per platform; its own aria-keyshortcuts wins', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await expect(page.locator('#assign')).toHaveAttribute('aria-keyshortcuts', 'A');
  await expect(page.locator('#search')).toHaveAttribute('aria-keyshortcuts', 'Control+K');
  await expect(page.locator('#full')).toHaveAttribute('aria-keyshortcuts', 'Control+Enter');
  await expect(page.locator('#save-both')).toHaveAttribute('aria-keyshortcuts', 'Control+S Meta+S');
});

test('Button: on macOS Mod is Meta and the hint shows ⌘', async ({ page }, testInfo) => {
  await open(page, testInfo, 'MacIntel');
  await expect(page.locator('#search')).toHaveAttribute('aria-keyshortcuts', 'Meta+K');
  await page.locator('#search').hover();
  await expect(openHint(page)).toBeVisible();
  await expect(openHint(page)).toContainText('⌘');
});

test('Button: hover shows the key above the button; leaving and Escape hide it; keyboard focus shows it', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const button = page.locator('#assign');
  await expect(openHint(page)).toHaveCount(0);
  await button.hover();
  await expect(openHint(page)).toBeVisible();
  await expect(openHint(page).locator('kbd')).toHaveText('A');
  await settleOverlay(openHint(page));
  const [b, t] = [await button.boundingBox(), await openHint(page).boundingBox()];
  expect(t.y + t.height, 'the hint sits above the button').toBeLessThanOrEqual(b.y);
  await page.keyboard.press('Escape');
  await expect(openHint(page)).toHaveCount(0);
  await page.mouse.move(0, 0);
  // Keyboard focus (focus-visible) shows it; moving on hides it.
  await page.locator('#plain-c').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(button).toBeFocused();
  await expect(openHint(page)).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(openHint(page)).toHaveCount(0);
});

test('Button: focus a menu sends back after a mouse choice opens no hint', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const trigger = page.locator('#record-menu');
  await trigger.click();
  await page.getByRole('menuitem', { name: /Assign to me/ }).click();
  await expect(trigger).toBeFocused();
  await page.waitForTimeout(300);
  await expect(openHint(page)).toHaveCount(0);
});

test('Button: the hint changes neither the name nor the text, and a click on it activates nothing', async ({ page }, testInfo) => {
  await open(page, testInfo);
  expect(await page.locator('#assign').evaluate((el) => el.textContent)).toBe('Assign');
  expect(await page.locator('#send').evaluate((el) => el.textContent)).toBe('Send');
  await page.locator('#assign').hover();
  await expect(openHint(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assign', exact: true }).first()).toHaveAttribute('id', 'assign');
  await settleOverlay(openHint(page));
  await openHint(page).click();
  expect(await page.evaluate(() => window.__shortcut.assign ?? 0)).toBe(0);
  await page.locator('#assign').click();
  expect(await page.evaluate(() => window.__shortcut.assign ?? 0)).toBe(1);
  // A submit button: a click on its hint submits nothing. (Leave the first hint's grace period first.)
  await page.mouse.move(0, 0);
  await expect(openHint(page)).toHaveCount(0);
  await page.locator('#send').hover();
  await expect(openHint(page)).toBeVisible();
  await settleOverlay(openHint(page));
  await openHint(page).click();
  expect(await page.evaluate(() => window.__shortcut.submit ?? 0)).toBe(0);
  // The icon button's hint carries its name.
  await page.mouse.move(0, 0);
  await expect(openHint(page)).toHaveCount(0);
  await page.locator('#search').hover();
  await expect(openHint(page)).toContainText('Search');
});

test('Button: a shortcut changes no geometry (ButtonGroup corners, full width)', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const shapes = await page.evaluate(() => {
    const radius = (id) => { const s = getComputedStyle(document.getElementById(id)); return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderRightWidth]; };
    const box = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
    return {
      withShortcut: ['assign', 'resolve', 'close-record'].map(radius),
      plain: ['plain-a', 'plain-b', 'plain-c'].map(radius),
      widths: [box('assign'), box('plain-a')],
      full: document.getElementById('full').getBoundingClientRect().width,
      column: document.getElementById('full').parentElement.getBoundingClientRect().width,
    };
  });
  expect(shapes.withShortcut).toEqual(shapes.plain);
  expect(shapes.widths[0]).toEqual(shapes.widths[1]);
  expect(Math.abs(shapes.full - shapes.column)).toBeLessThan(1);
});

test('Tooltip: label and keys in its bubble; around a Button with a shortcut there is one bubble', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const trigger = page.locator('#tip-trigger');
  await expect(trigger).toHaveAttribute('aria-keyshortcuts', 'Shift+?');
  await trigger.hover();
  const bubble = page.getByRole('tooltip', { name: /Keyboard shortcuts/ });
  await expect(bubble).toBeVisible();
  await expect(bubble.locator('kbd')).toHaveText(['Shift', '?']);
  await expect(trigger).toHaveAccessibleDescription(/Keyboard shortcuts.*Shift\+\?/);
  await page.mouse.move(0, 0);
  const watch = page.locator('#watch');
  await expect(watch).toHaveAttribute('aria-keyshortcuts', 'W');
  await watch.hover();
  const watchTip = page.getByRole('tooltip', { name: /Watch this record/ });
  await expect(watchTip).toBeVisible();
  await expect(watchTip.locator('kbd')).toHaveText('W');
  await expect(openHint(page), 'the Button steps aside for the Tooltip').toHaveCount(0);
});

test('Menu: items show their keys and expose aria-keyshortcuts; a node shortcut still renders as given', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#record-menu').click();
  const assign = page.getByRole('menuitem', { name: /Assign to me/ });
  await expect(assign).toBeVisible();
  await expect(assign).toHaveAttribute('aria-keyshortcuts', 'A');
  await expect(assign.locator('.uix-menu__shortcut kbd')).toHaveText('A');
  await expect(page.locator('#menu-duplicate')).toHaveAttribute('aria-keyshortcuts', 'Control+D');
  await expect(page.locator('#menu-watch')).toHaveAttribute('aria-keyshortcuts', 'Shift+W');
  await expect(page.locator('#menu-legacy .uix-menu__shortcut kbd')).toHaveText('Del');
  await expect(page.locator('#menu-legacy')).not.toHaveAttribute('aria-keyshortcuts', /./);
  // The key sits at the row's end.
  const [row, keys] = [await assign.boundingBox(), await assign.locator('.uix-menu__shortcut').boundingBox()];
  expect(row.x + row.width - (keys.x + keys.width)).toBeLessThan(16);
});

test('axe: hint, tooltip and menu open', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#assign').hover();
  await settleOverlay(openHint(page));
  let results = await new AxeBuilder({ page }).include('body').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  let gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
  await page.locator('#record-menu').click();
  await settleOverlay(page.getByRole('menu'));
  results = await new AxeBuilder({ page }).include('body').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
