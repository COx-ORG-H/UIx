/* The per-row action panel in a browser (enterprise UX study, roadmap #10; spec
 * Docs/specs/2026-11-20-action-panel.md), on the docs' live demo (tests/action-panel/harness.tsx):
 * Ctrl+K on a focused ticket opens a real modal dialog anchored under the row, listing every action
 * with its keys; a second Ctrl+K hands over to the command palette; Enter runs the primary action;
 * the row keys work and the ? sheet lists them under the queue; Delete asks first and Archive offers
 * Undo; focus goes back to the row (or the ⋯ button) every time; it fits a phone; axe finds nothing
 * serious with the panel or its confirm step open, in both themes. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/action-panel/harness.html';
const GATED = new Set(['serious', 'critical']);
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

const open = async (page, testInfo, platform = 'Win32') => {
  await page.addInitScript(([t, p]) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
    Object.defineProperty(navigator, 'platform', { get: () => p });
    Object.defineProperty(navigator, 'userAgentData', { get: () => ({ platform: p === 'MacIntel' ? 'macOS' : 'Windows' }) });
  }, [themeOf(testInfo), platform]);
  await page.goto(`${HARNESS}${platform === 'MacIntel' ? '?platform=mac' : ''}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeOf(testInfo));
  await expect(rows(page).first()).toBeVisible();
};
const rows = (page) => page.locator('tbody tr[data-uix-row-id]');
const row = (page, id) => page.locator(`tbody tr[data-uix-row-id="${id}"]`);
const panel = (page, name = /^Actions for /) => page.getByRole('dialog', { name });
const status = (page) => page.locator('#ap-status');
/** The panel's options as "label=spoken keys". */
const optionRows = (page) => page.locator('dialog.uix-action-panel [role="option"]').evaluateAll((all) => all.map((o) => {
  const keys = o.querySelector('.uix-cmdk__shortcut .uix-visually-hidden')?.textContent;
  return `${o.querySelector('.uix-cmdk__label').textContent}${keys ? `=${keys}` : ''}`;
}));

test('Ctrl+K on a focused row opens its panel: a modal dialog under the row with every action and its keys; Escape gives focus back', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await row(page, 'INC-0413').focus();
  await page.keyboard.press('Control+k');
  const dialog = panel(page, 'Actions for INC-0413');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((d) => d.matches(':modal'))).toBe(true);
  await expect(page.getByRole('combobox', { name: 'Search actions' })).toBeFocused();
  await expect(page.locator('dialog.uix-cmdk-dialog')).toBeHidden();
  expect(await optionRows(page)).toEqual([
    'Open ticket=Enter', 'Assign to me', 'Change priority=P', 'Resolve=E', 'Copy ticket number', 'Archive', 'Delete ticket=Control+Backspace',
  ]);
  // Assign is disabled on an assigned ticket: shown, with its reason, and no key.
  await expect(page.getByRole('option', { name: /Assign to me/ })).toHaveAttribute('aria-disabled', 'true');
  // Anchored: under the row, at its end, inside the viewport.
  const r = await row(page, 'INC-0413').boundingBox();
  const d = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(Math.abs(d.y - (r.y + r.height))).toBeLessThanOrEqual(8);
  expect(d.x + d.width).toBeLessThanOrEqual(Math.min(r.x + r.width, viewport.width) + 1);
  expect(d.x).toBeGreaterThanOrEqual(0);
  // Instant: no transition on a keyboard surface.
  expect(await dialog.evaluate((el) => getComputedStyle(el).transitionDuration.split(',').every((t) => parseFloat(t) === 0))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(row(page, 'INC-0413')).toBeFocused();
});

test('first press local, second press global: Ctrl+K again closes the panel and opens the palette, which gives focus back to the row', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await row(page, 'INC-0412').focus();
  await page.keyboard.press('Control+k');
  await expect(panel(page)).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(panel(page)).toBeHidden();
  const field = page.getByRole('combobox', { name: 'Command palette' });
  await expect(field).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(field).toBeHidden();
  await expect(row(page, 'INC-0412')).toBeFocused();
  // Off a row, the first press is the palette's.
  await page.locator('#ap-sheet').focus();
  await page.keyboard.press('Control+k');
  await expect(field).toBeFocused();
  await expect(panel(page)).toBeHidden();
});

test('Enter runs the primary action; the row keys work and the ? sheet lists them under the queue', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await row(page, 'INC-0412').focus();
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveText('Opened INC-0412');
  await page.keyboard.press('a');
  await expect(row(page, 'INC-0412')).toContainText('Assigned to you');
  await page.keyboard.press('p');
  await expect(row(page, 'INC-0412')).toContainText('P2');
  // Off the rows, A is not a shortcut.
  await page.locator('#ap-sheet').focus();
  await page.keyboard.press('e');
  await expect(row(page, 'INC-0412')).not.toContainText('Resolved');
  await row(page, 'INC-0414').focus();
  await page.keyboard.press('?');
  const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(sheet.locator('h3')).toHaveText(['Everywhere', 'Ticket queue']);
  const listed = await sheet.locator('.uix-shortcut-sheet__row').evaluateAll((all) => all.map((r) => `${r.querySelector('dt').textContent}=${r.querySelector('dd .uix-visually-hidden').textContent}`));
  expect(listed).toEqual(expect.arrayContaining(['Show actions=Control+K', 'Assign to me=A', 'Change priority=P', 'Resolve=E', 'Delete ticket=Control+Backspace']));
  await page.keyboard.press('Escape');
  await expect(row(page, 'INC-0414')).toBeFocused();
});

test('Delete asks first, on the row: Cancel has focus, Escape closes; confirming deletes and focus moves to the next row', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await row(page, 'INC-0414').focus();
  await page.keyboard.press('Control+Backspace');
  const dialog = panel(page, 'Actions for INC-0414');
  await expect(dialog).toBeVisible();
  const step = dialog.getByRole('group', { name: 'Delete INC-0414?' });
  await expect(step).toHaveAccessibleDescription(/cannot be undone/);
  await expect(step.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(row(page, 'INC-0414')).toBeFocused();
  await expect(rows(page)).toHaveCount(5);
  // From the list: choose Delete, Escape steps back to the list, then confirm.
  await page.keyboard.press('Control+k');
  await page.keyboard.type('delete');
  await page.keyboard.press('Enter');
  await expect(step).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('combobox', { name: 'Search actions' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(step.getByRole('button', { name: 'Delete' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(rows(page)).toHaveCount(4);
  await expect(status(page)).toHaveText('INC-0414: deleted');
  await expect(row(page, 'INC-0412')).toBeFocused();
});

test('Archive is undoable: it runs at once and the toast offers Undo', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await row(page, 'INC-0415').focus();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('arch');
  await page.keyboard.press('Enter');
  await expect(row(page, 'INC-0415')).toHaveCount(0);
  await expect(status(page)).toHaveText('INC-0415: archived');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(row(page, 'INC-0415')).toHaveCount(1);
});

test('the row ⋯ button opens the panel by pointer; focus goes back to the button; it fits a phone', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await open(page, testInfo);
  const trigger = page.getByRole('button', { name: 'Actions for INC-0416' });
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  await trigger.click();
  const dialog = panel(page, 'Actions for INC-0416');
  await expect(dialog).toBeVisible();
  const d = await dialog.boundingBox();
  expect(d.x).toBeGreaterThanOrEqual(0);
  expect(d.x + d.width).toBeLessThanOrEqual(375);
  expect(d.y + d.height).toBeLessThanOrEqual(740);
  await page.getByRole('option', { name: /Resolve/ }).click();
  await expect(dialog).toBeHidden();
  await expect(row(page, 'INC-0416')).toContainText('Resolved');
  await expect(trigger).toBeFocused();
  // A click outside the panel closes it.
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
});

test('macOS: ⌘K opens the panel, the keys say Command', async ({ page }, testInfo) => {
  await open(page, testInfo, 'MacIntel');
  await row(page, 'INC-0412').focus();
  await page.keyboard.press('Meta+k');
  await expect(panel(page)).toBeVisible();
  expect(await optionRows(page)).toContain('Delete ticket=Command+Backspace');
});

test('axe: no serious or critical violations with the panel open, and on its confirm step, in this theme', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await row(page, 'INC-0412').focus();
  await page.keyboard.press('Control+k');
  await expect(panel(page)).toBeVisible();
  const check = async () => {
    const results = await new AxeBuilder({ page }).analyze();
    const gated = results.violations.filter((v) => GATED.has(v.impact));
    expect(gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  };
  await check();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+Backspace');
  await expect(panel(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
  await check();
});
