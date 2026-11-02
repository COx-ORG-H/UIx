import { test, expect } from '@playwright/test';
const harness = '/tests/toast-top-layer/harness.html';
async function hitToast(page) {
  await expect.poll(() => page.locator('.uix-toast').evaluate(el => {
    const r = el.querySelector('.uix-toast__title').getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  })).toBe(true);
  const pixels = await page.locator('.uix-toast').evaluate(el => {
    const rect = el.getBoundingClientRect();
    const title = el.querySelector('.uix-toast__title').getBoundingClientRect();
    const hit = document.elementFromPoint(title.x + title.width / 2, title.y + title.height / 2);
    return { rect: rect.toJSON(), hit: hit?.className, toastContainsHit: el.contains(hit),
      dialog: el.closest('dialog')?.id ?? null, popover: el.closest('.uix-toaster').matches(':popover-open') };
  });
  await test.info().attach('toast-pixels', { body: JSON.stringify(pixels), contentType: 'application/json' });
}
for (const width of [1280, 320]) {
  test(`toast pixels and controls above drawer and nested modal at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(harness);
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, info.project.name);
    await page.locator('#open-drawer').click();
    await page.screenshot({ path: info.outputPath('drawer-before.png') });
    await page.locator('#drawer').getByRole('button', { name: 'Fehler anzeigen', exact: true }).click();
    await expect(page.locator('.uix-toast')).toBeVisible();
    await page.screenshot({ path: info.outputPath('drawer-error.png') });
    await hitToast(page);
    await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click();
    await expect(page.locator('#actions')).toHaveText('1');
    await expect(page.locator('.uix-toast')).toHaveCount(0);
    await page.locator('#drawer').getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(page.locator('.uix-toast')).toHaveAttribute('aria-busy', 'true');
    await hitToast(page);
    await page.screenshot({ path: info.outputPath('drawer-pending.png') });
    await page.locator('#nested').click();
    await hitToast(page);
    await page.locator('#modal').getByRole('button', { name: 'Erfolg anzeigen', exact: true }).click();
    await expect(page.locator('.uix-toast')).toContainText('Änderung gespeichert');
    await hitToast(page);
    await page.screenshot({ path: info.outputPath('nested-success.png') });
    await page.locator('#close-modal').click();
    await hitToast(page);
    await expect(page.getByRole('textbox', { name: 'Entwurf' })).toHaveValue('Ungespeicherter Text');
    await page.locator('.uix-toast__close').focus();
    await expect(page.locator('.uix-toast__close')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.uix-toast')).toHaveCount(0);
    await expect(page.locator('#drawer')).toBeVisible();
    await expect(page.locator('#nested')).toBeFocused();
    await page.locator('#drawer').getByRole('button', { name: 'Schließen', exact: true }).click();
    await expect(page.locator('#open-drawer')).toBeFocused();
    await page.locator('#page-controls').getByRole('button', { name: 'Fehler anzeigen', exact: true }).click();
    await hitToast(page);
    await page.locator('.uix-toast__close').click();
    await expect(page.locator('.uix-toast')).toHaveCount(0);
    await expect(page.locator('.uix-toaster')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: info.outputPath('empty.png') });
  });
}
test('keyboard, reduced motion and a toast survive closing a standalone modal', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(harness);
  await page.evaluate(theme => document.documentElement.dataset.theme = theme, info.project.name);
  await page.locator('#open-modal').focus();
  await page.keyboard.press('Enter');
  await page.locator('#modal').getByRole('button', { name: 'Fehler anzeigen', exact: true }).click();
  await hitToast(page);
  await page.locator('.uix-toast__action').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#actions')).toHaveText('1');
  await page.locator('#modal').getByRole('button', { name: 'Fehler anzeigen', exact: true }).click();
  await page.locator('#close-modal').click();
  await hitToast(page);
  await page.screenshot({ path: info.outputPath('modal-closed-toast-remains.png') });
  // Opposite DOM order: the drawer precedes this modal in the tree but opens AFTER it.
  await page.locator('#open-modal').click();
  await page.locator('#nested-drawer').click();
  await hitToast(page);
  await page.locator('#drawer').getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(page.locator('#modal')).toBeVisible();
  await hitToast(page);
});
