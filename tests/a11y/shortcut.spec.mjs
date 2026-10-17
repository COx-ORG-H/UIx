/* Keyboard shortcuts where people act (HAR-2031; TENSOR audit UXC-03, D-09): a Button's
 * tooltip, a Tooltip and a Menu item show the key with Kbd and set `aria-keyshortcuts`, so ~65
 * registered shortcuts are no longer discoverable only through the "?" sheet.
 *
 * Measured on a React harness (tests/shortcut/harness.tsx), in both themes, with a Windows and a
 * macOS platform (⌘ vs Ctrl, Meta vs Control). The Button's hint renders INSIDE the button, so
 * the test also checks that a ButtonGroup and a full-width button keep their geometry.
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

test('Button: aria-keyshortcuts, per platform', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await expect(page.locator('#assign')).toHaveAttribute('aria-keyshortcuts', 'A');
  await expect(page.locator('#search')).toHaveAttribute('aria-keyshortcuts', 'Control+K');
  await expect(page.locator('#full')).toHaveAttribute('aria-keyshortcuts', 'Control+Enter');
});

test('Button: on macOS Mod is Meta and the hint shows ⌘', async ({ page }, testInfo) => {
  await open(page, testInfo, 'MacIntel');
  await expect(page.locator('#search')).toHaveAttribute('aria-keyshortcuts', 'Meta+K');
  await page.locator('#search').hover();
  const bubble = page.locator('#search .uix-tooltip__bubble');
  await expect(bubble).toBeVisible();
  await expect(bubble).toContainText('⌘');
});

test('Button: hovering shows the key next to the button; leaving and Escape hide it', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const button = page.locator('#assign');
  const bubble = button.locator('.uix-tooltip__bubble');
  await expect(bubble).toBeHidden();
  await button.hover();
  await expect(bubble).toBeVisible();
  await expect(bubble.locator('kbd')).toHaveText('A');
  await settleOverlay(bubble);
  const [b, t] = [await button.boundingBox(), await bubble.boundingBox()];
  expect(t.y + t.height, 'the hint sits above the button').toBeLessThanOrEqual(b.y);
  await page.keyboard.press('Escape');
  await expect(bubble).toBeHidden();
  // Keyboard focus shows it too.
  await page.locator('#plain-c').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await button.focus();
  await expect(bubble).toBeVisible();
  await page.locator('#plain-a').focus();
  await expect(bubble).toBeHidden();
});

test('Button: the hint is not part of the name, and a click on it is not a click on the button', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const button = page.locator('#assign');
  await button.hover();
  const bubble = button.locator('.uix-tooltip__bubble');
  await expect(bubble).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assign', exact: true }).first()).toHaveAttribute('id', 'assign');
  const icon = page.locator('#search');
  await icon.hover();
  await expect(icon.locator('.uix-tooltip__bubble')).toContainText('Search');
  await expect(page.getByRole('button', { name: 'Search', exact: true })).toHaveAttribute('id', 'search');
  // Click the bubble itself.
  await button.hover();
  await expect(bubble).toBeVisible();
  await settleOverlay(bubble);
  await bubble.click();
  expect(await page.evaluate(() => window.__shortcut.assign ?? 0)).toBe(0);
  await button.click();
  expect(await page.evaluate(() => window.__shortcut.assign ?? 0)).toBe(1);
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

test('Tooltip: the bubble shows the label and the keys; the trigger gets aria-keyshortcuts', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const trigger = page.locator('#tip-trigger');
  await expect(trigger).toHaveAttribute('aria-keyshortcuts', 'Shift+?');
  await trigger.hover();
  const bubble = page.getByRole('tooltip', { name: /Keyboard shortcuts/ });
  await expect(bubble).toBeVisible();
  await expect(bubble.locator('kbd')).toHaveText(['Shift', '?']);
  await expect(trigger).toHaveAccessibleDescription(/Keyboard shortcuts.*Shift\+\?/);
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
  await settleOverlay(page.locator('#assign .uix-tooltip__bubble'));
  let results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  let gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
  await page.locator('#record-menu').click();
  await settleOverlay(page.getByRole('menu'));
  results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
