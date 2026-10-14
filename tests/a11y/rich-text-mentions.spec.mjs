/* `@` mentions in the RichTextEditor, in a real browser (TENSOR HAR-1599).
 *
 * jsdom cannot show the caret, the list's position or what Backspace does next to an
 * atom, so the keyboard path runs here, in both themes, on the harness's Mentions section
 * (tests/rich-text/harness.tsx): an async people source where "zz" finds nobody and
 * "fail" fails.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.setTimeout(60_000);

const HARNESS = '/tests/rich-text/harness.html';
const GATED = new Set(['serious', 'critical']);
const STORED = 'Ask @[Ben Okafor](mention:u-ben) first.';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('#mention.ProseMirror')).toBeVisible();
});

/** The caret at the end of the mention editor, focused, before typing. */
const caretAtEnd = async (page) => {
  await page.evaluate(() => {
    const editor = document.getElementById('mention').editor;
    editor.chain().setTextSelection(editor.state.doc.content.size - 1).run();
    editor.view.focus();
  });
  await expect(page.locator('#mention')).toBeFocused();
};
const value = (page) => page.getByTestId('mention-value');
const list = (page) => page.locator('[data-mention-list]');

test('a stored mention loads as one token and the viewer names it', async ({ page }) => {
  const token = page.locator('#mention .uix-mention');
  await expect(token).toHaveCount(1);
  await expect(token).toHaveText('@Ben Okafor');
  await expect(token).toHaveAttribute('data-mention-id', 'u-ben');
  // The viewer below the editor draws the same token, named by resolveMention.
  const viewed = page.locator('.uix-markdown .uix-mention[data-mention-id="u-ben"]');
  await expect(viewed).toHaveText('@Ben O.');
  await expect(value(page)).toHaveText(STORED);
});

test('typing @an lists the people the source returned; the keyboard picks one', async ({ page }, testInfo) => {
  await caretAtEnd(page);
  await page.keyboard.type(' @an');
  const people = page.getByRole('listbox', { name: 'People' });
  await expect(people.getByRole('option')).toHaveText([/Anna Schmidt/, /André Bauer/]);
  await expect(page.locator('#mention')).toHaveAttribute('aria-controls', await people.getAttribute('id'));
  await expect(people.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');

  const { violations } = await new AxeBuilder({ page }).include('#mention').include('[data-mention-list]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.filter((v) => GATED.has(v.impact)), `[${testInfo.project.name}]`).toEqual([]);

  await page.keyboard.press('ArrowDown');
  await expect(people.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(list(page)).toHaveCount(0);
  await expect(value(page)).toHaveText('Ask @[Ben Okafor](mention:u-ben) first. @[Anna Schmidt](mention:u-anna) ');
  await expect(page.locator('#mention .uix-mention')).toHaveCount(2);
});

test('Tab also picks, and Backspace next to a token removes the whole token', async ({ page }) => {
  await caretAtEnd(page);
  await page.keyboard.type(' @be');
  await expect(page.getByRole('listbox', { name: 'People' }).getByRole('option')).toHaveText([/Ben Okafor/]);
  await page.keyboard.press('Tab');
  await expect(value(page)).toHaveText(`${STORED} @[Ben Okafor](mention:u-ben) `);
  // The space after the token, then the token as a unit.
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(value(page)).toHaveText(`${STORED}`);
  await expect(page.locator('#mention .uix-mention')).toHaveCount(1);
});

test('Escape closes the list and leaves the typed text', async ({ page }) => {
  await caretAtEnd(page);
  await page.keyboard.type(' @an');
  await expect(page.getByRole('listbox', { name: 'People' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(list(page)).toHaveCount(0);
  await expect(value(page)).toHaveText(`${STORED} @an`);
});

test('nobody found and a failed search are said, not shown as an empty list', async ({ page }) => {
  await caretAtEnd(page);
  await page.keyboard.type(' @zz');
  await expect(list(page)).toHaveAttribute('data-state', 'empty');
  await expect(list(page)).toHaveAttribute('role', 'status');
  await expect(list(page)).toHaveText('No matching people');
  // Enter with no choice is an ordinary Enter: nothing is inserted as a mention.
  await page.keyboard.press('Escape');
  await page.keyboard.type(' @fail');
  await expect(list(page)).toHaveAttribute('data-state', 'error');
  await expect(list(page)).toHaveText('People could not be loaded.');
});

test('at 320 px the list stays inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await caretAtEnd(page);
  await page.keyboard.type(' @an');
  const box = await page.getByRole('listbox', { name: 'People' }).boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
