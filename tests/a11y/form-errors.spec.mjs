/* The forms error-recovery layer in Chromium, both themes (UIx enterprise UX study, "First five" #2):
 *
 * - a failed submit shows "There is a problem" with one link per error, takes focus, scrolls it
 *   into view, prefixes the page title with "Error: "; the fields say the same words, each
 *   described as "Error: …"; a link focuses its control and brings its field into view;
 * - what a screen reader is given: the summary's alert region, polite errors after a blur, silent
 *   field errors after a submit (the summary speaks for them);
 * - inside a Drawer the summary scrolls into view within the drawer's own scroller;
 * - leaving: the browser's beforeunload prompt while dirty, the "Discard changes?" step for in-app
 *   navigation with focus on Keep editing;
 * - the conflict banner: who and when, the review in DiffViewer, Apply after a choice;
 * - axe (serious and critical) on each state.
 *
 * jsdom covers the rules (packages/react/src/form-errors-dom.test.mjs); this proves focus, scroll,
 * the accessibility tree and contrast in a real browser on tests/form-errors/harness.tsx. */
import { test, expect } from '@playwright/test';
import AxeBuilder from './axe.mjs';
import { settleAnimations } from './settle.mjs';

const HARNESS = '/tests/form-errors/harness.html';
const GATED = new Set(['serious', 'critical']);
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');
const TITLE = 'Form errors harness — UIx v2';

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, themeOf(testInfo));
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeOf(testInfo));
  await expect(page.locator('#incident-save')).toBeAttached();
});

const axe = async (page, selector) => {
  await settleAnimations(page);
  const results = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
};

const inViewport = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return r.top >= 0 && r.bottom <= window.innerHeight;
});

test('a failed submit: the summary takes focus in view, names every error with the field’s words, and the title says Error', async ({ page }) => {
  await page.locator('#incident-save').scrollIntoViewIfNeeded();
  await page.locator('#incident-save').click();
  const summary = page.locator('#incident .uix-validation-summary');
  await expect(summary).toBeFocused();
  expect(await inViewport(summary)).toBe(true);
  await expect(page).toHaveTitle(`Error: ${TITLE}`);
  // What assistive technology gets: an alert region with the heading and the linked list.
  await expect(summary).toMatchAriaSnapshot(`
    - alert:
      - heading "There is a problem" [level=2]
      - list:
        - listitem:
          - link "Enter a title"
        - listitem:
          - link "Enter the requester’s email address"
        - listitem:
          - link "Enter the team that owns this incident"
  `);
  for (const [name, message] of [['title', 'Enter a title'], ['email', 'Enter the requester’s email address'], ['team', 'Enter the team that owns this incident']]) {
    const control = page.locator(`#incident-${name}`);
    await expect(control).toHaveAttribute('aria-invalid', 'true');
    await expect(control).toHaveAccessibleDescription(`Error: ${message}`);
    // Silent at the field: the summary already announced it.
    const field = control.locator('xpath=ancestor::div[contains(@class,"uix-field")]');
    await expect(field.locator('[role="alert"]')).toHaveCount(0);
    await expect(field.locator('[data-uix-field-announce]')).toHaveText('');
  }
  await axe(page, '#incident');
});

test('a summary link focuses its control and scrolls its field into view; fixing it clears both places', async ({ page }) => {
  await page.locator('#incident-save').click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator('#incident-save').click();
  const summary = page.locator('#incident .uix-validation-summary');
  await expect(summary).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(summary.getByRole('link', { name: 'Enter the requester’s email address' })).toBeFocused();
  await page.keyboard.press('Enter');
  const email = page.locator('#incident-email');
  await expect(email).toBeFocused();
  expect(await inViewport(page.locator('#incident').getByText('Requester email', { exact: true }))).toBe(true);
  await email.fill('ana@example.com');
  await expect(email).not.toHaveAttribute('aria-invalid', 'true');
  await expect(summary.getByRole('link')).toHaveCount(2);
  await expect(summary.getByRole('link', { name: 'Enter the requester’s email address' })).toHaveCount(0);
});

test('leaving a filled field flags it politely; an empty one waits; the fixing keystroke clears it', async ({ page }) => {
  const email = page.locator('#incident-email');
  const field = email.locator('xpath=ancestor::div[contains(@class,"uix-field")]');
  await page.locator('#incident-title').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#incident-title')).not.toHaveAttribute('aria-invalid', 'true');
  await email.fill('ana@');
  await page.keyboard.press('Tab');
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(field.locator('.uix-field__msg')).not.toHaveAttribute('aria-live', /./);
  await expect(field.locator('[data-uix-field-announce]')).toHaveAttribute('aria-live', 'polite');
  await expect(field.locator('[data-uix-field-announce]')).toHaveText('Error: Enter an email address in the correct format, like name@example.com');
  await expect(field.locator('[role="alert"]')).toHaveCount(0);
  await expect(email).toHaveAccessibleDescription('Error: Enter an email address in the correct format, like name@example.com');
  await expect(page.locator('.uix-validation-summary')).toHaveCount(0);
  await expect(page).toHaveTitle(TITLE);
  await email.focus();
  await page.keyboard.type('example.com');
  await expect(email).not.toHaveAttribute('aria-invalid', 'true');
  await expect(email).toHaveAccessibleDescription('The person who reported it'); // back to the hint
  await expect(field.locator('[data-uix-field-announce]')).toHaveText(''); // and the hint is not read out
  await axe(page, '#incident');
});

test('in a Drawer, the summary scrolls into view within the drawer, not the page', async ({ page }) => {
  await page.locator('#open-drawer').click();
  const dialog = page.locator('dialog#drawer');
  await expect(dialog).toHaveJSProperty('open', true);
  await settleAnimations(page);
  await page.locator('#drawer-team').scrollIntoViewIfNeeded();
  await page.locator('#drawer-save').click();
  const summary = dialog.locator('.uix-validation-summary');
  await expect(summary).toBeFocused();
  await expect.poll(() => inViewport(summary)).toBe(true);
  await expect(page).toHaveTitle(TITLE); // prefixTitle={false}
  await axe(page, 'dialog#drawer');
});

test('leaving: in-app navigation asks with the discard words, Keep editing stays, Discard goes', async ({ page }) => {
  await expect(page.getByTestId('leave-active')).toHaveText('Not armed');
  await page.locator('#go-elsewhere').click();
  await expect.poll(() => page.evaluate(() => window.__forms.navigated)).toBe(1);
  await page.evaluate(() => { window.location.hash = ''; });
  await page.locator('#incident-title').fill('Mail relay down');
  await expect(page.getByTestId('leave-active')).toHaveText('Armed');
  await page.locator('#go-elsewhere').click();
  const step = page.getByRole('alertdialog', { name: 'Discard changes?' });
  await expect(step).toBeVisible();
  await expect(step).toContainText('Your changes to Title will be lost.');
  await expect(step.getByRole('button', { name: 'Keep editing' })).toBeFocused();
  await settleAnimations(page);
  await axe(page, 'dialog[open]');
  await page.keyboard.press('Escape');
  await expect(step).toBeHidden();
  expect(await page.evaluate(() => window.__forms.navigated)).toBe(1);
  await page.locator('#go-elsewhere').click();
  await step.getByRole('button', { name: 'Discard' }).click();
  await expect.poll(() => page.evaluate(() => window.__forms.navigated)).toBe(2);
});

test('leaving: the browser asks before unload only while there is something to lose', async ({ page }) => {
  const kinds = [];
  page.on('dialog', (dialog) => { kinds.push(dialog.type()); void dialog.dismiss(); });
  // The guard's listener follows the render in an effect: wait for the words, then a frame.
  const settled = async (text) => {
    await expect(page.getByTestId('leave-active')).toHaveText(text);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
  };
  await page.locator('#incident-title').fill('Mail relay down');
  await settled('Armed');
  await page.locator('#incident-title').fill('');
  await settled('Not armed');
  // Clean again (nothing typed stays): no prompt.
  await page.reload({ waitUntil: 'networkidle' });
  expect(kinds).toEqual([]);
  await page.locator('#incident-title').fill('Mail relay down');
  await settled('Armed');
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => kinds).toEqual(['beforeunload']);
});

test('the conflict banner: who and when, what they changed, review and apply a choice', async ({ page }) => {
  await page.locator('#simulate-conflict').click();
  const notice = page.locator('.uix-conflict-notice');
  const banner = notice.getByRole('alert');
  await expect(notice.locator('.uix-alert')).not.toHaveAttribute('role', /./); // the focus target is not the alert
  await expect(banner.getByRole('button')).toHaveCount(0);
  await expect(banner).toContainText('Alex Novak changed this at 14:02 while you were editing');
  await expect(banner).toContainText('Your changes are not saved yet, and they are still here.');
  await expect(banner).toContainText('You both changed Priority.');
  const review = notice.getByRole('button', { name: 'Review changes' });
  await expect(review).toHaveAttribute('aria-expanded', 'true');
  await expect(notice.getByRole('region', { name: 'Changes to review' })).toBeVisible();
  await axe(page, '#conflict');
  const apply = notice.getByRole('button', { name: 'Apply' });
  await expect(apply).toHaveAttribute('aria-disabled', 'true');
  await expect(apply).toHaveAccessibleDescription('Choose a version for each field you both changed.');
  await notice.getByRole('button', { name: 'Keep yours for Priority' }).click();
  await apply.click();
  await expect(notice).toHaveCount(0);
  await expect(page.getByTestId('record')).toHaveText(JSON.stringify({ title: 'Mail relay down (EU)', priority: 'P2', assignee: 'Ana', notes: 'Restarted the relay' }));
});
