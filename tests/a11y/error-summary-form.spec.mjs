/* The exact three-field form mounted by the live Form errors documentation. These tests cover
 * browser focus/layout and the ARIA contract; they do not claim a manual screen-reader result. */
import { test, expect } from '@playwright/test';
import AxeBuilder from './axe.mjs';
import { settleAnimations } from './settle.mjs';

const themeOf = (testInfo) => testInfo.project.name === 'dark' ? 'dark' : 'light';
const HARNESS = '/tests/error-summary-form/harness.html';

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript((theme) => localStorage.setItem('uix-theme', theme), themeOf(testInfo));
  await page.goto(HARNESS);
  await expect(page.locator('#recovery-title')).toBeVisible();
});

const checkAxe = async (page, selector) => {
  await settleAnimations(page);
  const result = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(result.passes.length).toBeGreaterThan(0);
  expect(result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
};

test('three errors focus once in form order, including the Combobox input, with silent inline errors', async ({ page }) => {
  const form = page.locator('#recovery');
  await expect(form.locator('[data-uix-error-summary]')).toHaveCount(0);
  await form.getByRole('button', { name: 'Save incident' }).click();
  const summary = form.locator('[data-uix-error-summary]');
  await expect(summary).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.__errorSummary.focused)).toBe(1);
  await expect(summary.getByRole('heading')).toHaveText('3 fields need attention');
  await expect(summary.getByRole('link')).toHaveText([
    'Enter a title', 'Enter the requester’s email address', 'Select the team that owns this incident',
  ]);
  await expect(form.locator('.uix-field [role="alert"]')).toHaveCount(0);
  await expect(form.locator('[data-uix-field-announce]')).toHaveText(['', '', '']);
  await expect(form.locator('#recovery-email')).toHaveAccessibleDescription('Only your service team sees this email address. Error: Enter the requester’s email address');
  // From the summary, Tab visits the ordered links. The third one names the public inputId.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(summary.getByRole('link').nth(2)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(form.getByRole('combobox', { name: 'Team' })).toBeFocused();
  await expect(form.getByRole('combobox')).toHaveAttribute('id', 'recovery-team');
  await checkAxe(page, '#recovery');
});

test('correction keeps the draft and focus, single errors still show, and valid values reach the handler', async ({ page }) => {
  const form = page.locator('#recovery');
  const title = form.getByRole('textbox', { name: /^Title/ });
  const email = form.getByRole('textbox', { name: 'Requester email' });
  await form.getByRole('button', { name: 'Save incident' }).click();
  await title.fill('Mail relay down');
  await expect(title).toBeFocused();
  await expect(form.locator('[data-uix-error-summary] a')).toHaveCount(2);
  await email.fill('ana@example.com');
  await expect(email).toBeFocused();
  await expect(form.locator('[data-uix-error-summary] h2')).toHaveText('1 field needs attention');
  await expect.poll(() => page.evaluate(() => window.__errorSummary.focused)).toBe(1);
  await form.getByRole('button', { name: 'Save incident' }).click();
  await expect(form.locator('[data-uix-error-summary]')).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.__errorSummary.focused)).toBe(2);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(form.getByRole('combobox')).toHaveValue('Support');
  await expect(form.locator('[data-uix-error-summary]')).toHaveCount(0);
  await expect(page).toHaveTitle('Error summary form recovery');
  await form.getByRole('button', { name: 'Save incident' }).click();
  await expect.poll(() => page.evaluate(() => window.__errorSummary.saves)).toBe(1);
  expect(await page.evaluate(() => window.__errorSummary.savedValues)).toEqual({
    title: 'Mail relay down', email: 'ana@example.com', team: 'support',
  });
  await expect(title).toHaveValue('Mail relay down');
  await expect(email).toHaveValue('ana@example.com');
  await expect(email).toHaveAccessibleDescription('Only your service team sees this email address. The person who reported it');
  await expect(form.getByRole('status').filter({ hasText: 'Incident saved' })).toHaveText('Incident saved');
  await checkAxe(page, '#recovery');
});

for (const unavailable of ['missing', 'disabled', 'hidden', 'non-focusable']) {
  test(`an error link with a ${unavailable} target returns to the summary without a hash change`, async ({ page }) => {
    const form = page.locator('#recovery');
    await form.getByRole('button', { name: 'Save incident' }).click();
    await form.locator('#recovery-title').evaluate((input, kind) => {
      if (kind === 'missing') input.remove();
      else if (kind === 'disabled') input.disabled = true;
      else if (kind === 'hidden') input.style.display = 'none';
      else input.replaceWith(Object.assign(document.createElement('div'), { id: input.id }));
    }, unavailable);
    const before = page.url();
    const summary = form.locator('[data-uix-error-summary]');
    await summary.getByRole('link').first().click();
    await expect(summary).toBeFocused();
    expect(page.url()).toBe(before);
  });
}

test('passive background error updates leave focus with the initiating control', async ({ page }) => {
  const passive = page.locator('#passive');
  const update = passive.getByRole('button', { name: 'Update background errors' });
  await update.focus();
  await update.press('Enter');
  await expect(update).toBeFocused();
  await update.press('Enter');
  await expect(passive.getByRole('link')).toHaveText('Check the background update 2');
  await expect(update).toBeFocused();
});

test('long localized errors and count headings reflow at 320 px with 200 percent text', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.locator('html').evaluate((root) => { root.style.fontSize = '200%'; });
  const localized = page.locator('#localized');
  await localized.getByRole('button', { name: 'Vorfall speichern' }).click();
  const summary = localized.locator('[data-uix-error-summary]');
  await expect(summary).toBeFocused();
  await expect(summary.getByRole('heading')).toHaveText('3 Felder müssen korrigiert werden');
  await expect(page).toHaveTitle('Fehler: Error summary form recovery');
  const box = await summary.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(await summary.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const layout = await page.evaluate(() => ({
    fits: document.documentElement.scrollWidth <= window.innerWidth,
    outside: [...document.querySelectorAll('body *')].filter((element) => element.getBoundingClientRect().right > window.innerWidth)
      .map((element) => ({ tag: element.tagName, className: element.className, width: element.getBoundingClientRect().width })).slice(0, 10),
  }));
  expect(layout.fits, JSON.stringify(layout.outside)).toBe(true);
  const message = localized.locator('#localized-team').locator('xpath=ancestor::div[contains(@class,"uix-field")]').locator('.uix-field__error');
  expect(await message.innerText()).toContain(await summary.getByRole('link').last().innerText());
  await checkAxe(page, '#localized');
  await localized.screenshot({ path: testInfo.outputPath('localized-320.png') });
});

test('the live documentation mounts the shared form and recovers to its Combobox', async ({ page }) => {
  await page.goto('/packages/tokens/docs/explorer.html#form-errors');
  const demo = page.locator('[data-live-demo="form-errors-demo"][data-demo="summary"]');
  await demo.getByRole('button', { name: 'Save incident' }).click();
  const summary = demo.locator('[data-uix-error-summary]');
  await expect(summary).toBeFocused();
  await expect(summary.getByRole('heading')).toHaveText('3 fields need attention');
  await summary.getByRole('link').last().click();
  await expect(demo.getByRole('combobox', { name: 'Team' })).toBeFocused();
  await checkAxe(page, '[data-live-demo="form-errors-demo"][data-demo="summary"]');
});
