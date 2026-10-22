/* FilterEditor kinds of HAR-1832 (TENSOR HAR-1484 `table-filter-editor.tsx`) in Chromium: free-text
 * tags typed with the keyboard, a date with a condition kept across a restore, reference ids that
 * resolve to names (in the editor and on the chip), Enter applying from any field, and each
 * editor in a popover at 320 px. German harness: tests/filter-editor-kinds/harness.tsx. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/filter-editor-kinds/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#inline')).toBeVisible();
};
const applied = (page, id) => page.evaluate((k) => window.__filters.applied[k], id);
const editor = (page, id) => page.locator(`#inline [data-field="${id}"]`);

test('tags: Enter and comma add, a chip button removes, Backspace takes the last back, Enter on an empty field applies', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const field = editor(page, 'host').getByRole('textbox', { name: 'Wert hinzufügen' });
  await expect(field).toHaveAccessibleDescription('Mit Eingabetaste oder Komma hinzufügen.');
  await field.fill('mail-01');
  await field.press('Enter');
  await field.pressSequentially('mail-02,');
  await expect(editor(page, 'host').locator('.uix-tag')).toHaveText(['db-prod-eu-central-01', 'web-01', 'mail-01', 'mail-02']);
  await expect(field).toHaveValue('');
  await editor(page, 'host').getByRole('button', { name: 'web-01 entfernen' }).click();
  await expect(field).toBeFocused();
  await field.press('Backspace');
  await expect(editor(page, 'host').locator('.uix-tag')).toHaveText(['db-prod-eu-central-01', 'mail-01']);
  await field.press('Enter');
  expect(await applied(page, 'host')).toEqual({ kind: 'tags', values: ['db-prod-eu-central-01', 'mail-01'] });
});

test('date: a restored one-day "between" stays between; before shows one date and applies with Enter', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const condition = editor(page, 'created').getByRole('combobox', { name: 'Bedingung' });
  await expect(condition).toContainText('zwischen');
  await expect(editor(page, 'created').locator('input[type="date"]')).toHaveCount(2);
  await condition.click();
  await page.getByRole('option', { name: 'vor', exact: true }).click();
  await expect(editor(page, 'created').locator('input[type="date"]')).toHaveCount(1);
  await editor(page, 'created').locator('input[type="date"]').press('Enter');
  expect(await applied(page, 'created')).toEqual({ kind: 'date', operator: 'before', from: '2026-10-05' });
});

test('reference: restored ids are named in the editor and on the chip, asked once', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await expect(editor(page, 'assignee').locator('.uix-chip')).toHaveText(['Amra Kovač', 'Lejla Hadžić-Šehović']);
  await expect(page.locator('#chip-assignee')).toContainText('Bearbeiter: Amra Kovač, Lejla Hadžić-Šehović');
  await editor(page, 'assignee').getByRole('checkbox', { name: 'Jonas Weber' }).check();
  await editor(page, 'assignee').getByRole('checkbox', { name: 'Jonas Weber' }).press('Enter');
  expect((await applied(page, 'assignee')).values.map((v) => v.label)).toEqual(['Amra Kovač', 'Lejla Hadžić-Šehović', 'Jonas Weber']);
});

test('in a popover at 320 px: the editor fits, Escape closes it, and axe passes', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 760 });
  for (const id of ['host', 'created', 'assignee']) {
    await page.locator(`#chip-${id} > .uix-chip`).click();
    const pop = page.locator(`#pop-${id}`);
    await expect(pop).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    const fits = await pop.evaluate((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= document.documentElement.clientWidth; });
    expect(fits, id).toBe(true);
    const results = await new AxeBuilder({ page }).include(`#pop-${id}`).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const gated = results.violations.filter((v) => GATED.has(v.impact));
    expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(pop).toBeHidden();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});
