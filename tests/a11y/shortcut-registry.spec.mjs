/* The shortcut registry in a browser (enterprise UX study, roadmap #1; spec
 * Docs/specs/2026-11-20-shortcut-registry.md), on the docs' live demo (tests/shortcut-registry/harness.tsx):
 * the ? sheet is a real modal dialog that lists what works where focus was and gives focus back;
 * list verbs work only with focus in the list; G then I is a sequence; the character-key switch
 * (WCAG 2.1.4) turns single keys and their hints off while Ctrl/⌘ shortcuts stay; a remap shows in
 * every hint at once; axe finds nothing serious with the sheet open, in both themes. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/shortcut-registry/harness.html';
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
  await expect(page.locator('[data-ticket]').first()).toBeVisible();
};
const sheet = (page) => page.getByRole('dialog', { name: 'Keyboard shortcuts' });
const heading = (page) => page.locator('#demo-view');
const rows = (page) => page.locator('[data-ticket]');
/** The rows of the sheet as "label=spoken keys". */
const sheetRows = (page) => sheet(page).locator('.uix-shortcut-sheet__row').evaluateAll((all) => all.map((row) => `${row.querySelector('dt').textContent}=${row.querySelector('dd .uix-visually-hidden').textContent}`));

test('? opens the sheet as a modal dialog over the page; Escape closes it and focus goes back', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const opener = page.locator('#demo-sheet');
  await opener.focus();
  await page.keyboard.press('?');
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page)).toHaveAttribute('aria-labelledby', /.+/);
  expect(await sheet(page).evaluate((d) => d.matches(':modal'))).toBe(true);
  expect(await page.evaluate(() => document.querySelector('dialog.uix-shortcut-sheet').contains(document.activeElement))).toBe(true);
  // From a button outside the list: what works everywhere, not the list's verbs.
  await expect(sheet(page).locator('h3')).toHaveText(['Everywhere']);
  expect(await sheetRows(page)).toEqual([
    'Show keyboard shortcuts=?',
    'Open the command palette=Control+K',
    'Go to the inbox=G, then I',
    'Go to my tickets=G, then M',
  ]);
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();
  await expect(opener).toBeFocused();
});

test('opened from the list, the sheet adds the list scope; the list verbs work only with focus in it', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#demo-palette').focus();
  await page.keyboard.press('j');
  await expect(page.locator('#demo-palette')).toBeFocused();
  await rows(page).first().focus();
  await page.keyboard.press('j');
  await expect(rows(page).nth(1)).toBeFocused();
  await page.keyboard.press('k');
  await expect(rows(page).first()).toBeFocused();
  await page.keyboard.press('a');
  await expect(rows(page).first()).toContainText('Assigned to you');
  await expect(page.locator('#demo-status')).toHaveText('INC-0412: Assigned to you');
  await page.keyboard.press('?');
  await expect(sheet(page).locator('h3')).toHaveText(['Everywhere', 'Ticket list']);
  const listed = await sheetRows(page);
  expect(listed).toEqual(expect.arrayContaining(['Next ticket=J', 'Previous ticket=K', 'Assign to me=A', 'Resolve=E']));
  await page.keyboard.press('Escape');
  await expect(rows(page).first()).toBeFocused();
});

test('G then I is a sequence with a visible pending state; a text field types instead', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#demo-sheet').focus();
  await page.keyboard.press('g');
  await expect(page.locator('#demo-status')).toContainText('waiting for the next key');
  await page.keyboard.press('m');
  await expect(heading(page)).toHaveText('My tickets');
  await page.keyboard.press('g');
  await page.keyboard.press('i');
  await expect(heading(page)).toHaveText('Inbox');
  // In the palette's field the same letters are text.
  await page.keyboard.press('Control+k');
  const field = page.getByRole('combobox', { name: 'Command palette' });
  await expect(field).toBeFocused();
  await page.keyboard.type('gm');
  await expect(field).toHaveValue('gm');
  await expect(heading(page)).toHaveText('Inbox');
  await page.keyboard.press('Control+k');
  await expect(field).toBeHidden();
});

test('the character-key switch (WCAG 2.1.4): single keys and their hints go, Ctrl+K and the palette path stay', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await expect(page.locator('#demo-sheet')).toHaveAccessibleDescription('?');
  await rows(page).first().focus();
  await page.keyboard.press('?');
  const toggle = sheet(page).getByRole('switch', { name: 'Single-key shortcuts' });
  await expect(toggle).toBeChecked();
  await expect(toggle).toHaveAccessibleDescription(/speech input/);
  await toggle.press('Space');
  await expect(toggle).not.toBeChecked();
  await expect(toggle).toHaveAccessibleDescription(/are off/);
  expect(await sheetRows(page)).toEqual(['Open the command palette=Control+K']);
  await page.keyboard.press('Escape');
  await expect(rows(page).first()).toBeFocused();
  await page.keyboard.press('j');
  await expect(rows(page).first()).toBeFocused();
  await page.keyboard.press('?');
  await expect(sheet(page)).toBeHidden();
  await expect(page.locator('#demo-sheet')).not.toHaveAccessibleDescription('?');
  // The modifier path: the palette runs the switched-off verb on the focused ticket.
  await page.keyboard.press('Control+k');
  const field = page.getByRole('combobox', { name: 'Command palette' });
  await field.fill('resolve');
  const option = page.getByRole('option', { name: /Resolve/ });
  await expect(option).not.toHaveAttribute('aria-keyshortcuts', /./);
  await page.keyboard.press('Enter');
  await expect(rows(page).first()).toContainText('Resolved');
});

test('a remap shows in every hint at once and the old key stops', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#demo-remap').check();
  await rows(page).nth(1).focus();
  await page.keyboard.press('a');
  await expect(rows(page).nth(1)).not.toContainText('Assigned to you');
  await page.keyboard.press('Alt+a');
  await expect(rows(page).nth(1)).toContainText('Assigned to you');
  await page.getByRole('button', { name: 'Actions for INC-0413' }).click();
  const item = page.getByRole('menuitem', { name: /Assign to me/ });
  await expect(item).toHaveAttribute('aria-keyshortcuts', 'Alt+A');
  await page.keyboard.press('Escape');
  await rows(page).nth(1).focus();
  await page.keyboard.press('?');
  expect(await sheetRows(page)).toContain('Assign to me=Alt+A');
});

test('macOS: Mod is ⌘, and the hints say Command', async ({ page }, testInfo) => {
  await open(page, testInfo, 'MacIntel');
  await expect(page.locator('#demo-palette')).toHaveAccessibleDescription('Command+K');
  await page.keyboard.press('Meta+k');
  await expect(page.getByRole('combobox', { name: 'Command palette' })).toBeFocused();
});

test('axe: no serious or critical violations with the sheet open, in this theme', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await rows(page).first().focus();
  await page.keyboard.press('?');
  await expect(sheet(page)).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
