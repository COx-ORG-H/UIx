/* What TENSOR's ConfirmAction (about 157 call sites) needs from the kit's confirmations
 * (HAR-1831), on a German React harness (tests/confirm-actions/harness.tsx), in both themes:
 *
 *   - Popconfirm with a required reason: the field has focus, Confirm waits for it, the step is an
 *     alertdialog, the confirm button carries the consumer's data-action-id;
 *   - Popconfirm in a dirty Drawer with a Select inside it: Escape closes the list, then the step
 *     (focus back on its anchor), and only then is the drawer's Escape (it asks);
 *   - closeWhenAnchorHidden: scrolling the anchor out of its box cancels the step;
 *   - ConfirmDialog pending: Escape and × do nothing; when the caller unmounts the dialog the
 *     browser gives focus back to the button that opened it (a passive cleanup lost it);
 *   - type-to-confirm: the field turns invalid once the text stops matching;
 *   - an undo toast with pauseOnHover: false commits on time under the pointer.
 * jsdom has no top layer, focus restoration or layout: confirm-actions-dom.test.mjs covers the rest.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleOverlay } from './settle.mjs';

const HARNESS = '/tests/confirm-actions/harness.html';
const GATED = new Set(['serious', 'critical']);
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, themeOf(testInfo));
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeOf(testInfo));
  await expect(page.locator('#reject')).toBeVisible();
});

const log = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__confirm)));
const axe = async (page) => {
  const results = await new AxeBuilder({ page }).include('body').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
};

test('Popconfirm with a reason: the field has focus, Reject waits for it, the step is an alertdialog', async ({ page }) => {
  await page.locator('#reject').click();
  const step = page.getByRole('alertdialog', { name: 'Diese Änderung ablehnen?' });
  await expect(step).toBeVisible();
  await settleOverlay(step);
  await expect(page.locator('#reject-reason')).toBeFocused();
  const confirm = step.getByRole('button', { name: 'Ablehnen' });
  await expect(confirm).toBeDisabled();
  await expect(confirm).toHaveAttribute('data-action-id', 'change.reject');
  await axe(page);
  // The field takes the step's width: not squeezed to the text.
  const [s, f] = [await step.boundingBox(), await page.locator('#reject-reason').boundingBox()];
  expect(f.width).toBeGreaterThan(s.width - 40);
  await page.keyboard.type('Bricht das Release');
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(step).toBeHidden();
  expect((await log(page)).confirmed).toEqual(['reject:Bricht das Release']);
});

test('Popconfirm in a dirty Drawer: Escape closes the Select list, then the step, then the drawer asks', async ({ page }) => {
  await page.locator('#open-drawer').click();
  const drawer = page.locator('dialog#drawer');
  await expect(drawer).toHaveJSProperty('open', true);
  await drawer.locator('#move').click();
  const step = page.getByRole('dialog', { name: 'Vorlage verschieben?' });
  await expect(step).toBeVisible();
  // The Select in the step has focus (the first field); open its list.
  await expect(page.locator('#move-team')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(step, 'the list took the first Escape').toBeVisible();
  await page.keyboard.press('Escape');
  await expect(step).toBeHidden();
  await expect(drawer.locator('#move'), 'focus is back on the anchor').toBeFocused();
  await expect(page.getByRole('alertdialog', { name: 'Discard changes?' }), 'the step\'s Escape did not reach the drawer').toHaveCount(0);
  await expect(drawer).toHaveJSProperty('open', true);
  expect((await log(page)).cancelled).toEqual(['move']);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog', { name: 'Discard changes?' })).toBeVisible();
});

test('Popconfirm closeWhenAnchorHidden: scrolling the anchor out of view cancels the step', async ({ page }) => {
  await page.locator('#unlink').click();
  const step = page.getByRole('dialog', { name: 'Verknüpfung lösen?' });
  await expect(step).toBeVisible();
  await settleOverlay(step);
  await page.locator('#scroll-box').evaluate((el) => { el.scrollTop = 400; });
  await expect(step).toBeHidden();
  await expect.poll(async () => (await log(page)).cancelled).toEqual(['unlink']);
});

test('ConfirmDialog pending: Escape and × do nothing; the caller unmounting it gives focus back to the opener', async ({ page }) => {
  const opener = page.locator('#open-confirm');
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('alertdialog', { name: 'srv-ledger-01 löschen?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Abbrechen' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Löschen' }).click();
  await expect(dialog.getByRole('button', { name: 'Löschen' })).toHaveAttribute('aria-busy', 'true');
  await expect(dialog.getByRole('button', { name: 'Abbrechen' })).toBeDisabled();
  const close = dialog.locator('.uix-dialog__close');
  await expect(close).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Escape');
  await close.click({ force: true });
  await page.waitForTimeout(150);
  await expect(dialog).toBeVisible();
  expect((await log(page)).cancelled, 'nothing cancelled while pending').toEqual([]);
  // The action settles; the caller renders `{open && <ConfirmDialog/>}` and drops it.
  await page.evaluate(() => window.__confirm.settle());
  await expect(dialog).toHaveCount(0);
  await expect(opener, 'focus returns to the button that opened it').toBeFocused();
});

test('ConfirmDialog type-to-confirm: a node label, a placeholder, invalid once the text stops matching', async ({ page }) => {
  await page.locator('#open-typed').click();
  const dialog = page.getByRole('alertdialog', { name: 'Dienst löschen?' });
  const field = dialog.getByRole('textbox', { name: 'Zum Bestätigen ledger-prod eingeben' });
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute('placeholder', 'ledger-prod');
  const confirm = dialog.locator('[data-action-id="service.delete"]');
  await expect(confirm).toBeDisabled();
  await page.keyboard.type('ledger-');
  await expect(field).not.toHaveAttribute('aria-invalid', 'true');
  const footer = await dialog.locator('.uix-dialog__footer').boundingBox();
  await page.keyboard.type('x');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveAccessibleDescription('Das stimmt nicht mit ledger-prod überein.');
  expect((await dialog.locator('.uix-dialog__footer').boundingBox()).y, 'the message does not move the footer').toBeCloseTo(footer.y, 0);
  await axe(page);
  await page.keyboard.press('Backspace');
  await page.keyboard.type('prod');
  await expect(field).not.toHaveAttribute('aria-invalid', 'true');
  await confirm.click();
  expect((await log(page)).confirmed).toEqual(['service']);
});

test('undo toast with pauseOnHover: false commits on time while the pointer rests on it', async ({ page }) => {
  await page.locator('#close-ticket').click();
  const toast = page.locator('.uix-toast', { hasText: 'Ticket geschlossen' });
  await expect(toast).toBeVisible();
  await toast.hover();
  await expect.poll(async () => (await log(page)).committed, { timeout: 4000 }).toBe(1);
  expect((await log(page)).undone).toBe(0);
});
